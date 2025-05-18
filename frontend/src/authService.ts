import {
  getAuth,
  sendSignInLinkToEmail as firebaseSendSignInLinkToEmail,
  isSignInWithEmailLink as firebaseIsSignInWithEmailLink,
  signInWithEmailLink as firebaseSignInWithEmailLink,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signOut as firebaseSignOut,
  type User
} from 'firebase/auth';
import app, { db } from './firebaseConfig'; // Import db from firebaseConfig
import { ref, get } from 'firebase/database'; // Import RTDB functions

const auth = getAuth(app);

const ACTION_CODE_SETTINGS = {
  // URL you want to redirect back to. The domain (www.example.com)cloudfront.net
  // must be authorized in the Firebase Console.
  url: `${window.location.origin}/handle-signin`, // We'll create this page
  handleCodeInApp: true, // This must be true
};

const EMAIL_STORAGE_KEY = 'emailForSignIn';

export const sendSignInLink = async (email: string): Promise<void> => {
  try {
    await firebaseSendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS);
    // Save the email locally so you don't need to ask the user for it again
    // if they open the link on the same device.
    window.localStorage.setItem(EMAIL_STORAGE_KEY, email);
    alert('Sign-in link sent to your email. Please check your inbox.'); // Simple feedback
  } catch (error: any) {
    console.error('Error sending sign-in link:', error);
    alert(`Error sending link: ${error.message}`);
    throw error;
  }
};

export const isSignInWithEmailLink = (link: string): boolean => {
  return firebaseIsSignInWithEmailLink(auth, link);
};

export const completeSignInWithEmailLink = async (link: string): Promise<User | null> => {
  let email = window.localStorage.getItem(EMAIL_STORAGE_KEY);
  if (!email) {
    email = window.prompt('Please provide your email for confirmation:');
    if (!email) {
      // alert('Sign-in aborted: Email confirmation was cancelled or not provided.'); // Keep or remove simple user feedback as preferred
      throw new Error('Email is required to complete sign-in and was not provided.');
    }
  }

  // console.log(`[AUTH_SERVICE_DEBUG] Attempting signInWithEmailLink for email: "${email}" with link: "${link}"`);
  // alert(`[DEBUG] Using email: ${email} for sign-in. Link: ${link.substring(0,100)}...`); // REMOVED DEBUG ALERT

  try {
    const result = await firebaseSignInWithEmailLink(auth, email, link);
    window.localStorage.removeItem(EMAIL_STORAGE_KEY);
    // console.log('[AUTH_SERVICE_DEBUG] signInWithEmailLink successful for:', result.user?.email);
    return result.user;
  } catch (error: any) {
    // console.error('[AUTH_SERVICE_DEBUG] Error in signInWithEmailLink:', error);
    // console.error(`[AUTH_SERVICE_DEBUG] Details - Email used: "${email}", Error Code: ${error.code}, Message: ${error.message}`);
    console.error('Error signing in with email link:', error); // Keep a general error log
    window.localStorage.removeItem(EMAIL_STORAGE_KEY);
    alert(`Error signing in: ${error.message}. Email used: ${email}`); // Keep user-facing alert for failures
    throw error;
  }
};

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  return firebaseOnAuthStateChanged(auth, callback);
};

export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error('Error signing out:', error);
    alert(`Error signing out: ${error.message}`);
    throw error;
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const isUserAdmin = async (uid: string): Promise<boolean> => {
  if (!uid) return false;
  try {
    const adminUserRef = ref(db, `adminUsers/${uid}`);
    const snapshot = await get(adminUserRef);
    if (snapshot.exists()) {
      const adminData = snapshot.val();
      return adminData?.isAdmin === true;
    }
    return false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false; // Default to not admin on error
  }
};
