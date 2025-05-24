import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, OverallScoreGauge, ExpandableList } from '../ui';
import type { LighthouseReportData, ReportData } from '../../types/reportTypes';
import { unwrapMarkdown } from '../../utils/textUtils';

interface SeoSectionProps {
  lighthouseReport?: LighthouseReportData;
  reportStatus?: ReportData['status'];
}

const SeoSection: React.FC<SeoSectionProps> = ({ lighthouseReport, reportStatus }) => {
  // Simplified initial checks
  if (reportStatus === 'pending' || reportStatus === 'processing') {
    return <Card title="SEO Audit"><p className="text-slate-500">SEO analysis is pending or in progress...</p></Card>;
  }

  if (lighthouseReport?.success === false && lighthouseReport.error) {
    return <Card title="SEO Audit"><p className="text-red-500">SEO analysis failed: {lighthouseReport.error}</p></Card>;
  }

  if (reportStatus === 'failed') {
    return <Card title="SEO Audit"><p className="text-red-500">SEO analysis could not be completed due to a report failure.</p></Card>;
  }

  // If report is completed or in an unknown state, but no specific Lighthouse error, try to display data
  const seoScore = lighthouseReport?.scores?.seo;
  const seoAudits = lighthouseReport?.seoAudits;
  const llmExplainedAudits = lighthouseReport?.llmExplainedSeoAudits;

  if (typeof seoScore === 'undefined' &&
      (!seoAudits || seoAudits.length === 0) &&
      (!llmExplainedAudits || llmExplainedAudits.length === 0)) {
    // This condition means no score, no raw audits, and no LLM-explained audits.
    // It also covers cases where lighthouseReport might be undefined but status is 'completed'.
    return <Card title="SEO Audit"><p className="text-slate-500">No SEO data or audits are available for this report.</p></Card>;
  }

  return (
    <Card title="SEO">
      {typeof seoScore === 'number' && (
        <div className="flex flex-col items-center mb-8">
          <OverallScoreGauge score={seoScore} categoryName="SEO" />
        </div>
      )}

      {seoAudits && seoAudits.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4 text-center">
            Lighthouse SEO Audits
          </h3>
          <ExpandableList
            items={seoAudits}
            renderItem={(audit: any) => (
              <li
                key={audit.id}
                className="p-3 sm:p-4 bg-slate-50 rounded-md sm:rounded-lg shadow border border-slate-200"
              >
                <h5 className="font-semibold text-sky-700 mb-1 sm:mb-2 text-base sm:text-lg">
                  {audit.title}
                </h5>
                {audit.description && (
                  <div className="text-sm sm:text-base text-slate-700 prose prose-sm sm:prose-base max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-medium prose-h3:text-base prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:font-mono">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {unwrapMarkdown(audit.description)}
                    </ReactMarkdown>
                  </div>
                )}
              </li>
            )}
            emptyMessage="No Lighthouse SEO audits found."
            initialVisibleCount={5}
            itemKey={(item: any) => item.id}
          />
        </div>
      )}
      {llmExplainedAudits && llmExplainedAudits.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4 text-center">
            AI-Explained SEO Audits
          </h3>
          <ExpandableList
            items={llmExplainedAudits}
            renderItem={(item: any) => (
              <li
                key={item.id}
                className="p-3 sm:p-4 bg-white rounded-md sm:rounded-lg shadow border border-slate-200"
              >
                <h5 className="font-semibold text-sky-700 mb-1 sm:mb-2 text-base sm:text-lg">
                  {item.title}
                </h5>
                {item.llmExplanation && (
                  <div className="text-sm sm:text-base text-slate-700 prose prose-sm sm:prose-base max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-medium prose-h3:text-base prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:font-mono">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {unwrapMarkdown(item.llmExplanation)}
                    </ReactMarkdown>
                  </div>
                )}
                {item.status === "pending" && (
                  <p className="text-xs text-slate-400 mt-1">
                    AI explanation pending...
                  </p>
                )}
                {item.status === "error" && item.error && (
                  <p className="text-xs text-red-500 mt-1">
                    AI explanation error: {item.error}
                  </p>
                )}
              </li>
            )}
            emptyMessage="No AI-explained SEO audits found."
            initialVisibleCount={5}
            itemKey={(item: any) => item.id}
          />
        </div>
      )}
    </Card>
  );
};

export default SeoSection;
