import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebaseConfig'; // Import RTDB instance
import { ref, onValue, off } from "firebase/database"; // Import RTDB functions

// Define an interface for the report data structure
interface ReportData {
  url: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  createdAt: number; // Timestamp
  // Optional fields that will be added later
  screenshotUrl?: string;
  lighthouseScores?: Record<string, number>;
  performanceMetrics?: Record<string, number>;
  accessibilityIssues?: Array<Record<string, string>>;
  errorMessage?: string;
  completedAt?: number;
}

const ReportPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) {
      setError("Report ID is missing from URL.");
      setLoading(false);
      return;
    }

    // Reference to the specific report node in RTDB
    const reportRef = ref(db, `reports/${reportId}`);

    // Set up the listener
    const unsubscribe = onValue(reportRef, (snapshot) => {
      const data = snapshot.val();
      if (snapshot.exists()) {
        setReportData(data as ReportData);
        setError(null);
        console.log("Report data received:", data);
      } else {
        setError(`Report not found for ID: ${reportId}`);
        setReportData(null);
        console.log(`No data found for report ID: ${reportId}`);
      }
      setLoading(false);
    }, (dbError) => {
      // Handle potential errors fetching data
      console.error("Error fetching report data:", dbError);
      setError("Failed to fetch report data.");
      setLoading(false);
    });

    // Cleanup function: Detach the listener when the component unmounts
    // or when reportId changes (though it shouldn't change in this component)
    return () => {
      off(reportRef, 'value', unsubscribe);
      console.log("Detached RTDB listener for report:", reportId);
    };

  }, [reportId]); // Re-run effect if reportId changes

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 font-sans antialiased">
        <p className="text-xl text-slate-500">Loading Report...</p>
      </div>
    );
  }

  if (error) {
      return (
        <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8 pt-12 sm:pt-16 lg:pt-20 bg-slate-50 font-sans antialiased">
          <h1 className="text-2xl sm:text-3xl font-bold text-red-600 mb-4 text-center">Error</h1>
          <p className="text-red-700">{error}</p>
          {reportId && <p className="mt-2 text-sm text-slate-500">Report ID: <span className="font-mono bg-slate-200 px-1 rounded">{reportId}</span></p>}
        </div>
      );
  }

  if (!reportData) {
    // This case might be covered by the error state if not found, but good to have
     return (
        <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8 pt-12 sm:pt-16 lg:pt-20 bg-slate-50 font-sans antialiased">
          <p className="text-xl text-slate-500">Report data unavailable.</p>
          {reportId && <p className="mt-2 text-sm text-slate-500">Report ID: <span className="font-mono bg-slate-200 px-1 rounded">{reportId}</span></p>}
        </div>
      );
  }

  // --- Display Report Data ---
  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8 pt-12 sm:pt-16 lg:pt-20 bg-slate-50 font-sans antialiased">
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-4 text-center">
        QA Report
      </h1>
      <p className="text-slate-600 mb-2">Report ID: <span className="font-mono bg-slate-200 px-1 rounded">{reportId}</span></p>
      <p className="text-slate-500 mb-6">Scanning: <a href={reportData.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{reportData.url}</a></p>

      {/* Main Report Card */}
      <div className="w-full max-w-4xl bg-white p-6 rounded-lg shadow-md space-y-6">

        {/* Scan Status Section */}
        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-2">Scan Status</h2>
          <p className="capitalize font-medium
            ${reportData.status === 'pending' ? 'text-amber-600' :
              reportData.status === 'processing' ? 'text-blue-600' :
              reportData.status === 'complete' ? 'text-green-600' :
              reportData.status === 'error' ? 'text-red-600' : 'text-slate-500'}"
          >
            {reportData.status}
            {(reportData.status === 'pending' || reportData.status === 'processing') &&
             <svg className="animate-spin inline-block ml-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            }
          </p>
          {reportData.status === 'error' && reportData.errorMessage && (
              <p className="mt-2 text-sm text-red-700">Error Details: {reportData.errorMessage}</p>
          )}
          <p className="text-xs text-slate-400 mt-2">Created: {new Date(reportData.createdAt).toLocaleString()}</p>
        </div>

        {/* Divider */}
        <hr className="border-slate-200" />

        {/* Placeholder: Screenshot Section */}
        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-3">Screenshot</h2>
          <div className="p-4 border border-dashed border-slate-300 rounded-md bg-slate-50 text-center text-slate-500">
            {/* Conditionally show image later based on reportData.screenshotUrl */}
            Screenshot will appear here when scan is complete.
          </div>
        </div>

        {/* Divider */}
        <hr className="border-slate-200" />

        {/* Placeholder: Performance Section */}
        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-3">Performance</h2>
          <div className="p-4 border border-dashed border-slate-300 rounded-md bg-slate-50 text-center text-slate-500">
            {/* Display Lighthouse scores later */}
            Performance scores (Lighthouse) will appear here when scan is complete.
          </div>
        </div>

        {/* Divider */}
        <hr className="border-slate-200" />

        {/* Placeholder: Accessibility Section */}
        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-3">Accessibility</h2>
          <div className="p-4 border border-dashed border-slate-300 rounded-md bg-slate-50 text-center text-slate-500">
            {/* Display accessibility issues later */}
            Accessibility issues (Lighthouse) will appear here when scan is complete.
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReportPage;
