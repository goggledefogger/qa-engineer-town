import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, OverallScoreGauge } from '../ui';
import type { LighthouseReportData, ReportData, LLMExplainedAuditItem } from '../../types/report';
import { unwrapMarkdown } from '../../utils/textUtils';

interface SeoSectionProps {
  lighthouseReport: LighthouseReportData | undefined;
  reportStatus: ReportData['status'];
}

const SeoSection: React.FC<SeoSectionProps> = ({ lighthouseReport, reportStatus }) => {
  // console.log('[SeoSection] Data:', { seoScore, seoAudits, llmExplainedAudits });

  const seoScore = lighthouseReport?.scores?.seo;
  const seoAudits = lighthouseReport?.seoAudits;
  const llmExplainedAudits = lighthouseReport?.llmExplainedSeoAudits;

  const noAuditsFound = seoAudits && seoAudits.length === 0;
  const hasExplicitError = lighthouseReport?.success === false && lighthouseReport?.error;
  const isLoading = reportStatus === 'processing' || reportStatus === 'pending';
  const isCompleted = reportStatus === 'complete';
  const isFailed = reportStatus === 'error' || (isCompleted && lighthouseReport?.success === false && !hasExplicitError);

  const renderContent = () => {
    if (isLoading) {
      return <p className="text-slate-500">SEO analysis in progress...</p>;
    }
    if (hasExplicitError) {
      return <p className="text-red-500">SEO analysis failed: {lighthouseReport.error}</p>;
    }
    if (isFailed && !lighthouseReport?.scores) {
      return <p className="text-red-500">SEO analysis could not be completed or data is unavailable.</p>;
    }
    if (!seoScore && !seoAudits?.length && isCompleted) {
      return <p className="text-slate-500">No SEO data available for this report.</p>;
    }

    return (
      <>
        {typeof seoScore === 'number' && (
          <div className="mb-6">
            <OverallScoreGauge score={seoScore} categoryName="SEO" />
          </div>
        )}

        {/* Always show raw Lighthouse SEO audits if available */}
        {seoAudits && seoAudits.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">Lighthouse SEO Audits</h3>
            <ul className="space-y-4 list-none p-0">
              {seoAudits.map((audit) => (
                <li key={audit.id} className="p-4 bg-slate-50 rounded-lg shadow border border-slate-200">
                  <h5 className="font-semibold text-sky-700 mb-2">{audit.title}</h5>
                  <div className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-medium prose-h3:text-base prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:font-mono">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{unwrapMarkdown(audit.description)}</ReactMarkdown>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Show LLM explanations if available, with pending/error states */}
        {llmExplainedAudits && llmExplainedAudits.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">AI-Explained SEO Audits</h3>
            <ul className="space-y-4 list-none p-0">
              {llmExplainedAudits.map((item) => (
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
    <Card title="SEO">
      {renderContent()}
    </Card>
  );
};

export default SeoSection;
