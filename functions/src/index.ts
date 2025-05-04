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

// Example HTTP function
export const helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

/**
 * HTTP Function to trigger a website scan.
 * Expects a POST request with JSON body: { url: string }
 */
export const apiScan = onRequest(async (request, response) => {
  // Ensure it's a POST request
  if (request.method !== 'POST') {
    response.status(405).send('Method Not Allowed');
    return;
  }

  // Extract URL from request body
  const { url } = request.body;

  // Log the request
  logger.info(`Received scan request for URL: ${url}`, { body: request.body });

  // --- TODO: Add Core Logic ---
  // 1. Validate URL more thoroughly
  // 2. Get authenticated user ID (if needed later, requires frontend to send token)
  // 3. Create initial 'pending' report entry in Realtime Database
  //    const reportId = /* generate unique ID */;
  //    await admin.database().ref(`reports/${reportId}`).set({ ... });
  // 4. Trigger async tasks (Playwright screenshot, Lighthouse)
  //    This might involve another function or Pub/Sub for long-running tasks
  // --- End TODO ---

  // Basic immediate response
  if (!url) {
    logger.error("Missing 'url' in request body");
    response.status(400).json({ error: "Missing 'url' in request body" });
    return;
  }

  // Respond with a simple acknowledgement (actual report ID will come from DB creation)
  response.status(202).json({ message: "Scan initiated", receivedUrl: url /*, reportId: reportId */ });

});
