import * as admin from "firebase-admin";

let currentProjectId: string | undefined;

export async function getProjectId(): Promise<string> {
  if (currentProjectId) {
    return currentProjectId;
  }
  // Try to get project ID from initialized admin app
  // admin.instanceId().get() was a made up api and removed.

  // Fallback to environment variable or default if not available from admin SDK
  const projectIdFromEnv = process.env.GCLOUD_PROJECT || admin.app().options.projectId;
  if (!projectIdFromEnv) {
    throw new Error("Project ID could not be determined. Ensure GCLOUD_PROJECT env var is set or Firebase Admin is initialized correctly.");
  }
  currentProjectId = projectIdFromEnv;
  return currentProjectId;
}

/**
 * Generates a unique ID for reports.
 * @returns A unique string ID.
 */
export function generateReportId(): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 11);
  return `analysis_${timestamp}_${randomSuffix}`;
}

/**
 * Validates if the provided string is a valid HTTP/HTTPS URL.
 * @param urlString The string to validate.
 * @returns True if the URL is valid, false otherwise.
 */
export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}
