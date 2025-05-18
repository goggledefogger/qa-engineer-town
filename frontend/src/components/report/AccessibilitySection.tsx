import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, OverallScoreGauge } from '../ui';
import type { LighthouseReportData, ReportData, LLMExplainedAuditItem } from '../../types/report';
import { unwrapMarkdown } from '../../utils/textUtils';

interface AccessibilitySectionProps {
  lighthouseReport: LighthouseReportData | undefined;
  reportStatus: ReportData['status'];
}

const AccessibilitySection: React.FC<AccessibilitySectionProps> = ({ lighthouseReport, reportStatus }) => {
  console.log('[AccessibilitySection] Props Received:', { lighthouseReport, reportStatus });

  const accessibilityScore = lighthouseReport?.scores?.accessibility;
  const accessibilityIssues = lighthouseReport?.accessibilityIssues;
  const llmExplainedIssues = lighthouseReport?.llmExplainedAccessibilityIssues;

  if (reportStatus === 'complete') {
    console.log('[AccessibilitySection] COMPLETE state. Full lighthouseReport:', JSON.parse(JSON.stringify(lighthouseReport || {})));
    console.log('[AccessibilitySection] COMPLETE state. Raw accessibilityIssues:', accessibilityIssues);
    console.log('[AccessibilitySection] COMPLETE state. LLM explained issues from prop:', llmExplainedIssues);
  }

  const noIssuesFound = accessibilityIssues && accessibilityIssues.length === 0;
  const hasExplicitError = lighthouseReport?.success === false && lighthouseReport?.error;
  const isLoading = reportStatus === 'processing' || reportStatus === 'pending';
  const isCompleted = reportStatus === 'complete';
  const isFailed = reportStatus === 'error' || (isCompleted && lighthouseReport?.success === false && !hasExplicitError);

  const renderContent = () => {
    if (isLoading) {
      return <p className="text-slate-500">Accessibility analysis in progress...</p>;
    }
    if (hasExplicitError) {
      return <p className="text-red-500">Accessibility analysis failed: {lighthouseReport.error}</p>;
    }
    if (isFailed && !lighthouseReport?.scores) {
      return <p className="text-red-500">Accessibility analysis could not be completed or data is unavailable.</p>;
    }
    if (!accessibilityScore && !accessibilityIssues?.length && isCompleted) {
      return <p className="text-slate-500">No accessibility data available for this report.</p>;
    }

    return (
      <>
        {typeof accessibilityScore === 'number' && (
          <div className="mb-6">
            <OverallScoreGauge score={accessibilityScore} categoryName="Accessibility" />
          </div>
        )}

        {noIssuesFound && <p className="text-slate-600">No specific accessibility issues found by Lighthouse. Great job!</p>}

        {(() => {
          console.log('[AccessibilitySection] Checking condition for llmExplainedIssues. llmExplainedIssues:', llmExplainedIssues);
          if (llmExplainedIssues && llmExplainedIssues.length > 0) {
            console.log('[AccessibilitySection] Rendering llmExplainedIssues. Count:', llmExplainedIssues.length);
            return (
              <div className="mt-4">
                <h4 className="text-lg font-semibold text-slate-800 mb-3">AI-Explained Accessibility Issues:</h4>
                <ul className="space-y-3">
                  {llmExplainedIssues.map((explainedIssue) => (
                    <li key={explainedIssue.id} className="p-4 bg-white rounded-lg shadow border border-slate-200">
                      <h5 className="font-semibold text-sky-700 mb-2">{explainedIssue.title}</h5>
                      {explainedIssue.llmExplanation && (
                        <div className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-medium prose-h3:text-base prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:font-mono">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {unwrapMarkdown(explainedIssue.llmExplanation)}
                          </ReactMarkdown>
                        </div>
                      )}
                      {explainedIssue.status === 'error' && explainedIssue.error && (
                        <p className="text-xs text-red-500 mt-1">AI explanation error: {explainedIssue.error}</p>
                      )}
                      {explainedIssue.status === 'pending' && (
                        <p className="text-xs text-slate-400 mt-1">AI explanation pending...</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          } else {
            console.log('[AccessibilitySection] llmExplainedIssues not rendered. Condition not met or empty.');
            return null;
          }
        })()}
      </>
    );
  };

  return (
    <Card title="Accessibility">
      {renderContent()}
    </Card>
  );
};

export default AccessibilitySection;
