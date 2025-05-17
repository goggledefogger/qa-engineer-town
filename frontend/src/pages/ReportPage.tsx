import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown'; // Import ReactMarkdown
import remarkGfm from 'remark-gfm'; // Import remark-gfm
import { db } from '../firebaseConfig'; // Import RTDB instance
import { ref, onValue, off } from "firebase/database"; // Import RTDB functions
import { ReportPageLayout } from '../components/layout';
import SidebarNav, { type SectionStatus, type SectionStatuses } from '../components/navigation/SidebarNav';
import { Card, ScanProgressIndicator } from '../components/ui'; // Assuming Card component is in ui

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
  accessibilityIssues?: Array<{
    id: string;
    title: string;
    description: string;
    score: number | null;
  }>;
  detailedMetrics?: {
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
    totalBlockingTime?: number;
    cumulativeLayoutShift?: number;
    speedIndex?: number;
  };
  performanceOpportunities?: Array<{
    id: string;
    title: string;
    description: string;
    overallSavingsMs?: number;
    overallSavingsBytes?: number;
  }>;
  seoAudits?: Array<{
    id: string;
    title: string;
    description: string;
    score: number | null;
  }>;
  bestPracticesAudits?: Array<{
    id: string;
    title: string;
    description: string;
    score: number | null;
  }>;
}

// Define an interface for the LLM Report Summary data structure
interface LLMReportSummary {
  status: "pending" | "processing" | "completed" | "error" | "skipped";
  summaryText?: string;
  error?: string;
  modelUsed?: string;
}

// Define an interface for Screenshot URLs (matching backend)
interface ScreenshotUrls {
  desktop?: string;
  tablet?: string;
  mobile?: string;
}

// Define an interface for Playwright report data (matching backend)
interface PlaywrightReport {
  success?: boolean;
  pageTitle?: string;
  screenshotUrls?: ScreenshotUrls; // Updated from screenshotUrl
  error?: string;
}

// Define ScreenContextType matching backend
export type ScreenContextType = 'desktop' | 'tablet' | 'mobile' | 'general';

// Define AiUxDesignSuggestionItem matching backend
export interface AiUxDesignSuggestionItem {
  suggestion: string;
  reasoning: string;
  screenContext?: ScreenContextType;
}

// Define an interface for the report data structure
interface ReportData {
  url: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  createdAt: number; // Timestamp
  playwrightReport?: PlaywrightReport; // Use the updated PlaywrightReport interface
  lighthouseReport?: LighthouseReportData;
  aiUxDesignSuggestions?: { // Updated structure
    status: "completed" | "error" | "pending" | "skipped";
    suggestions?: AiUxDesignSuggestionItem[]; // Use the new item type
    modelUsed?: string;
    error?: string;
  };
  llmReportSummary?: LLMReportSummary; // Add the new field here
  errorMessage?: string;
  completedAt?: number;
}

const ReportPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('summary');

  const sectionStatuses = React.useMemo<SectionStatuses>(() => {
    const statuses: SectionStatuses = {};
    if (!reportData) {
      // If no reportData, all sections that would eventually have data are effectively PENDING or LOADING
      // For simplicity, let's mark them based on the global loading state, or PENDING if loading is false but still no data.
      const defaultStatus = loading ? 'LOADING' : 'PENDING';
      ['summary', 'llm-summary', 'screenshot', 'performance', 'accessibility', 'seo', 'best-practices', 'ai-ux-design'].forEach(id => {
        statuses[id] = defaultStatus;
      });
      return statuses;
    }

    // Overall report status
    const isProcessing = reportData.status === 'processing' || reportData.status === 'pending';

    // Summary status
    statuses['summary'] = 'COMPLETED'; // Always completed if reportData exists

    // LLM Summary status
    if (reportData.llmReportSummary) {
      switch (reportData.llmReportSummary.status) {
        case 'completed': statuses['llm-summary'] = 'COMPLETED'; break;
        case 'error': statuses['llm-summary'] = 'ERROR'; break;
        case 'skipped': statuses['llm-summary'] = 'SKIPPED'; break;
        case 'pending':
        case 'processing':
        default: statuses['llm-summary'] = 'LOADING'; break;
      }
    } else { // No llmReportSummary object yet
      statuses['llm-summary'] = isProcessing ? 'LOADING' : 'PENDING';
    }

    // Screenshot status
    if (reportData.playwrightReport) {
      if (reportData.playwrightReport.screenshotUrls && Object.values(reportData.playwrightReport.screenshotUrls).some(url => typeof url === 'string' && url.length > 0)) {
        statuses['screenshot'] = 'COMPLETED';
      } else if (reportData.playwrightReport.error) {
        statuses['screenshot'] = 'ERROR';
      } else {
        statuses['screenshot'] = isProcessing ? 'LOADING' : 'PENDING';
      }
    } else {
      statuses['screenshot'] = isProcessing ? 'LOADING' : 'PENDING';
    }

    // Lighthouse sections status (Performance, Accessibility, SEO, Best Practices)
    const lighthouseSections: Array<{id: string, scoreKey?: keyof NonNullable<LighthouseReportData['scores']>}> = [
      { id: 'performance', scoreKey: 'performance' },
      { id: 'accessibility', scoreKey: 'accessibility' },
      { id: 'seo', scoreKey: 'seo' },
      { id: 'best-practices', scoreKey: 'bestPractices' },
    ];

    lighthouseSections.forEach(section => {
      if (reportData.lighthouseReport) {
        if (reportData.lighthouseReport.error) {
          statuses[section.id] = 'ERROR';
        } else if (reportData.lighthouseReport.success === false && !section.scoreKey) { // Generic failure not tied to a score
          statuses[section.id] = 'ERROR';
        } else if (section.scoreKey && reportData.lighthouseReport.scores && reportData.lighthouseReport.scores[section.scoreKey] !== undefined) {
          statuses[section.id] = 'COMPLETED';
        } else if (reportData.lighthouseReport.success === false) { // If success is explicitly false, but we didn't hit other error conditions for this specific section
            statuses[section.id] = 'ERROR';
        } else {
          statuses[section.id] = isProcessing ? 'LOADING' : 'PENDING';
        }
      } else { // No lighthouseReport object yet
        statuses[section.id] = isProcessing ? 'LOADING' : 'PENDING';
      }
    });

    // AI UX Design suggestions status
    if (reportData.aiUxDesignSuggestions) {
      switch (reportData.aiUxDesignSuggestions.status) {
        case 'completed': statuses['ai-ux-design'] = 'COMPLETED'; break;
        case 'error': statuses['ai-ux-design'] = 'ERROR'; break;
        case 'skipped': statuses['ai-ux-design'] = 'SKIPPED'; break;
        case 'pending':
        default: statuses['ai-ux-design'] = 'LOADING'; break;
      }
    } else { // No aiUxDesignSuggestions object yet
      statuses['ai-ux-design'] = isProcessing ? 'LOADING' : 'PENDING';
    }

    return statuses;
  }, [reportData, loading]);

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
      } else {
        setError(`Report not found for ID: ${reportId}`);
        setReportData(null);
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
          <Card title="Screenshots" className="font-sans">
            {reportData.playwrightReport?.screenshotUrls && Object.values(reportData.playwrightReport.screenshotUrls).some(url => !!url) ? (
              <div className="space-y-8">
                {(Object.entries(reportData.playwrightReport.screenshotUrls) as Array<[keyof ScreenshotUrls, string]>)
                  .filter(([, url]) => !!url)
                  .map(([device, url]) => (
                  <div key={device} className="flex flex-col items-center">
                    <h4 className="text-xl font-semibold mb-3 capitalize text-slate-700">{device} View</h4>
                    <img
                      src={url}
                      alt={`Website Screenshot on ${device}`}
                      className="max-w-full max-h-[70vh] rounded shadow-lg border border-slate-300 object-contain bg-slate-100 p-1"
                    />
                    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4 text-sm text-blue-600 hover:underline">Open full size {device} screenshot</a>
                  </div>
                ))}
              </div>
            ) : reportData.playwrightReport?.error ? (
              <p className="text-red-600">Error capturing screenshots: {reportData.playwrightReport.error}</p>
            ) : (
              <p className="text-slate-600">Screenshots will appear here when scan is complete.</p>
            )}
            {reportData.playwrightReport && !(reportData.playwrightReport.screenshotUrls && Object.values(reportData.playwrightReport.screenshotUrls).some(url => !!url)) && !reportData.playwrightReport.error && (
              <p className="text-xs text-orange-500 mt-2">
                Debug: Playwright report exists, but no valid screenshot URLs found. Status: {reportData.status}
              </p>
            )}
          </Card>
        );
      case 'performance':
        return (
          <Card title="Performance (Lighthouse)" className="font-sans">
            {/* Overall Score */}
            {reportData.lighthouseReport?.scores?.performance !== undefined && (
              <p className="text-lg text-slate-700 mb-4">
                Overall Performance Score: <span className="font-bold">{reportData.lighthouseReport.scores.performance}</span>/100
              </p>
            )}

            {/* Detailed Metrics */}
            {reportData.lighthouseReport?.detailedMetrics && Object.keys(reportData.lighthouseReport.detailedMetrics).length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-md text-slate-800 mb-2">Key Metrics:</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                  {reportData.lighthouseReport.detailedMetrics.firstContentfulPaint !== undefined && (
                    <DetailItem label="First Contentful Paint">{reportData.lighthouseReport.detailedMetrics.firstContentfulPaint.toLocaleString()} ms</DetailItem>
                  )}
                  {reportData.lighthouseReport.detailedMetrics.largestContentfulPaint !== undefined && (
                    <DetailItem label="Largest Contentful Paint">{reportData.lighthouseReport.detailedMetrics.largestContentfulPaint.toLocaleString()} ms</DetailItem>
                  )}
                  {reportData.lighthouseReport.detailedMetrics.totalBlockingTime !== undefined && (
                    <DetailItem label="Total Blocking Time">{reportData.lighthouseReport.detailedMetrics.totalBlockingTime.toLocaleString()} ms</DetailItem>
                  )}
                  {reportData.lighthouseReport.detailedMetrics.cumulativeLayoutShift !== undefined && (
                    <DetailItem label="Cumulative Layout Shift">{reportData.lighthouseReport.detailedMetrics.cumulativeLayoutShift}</DetailItem>
                  )}
                  {reportData.lighthouseReport.detailedMetrics.speedIndex !== undefined && (
                    <DetailItem label="Speed Index">{reportData.lighthouseReport.detailedMetrics.speedIndex.toLocaleString()} ms</DetailItem>
                  )}
                </div>
              </div>
            )}

            {/* Performance Opportunities */}
            {reportData.lighthouseReport?.performanceOpportunities && reportData.lighthouseReport.performanceOpportunities.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-md text-slate-800 mb-2">Top Performance Opportunities:</h4>
                <ul className="space-y-3 list-none p-0">
                  {reportData.lighthouseReport.performanceOpportunities.map((opp) => (
                    <li key={opp.id} className="p-3 bg-slate-50 rounded-md shadow-sm border border-slate-200">
                      <h5 className="font-semibold text-slate-800 mb-0.5">{opp.title}</h5>
                      {opp.overallSavingsMs !== undefined && (
                        <p className="text-xs text-slate-500 mb-1">Est. savings: {opp.overallSavingsMs.toLocaleString()} ms</p>
                      )}
                      {opp.overallSavingsBytes !== undefined && (
                        <p className="text-xs text-slate-500 mb-1">Est. savings: {(opp.overallSavingsBytes / 1024).toFixed(1)} KiB</p>
                      )}
                      <div
                        className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-200 prose-code:px-1 prose-code:rounded"
                        dangerouslySetInnerHTML={{ __html: opp.description }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {( !reportData.lighthouseReport?.detailedMetrics || Object.keys(reportData.lighthouseReport.detailedMetrics).length === 0 ) &&
             ( !reportData.lighthouseReport?.performanceOpportunities || reportData.lighthouseReport.performanceOpportunities.length === 0 ) &&
             !reportData.lighthouseReport?.scores?.performance &&
             !reportData.lighthouseReport?.error &&
             (reportData.status === 'processing' || reportData.status === 'pending') && (
              <p className="text-slate-600">Performance details will appear here when scan is complete.</p>
            )}
            {reportData.lighthouseReport?.error && <p className="text-red-600 mt-2 text-sm">Lighthouse Performance check error: {reportData.lighthouseReport.error}</p>}
          </Card>
        );
      case 'accessibility':
        return (
          <Card title="Accessibility Issues (Lighthouse)" className="font-sans">
            {reportData.lighthouseReport?.accessibilityIssues && reportData.lighthouseReport.accessibilityIssues.length > 0 ? (
              <ul className="space-y-3 list-none p-0">
                {reportData.lighthouseReport.accessibilityIssues.map((issue) => (
                  <li key={issue.id} className="p-3 bg-slate-50 rounded-md shadow-sm border border-slate-200">
                    <h4 className="font-semibold text-md text-slate-800 mb-0.5">{issue.title}</h4>
                    <p className="text-xs text-slate-500 mb-1.5 font-mono">ID: {issue.id} | Score: {issue.score === null ? 'N/A' : issue.score}</p>
                    <div
                        className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-200 prose-code:px-1 prose-code:rounded"
                        dangerouslySetInnerHTML={{ __html: issue.description }}
                    />
                    {/* We could add a link to more info if 'helpUrl' was available and populated */}
                  </li>
                ))}
              </ul>
            ) : reportData.lighthouseReport?.success === false && reportData.lighthouseReport?.error ? (
              <p className="text-slate-600">Accessibility check could not be completed due to an error: {reportData.lighthouseReport.error}</p>
            ) : reportData.status === 'processing' || reportData.status === 'pending' ? (
              <p className="text-slate-600">Accessibility issues will appear here when the scan is complete.</p>
            ) : (
              <p className="text-slate-600">No specific accessibility issues flagged by Lighthouse, or the check did not run. Ensure the overall accessibility score is reviewed.</p>
            )}
            {/* Display overall accessibility score if available and not already part of the items */}
            {reportData.lighthouseReport?.scores?.accessibility !== undefined && (
                <p className="mt-4 text-sm text-slate-700">
                    Overall Accessibility Score: <span className="font-bold">{reportData.lighthouseReport.scores.accessibility}</span>/100
                </p>
            )}
          </Card>
        );
      case 'seo':
        return (
          <Card title="SEO Audits (Lighthouse)" className="font-sans">
            {reportData.lighthouseReport?.scores?.seo !== undefined && (
              <p className="text-lg text-slate-700 mb-4">
                Overall SEO Score: <span className="font-bold">{reportData.lighthouseReport.scores.seo}</span>/100
              </p>
            )}
            {reportData.lighthouseReport?.seoAudits && reportData.lighthouseReport.seoAudits.length > 0 ? (
              <ul className="space-y-3 list-none p-0">
                {reportData.lighthouseReport.seoAudits.map((audit) => (
                  <li key={audit.id} className="p-3 bg-slate-50 rounded-md shadow-sm border border-slate-200">
                    <h4 className="font-semibold text-md text-slate-800 mb-0.5">{audit.title}</h4>
                    <p className="text-xs text-slate-500 mb-1.5 font-mono">ID: {audit.id} | Score: {audit.score === null ? 'N/A' : audit.score}</p>
                    <div
                        className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-200 prose-code:px-1 prose-code:rounded"
                        dangerouslySetInnerHTML={{ __html: audit.description }}
                    />
                  </li>
                ))}
              </ul>
            ) : reportData.status === 'processing' || reportData.status === 'pending' ? (
              <p className="text-slate-600">SEO audit details will appear here when scan is complete.</p>
            ) : (
              <p className="text-slate-600">No specific SEO issues flagged by Lighthouse, or the check did not run. Review overall SEO score.</p>
            )}
            {reportData.lighthouseReport?.error && !reportData.lighthouseReport.seoAudits && (
                <p className="text-red-600 mt-2 text-sm">Lighthouse SEO check error: {reportData.lighthouseReport.error}</p>
            )}
          </Card>
        );
      case 'best-practices':
        return (
          <Card title="Best Practices Audits (Lighthouse)" className="font-sans">
            {reportData.lighthouseReport?.scores?.bestPractices !== undefined && (
              <p className="text-lg text-slate-700 mb-4">
                Overall Best Practices Score: <span className="font-bold">{reportData.lighthouseReport.scores.bestPractices}</span>/100
              </p>
            )}
            {reportData.lighthouseReport?.bestPracticesAudits && reportData.lighthouseReport.bestPracticesAudits.length > 0 ? (
              <ul className="space-y-3 list-none p-0">
                {reportData.lighthouseReport.bestPracticesAudits.map((audit) => (
                  <li key={audit.id} className="p-3 bg-slate-50 rounded-md shadow-sm border border-slate-200">
                    <h4 className="font-semibold text-md text-slate-800 mb-0.5">{audit.title}</h4>
                    <p className="text-xs text-slate-500 mb-1.5 font-mono">ID: {audit.id} | Score: {audit.score === null ? 'N/A' : audit.score}</p>
                    <div
                        className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-200 prose-code:px-1 prose-code:rounded"
                        dangerouslySetInnerHTML={{ __html: audit.description }}
                    />
                  </li>
                ))}
              </ul>
            ) : reportData.status === 'processing' || reportData.status === 'pending' ? (
              <p className="text-slate-600">Best Practices audit details will appear here when scan is complete.</p>
            ) : (
              <p className="text-slate-600">No specific Best Practices issues flagged by Lighthouse, or the check did not run. Review overall Best Practices score.</p>
            )}
            {reportData.lighthouseReport?.error && !reportData.lighthouseReport.bestPracticesAudits && (
                <p className="text-red-600 mt-2 text-sm">Lighthouse Best Practices check error: {reportData.lighthouseReport.error}</p>
            )}
          </Card>
        );
      case 'ai-ux-design':
        const aiSuggestions = reportData.aiUxDesignSuggestions;
        return (
          <Card title="AI UX & Design Insights" className="font-sans">
            {!aiSuggestions || aiSuggestions.status === 'pending' ? (
              <p className="text-slate-600">
                AI-powered UX & Design suggestions are being generated or will appear here once the analysis is complete.
              </p>
            ) : aiSuggestions.status === 'skipped' ? (
              <p className="text-slate-600">
                AI UX & Design analysis was skipped. {aiSuggestions.error ? `Reason: ${aiSuggestions.error}` : ''}
              </p>
            ) : aiSuggestions.status === 'error' ? (
              <p className="text-red-600">
                Error during AI UX & Design analysis: {aiSuggestions.error || 'An unspecified error occurred.'}
              </p>
            ) : aiSuggestions.status === 'completed' && aiSuggestions.suggestions && aiSuggestions.suggestions.length > 0 ? (
              <>
                {aiSuggestions.modelUsed && (
                  <p className="text-xs text-slate-500 mb-3">Insights generated by: {aiSuggestions.modelUsed}</p>
                )}
                <ul className="space-y-4 list-none p-0">
                  {aiSuggestions.suggestions.map((item, index) => (
                    <li key={index} className="p-4 bg-slate-50 rounded-md shadow-sm border border-slate-200">
                      {/* Display Screen Context */}
                      {item.screenContext && (
                        <p className="text-xs text-sky-700 font-medium mb-1 capitalize">
                          Context: {item.screenContext}
                        </p>
                      )}
                      <p className="text-sm text-slate-800 font-medium mb-1.5 leading-snug">{item.suggestion}</p>
                      {item.reasoning && (
                        <p className="text-xs text-slate-600 pl-1 border-l-2 border-slate-300 italic">
                          <span className="font-semibold not-italic">Reasoning:</span> {item.reasoning}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : aiSuggestions.status === 'completed' ? (
               <p className="text-slate-600">
                AI analysis completed, but no specific suggestions were provided.
              </p>
            ) : (
              <p className="text-slate-600">
                The status of AI UX & Design suggestions is unknown.
              </p>
            )}
          </Card>
        );
      case 'llm-summary': // New case for LLM Report Summary
        const llmSummary = reportData.llmReportSummary;
        return (
          <Card title="AI-Generated Overview" className="font-sans">
            {!llmSummary || llmSummary.status === 'pending' ? (
              <p className="text-slate-600">
                The AI-generated overview is being prepared or will appear here once available.
              </p>
            ) : llmSummary.status === 'skipped' ? (
              <p className="text-slate-600">
                AI-Generated Overview was skipped. {llmSummary.error ? `Reason: ${llmSummary.error}` : ''}
              </p>
            ) : llmSummary.status === 'error' ? (
              <p className="text-red-600">
                Error generating AI Overview: {llmSummary.error || 'An unspecified error occurred.'}
              </p>
            ) : llmSummary.status === 'completed' && llmSummary.summaryText ? (
              <>
                {llmSummary.modelUsed && (
                  <p className="text-xs text-slate-500 mb-3">Summary generated by: {llmSummary.modelUsed}</p>
                )}
                <div className="prose prose-sm max-w-none text-slate-700">
                  {(() => {
                    const rawText = llmSummary.summaryText;

                    let markdownContent = "";

                    const parts = rawText.split(/\n\s*`{3}(?:markdown|\w+)?\n/);
                    if (parts.length > 1) {
                      // Join the rest, in case the markdown itself contained ```markdown\n (unlikely but defensive)
                      let mainMarkdownSection = parts.slice(1).join('\n```markdown\n');
                      // Remove the final triple backticks
                      mainMarkdownSection = mainMarkdownSection.replace(/\n\s*`{3}\s*$/, '').trim();
                      markdownContent = mainMarkdownSection;
                    } else {
                      // Fallback if a ```markdown block is not found after an intro
                      // Try to strip potential global fences just in case pattern changed
                      markdownContent = rawText.replace(/^(\s*`{3}(markdown|\w+)?\n)?([\s\S]+?)(\n\s*`{3}\s*)?$/, '$3').trim();
                    }

                    return (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2 text-slate-800" {...props} />,
                            p: ({node, ...props}) => <p className="mb-2 leading-relaxed text-slate-700" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                            li: ({node, ...props}) => <li className="text-slate-700" {...props} />,
                            a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-700 hover:underline" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-slate-800" {...props} />,
                          }}
                        >
                          {markdownContent}
                        </ReactMarkdown>
                    );
                  })()}
                </div>
              </>
            ) : llmSummary.status === 'completed' ? (
               <p className="text-slate-600">
                AI Overview analysis completed, but no summary text was provided.
              </p>
            ) : (
              <p className="text-slate-600">
                The status of the AI-Generated Overview is unknown.
              </p>
            )}
          </Card>
        );
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
      sidebarContent={<SidebarNav activeSection={activeSection} onSelectSection={setActiveSection} sectionStatuses={sectionStatuses} />}
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

          {/* Global Scan Progress Indicator */}
          {reportData && (reportData.status === 'pending' || reportData.status === 'processing') && (
            <ScanProgressIndicator status={reportData.status} />
          )}

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
