import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
// ReactMarkdown and remarkGfm are now used within section components
import { db } from '../firebaseConfig';
import { ref, onValue, off } from "firebase/database";
import SidebarNav, { type SectionStatuses } from '../components/navigation/SidebarNav';
import { Card, ScanProgressIndicator } from '../components/ui'; // OverallScoreGauge, MetricDisplay are used in section components

import type { ReportData } from '../types/reportTypes';
// lighthouseMetricDetails is now in PerformanceSection.tsx

// Import the new section components
import {
  SummarySection,
  ScreenshotsSection,
  PerformanceSection,
  AccessibilitySection,
  SeoSection,
  BestPracticesSection,
  AiUxDesignSection,
  LlmSummarySection,
  TechStackSection
} from '../components/report'; // Assuming index.ts handles exports
import ReportPageLayout from '../components/layout/ReportPageLayout';

const ReportPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('summary');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const mainContentRef = React.useRef<HTMLDivElement>(null);

  // Scroll to top of main content when activeSection changes
  React.useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [activeSection]);

  useEffect(() => {
    if (!reportId) {
      setError("Report ID is missing from URL.");
      setLoading(false);
      return;
    }
    const reportRef = ref(db, `reports/${reportId}`);
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
      console.error("Error fetching report data:", dbError);
      setError("Failed to fetch report data.");
      setLoading(false);
    });
    return () => {
      off(reportRef, 'value', unsubscribe);
    };
  }, [reportId]);

  const sectionStatuses = React.useMemo<SectionStatuses>(() => {
    const statuses: SectionStatuses = {};
    if (!reportData) {
      const defaultStatus = loading ? 'LOADING' : 'PENDING';
      ['summary', 'llm-summary', 'screenshot', 'performance', 'accessibility', 'seo', 'best-practices', 'ai-ux-design', 'tech-stack'].forEach(id => {
        statuses[id] = defaultStatus;
      });
      return statuses;
    }
    const isProcessing = reportData.status === 'processing' || reportData.status === 'pending';
    statuses['summary'] = 'COMPLETED';
    if (reportData.llmReportSummary) {
      switch (reportData.llmReportSummary.status) {
        case 'completed': statuses['llm-summary'] = 'COMPLETED'; break;
        case 'error': statuses['llm-summary'] = 'ERROR'; break;
        case 'skipped': statuses['llm-summary'] = 'SKIPPED'; break;
        case 'pending': case 'processing': default: statuses['llm-summary'] = 'LOADING'; break;
      }
    } else { statuses['llm-summary'] = isProcessing ? 'LOADING' : 'PENDING'; }

    if (reportData.playwrightReport) {
      if (reportData.playwrightReport.screenshotUrls && Object.values(reportData.playwrightReport.screenshotUrls).some(url => typeof url === 'string' && url.length > 0)) {
        statuses['screenshot'] = 'COMPLETED';
      } else if (reportData.playwrightReport.error) {
        statuses['screenshot'] = 'ERROR';
      } else { statuses['screenshot'] = isProcessing ? 'LOADING' : 'PENDING'; }
    } else { statuses['screenshot'] = isProcessing ? 'LOADING' : 'PENDING'; }

    type LighthouseScoreKey = keyof NonNullable<NonNullable<ReportData['lighthouseReport']>['scores']>;
    const lighthouseSections: Array<{id: string, scoreKey?: LighthouseScoreKey}> = [
      { id: 'performance', scoreKey: 'performance' }, { id: 'accessibility', scoreKey: 'accessibility' },
      { id: 'seo', scoreKey: 'seo' }, { id: 'best-practices', scoreKey: 'bestPractices' },
    ];
    lighthouseSections.forEach(section => {
      if (reportData.lighthouseReport) {
        const currentScores = reportData.lighthouseReport.scores;
        if (reportData.lighthouseReport.error) { statuses[section.id] = 'ERROR'; }
        else if (reportData.lighthouseReport.success === false && !section.scoreKey) { statuses[section.id] = 'ERROR'; }
        else if (section.scoreKey && currentScores && currentScores[section.scoreKey] !== undefined) { statuses[section.id] = 'COMPLETED'; }
        else if (reportData.lighthouseReport.success === false) { statuses[section.id] = 'ERROR'; }
        else { statuses[section.id] = isProcessing ? 'LOADING' : 'PENDING'; }
      } else { statuses[section.id] = isProcessing ? 'LOADING' : 'PENDING'; }
    });

    if (reportData.aiUxDesignSuggestions) {
      switch (reportData.aiUxDesignSuggestions.status) {
        case 'completed': statuses['ai-ux-design'] = 'COMPLETED'; break;
        case 'error': statuses['ai-ux-design'] = 'ERROR'; break;
        case 'skipped': statuses['ai-ux-design'] = 'SKIPPED'; break;
        case 'pending': default: statuses['ai-ux-design'] = 'LOADING'; break;
      }
    } else { statuses['ai-ux-design'] = isProcessing ? 'LOADING' : 'PENDING'; }

    // Tech Stack Status Calculation
    if (reportData.techStack) {
      switch (reportData.techStack.status) {
        case 'completed': statuses['tech-stack'] = 'COMPLETED'; break;
        case 'error': statuses['tech-stack'] = 'ERROR'; break;
        case 'skipped': statuses['tech-stack'] = 'SKIPPED'; break;
        case 'pending': case 'processing': default: statuses['tech-stack'] = 'LOADING'; break;
      }
    } else { statuses['tech-stack'] = isProcessing ? 'LOADING' : 'PENDING'; }

    return statuses;
  }, [reportData, loading]);

  const renderSectionContent = () => {
    if (!reportData) return <Card title="No Data"><p className="text-slate-600">Report details are unavailable.</p></Card>;
    // DetailItem is removed as it should be encapsulated in SummarySection or a shared UI component if needed elsewhere

    switch (activeSection) {
      case 'summary':
        return <SummarySection reportData={reportData} />;
      case 'screenshot':
        return <ScreenshotsSection playwrightReport={reportData.playwrightReport} reportStatus={reportData.status} />;
      case 'performance':
        return <PerformanceSection lighthouseReport={reportData.lighthouseReport} reportStatus={reportData.status} />;
      case 'accessibility':
        return <AccessibilitySection lighthouseReport={reportData.lighthouseReport} reportStatus={reportData.status} />;
      case 'seo':
        return <SeoSection lighthouseReport={reportData.lighthouseReport} reportStatus={reportData.status} />;
      case 'best-practices':
        return <BestPracticesSection lighthouseReport={reportData.lighthouseReport} reportStatus={reportData.status} />;
      case 'ai-ux-design':
        return <AiUxDesignSection aiUxDesignSuggestions={reportData.aiUxDesignSuggestions} />;
      case 'llm-summary':
        return <LlmSummarySection llmReportSummary={reportData.llmReportSummary} />;
      case 'tech-stack':
        return <TechStackSection techStackData={reportData.techStack} />;
      default:
        return <Card title="Section Not Found" className="font-sans"><p className="text-slate-600">Content for {activeSection} is not available yet.</p></Card>;
    }
  };

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

  if (!reportData && !loading) {
     return (
        <div className="flex flex-col items-center justify-center p-4 h-full text-center">
          <p className="text-xl text-slate-500 mb-3 font-sans">Report data unavailable.</p>
          {reportId && <p className="text-sm text-slate-500 font-sans">Report ID: <span className="font-mono bg-slate-200 px-1 rounded">{reportId}</span></p>}
        </div>
      );
  }

  // Heading component for reuse
  const ReportHeading = ({ showScreenshot = true }: { showScreenshot?: boolean }) => {
    const screenshotUrls = reportData?.playwrightReport?.screenshotUrls || {};
    const screenshots: Array<{ key: string; label: string; url?: string }> = [
      { key: "desktop", label: "Desktop", url: screenshotUrls.desktop },
      { key: "tablet", label: "Tablet", url: screenshotUrls.tablet },
      { key: "mobile", label: "Mobile", url: screenshotUrls.mobile },
    ].filter(s => !!s.url);

    // SVG device outlines
    const DeviceFrame = ({
      type,
      url,
    }: {
      type: "desktop" | "tablet" | "mobile";
      url: string;
    }) => {
      // All device frames: border tightly around image, minimal gap, no extra padding
      if (type === "desktop") {
        // 16:9 aspect ratio, slightly larger border
        return (
          <svg width="432" height="252" viewBox="0 0 432 252" className="block shrink-0" style={{maxWidth: '100%'}}>
            <defs>
              <clipPath id="desktopScreen">
                <rect x="20" y="20" width="392" height="212" rx="6" />
              </clipPath>
            </defs>
            <rect x="8" y="8" width="416" height="236" rx="16" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="3"/>
            <image
              href={url}
              x="20"
              y="20"
              width="392"
              height="212"
              preserveAspectRatio="xMidYMid meet"
              clipPath="url(#desktopScreen)"
              style={{ shapeRendering: "crispEdges" }}
            />
            <rect x="196" y="242" width="40" height="6" rx="3" fill="#cbd5e1"/>
          </svg>
        );
      }
      if (type === "tablet") {
        // 3:4 aspect ratio, slightly larger border
        return (
          <svg width="168" height="224" viewBox="0 0 168 224" className="block shrink-0" style={{maxWidth: '100%'}}>
            <defs>
              <clipPath id="tabletScreen">
                <rect x="14" y="14" width="140" height="196" rx="8" />
              </clipPath>
            </defs>
            <rect x="6" y="6" width="156" height="212" rx="18" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="3"/>
            <image
              href={url}
              x="14"
              y="14"
              width="140"
              height="196"
              preserveAspectRatio="xMidYMid meet"
              clipPath="url(#tabletScreen)"
              style={{ shapeRendering: "crispEdges" }}
            />
            <circle cx="84" cy="210" r="4" fill="#cbd5e1"/>
          </svg>
        );
      }
      // mobile: 9:19.5 aspect ratio, slightly larger border
      return (
        <svg width="84" height="140" viewBox="0 0 84 140" className="block shrink-0" style={{maxWidth: '100%'}}>
          <defs>
            <clipPath id="mobileScreen">
              <rect x="10" y="10" width="64" height="120" rx="10" />
            </clipPath>
          </defs>
          <rect x="4" y="4" width="76" height="132" rx="14" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="3"/>
          <image
            href={url}
            x="10"
            y="10"
            width="64"
            height="120"
            preserveAspectRatio="xMidYMid meet"
            clipPath="url(#mobileScreen)"
            style={{ shapeRendering: "crispEdges" }}
          />
          <circle cx="42" cy="130" r="3" fill="#cbd5e1"/>
        </svg>
      );
    };

    return (
      <div className="bg-white shadow rounded-lg p-4 md:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1 leading-tight">
          QA Report:&nbsp;
          {reportData?.url ? (
            <a
              href={reportData.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 hover:text-blue-800 hover:underline break-all"
            >
              {reportData.url}
            </a>
          ) : (
            "Loading URL..."
          )}
        </h1>
        <p className="text-xs text-slate-500">
          Report ID:{" "}
          <span className="font-mono bg-slate-200 px-1 py-0.5 rounded">
            {reportId}
          </span>
        </p>
        {showScreenshot && screenshots.length > 0 && (
          <div className="flex flex-row items-end justify-center gap-4 mt-6 w-full overflow-x-auto">
            {screenshots.map(({ key, url }) => (
              <div
                key={key}
                className="shrink-0"
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "center",
                  padding: 0,
                  margin: 0,
                  height: "auto",
                  background: "none",
                }}
              >
                <DeviceFrame type={key as "desktop" | "tablet" | "mobile"} url={url!} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen bg-slate-50">
      <div className="w-full mx-auto flex flex-col md:flex-row gap-8 pt-2 md:pt-3 px-2 md:px-4 xl:px-6 2xl:px-8">
        <ReportPageLayout
          sidebarCollapsed={sidebarCollapsed}
          sidebarContent={
            <div className="flex flex-col h-full">
              {/* Show heading above nav menu only on mobile */}
              <div className="block md:hidden mb-4">
                <ReportHeading showScreenshot={activeSection !== 'screenshot'} />
              </div>
              <SidebarNav
                activeSection={activeSection}
                onSelectSection={setActiveSection}
                sectionStatuses={sectionStatuses}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
              />
            </div>
          }
          mainContent={
            <div className="flex-1 min-w-0 flex flex-col" ref={mainContentRef}>
              {/* Sticky QA Report header only above main content on desktop */}
              <div className="hidden md:block sticky top-0 z-30 bg-white shadow-md">
                <ReportHeading showScreenshot={activeSection !== 'screenshot'} />
              </div>
              <section className="flex-grow min-w-0 space-y-6 font-sans pb-12">
                {reportData &&
                  (reportData.status === "pending" ||
                    reportData.status === "processing") && (
                    <ScanProgressIndicator status={reportData.status} />
                  )}
                {renderSectionContent()}
              </section>
            </div>
          }
        />
      </div>
    </div>
  );
};

export default ReportPage;
