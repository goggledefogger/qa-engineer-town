import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth'; // Import User type
import { signOut } from '../../authService'; // Import signOut

interface AppLayoutProps {
  children: React.ReactNode;
  user: User | null;
  loadingAuth: boolean;
  isAdmin: boolean | null;
  loadingAdminCheck: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, user, loadingAuth, isAdmin, loadingAdminCheck }) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      // The onAuthStateChanged listener in App.tsx will handle redirecting to /signin
      // or App.tsx will re-render and ProtectedRoute will kick in.
      navigate('/signin'); // Optionally navigate immediately
    } catch (error) {
      console.error("Error signing out in layout:", error);
      // Handle error display if necessary
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-3 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link to="/" className="text-xl sm:text-2xl font-bold text-slate-900 hover:text-slate-700">
            AI QA Engineer
          </Link>
          <div className="flex items-center space-x-3">
            {!loadingAuth && !loadingAdminCheck && user && isAdmin && (
              <span className="text-sm text-slate-600 hidden sm:inline">Welcome, Admin ({user.email})</span>
            )}
            {!loadingAuth && !loadingAdminCheck && user && !isAdmin && (
              <span className="text-sm text-slate-600 hidden sm:inline">{user.email}</span>
            )}
            {(loadingAuth || loadingAdminCheck) && (
                <span className="text-sm text-slate-500">Loading user...</span>
            )}
            {!loadingAuth && user && (
              <button
                onClick={handleSignOut}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign Out
              </button>
            )}
            {!loadingAuth && !user && (
              <Link
                to="/signin"
                className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-grow w-full pt-1 pb-0 px-4 sm:px-6 lg:px-8 xl:px-2 2xl:px-0">
        {children}
      </main>
      {/* <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} AI QA Engineer Assistant
        </div>
      </footer> */}
    </div>
  );
};

export default AppLayout;
