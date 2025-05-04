import React, { useState, useEffect } from 'react';
import { auth } from './firebaseConfig'; // Import auth instance
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import UrlInputForm from './components/UrlInputForm'; // Import the new component

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true); // Renamed for clarity
  const [isSubmitting, setIsSubmitting] = useState(false); // State for submission status

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoadingAuth(false);
      } else {
        try {
          const userCredential = await signInAnonymously(auth);
          setUser(userCredential.user);
          console.log('Signed in anonymously:', userCredential.user.uid);
        } catch (error) {
          console.error("Error signing in anonymously:", error);
        }
        setLoadingAuth(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Handler passed to the form component
  const handleUrlSubmit = async (url: string) => {
    if (!user) {
      console.error("User not authenticated yet.");
      alert("Authentication error. Please refresh the page."); // User feedback
      return;
    }
    console.log('Submitting URL:', url, 'by user:', user.uid);
    setIsSubmitting(true);

    try {
      // Call the backend API function
      const response = await fetch('/api/scan', { // Assuming relative path works with proxy/hosting setup
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add Authorization header if/when needed (e.g., sending user ID token)
          // 'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({ url: url }),
      });

      if (!response.ok) {
        // Handle non-2xx responses
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' })); // Try to parse error
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorData?.message || 'Unknown error'}`);
      }

      const data = await response.json(); // Parse the JSON response from the function
      console.log('API Response:', data);

      // TODO: Get the actual reportId returned from the function (once implemented)
      const temporaryReportId = `temp_${Date.now()}`;
      alert(`Scan initiated for ${url}. Response: ${data.message}. (Temporary ID: ${temporaryReportId})`);
      // TODO: Replace alert with navigation: navigate(`/report/${data.reportId}`);

    } catch (error) {
      console.error("Error calling scan API:", error);
      // Provide more specific feedback if possible
      alert(`Failed to start analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-sans antialiased">
        <p className="text-xl text-slate-500">Authenticating...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 pt-12 sm:pt-16 lg:pt-20 bg-slate-50 font-sans antialiased">
      <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-center text-slate-800">
        AI QA Engineer Assistant
      </h1>
      {user && (
        <p className="text-sm text-slate-500 mb-10 sm:mb-12">User ID: {user.uid} (Anonymous)</p>
      )}

      <UrlInputForm onSubmitUrl={handleUrlSubmit} isSubmitting={isSubmitting} loadingAuth={loadingAuth} />

    </div>
  );
}

export default App;
