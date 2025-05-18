import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, OverallScoreGauge } from '../ui';
import type { LighthouseReportData, ReportData, LLMExplainedAuditItem } from '../../types/report';

interface SeoSectionProps {
  lighthouseReport: LighthouseReportData | undefined;
  reportStatus: ReportData['status'];
}

const SeoSection: React.FC<SeoSectionProps> = ({ lighthouseReport, reportStatus }) => {
  const seoScore = lighthouseReport?.scores?.seo;
  const seoAudits = lighthouseReport?.seoAudits;
  const llmExplainedAudits = lighthouseReport?.llmExplainedSeoAudits;

  const noAuditsFound = seoAudits && seoAudits.length === 0;
  const hasExplicitError = lighthouseReport?.success === false && lighthouseReport?.error;

  if (!lighthouseReport && (reportStatus === 'pending' || reportStatus === 'processing')) {
    return (
      <Card title="SEO (Lighthouse)" className="font-sans">
        <div className="flex flex-col items-center mb-6">
          <OverallScoreGauge score={undefined} categoryName="Overall SEO" />
        </div>
        <p className="text-slate-600 text-center py-8">SEO audit details will appear here when scan is complete.</p>
      </Card>
    );
  }

  return (
    <Card title="SEO (Lighthouse)" className="font-sans">
      <div className="flex flex-col items-center mb-6">
        <OverallScoreGauge score={seoScore} categoryName="Overall SEO" />
      </div>

      {seoAudits && seoAudits.length > 0 ? (
        <>
          <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">Identified SEO Audits</h3>
          <ul className="space-y-3 list-none p-0">
            {seoAudits.map((audit) => (
              <li key={audit.id} className="p-3 bg-slate-50 rounded-md shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <h4 className="font-semibold text-md text-slate-800 mb-0.5">{audit.title}</h4>
                <p className="text-xs text-slate-500 mb-1.5 font-mono">ID: {audit.id} | Score: {audit.score === null ? 'N/A' : audit.score}</p>
                <div className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-200 prose-code:px-1 prose-code:rounded">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{audit.description}</ReactMarkdown>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : hasExplicitError ? (
        <p className="text-slate-600 text-center py-4">SEO check could not be completed due to an error: {lighthouseReport?.error}</p>
      ) : (reportStatus === 'processing' || reportStatus === 'pending') && !seoScore ? (
        <p className="text-slate-600 text-center py-8">SEO audit details will appear here when scan is complete.</p>
      ) : seoScore !== undefined && noAuditsFound ? (
        <p className="text-slate-600 text-center py-4">No specific SEO issues flagged by Lighthouse. Looks good!</p>
      ) : (
        <p className="text-slate-600 text-center py-4">SEO data is not available. The check might not have run or an unknown error occurred.</p>
      )}

      {lighthouseReport?.error && (!seoAudits || seoAudits.length === 0) && (
          <p className="text-red-600 mt-4 text-sm text-center">Lighthouse SEO check error: {lighthouseReport.error}</p>
      )}

      {/* LLM Enhanced Explanations for SEO Audits */}
      {(seoAudits && seoAudits.length > 0 || llmExplainedAudits) && (
        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">Simplified Explanations & Advice (AI-Powered)</h3>
          {(!llmExplainedAudits || llmExplainedAudits.length === 0) &&
           (reportStatus === 'processing' || reportStatus === 'pending') &&
           (seoAudits && seoAudits.length > 0) && (
            <p className="text-slate-500 text-center py-4">Generating enhanced SEO advice... This may take a few moments.</p>
          )}
          {llmExplainedAudits && llmExplainedAudits.length > 0 && (
            <ul className="space-y-4 list-none p-0">
              {llmExplainedAudits.map((explainedAudit) => (
                <li key={explainedAudit.id} className="p-4 bg-white rounded-lg shadow border border-slate-200">
                  <h5 className="font-semibold text-sky-700 mb-2">Enhanced Look: {explainedAudit.title}</h5>
                  {explainedAudit.status === 'pending' && <p className="text-sm text-slate-500 italic">Loading explanation...</p>}
                  {explainedAudit.status === 'error' && <p className="text-sm text-red-500">Error loading explanation: {explainedAudit.error}</p>}
                  {explainedAudit.status === 'completed' && explainedAudit.llmExplanation && (
                    <div className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-medium prose-h3:text-base prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:font-mono">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{explainedAudit.llmExplanation}</ReactMarkdown>
                    </div>
                  )}
                  {explainedAudit.status === 'completed' && !explainedAudit.llmExplanation && (
                      <p className="text-sm text-slate-500 italic">Enhanced explanation was processed but is empty.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {llmExplainedAudits?.length === 0 && reportStatus === 'complete' &&
            (seoAudits && seoAudits.length > 0) && (
              <p className="text-slate-500 text-center py-4">No enhanced SEO advice generated or available for these audits.</p>
          )}
        </div>
      )}
    </Card>
  );
};

export default SeoSection;
