/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {onRequest} from "firebase-functions/v2/https";
import {onTaskDispatched} from "firebase-functions/v2/tasks";
import {CloudTasksClient, protos} from "@google-cloud/tasks";
// @ts-ignore: No types for playwright-aws-lambda
import * as playwright from "playwright-aws-lambda";
import lighthouse, { Flags as LighthouseFlags } from "lighthouse"; // Import Lighthouse and its Flags type

// Initialize Firebase Admin SDK
admin.initializeApp();

// Get a reference to the Realtime Database service
const rtdb = admin.database();

// Configuration for Cloud Tasks
const LOCATION_ID = "us-central1"; // Ensure this is your function's region
const QUEUE_ID = "scanProcessingQueue";

const tasksClient = new CloudTasksClient();
let currentProjectId: string | undefined;

async function getProjectId(): Promise<string> {
  if (currentProjectId) {
    return currentProjectId;
  }
  // Try to get project ID from initialized admin app
  if (admin.instanceId && admin.instanceId()) {
     // This is a made up api that does not exist
     // currentProjectId = await admin.instanceId().get();
     // return currentProjectId;
  }


  // Fallback to environment variable or default if not available from admin SDK
  // (this part might need adjustment based on actual Firebase Admin SDK capabilities for project ID)
  const projectIdFromEnv = process.env.GCLOUD_PROJECT || admin.app().options.projectId;
  if (!projectIdFromEnv) {
    throw new Error("Project ID could not be determined. Ensure GCLOUD_PROJECT env var is set or Firebase Admin is initialized correctly.");
  }
  currentProjectId = projectIdFromEnv;
  return currentProjectId;
}

interface LighthouseReportData {
  success: boolean;
  error?: string;
  scores?: {
    performance?: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
    pwa?: number;
  };
  // We can add more specific audit details or the full LHR JSON later if needed.
}

/**
 * Represents the data structure for a report stored in the Realtime Database.
 */
interface ReportData {
  id: string;
  url: string;
  status: "pending" | "processing" | "completed" | "failed";
  playwrightReport?: {
    success: boolean;
    pageTitle?: string;
    screenshotUrl?: string;
    error?: string;
    // Add other relevant data from Playwright if needed
  };
  lighthouseReport?: LighthouseReportData;
  createdAt: number;
  updatedAt: number;
  error?: string;
}

/**
 * Generates a unique ID for reports.
 * @returns A unique string ID.
 */
