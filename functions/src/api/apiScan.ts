import * as logger from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";
import { getProjectId, generateReportId, isValidUrl } from "../utils";
import { ReportData, ScanTaskPayload } from "../types";
import * as admin from "firebase-admin";
import { CloudTasksClient, protos } from "@google-cloud/tasks";
import { getSupportedProviders } from "../services/aiProviderService";

// Assuming rtdb, tasksClient, LOCATION_ID, and QUEUE_ID are initialized
// and exported from a central place (e.g., index.ts or a config.ts) or passed appropriately.
// For this refactor, we'll assume they can be imported if exported from index.ts or a config file.
// For now, to make it simpler, let's assume rtdb and tasksClient are initialized here or passed.
// Let's import them from a hypothetical config or index for now.

// Placeholder: these would ideally be initialized in and exported from index.ts or a config file
// const rtdb = admin.database(); // <-- REMOVE THIS
const tasksClient = new CloudTasksClient(); // This is fine, not Firebase Admin related
const LOCATION_ID = "us-central1";
const QUEUE_ID = "scanProcessingQueue";
const SUPPORTED_AI_PROVIDERS = new Set(getSupportedProviders());

/**
 * HTTP Function to trigger a website scan and store reports.
 */
export const apiScan = onRequest({cors: true}, async (request, response) => {
  // ===== BEGIN AUTH CHECK =====
  const authorizationHeader = request.headers.authorization;
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    logger.warn("Missing or invalid Authorization header.");
    response.status(401).send("Unauthorized: Missing or invalid token.");
    return;
  }
  const idToken = authorizationHeader.split('Bearer ')[1];
  // const allowedAdminEmail = process.env.ALLOWED_ADMIN_EMAIL; // No longer used

  // if (!allowedAdminEmail) { // No longer used
  //   logger.error("ALLOWED_ADMIN_EMAIL environment variable is not set. Cannot perform auth check.");
  //   response.status(500).send("Server configuration error: Admin email not set.");
  //   return;
  // }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    // Check for the custom admin claim
    if (decodedToken.admin !== true) {
      logger.warn("Forbidden: User does not have admin custom claim.", {uid: decodedToken.uid, email: decodedToken.email});
      response.status(403).send("Forbidden: You do not have permission to access this resource.");
      return;
    }
    logger.info("User authenticated successfully as admin via custom claim.", {uid: decodedToken.uid, email: decodedToken.email});
  } catch (error) {
    logger.error("Error verifying ID token or missing admin claim:", error);
    response.status(401).send("Unauthorized: Invalid token or insufficient permissions.");
    return;
  }
  // ===== END AUTH CHECK =====

  const rtdb = admin.database();
  logger.info("apiScan function triggered by authenticated admin.", {structuredData: true});

  const urlToScan = request.body.url as string;
  const rawProvider = typeof request.body.aiProvider === "string" ? request.body.aiProvider.trim().toLowerCase() : undefined;
  const rawModel = typeof request.body.aiModel === "string" ? request.body.aiModel.trim() : undefined;

  if (rawProvider && !SUPPORTED_AI_PROVIDERS.has(rawProvider)) {
    logger.warn("Unsupported AI provider requested.", { rawProvider });
    response.status(400).send(`Unsupported AI provider: ${rawProvider}`);
    return;
  }

  const requestedAiProvider = rawProvider;
  const requestedAiModel = rawModel && rawModel.length > 0 ? rawModel : undefined;

  if (request.method !== 'POST') {
    response.status(405).send('Method Not Allowed');
    return;
  }

  if (!urlToScan) {
    logger.warn("URL is missing from the request body.");
    response.status(400).send("URL is required in the request body.");
    return;
  }

  if (!isValidUrl(urlToScan)) {
    logger.warn("Invalid URL format provided.", {url: urlToScan});
    response.status(400).send("Invalid URL format. Please provide a valid HTTP/HTTPS URL.");
    return;
  }

  const reportId = generateReportId();
  const analysisId = reportId; // Maintain backwards compatibility while supporting new terminology
  const initialReportData: ReportData = {
    id: reportId,
    analysisId,
    url: urlToScan,
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...(requestedAiProvider || requestedAiModel ? { aiConfig: { provider: requestedAiProvider, model: requestedAiModel } } : {}),
  };

  try {
    await rtdb.ref(`reports/${reportId}`).set(initialReportData);
    logger.info("Initial report data stored in RTDB.", {reportId});

    const projectId = await getProjectId();
    const queuePath = tasksClient.queuePath(projectId, LOCATION_ID, QUEUE_ID);

    const processScanTaskUrl = process.env.PROCESS_SCAN_TASK_URL;

    if (!processScanTaskUrl) {
      logger.error("PROCESS_SCAN_TASK_URL environment variable is not set. This is required for enqueuing tasks. Please deploy processScanTask and set its trigger URL as this environment variable.");
      response.status(500).send("Server configuration error: PROCESS_SCAN_TASK_URL not set.");
      await rtdb.ref(`reports/${reportId}/status`).set("failed");
      await rtdb.ref(`reports/${reportId}/error`).set("Configuration error: Target function URL not set.");
      await rtdb.ref(`reports/${reportId}/updatedAt`).set(Date.now());
      return;
    }
    logger.info(`Using processScanTask URL: ${processScanTaskUrl}`);

    const actualPayload: ScanTaskPayload = {reportId, urlToScan, aiProvider: requestedAiProvider, aiModel: requestedAiModel};
    const wrappedPayload = { data: actualPayload };

    const task: protos.google.cloud.tasks.v2.ITask = {
      httpRequest: {
        httpMethod: protos.google.cloud.tasks.v2.HttpMethod.POST,
        url: processScanTaskUrl,
        headers: {"Content-Type": "application/json; charset=utf-8"},
        body: Buffer.from(JSON.stringify(wrappedPayload), 'utf8'),
        oidcToken: {
          serviceAccountEmail: `${projectId}@appspot.gserviceaccount.com`,
          audience: processScanTaskUrl,
        },
      },
    };

    logger.info("Attempting to enqueue task...", {queuePath, wrappedPayload});
    const [taskResponse] = await tasksClient.createTask({parent: queuePath, task});
    logger.info("Task enqueued successfully.", {taskId: taskResponse.name});

    response.status(202).json({
      message: "Scan initiation request received, task enqueued.",
      receivedUrl: urlToScan,
      reportId,
      analysisId,
      id: analysisId,
      status: "queued",
      url: urlToScan,
      queuedAt: new Date().toISOString(),
      estimatedCompletionTime: null,
    });
  } catch (error) {
    logger.error("Error in apiScan function:", error);
    await rtdb.ref(`reports/${reportId}/status`).set("failed");
    await rtdb.ref(`reports/${reportId}/error`).set((error as Error).message);
    await rtdb.ref(`reports/${reportId}/updatedAt`).set(Date.now());
    response.status(500).send("Internal Server Error during scan initiation.");
  }
});
