import React, { useState, useEffect, ReactNode } from 'react';
import { useNavigate, Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import { User } from 'firebase/auth'; // Import User type
import { onAuthStateChanged, getCurrentUser, signOut as firebaseSignOut, isUserAdmin } from './authService'; // Use our authService
import UrlInputForm from './components/UrlInputForm';
import { AppLayout } from './components/layout';
import ReportPage from './pages/ReportPage';
import SignInPage from './pages/SignInPage'; // Import SignInPage
import HandleSignInPage from './pages/HandleSignInPage'; // Import HandleSignInPage
import type { AiProvider } from './config/aiProviders';

// const ALLOWED_EMAIL = import.meta.env.VITE_ALLOWED_EMAIL || 'test@test.com'; // No longer used

// ProtectedRoute component
interface ProtectedRouteProps {
  user: User | null;
  loadingAuth: boolean;
  isAdmin: boolean | null; // null if not yet determined, true/false once checked
  loadingAdminCheck: boolean;
  children?: ReactNode;
}

type ScanApiResponse = {
  reportId?: unknown;
  analysisId?: unknown;
  id?: unknown;
  [key: string]: unknown;
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ user, loadingAuth, isAdmin, loadingAdminCheck, children }) => {
  const location = useLocation();

  if (loadingAuth || loadingAdminCheck) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-sans antialiased">
        <p className="text-xl text-slate-500">Loading authentication status...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (isAdmin === false) { // Explicitly check for false, as null means still loading or error
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-100 font-sans">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-slate-700 mb-2">Your account (<span className="font-medium">{user.email}</span>) is not authorized to access this application.</p>
        <p className="text-slate-600 text-sm mb-6">Only designated administrators can access this application.</p>
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

interface LandingPageProps {
  onUrlSubmit: (url: string, aiConfig: { provider: AiProvider; model: string }) => Promise<void>;
  isSubmitting: boolean;
  loadingAuth: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({ onUrlSubmit, isSubmitting, loadingAuth }) => {
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
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loadingAdminCheck, setLoadingAdminCheck] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      if (currentUser) {
        setLoadingAdminCheck(true);
        const adminStatus = await isUserAdmin(currentUser.uid);
        setIsAdmin(adminStatus);
        setLoadingAdminCheck(false);
      } else {
        setIsAdmin(null); // No user, so not an admin
        setLoadingAdminCheck(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUrlSubmit = async (url: string, aiConfig: { provider: AiProvider; model: string }) => {
    if (!user || !isAdmin) { // Check isAdmin flag
      alert("You are not authorized to perform this action. Please sign in with an admin account.");
      if (!user) navigate('/signin');
      return;
    }

    setIsSubmitting(true);
    let idToken = '';
    try {
      if (user) {
        idToken = await user.getIdToken();
        console.log("[FRONTEND_DEBUG] ID Token to be sent:", idToken ? idToken.substring(0, 30) + '...' : 'EMPTY_OR_NULL_TOKEN');
      } else {
        throw new Error("User object is null, cannot get ID token.");
      }
    } catch (tokenError) {
      console.error("Error getting ID token:", tokenError);
      alert("Authentication error: Could not retrieve ID token. Please try signing out and in again.");
      setIsSubmitting(false);
      return;
    }

    if (!idToken) {
       console.error("[FRONTEND_DEBUG] ID Token is empty after trying to fetch it. Aborting API call.");
       alert("Authentication error: Failed to obtain a valid ID token. Please try again.");
       setIsSubmitting(false);
       return;
    }

    console.log('Submitting URL:', url, 'by user:', user.uid);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          url,
          aiProvider: aiConfig.provider,
          aiModel: aiConfig.model,
        }),
      });

      if (!response.ok) {
        // Try to parse error response, but handle cases where it might not be JSON
        let errorText = `API Error: ${response.status} ${response.statusText}`;
        try {
           const errorData = await response.json();
           errorText += ` - ${errorData?.message || 'Unknown error'}`;
        } catch (parseError) {
           // If parsing errorData as JSON fails, use the raw response text if available
           const rawText = await response.text().catch(() => ''); // Prevent further errors
           if (rawText) errorText += ` - ${rawText}`;
        }
        throw new Error(errorText);
      }

      const data: ScanApiResponse = await response.json();
      console.log('API Response:', data);

      const reportIdFromResponse =
        typeof data.reportId === 'string' && data.reportId.trim().length > 0
          ? data.reportId.trim()
          : typeof data.analysisId === 'string' && data.analysisId.trim().length > 0
            ? data.analysisId.trim()
            : typeof data.id === 'string' && data.id.trim().length > 0
              ? data.id.trim()
              : null;

      if (reportIdFromResponse) {
        console.log('[FRONTEND_DEBUG] Navigating with report identifier:', reportIdFromResponse);
        navigate(`/report/${reportIdFromResponse}`);
      } else {
        console.error("API response successful but missing a recognizable report identifier", { data });
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
    <AppLayout user={user} loadingAuth={loadingAuth} isAdmin={isAdmin} loadingAdminCheck={loadingAdminCheck}>
      <Routes>
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/handle-signin" element={<HandleSignInPage />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute user={user} loadingAuth={loadingAuth} isAdmin={isAdmin} loadingAdminCheck={loadingAdminCheck} />}>
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
