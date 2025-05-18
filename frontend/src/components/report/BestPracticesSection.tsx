import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card } from '../ui';
import type { LighthouseReportData, ReportData } from '../../types/report';
import { unwrapMarkdown } from '../../utils/textUtils';

interface BestPracticesSectionProps {
  lighthouseReport: LighthouseReportData | undefined;
  reportStatus: ReportData['status'];
}

const BestPracticesSection: React.FC<BestPracticesSectionProps> = ({ lighthouseReport, reportStatus }) => {
  const bpAudits = lighthouseReport?.bestPracticesAudits;
  const llmExplainedAudits = lighthouseReport?.llmExplainedBestPracticesAudits;
  const isLoading = reportStatus === 'processing' || reportStatus === 'pending';
  const isCompleted = reportStatus === 'complete';
  const isFailed = reportStatus === 'error' || (isCompleted && lighthouseReport?.success === false);

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
        {bpAudits && bpAudits.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">Lighthouse Best Practices Audits</h3>
            <ul className="space-y-4 list-none p-0">
              {bpAudits.map((audit: any) => (
                <li key={audit.id} className="p-4 bg-slate-50 rounded-lg shadow border border-slate-200">
                  <h5 className="font-semibold text-sky-700 mb-2">{audit.title}</h5>
                  {audit.description && (
                    <div className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-medium prose-h3:text-base prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:font-mono">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{unwrapMarkdown(audit.description)}</ReactMarkdown>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Show LLM explanations if available, with pending/error states */}
        {llmExplainedAudits && llmExplainedAudits.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">AI-Explained Best Practices Audits</h3>
            <ul className="space-y-4 list-none p-0">
              {llmExplainedAudits.map((item: any) => (
                <li key={item.id} className="p-4 bg-white rounded-lg shadow border border-slate-200">
                  <h5 className="font-semibold text-sky-700 mb-2">{item.title}</h5>
                  {item.llmExplanation && (
                    <div className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-medium prose-h3:text-base prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:font-mono">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{unwrapMarkdown(item.llmExplanation)}</ReactMarkdown>
                    </div>
                  )}
                  {item.status === 'pending' && (
                    <p className="text-xs text-slate-400 mt-1">AI explanation pending...</p>
                  )}
                  {item.status === 'error' && item.error && (
                    <p className="text-xs text-red-500 mt-1">AI explanation error: {item.error}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
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
