import { onValueWritten, DatabaseEvent } from 'firebase-functions/v2/database';
import * as functions from 'firebase-functions'; // For functions.Change type
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

interface AdminUserData {
  email?: string;
  isAdmin?: boolean;
}

// Type for the custom claims we are setting
interface AdminCustomClaims {
  admin?: boolean | null;
}

export const manageAdminCustomClaims = onValueWritten(
  { ref: '/adminUsers/{uid}' },
  async (event: DatabaseEvent<functions.Change<admin.database.DataSnapshot>, { uid: string }>) => {
    const uid = event.params.uid;
    const afterDataSnapshot = event.data.after;
    const beforeDataSnapshot = event.data.before;

    const userDataAfter = afterDataSnapshot.val() as AdminUserData | null;
    const userIsAdminAfter = afterDataSnapshot.exists() && userDataAfter?.isAdmin === true;

    const userDataBefore = beforeDataSnapshot.val() as AdminUserData | null;
    const wasAdminBefore = beforeDataSnapshot.exists() && userDataBefore?.isAdmin === true;

    // Scenario 1: User is being removed as admin or node deleted
    if (wasAdminBefore && !userIsAdminAfter) {
      logger.info(`User ${uid} is no longer an admin. Removing custom claim.`);
      try {
        const userRecord = await admin.auth().getUser(uid);
        const existingClaims = (userRecord.customClaims || {}) as AdminCustomClaims;
        if (existingClaims.admin === true) {
          await admin.auth().setCustomUserClaims(uid, { ...existingClaims, admin: null });
          logger.info(`Successfully nulled admin custom claim for user ${uid}.`);
        }
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          logger.warn(`User ${uid} not found in Firebase Auth during claim removal.`);
        } else {
          logger.error(`Error removing admin custom claim for user ${uid}:`, error);
        }
      }
    }
    // Scenario 2: User is being added as admin
    else if (!wasAdminBefore && userIsAdminAfter) {
      logger.info(`User ${uid} is now an admin. Setting custom claim. Email: ${userDataAfter?.email}`);
      try {
        const userRecord = await admin.auth().getUser(uid);
        const existingClaims = (userRecord.customClaims || {}) as AdminCustomClaims;
        if (existingClaims.admin !== true) {
            await admin.auth().setCustomUserClaims(uid, { ...existingClaims, admin: true });
            logger.info(`Successfully set admin custom claim for user ${uid}.`);
        }
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          logger.warn(`User ${uid} not found in Firebase Auth. Cannot set admin claim. Ensure user exists.`);
        } else {
          logger.error(`Error setting admin custom claim for user ${uid}:`, error);
        }
      }
    }
    return null;
  }
);
