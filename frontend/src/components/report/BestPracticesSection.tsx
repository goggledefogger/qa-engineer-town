import React from 'react';
import { Card } from '../ui';
import type { LighthouseReportData, ReportData } from '../../types/reportTypes';
import ReportAuditList from './ReportAuditList';

interface BestPracticesSectionProps {
  lighthouseReport: LighthouseReportData | undefined;
  reportStatus: ReportData['status'];
}

const BestPracticesSection: React.FC<BestPracticesSectionProps> = ({ lighthouseReport, reportStatus }) => {
  const bpAudits = lighthouseReport?.bestPracticesAudits;
  const llmExplainedAudits = lighthouseReport?.llmExplainedBestPracticesAudits;
  const isLoading = reportStatus === 'processing' || reportStatus === 'pending';
  const isCompleted = reportStatus === 'completed';
  const isFailed = reportStatus === 'failed' || (isCompleted && lighthouseReport?.success === false);

  // console.log('[BestPracticesSection] Props:', { lighthouseReport, reportStatus });
  // console.log('[BestPracticesSection] Data:', { bpAudits, llmExplainedAudits });

  const renderContent = () => {
    if (!lighthouseReport && isLoading) {
      // console.log('[BestPracticesSection] Rendering: Loading state (report pending/processing)');
      return <p className="text-slate-500">Best practices analysis in progress...</p>;
    }
    if (lighthouseReport?.success === false && lighthouseReport?.error) {
      // console.log('[BestPracticesSection] Rendering: Explicit error from lighthouseReport');
      return <p className="text-red-500">Best practices analysis failed: {lighthouseReport.error}</p>;
    }
    if (isFailed && !bpAudits) {
      // console.log('[BestPracticesSection] Rendering: Failed state, no audits data');
      return <p className="text-red-500">Best practices analysis could not be completed or data is unavailable.</p>;
    }
    if (isCompleted && (!bpAudits || bpAudits.length === 0) && (!llmExplainedAudits || llmExplainedAudits.length === 0)) {
      // console.log('[BestPracticesSection] Rendering: Completed, but no audits found');
      return <p className="text-slate-500">No best practices audits found for this report.</p>;
    }

    // console.log('[BestPracticesSection] Rendering: Main content with audits');
    return (
      <>
        {/* Always show raw Lighthouse Best Practices audits if available */}
        <ReportAuditList
          items={bpAudits || []}
          title="Lighthouse Best Practices Audits"
          explanationField="description"
          emptyMessage="No Lighthouse best practices audits found."
          initialVisibleCount={5}
        />
        {/* Show LLM explanations if available, with pending/error states */}
        <ReportAuditList
          items={
            (llmExplainedAudits || []).map(item => ({
              ...item,
              status: item.status === "pending" || item.status === "error" ? item.status : undefined,
            }))
          }
          title="AI-Explained Best Practices Audits"
          explanationField="llmExplanation"
          emptyMessage="No AI-explained best practices audits found."
          initialVisibleCount={5}
          itemClassName="p-3 sm:p-4 bg-white rounded-md sm:rounded-lg shadow border border-slate-200"
          showStatus={true}
        />
      </>
    );
  };

  return (
    <Card title="Best Practices">
      {renderContent()}
    </Card>
  );
};

export default BestPracticesSection;
