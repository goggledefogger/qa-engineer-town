import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
// ReactMarkdown and remarkGfm are now used within section components
import { db } from '../firebaseConfig';
import { ref, onValue, off } from "firebase/database";
import { ReportPageLayout } from '../components/layout';
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

const ReportPage: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('summary');

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
  const ReportHeading = () => (
    <div className="bg-white shadow rounded-lg p-4 md:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-1 leading-tight">
        QA Report:
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
    </div>
  );

  return (
    <ReportPageLayout
      sidebarContent={
        <>
          {/* Show heading above menu on mobile only */}
          <div className="block md:hidden mb-4">
            <ReportHeading />
          </div>
          <SidebarNav
            activeSection={activeSection}
            onSelectSection={setActiveSection}
            sectionStatuses={sectionStatuses}
          />
        </>
      }
      mainContent={
        <div className="space-y-6 font-sans">
          {/* Show heading in main content on desktop only */}
          <div className="hidden md:block">
            <ReportHeading />
          </div>
          {reportData &&
            (reportData.status === "pending" ||
              reportData.status === "processing") && (
              <ScanProgressIndicator status={reportData.status} />
            )}
          {renderSectionContent()}
        </div>
      }
    />
  );
};

export default ReportPage;