function generateReportId(): string {
  return `report-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Validates if the provided string is a valid HTTP/HTTPS URL.
 * @param urlString The string to validate.
 * @returns True if the URL is valid, false otherwise.
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

/**
 * HTTP Function to trigger a website scan and store reports.
 */
export const apiScan = onRequest({cors: true}, async (request, response) => {
  logger.info("apiScan function triggered.", {structuredData: true});

  // const urlToScan = request.query.url as string; // Old way: from query param
  const urlToScan = request.body.url as string; // New way: from request body

  if (request.method !== 'POST') {
    response.status(405).send('Method Not Allowed');
    return;
  }

  if (!urlToScan) {
    logger.warn("URL is missing from the request body.");
    // response.status(400).send("URL query parameter is required."); // Old message
    response.status(400).send("URL is required in the request body."); // New message
    return;
  }

  if (!isValidUrl(urlToScan)) {
    logger.warn("Invalid URL format provided.", {url: urlToScan});
    response.status(400).send("Invalid URL format. Please provide a valid HTTP/HTTPS URL.");
    return;
  }

  const reportId = generateReportId();
  const initialReportData: ReportData = {
    id: reportId,
    url: urlToScan,
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  try {
    // Store initial report data in Realtime Database
    await rtdb.ref(`reports/${reportId}`).set(initialReportData);
    logger.info("Initial report data stored in RTDB.", {reportId});

    const projectId = await getProjectId();
    const queuePath = tasksClient.queuePath(projectId, LOCATION_ID, QUEUE_ID);

    // Construct the full URL to the processScanTask function
    // For 2nd gen functions (like onTaskDispatched), this is a Cloud Run URL.
    // It's best to set this via an environment variable after deploying processScanTask.
    const processScanTaskUrl = process.env.PROCESS_SCAN_TASK_URL;

    if (!processScanTaskUrl) {
      logger.error("PROCESS_SCAN_TASK_URL environment variable is not set. This is required for enqueuing tasks. Please deploy processScanTask and set its trigger URL as this environment variable.");
      response.status(500).send("Server configuration error: PROCESS_SCAN_TASK_URL not set.");
      // Update RTDB to failed
      await rtdb.ref(`reports/${reportId}/status`).set("failed");
      await rtdb.ref(`reports/${reportId}/error`).set("Configuration error: Target function URL not set.");
      await rtdb.ref(`reports/${reportId}/updatedAt`).set(Date.now());
      return;
    }
    logger.info(`Using processScanTask URL: ${processScanTaskUrl}`);


    const actualPayload: ScanTaskPayload = {reportId, urlToScan};
    // Wrap the actual payload inside a 'data' property, to mimic how onTaskDispatched might expect it
    // when the request doesn't originate from firebase-admin/functions TaskQueue.enqueue().
    const wrappedPayload = { data: actualPayload };

    const task: protos.google.cloud.tasks.v2.ITask = {
      httpRequest: {
        httpMethod: protos.google.cloud.tasks.v2.HttpMethod.POST,
        url: processScanTaskUrl, // Use the configurable URL
        headers: {"Content-Type": "application/json; charset=utf-8"}, // Explicit Content-Type with charset
        body: Buffer.from(JSON.stringify(wrappedPayload), 'utf8'), // Send the wrapped payload as a UTF-8 Buffer
        oidcToken: {
          serviceAccountEmail: `${projectId}@appspot.gserviceaccount.com`, // Default App Engine service account
          audience: processScanTaskUrl, // Audience MUST be the URL of the called function
        },
      },
      // Optionally, set scheduleTime or other task parameters here
      // scheduleTime: { seconds: Date.now() / 1000 + 60 } // e.g., 60 seconds from now
    };

    logger.info("Attempting to enqueue task...", {queuePath, wrappedPayload});
    const [taskResponse] = await tasksClient.createTask({parent: queuePath, task});
    logger.info("Task enqueued successfully.", {taskId: taskResponse.name});

  // Respond with the generated reportId
  response.status(202).json({
      message: "Scan initiation request received, task enqueued.",
    receivedUrl: urlToScan,
      reportId: reportId,
    });
  } catch (error) {
    logger.error("Error in apiScan function:", error);
    // Update status to failed in RTDB if possible
    await rtdb.ref(`reports/${reportId}/status`).set("failed");
    await rtdb.ref(`reports/${reportId}/error`).set((error as Error).message);
    await rtdb.ref(`reports/${reportId}/updatedAt`).set(Date.now());
    response.status(500).send("Internal Server Error during scan initiation.");
  }
});

interface ScanTaskPayload {
  reportId: string;
  urlToScan: string;
}

// New Task Queue Function to process the scan
// Using onTaskDispatched as per firebase-functions/v2/tasks
export const processScanTask = onTaskDispatched<ScanTaskPayload>(
  {
    retryConfig: {
      maxAttempts: 5,
      minBackoffSeconds: 60,
    },
    rateLimits: {
      maxConcurrentDispatches: 10, // Adjust as needed
    },
    timeoutSeconds: 540, // Max timeout for Firebase Functions (gen 2 can be higher if configured)
    memory: "1GiB", // Adjust as needed
    // Ensure this function is deployed to the same region as the queue (LOCATION_ID)
    // region: LOCATION_ID, // This might be set globally or per function
  },
  async (request) => {
    // EXTENSIVE DIAGNOSTIC LOGGING
    logger.info("processScanTask: FULL REQUEST DUMP", {
      headers: request.headers,
      data: request.data,
      body: (request as any).body,
      rawBody: (request as any).rawBody,
      allKeys: Object.keys(request),
    });

    // Log the raw request object details for debugging
    logger.info("processScanTask received request. Headers:", request.headers);
    logger.info("processScanTask received request. Parsed data object:", request.data);

    // Defensive check if data is truly missing or not an object
    if (!request.data || typeof request.data !== 'object') {
      logger.error("request.data is missing, undefined, or not an object.", {receivedData: request.data});
      // If request.data is not what we expect, we should probably not proceed further with destructuring.
      // Throw an error to indicate failure, which Cloud Tasks can then retry.
      throw new Error("Parsed request.data is invalid or missing.");
    }

    const {reportId, urlToScan} = request.data; // Correctly access the payload from request.data

    logger.info(`processScanTask starting with: reportId: ${reportId}, url: ${urlToScan}`, {reportId, urlToScan});

    try {
      // 1. Update report status to "processing" in RTDB
      await rtdb.ref(`reports/${reportId}/status`).set("processing");
      await rtdb.ref(`reports/${reportId}/updatedAt`).set(Date.now());
      logger.info("Report status updated to processing.", {reportId});

      // 2. Playwright execution
      let playwrightScanSucceeded = false;
      // Initialize with a default structure in case of early errors before playwrightReport is fully populated
      let playwrightReportData: ReportData["playwrightReport"] = { success: false, error: "Playwright scan did not run or complete." };
      let browser;

      try {
        logger.info("Using playwright-aws-lambda. Launching Chromium with launchChromium()...");
        browser = await playwright.launchChromium();
        const context = await browser.newContext();
        const page = await context.newPage();
        logger.info("Navigating to target URL...", { urlToScan });
        const navigationResponse = await page.goto(urlToScan, { waitUntil: 'domcontentloaded', timeout: 30000 });
        logger.info("Navigation complete.", { status: navigationResponse?.status() });
        const pageTitle = await page.title();
        logger.info("Fetched page title via Playwright.", { pageTitle });

        // Take screenshot and upload to Firebase Storage
        const screenshotBuffer = await page.screenshot({ type: "png" });
        const bucket = admin.storage().bucket(); // Ensure bucket is configured if not default
        const screenshotPath = `screenshots/${reportId}.png`;
        const file = bucket.file(screenshotPath);
        await file.save(screenshotBuffer, { contentType: "image/png" });
        const [screenshotUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
        });
        logger.info("Screenshot uploaded to Firebase Storage.", { screenshotPath, screenshotUrl });

        playwrightReportData = {
          success: true,
          pageTitle: pageTitle,
          screenshotUrl: screenshotUrl,
        };
        playwrightScanSucceeded = true;

      } catch (playwrightError) {
        const errorMsg = (playwrightError as Error).message || String(playwrightError);
        logger.error("Error during Playwright execution for report:", { reportId, error: errorMsg });
        playwrightReportData = {
          success: false,
          error: errorMsg,
        };
        // Do NOT re-throw here. This error is part of the scan result.
      } finally {
        if (browser) {
          await browser.close();
          logger.info("Closed Chromium browser.", {reportId});
        }
      }

      // Save Playwright results (success or failure details) to RTDB
      await rtdb.ref(`reports/${reportId}/playwrightReport`).set(playwrightReportData);
      // No longer need to save screenshotUrl separately here as it's in playwrightReport
      // await rtdb.ref(`reports/${reportId}/screenshotUrl`).set(screenshotUrl);
      await rtdb.ref(`reports/${reportId}/updatedAt`).set(Date.now());
      logger.info("Playwright report data saved to RTDB.", {reportId});

      // 3. Lighthouse execution
      let lighthouseScanSucceeded = false;
      let lighthouseReportData: LighthouseReportData = { success: false, error: "Lighthouse scan did not run or complete." };

      try {
        logger.info("Starting Lighthouse scan...", { reportId, urlToScan });

        // Define options for Lighthouse
        // Tell Lighthouse to use the same port Playwright is using for Chrome.
        // playwright-aws-lambda defaults to port 9222.
        const lighthouseOptions: LighthouseFlags = {
          port: 9222,
          output: 'json',
          logLevel: 'info',
          onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
          // Consider adding formFactor: 'mobile' or 'desktop' if needed, and other flags.
        };

        // Run Lighthouse
        const runnerResult = await lighthouse(urlToScan, lighthouseOptions);

        if (!runnerResult || !runnerResult.lhr) {
          throw new Error("Lighthouse did not return a valid report (LHR).");
        }

        const lhr = runnerResult.lhr; // lhr is the Lighthouse Result object
        logger.info("Lighthouse scan completed. Processing results...", { reportId });

        // Extract scores
        const scores: LighthouseReportData['scores'] = {};
        if (lhr.categories.performance?.score) {
          scores.performance = Math.round(lhr.categories.performance.score * 100);
        }
        if (lhr.categories.accessibility?.score) {
          scores.accessibility = Math.round(lhr.categories.accessibility.score * 100);
        }
        if (lhr.categories['best-practices']?.score) {
          scores.bestPractices = Math.round(lhr.categories['best-practices'].score * 100);
        }
        if (lhr.categories.seo?.score) {
          scores.seo = Math.round(lhr.categories.seo.score * 100);
        }
        // PWA score might be null if not applicable, handle that
        if (lhr.categories.pwa?.score !== null && lhr.categories.pwa?.score !== undefined) {
            scores.pwa = Math.round(lhr.categories.pwa.score * 100);
        } else {
            // Optional: explicitly set to undefined or a special value if PWA is not applicable/scored
            scores.pwa = undefined;
        }

        lighthouseReportData = {
          success: true,
          scores: scores,
        };
        lighthouseScanSucceeded = true;

      } catch (lighthouseError) {
        const errorMsg = (lighthouseError as Error).message || String(lighthouseError);
        logger.error("Error during Lighthouse execution for report:", { reportId, error: errorMsg });
        lighthouseReportData = {
          success: false,
          error: errorMsg,
        };
        // Do NOT re-throw here. This error is part of the scan result.
      }

      // Save Lighthouse results to RTDB
      await rtdb.ref(`reports/${reportId}/lighthouseReport`).set(lighthouseReportData);
      await rtdb.ref(`reports/${reportId}/updatedAt`).set(Date.now());
      logger.info("Lighthouse report data saved to RTDB.", {reportId, lighthouseReportData});

      // 4. Update final report status
      if (playwrightScanSucceeded && lighthouseScanSucceeded) { // Both must succeed
        await rtdb.ref(`reports/${reportId}/status`).set("completed");
      } else {
        await rtdb.ref(`reports/${reportId}/status`).set("failed");
        // The specific error (e.g. from Playwright) is already in playwrightReport.error
        // Or, if a general error message is preferred for the main error field:
        await rtdb.ref(`reports/${reportId}/error`).set("Scan completed with errors. See playwrightReport and/or lighthouseReport for details.");
      }
      await rtdb.ref(`reports/${reportId}/updatedAt`).set(Date.now());
      logger.info("processScanTask final status updated.", {reportId, status: (playwrightScanSucceeded && lighthouseScanSucceeded) ? "completed" : "failed" });

    } catch (outerError) {
      const errorMessage = (outerError as Error).message || String(outerError);
      logger.error(`CRITICAL Error in processScanTask orchestration for reportId ${reportId}:`, { error: outerError });

      // Update report status to "failed"
      await rtdb.ref(`reports/${reportId}/status`).set("failed");
      await rtdb.ref(`reports/${reportId}/error`).set(`Critical function error: ${errorMessage}`);
      await rtdb.ref(`reports/${reportId}/updatedAt`).set(Date.now());

      // For ANY error caught at this outer level, we assume it's critical enough to stop retries.
      logger.error("Outer critical error detected. Scan will not be retried by Cloud Tasks.", {reportId});
      // Do NOT re-throw, ensuring Cloud Tasks does not retry.
    }
  }
);

// TODO:
// 1. Ensure the Cloud Tasks queue "scan-processing-queue" is created in your GCP project in the LOCATION_ID region.
//    This can be done via gcloud CLI:
//    gcloud tasks queues create scan-processing-queue --location=us-central1
//
// 2. Ensure the service account used by apiScan (typically <PROJECT_ID>@appspot.gserviceaccount.com for App Engine default, or the function's specific service account)
//    has the "Cloud Tasks Enqueuer" (roles/cloudtasks.enqueuer) IAM role.
//    gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:YOUR_PROJECT_ID@appspot.gserviceaccount.com" --role="roles/cloudtasks.enqueuer"
//
// 3. Ensure the service account used by Cloud Tasks to invoke processScanTask (also typically <PROJECT_ID>@appspot.gserviceaccount.com if you use it for OIDC token)
//    has the "Cloud Functions Invoker" (roles/cloudfunctions.invoker) IAM role for the processScanTask function.
//    gcloud functions add-iam-policy-binding processScanTask --region=us-central1 --member="serviceAccount:YOUR_PROJECT_ID@appspot.gserviceaccount.com" --role="roles/cloudfunctions.invoker"
//
// 4. If using a different service account for the OIDC token in the task, ensure IT has invoke permission and the enqueuing service account has permission to impersonate IT ("Service Account Token Creator" role - roles/iam.serviceAccountTokenCreator).

// Note on Project ID retrieval:
// The `getProjectId` function attempts to retrieve the project ID.
// For Firebase Functions, `admin.app().options.projectId` should typically work if the Admin SDK is initialized.
// `process.env.GCLOUD_PROJECT` is also a common way it's available in the environment.
// The `admin.instanceId().get()` method was a made-up example and has been removed.
// For OIDC token generation, the serviceAccountEmail needs to be correct.
// Usually, for a function, it's `<PROJECT_ID>@appspot.gserviceaccount.com` (if using default App Engine SA)
// or a custom service account if your function is configured to run as one.
// The `audience` for the OIDC token MUST be the full URL of the target HTTP function (`processScanTask` in this case).

// The URL for 2nd gen functions triggered by Cloud Tasks via HTTP is critical.
// It's usually of the form: https://<function-name>-<hash>-<region>.a.run.app if it's a public HTTP endpoint.
// If `processScanTask` is deployed as an HTTP-triggered function (which it must be for Cloud Tasks to call its URL),
// then its URL needs to be correctly determined. The example `https://${LOCATION_ID}-${projectId}.cloudfunctions.net/processScanTask`
// is more typical for 1st gen functions. For 2nd gen, it will be a Cloud Run URL.
// You should obtain this URL from the Google Cloud Console after deploying `processScanTask` or via gcloud command:
// `gcloud functions describe processScanTask --region <region> --format 'value(serviceConfig.uri)'`
// And ensure that is the URL used in `task.httpRequest.url` and `task.httpRequest.oidcToken.audience`.

// The current `admin.instanceId` usage in the template was incorrect for getting project ID and has been commented out.
// `admin.app().options.projectId` or `process.env.GCLOUD_PROJECT` are the correct ways.
