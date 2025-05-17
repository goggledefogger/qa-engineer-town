import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  isSignInWithEmailLink,
  completeSignInWithEmailLink,
  signOut as firebaseSignOut, // Import signOut
} from '../authService';
import { Card } from '../components/ui';

const ALLOWED_EMAIL_FROM_ENV = import.meta.env.VITE_ALLOWED_EMAIL || 'test@test.com'; // Fallback

const HandleSignInPage: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processSignIn = async () => {
      const link = window.location.href;
      if (isSignInWithEmailLink(link)) {
        try {
          // Attempt to sign out any existing user first (temporary test)
          // This is to ensure a clean state before completing the email link sign-in.
          // In a normal flow, this shouldn't be strictly necessary if the user is already signed out
          // or if Firebase handles the session correctly.
          try {
            await firebaseSignOut();
            console.log("Attempted pre-sign-out before completing link.");
          } catch (signOutError) {
            console.warn("Error during pre-sign-out (might be normal if no user was signed in):", signOutError);
          }

          const user = await completeSignInWithEmailLink(link);
          if (user) {
            if (user.email === ALLOWED_EMAIL_FROM_ENV) {
              setStatus('success');
              navigate('/');
            } else {
              setError(
                `Access denied. This application is restricted. Your email (${user.email}) is not authorized. Please use ${ALLOWED_EMAIL_FROM_ENV}.`
              );
              // Sign out the user who isn't allowed
              await firebaseSignOut();
              setStatus('error');
              setTimeout(() => navigate('/signin'), 7000); // Increased timeout for reading message
            }
          } else {
            // This case should ideally not be reached if completeSignInWithEmailLink resolves without error and without a user.
            setError('Sign-in process did not return a user.');
            setStatus('error');
          }
        } catch (e: any) {
          console.error('Sign-in failed:', e);
          setError(e.message || 'Failed to sign in. The link may be invalid or expired.');
          setStatus('error');
        }
      } else {
        setError('This is not a valid sign-in link.');
        setStatus('error');
        // Optionally redirect to sign-in page if the link is invalid
        setTimeout(() => navigate('/signin'), 3000);
      }
    };

    processSignIn();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 font-sans">
      <Card title="Processing Sign-In" className="w-full max-w-md shadow-xl text-center">
        {status === 'processing' && (
          <p className="text-slate-700">Please wait while we sign you in...</p>
        )}
        {status === 'success' && (
          <p className="text-green-600">Sign-in successful! Redirecting...</p>
        )}
        {status === 'error' && (
          <div className="space-y-3">
            <p className="text-red-600 font-semibold">Sign-In Error</p>
            <p className="text-red-700 text-sm">{error || 'An unknown error occurred.'}</p>
            <button
              onClick={() => navigate('/signin')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default HandleSignInPage;
