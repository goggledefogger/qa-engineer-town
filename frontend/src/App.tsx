import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom'; // Import useNavigate, Routes, Route, useLocation
import { auth } from './firebaseConfig'; // Import auth instance
import { onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import UrlInputForm from './components/UrlInputForm'; // Import the new component
import { AppLayout } from './components/layout'; // Import AppLayout
import ReportPage from './pages/ReportPage'; // Assuming ReportPage is in pages directory

// A simple LandingPage component to be used within AppLayout
const LandingPage: React.FC<{
  user: User | null;
  onUrlSubmit: (url: string) => Promise<void>;
  isSubmitting: boolean;
  loadingAuth: boolean; // Pass loadingAuth
}> = ({ user, onUrlSubmit, isSubmitting, loadingAuth }) => {
  return (
    <div className="flex flex-col items-center justify-start pt-8 sm:pt-12 lg:pt-16">
      <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-center text-slate-800">
        AI QA Engineer Assistant
      </h1>
      {user && (
        <p className="text-sm text-slate-500 mb-10 sm:mb-12">User ID: {user.uid} (Anonymous)</p>
      )}
      <UrlInputForm onSubmitUrl={onUrlSubmit} isSubmitting={isSubmitting} loadingAuth={loadingAuth} />
    </div>
  );
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        try {
          const userCredential = await signInAnonymously(auth);
          setUser(userCredential.user);
          console.log('Signed in anonymously:', userCredential.user.uid);
        } catch (error) {
          console.error("Error signing in anonymously:", error);
        }
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUrlSubmit = async (url: string) => {
    if (!user) {
      console.error("User not authenticated yet.");
      alert("Authentication error. Please refresh the page.");
      return;
    }
    console.log('Submitting URL:', url, 'by user:', user.uid);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorData?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (data.reportId) {
        navigate(`/report/${data.reportId}`);
      } else {
        console.error("API response successful but missing reportId");
        alert("Failed to get report ID from server. Please try again.");
      }
    } catch (error) {
      console.error("Error calling scan API:", error);
      alert(`Failed to start analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingAuth && location.pathname === '/') { // Only show full-page auth loader on landing
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-sans antialiased">
        <p className="text-xl text-slate-500">Authenticating...</p>
      </div>
    );
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<LandingPage user={user} onUrlSubmit={handleUrlSubmit} isSubmitting={isSubmitting} loadingAuth={loadingAuth} />} />
        <Route path="/report/:reportId" element={<ReportPage />} />
        {/* Add other routes here */}
      </Routes>
    </AppLayout>
  );
}

export default App;
