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

// Initialize Firebase Admin SDK
admin.initializeApp();

// Get a reference to the Realtime Database service
const rtdb = admin.database();

/**
 * HTTP Function to trigger a website scan.
 * Expects a POST request with JSON body: { url: string }
 */
export const apiScan = onRequest({
    cors: true,
    timeoutSeconds: 300, // Increase timeout slightly, max 540 for v2
    memory: "1GiB" // Allocate more memory for browser instance
  }, async (request, response) => {
  // Ensure it's a POST request
  if (request.method !== 'POST') {
    response.status(405).send({ error: 'Method Not Allowed' });
    return;
  }

  // Extract URL from request body
  const { url } = request.body;
  logger.info(`Received scan request for URL: ${url}`, { body: request.body });

  // --- Backend Validation ---
  if (!url || typeof url !== 'string') {
    logger.error("Missing or invalid 'url' in request body");
    response.status(400).json({ error: "Missing or invalid 'url' in request body" });
    return;
  }

  let validatedUrl: URL;
  try {
    validatedUrl = new URL(url);
  } catch (error) {
    logger.error("Invalid URL format", { url: url, error });
    response.status(400).json({ error: "Invalid URL format" });
    return;
  }

  // Check for valid protocols
  if (validatedUrl.protocol !== 'http:' && validatedUrl.protocol !== 'https:') {
    logger.error("Invalid protocol", { url: url, protocol: validatedUrl.protocol });
    response.status(400).json({ error: "URL must use http or https protocol" });
    return;
  }

  // Optional: Add checks to prevent scanning local/internal URLs if desired
  // if (validatedUrl.hostname === 'localhost' || validatedUrl.hostname === '127.0.0.1') {
  //   logger.error("Scanning localhost is not permitted", { url: url });
  //   response.status(400).json({ error: "Scanning localhost is not permitted" });
  //   return;
  // }
  // --- End Validation ---

  // Use the validated URL string for further processing
  const urlToScan = validatedUrl.toString();

  // --- Create initial report entry in RTDB ---
  let reportId: string | null = null;
  try {
    const reportsRef = rtdb.ref("reports");
    const newReportRef = reportsRef.push(); // Generate unique ID
    reportId = newReportRef.key; // Get the unique key

    if (!reportId) {
      throw new Error("Failed to generate report ID");
    }

    const initialReportData = {
      url: urlToScan,
      status: 'pending', // Initial status
      createdAt: admin.database.ServerValue.TIMESTAMP, // Firebase server timestamp
      // TODO: Add userId: associatedUser.uid (need to handle auth)
    };

    await newReportRef.set(initialReportData); // Set the initial data
    logger.info(`Created initial report entry with ID: ${reportId}`, { data: initialReportData });

  } catch (dbError) {
    logger.error("Database error creating report entry", { error: dbError });
    response.status(500).json({ error: "Failed to create report entry in database" });
    return;
  }
  // --- End Database entry ---

  // --- Trigger Background Scan (Placeholder) ---
  if (reportId) {
    logger.info(`Placeholder: Would trigger background scan task for report ${reportId}`);
    // TODO: Implement Cloud Tasks or Pub/Sub trigger here later.
  } else {
    // Should not happen if DB write succeeded, but log just in case
    logger.error("Cannot trigger background task: reportId is missing");
  }
  // --- End Trigger ---

  // Respond with the generated reportId
  response.status(202).json({
    message: "Scan initiation request received", // Adjusted message
    receivedUrl: urlToScan,
    reportId: reportId
  });
});
