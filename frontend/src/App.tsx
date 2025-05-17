import React, { useState, useEffect, ReactNode } from 'react';
import { useNavigate, Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import { User } from 'firebase/auth'; // Import User type
import { onAuthStateChanged, getCurrentUser, signOut as firebaseSignOut } from './authService'; // Use our authService
import UrlInputForm from './components/UrlInputForm';
import { AppLayout } from './components/layout';
import ReportPage from './pages/ReportPage';
import SignInPage from './pages/SignInPage'; // Import SignInPage
import HandleSignInPage from './pages/HandleSignInPage'; // Import HandleSignInPage

const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL || 'test@test.com'; // Fallback for safety

// ProtectedRoute component
interface ProtectedRouteProps {
  user: User | null;
  loadingAuth: boolean;
  children?: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user, loadingAuth, children }) => {
  const location = useLocation();

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-sans antialiased">
        <p className="text-xl text-slate-500">Loading authentication...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (user.email !== ALLOWED_EMAIL) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-100 font-sans">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-slate-700 mb-2">Your email (<span className="font-medium">{user.email}</span>) is not authorized to access this application.</p>
        <p className="text-slate-600 text-sm mb-6">Only the administrator (<span className="font-medium">{ALLOWED_EMAIL}</span>) can access this page.</p>
        <button
          onClick={async () => {
            await firebaseSignOut();
            // navigate to /signin is handled by onAuthStateChanged listener reloading ProtectedRoute
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Sign Out & Try Again
        </button>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

const LandingPage: React.FC<{
  onUrlSubmit: (url: string) => Promise<void>;
  isSubmitting: boolean;
  loadingAuth: boolean;
}> = ({ onUrlSubmit, isSubmitting, loadingAuth }) => {
  return (
    <div className="flex flex-col items-center justify-start pt-8 sm:pt-12 lg:pt-16">
      <h1 className="text-3xl sm:text-4xl font-bold mb-3 text-center text-slate-800">
        AI QA Engineer Assistant
      </h1>
      {/* User info can be displayed in AppLayout header later if needed */}
      <UrlInputForm onSubmitUrl={onUrlSubmit} isSubmitting={isSubmitting} loadingAuth={loadingAuth} />
    </div>
  );
};

function App() {
  const [user, setUser] = useState<User | null>(getCurrentUser()); // Initialize with current user
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      if (currentUser && currentUser.email !== ALLOWED_EMAIL) {
        // If user is logged in but not allowed, they will be caught by ProtectedRoute
        // or HandleSignInPage logic.
      } else if (!currentUser) {
        // If no user, and not on a public page, ProtectedRoute will redirect
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUrlSubmit = async (url: string) => {
    if (!user || user.email !== ALLOWED_EMAIL) { // Check for allowed user here as well for core action
      alert("You are not authorized to perform this action. Please sign in with the correct account.");
      if (!user) navigate('/signin');
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

  // No full-page auth loader here anymore, ProtectedRoute handles its own loading state.

  return (
    <AppLayout user={user} loadingAuth={loadingAuth} allowedEmail={ALLOWED_EMAIL}>
      <Routes>
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/handle-signin" element={<HandleSignInPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute user={user} loadingAuth={loadingAuth} />}>
          <Route
            path="/"
            element={
              <LandingPage
                onUrlSubmit={handleUrlSubmit}
                isSubmitting={isSubmitting}
                loadingAuth={loadingAuth}
              />
            }
          />
          <Route path="/report/:reportId" element={<ReportPage />} />
        </Route>

        {/* Catch-all for undefined routes, could redirect to home or a 404 page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default App;
