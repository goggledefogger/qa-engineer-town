import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, OverallScoreGauge } from '../ui';
import type { LighthouseReportData, ReportData, LLMExplainedAuditItem } from '../../types/report';
import { unwrapMarkdown } from '../../utils/textUtils';

interface BestPracticesSectionProps {
  lighthouseReport: LighthouseReportData | undefined;
  reportStatus: ReportData['status'];
}

const BestPracticesSection: React.FC<BestPracticesSectionProps> = ({ lighthouseReport, reportStatus }) => {
  // console.log('[BestPracticesSection] Props:', { lighthouseReport, reportStatus });

  const bpScore = lighthouseReport?.scores?.bestPractices;
  const bpAudits = lighthouseReport?.bestPracticesAudits;
  const llmExplainedAudits = lighthouseReport?.llmExplainedBestPracticesAudits;
  console.log('[BestPracticesSection] Data:', { bpScore, bpAudits, llmExplainedAudits });

  const noAuditsFound = bpAudits && bpAudits.length === 0;
  const hasExplicitError = lighthouseReport?.success === false && lighthouseReport?.error;

  if (!lighthouseReport && (reportStatus === 'pending' || reportStatus === 'processing')) {
    // console.log('[BestPracticesSection] Rendering: Loading state (report pending/processing)');
    return (
      <Card title="Best Practices (Lighthouse)" className="font-sans">
        <div className="flex flex-col items-center mb-6">
          <OverallScoreGauge score={undefined} categoryName="Overall Best Practices" />
        </div>
        <p className="text-slate-600 text-center py-8">Best Practices audit details will appear here when scan is complete.</p>
      </Card>
    );
  }

  return (
    <Card title="Best Practices (Lighthouse)" className="font-sans">
      <div className="flex flex-col items-center mb-6">
        <OverallScoreGauge score={bpScore} categoryName="Overall Best Practices" />
      </div>

      {bpAudits && bpAudits.length > 0 ? (
        <>
          {/* console.log('[BestPracticesSection] Rendering: Identified Best Practices Audits list'); */}
          <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">Identified Best Practices Audits</h3>
          <ul className="space-y-3 list-none p-0">
            {bpAudits.map((audit) => (
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
        <p className="text-slate-600 text-center py-4">Best Practices check could not be completed due to an error: {lighthouseReport?.error}</p>
      ) : (reportStatus === 'processing' || reportStatus === 'pending') && !bpScore ? (
        // console.log('[BestPracticesSection] Rendering: Pending message (still processing, no score)');
        <p className="text-slate-600 text-center py-8">Best Practices audit details will appear here when scan is complete.</p>
      ) : bpScore !== undefined && noAuditsFound ? (
        // console.log('[BestPracticesSection] Rendering: No audits found message');
        <p className="text-slate-600 text-center py-4">No specific Best Practices issues flagged by Lighthouse. Well done!</p>
      ) : (
        // console.log('[BestPracticesSection] Rendering: Fallback message (data not available)');
        <p className="text-slate-600 text-center py-4">Best Practices data is not available. The check might not have run or an unknown error occurred.</p>
      )}

      {lighthouseReport?.error && (!bpAudits || bpAudits.length === 0) && (
        // console.log('[BestPracticesSection] Rendering: Lighthouse general error message');
          <p className="text-red-600 mt-4 text-sm text-center">Lighthouse Best Practices check error: {lighthouseReport.error}</p>
      )}

      {/* LLM Enhanced Explanations for Best Practices Audits */}
      {/* console.log('[BestPracticesSection] Checking for LLM Enhanced Explanations. Has audits:', !!(bpAudits && bpAudits.length > 0), 'Has llmExplainedAudits:', !!llmExplainedAudits); */}
      {(bpAudits && bpAudits.length > 0 || llmExplainedAudits) && (
        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">Simplified Explanations & Advice (AI-Powered)</h3>
          {(!llmExplainedAudits || llmExplainedAudits.length === 0) &&
           (reportStatus === 'processing' || reportStatus === 'pending') &&
           (bpAudits && bpAudits.length > 0) && (
            // console.log('[BestPracticesSection] Rendering: Generating enhanced advice message');
            <p className="text-slate-500 text-center py-4">Generating enhanced best practices advice... This may take a few moments.</p>
          )}
          {llmExplainedAudits && llmExplainedAudits.length > 0 && (
            // console.log('[BestPracticesSection] Rendering: LLM Explained Audits list', llmExplainedAudits);
            <ul className="space-y-4 list-none p-0">
              {llmExplainedAudits.map((explainedAudit) => {
                // console.log('[BestPracticesSection] Rendering LLM Explained Audit Item:', explainedAudit);
                return (
                  <li key={explainedAudit.id} className="p-4 bg-white rounded-lg shadow border border-slate-200">
                    <h5 className="font-semibold text-sky-700 mb-2">Enhanced Look: {explainedAudit.title}</h5>
                    {explainedAudit.status === 'pending' && <p className="text-sm text-slate-500 italic">Loading explanation...</p>}
                    {explainedAudit.status === 'error' && <p className="text-sm text-red-500">Error loading explanation: {explainedAudit.error}</p>}
                    {explainedAudit.status === 'completed' && explainedAudit.llmExplanation && (
                      <div className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-medium prose-h3:text-base prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:font-mono">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{unwrapMarkdown(explainedAudit.llmExplanation)}</ReactMarkdown>
                      </div>
                    )}
                    {explainedAudit.status === 'completed' && !explainedAudit.llmExplanation && (
                      // console.log('[BestPracticesSection] LLM Explained Audit Item is completed but has no explanation text.', explainedAudit.id);
                      <p className="text-sm text-slate-500 italic">Enhanced explanation was processed but is empty.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {llmExplainedAudits?.length === 0 && reportStatus === 'complete' &&
            (bpAudits && bpAudits.length > 0) && (
              // console.log('[BestPracticesSection] Rendering: No enhanced advice generated (report complete, audits exist, but llmExplainedAudits is empty)');
              <p className="text-slate-500 text-center py-4">No enhanced best practices advice generated or available for these audits.</p>
          )}
        </div>
      )}
    </Card>
  );
};

export default BestPracticesSection;
