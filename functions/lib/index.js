"use strict";
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiScan = exports.helloWorld = void 0;
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const https_1 = require("firebase-functions/v2/https");
// Initialize Firebase Admin SDK
admin.initializeApp();
// Example HTTP function
exports.helloWorld = (0, https_1.onRequest)((request, response) => {
    logger.info("Hello logs!", { structuredData: true });
    response.send("Hello from Firebase!");
});
/**
 * HTTP Function to trigger a website scan.
 * Expects a POST request with JSON body: { url: string }
 */
exports.apiScan = (0, https_1.onRequest)(async (request, response) => {
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
//# sourceMappingURL=index.js.map