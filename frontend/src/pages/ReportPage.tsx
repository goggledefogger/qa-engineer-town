import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebaseConfig'; // Import RTDB instance
import { ref, onValue, off } from "firebase/database"; // Import RTDB functions
import { ReportPageLayout } from '../components/layout';
import { SidebarNav } from '../components/navigation';
import { Card } from '../components/ui'; // Assuming Card component is in ui

// Define an interface for Lighthouse report data
interface LighthouseReportData {
  success: boolean;
  error?: string;
  scores?: {
    performance?: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
    pwa?: number;
  };
}

// Define an interface for the report data structure
interface ReportData {
  url: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  createdAt: number; // Timestamp
  playwrightReport?: {
    success?: boolean;
    pageTitle?: string;
    screenshotUrl?: string;
    error?: string;
  };
  lighthouseReport?: LighthouseReportData;
  aiUxDesignSuggestions?: Array<{ type: string; suggestion: string; area?: any }>; // TODO: Refine this type
  errorMessage?: string;
  completedAt?: number;
}

const ReportPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('summary'); // Default to summary

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

  const renderSectionContent = () => {
    if (!reportData) return <Card title="No Data"><p className="text-slate-600">Report details are unavailable.</p></Card>;

    // Helper for consistent label-value pairs
    const DetailItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
      <p className="text-sm text-slate-700">
        <span className="font-semibold text-slate-800">{label}:</span> {children}
      </p>
    );

    switch (activeSection) {
      case 'summary':
        return (
          <Card title="Scan Summary" className="font-sans">
            <div className="space-y-2">
              <DetailItem label="Status">
                <span className={`capitalize font-medium
                  ${reportData.status === 'pending' ? 'text-amber-600' :
                    reportData.status === 'processing' ? 'text-blue-600' :
                    reportData.status === 'complete' ? 'text-green-600' :
                    reportData.status === 'error' ? 'text-red-600' : 'text-slate-600'}
                `}>{reportData.status}</span>
              </DetailItem>
              <DetailItem label="URL">
                <a href={reportData.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{reportData.url}</a>
              </DetailItem>
              <DetailItem label="Created">{new Date(reportData.createdAt).toLocaleString()}</DetailItem>
              {reportData.completedAt && <DetailItem label="Completed">{new Date(reportData.completedAt).toLocaleString()}</DetailItem>}
              {reportData.errorMessage && <DetailItem label="Error"><span className="text-red-600">{reportData.errorMessage}</span></DetailItem>}
            </div>
          </Card>
        );
      case 'screenshot':
        return (
          <Card title="Screenshot" className="font-sans">
            {reportData.playwrightReport?.screenshotUrl ? (
              <div className="flex flex-col items-center">
                <img
                  src={reportData.playwrightReport.screenshotUrl}
                  alt="Website Screenshot"
                  className="max-w-full max-h-[70vh] rounded shadow-md border border-slate-300 object-contain bg-slate-50"
                />
                <a href={reportData.playwrightReport.screenshotUrl} target="_blank" rel="noopener noreferrer" className="mt-3 text-sm text-blue-600 hover:underline">Open full size</a>
              </div>
            ) : (
              <p className="text-slate-600">Screenshot will appear here when scan is complete.</p>
            )}
          </Card>
        );
      case 'performance':
        return (
          <Card title="Performance (Lighthouse)" className="font-sans">
            {reportData.lighthouseReport?.scores ? (
              <div className="space-y-1.5">
                <DetailItem label="Performance">{reportData.lighthouseReport.scores.performance ?? 'N/A'}</DetailItem>
                <DetailItem label="Accessibility">{reportData.lighthouseReport.scores.accessibility ?? 'N/A'}</DetailItem>
                <DetailItem label="Best Practices">{reportData.lighthouseReport.scores.bestPractices ?? 'N/A'}</DetailItem>
                <DetailItem label="SEO">{reportData.lighthouseReport.scores.seo ?? 'N/A'}</DetailItem>
                {reportData.lighthouseReport.scores.pwa !== undefined && (
                  <DetailItem label="PWA">{reportData.lighthouseReport.scores.pwa}</DetailItem>
                )}
              </div>
            ) : (
              <p className="text-slate-600">Performance scores will appear here when scan is complete.</p>
            )}
            {reportData.lighthouseReport?.error && <p className="text-red-600 mt-2 text-sm">Error: {reportData.lighthouseReport.error}</p>}
          </Card>
        );
        // TODO: Add cases for 'accessibility', 'seo', 'best-practices', 'ai-ux-design'
      default:
        return <Card title="Section Not Found" className="font-sans"><p className="text-slate-600">Content for {activeSection} is not available yet.</p></Card>;
    }
  };

  // --- Render Logic ---

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 h-full">
        <p className="text-xl text-slate-500 font-sans">Loading Report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 h-full text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-3 font-sans">Error</h1>
        <p className="text-red-700 mb-3 font-sans">{error}</p>
        {reportId && <p className="text-sm text-slate-500 font-sans">Report ID: <span className="font-mono bg-slate-200 px-1 rounded">{reportId}</span></p>}
      </div>
    );
  }

  if (!reportData && !loading) { // Ensure we only show this if not loading and no data
     return (
        <div className="flex flex-col items-center justify-center p-4 h-full text-center">
          <p className="text-xl text-slate-500 mb-3 font-sans">Report data unavailable.</p>
          {reportId && <p className="text-sm text-slate-500 font-sans">Report ID: <span className="font-mono bg-slate-200 px-1 rounded">{reportId}</span></p>}
        </div>
      );
  }

  // --- Display Report Data ---
  return (
    <ReportPageLayout
      sidebarContent={<SidebarNav activeSection={activeSection} onSelectSection={setActiveSection} />}
      mainContent={
        <div className="space-y-6 font-sans"> {/* Apply font-sans to the main content wrapper */}
          <div className="bg-white shadow rounded-lg p-4 md:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1 leading-tight">
              QA Report:
              {reportData?.url ?
                <a href={reportData.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:text-blue-800 hover:underline break-all">
                  {reportData.url}
                </a> :
                'Loading URL...'
              }
            </h1>
            <p className="text-xs text-slate-500">Report ID: <span className="font-mono bg-slate-200 px-1 py-0.5 rounded">{reportId}</span></p>
          </div>
          {renderSectionContent()}
          {/* Example of how other sections might be structured as Cards */}
          {/* <Card title="Accessibility Details">...</Card> */}
          {/* <Card title="SEO Insights">...</Card> */}
        </div>
      }
    />
  );
};

export default ReportPage;
