/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK (this should be done only once)
if (!admin.apps.length) {
  admin.initializeApp();
} else {
  admin.app(); // if already initialized, use that one
}

// Import and re-export types if they are meant to be public, otherwise keep them unexported from here
// export * from "./types"; // Example if all types were to be re-exported

// Export functions from their new locations
export { apiScan } from "./api/apiScan";
export { processScanTask } from "./tasks/processScanTask";

// Get a reference to the Realtime Database service - can be exported if needed by other top-level files
// export const rtdb = admin.database();

// Configuration for Cloud Tasks (can be exported if needed)
// export const LOCATION_ID = "us-central1";
// export const QUEUE_ID = "scanProcessingQueue";
// export const tasksClient = new CloudTasksClient();

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
