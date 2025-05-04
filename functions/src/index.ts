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

/**
 * HTTP Function to trigger a website scan.
 * Expects a POST request with JSON body: { url: string }
 */
export const apiScan = onRequest({ cors: true /* Allow requests from frontend origin */ }, async (request, response) => {
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

  // --- TODO: Add Core Logic ---
  // 2. Get authenticated user ID (if needed later)
  // 3. Create initial 'pending' report entry in Realtime Database
  //    const reportId = /* generate unique ID */;
  //    await admin.database().ref(`reports/${reportId}`).set({ url: urlToScan, status: 'pending', createdAt: admin.database.ServerValue.TIMESTAMP });
  // 4. Trigger async tasks (Playwright screenshot, Lighthouse)
  // --- End TODO ---

  // Respond with a simple acknowledgement
  response.status(202).json({ message: "Scan initiated", receivedUrl: urlToScan /*, reportId: reportId */ });

});
