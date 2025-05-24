import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, OverallScoreGauge } from '../ui';
import type { LighthouseReportData, ReportData, AccessibilityKeyboardCheckResult } from '../../types/reportTypes';
import { unwrapMarkdown } from '../../utils/textUtils';
import AccessibilityKeyboardCheck from './AccessibilityKeyboardCheck';

interface AccessibilitySectionProps {
  lighthouseReport?: LighthouseReportData;
  reportStatus?: ReportData['status'];
  accessibilityKeyboardCheck?: AccessibilityKeyboardCheckResult;
}

const AccessibilitySection: React.FC<AccessibilitySectionProps> = ({
  lighthouseReport,
  reportStatus,
  accessibilityKeyboardCheck,
}) => {
  const accessibilityScore = lighthouseReport?.scores?.accessibility;
  const accessibilityAudits = lighthouseReport?.accessibilityIssues;
  const llmExplainedAudits = lighthouseReport?.llmExplainedAccessibilityIssues;
  const hasExplicitError = !!lighthouseReport?.error;

  const isLoading = reportStatus === 'processing' || reportStatus === 'pending';
  const isCompleted = reportStatus === 'completed';
  const isFailed = reportStatus === 'failed' || (isCompleted && lighthouseReport?.success === false && !hasExplicitError);

  if (reportStatus === 'completed') {
    console.log('[AccessibilitySection] COMPLETE state. Full lighthouseReport:', JSON.parse(JSON.stringify(lighthouseReport || {})));
    console.log('[AccessibilitySection] COMPLETE state. Raw accessibilityIssues:', accessibilityAudits);
    console.log('[AccessibilitySection] COMPLETE state. LLM explained issues from prop:', llmExplainedAudits);
  }

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
    if (!accessibilityScore && !accessibilityAudits?.length && isCompleted) {
      return <p className="text-slate-500">No accessibility data available for this report.</p>;
    }

    return (
      <>
        {typeof accessibilityScore === 'number' && (
          <div className="flex flex-col items-center mb-8">
            <OverallScoreGauge score={accessibilityScore} categoryName="Accessibility" />
          </div>
        )}

        {/* Always show raw Lighthouse Accessibility issues if available */}
        {accessibilityAudits && accessibilityAudits.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4 text-center">
              Lighthouse Accessibility Issues
            </h3>
            <ul className="space-y-3 sm:space-y-4 list-none p-0">
              {accessibilityAudits.map((issue) => (
                <li
                  key={issue.id}
                  className="p-3 sm:p-4 bg-slate-50 rounded-md sm:rounded-lg shadow border border-slate-200"
                >
                  <h5 className="font-semibold text-sky-700 mb-1 sm:mb-2 text-base sm:text-lg">
                    {issue.title}
                  </h5>
                  <div className="text-sm sm:text-base text-slate-700 prose prose-sm sm:prose-base max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-medium prose-h3:text-base prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:font-mono">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {unwrapMarkdown(issue.description)}
                    </ReactMarkdown>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Show LLM explanations if available, with pending/error states */}
        {llmExplainedAudits && llmExplainedAudits.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4 text-center">
              AI-Explained Accessibility Issues
            </h3>
            <ul className="space-y-3 sm:space-y-4 list-none p-0">
              {llmExplainedAudits.map((item) => (
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
              ))}
            </ul>
          </div>
        )}
        {/* Keyboard Accessibility Checks */}
        {accessibilityKeyboardCheck && (
          <AccessibilityKeyboardCheck result={accessibilityKeyboardCheck} />
        )}
      </>
    );
  };

  if (reportStatus === 'pending' || reportStatus === 'processing') {
    return <Card title="Accessibility Audit"><p className="text-slate-500">Accessibility analysis is pending or in progress...</p></Card>;
  }
  if (reportStatus === 'failed') {
    return <Card title="Accessibility Audit"><p className="text-red-500">Accessibility analysis encountered an error or the report failed.</p></Card>;
  }
  if (!lighthouseReport || !lighthouseReport.success || lighthouseReport.scores?.accessibility === undefined) {
    const errorMessage = lighthouseReport?.error || 'Accessibility data is unavailable.';
    return <Card title="Accessibility Audit"><p className="text-red-500">{errorMessage}</p></Card>;
  }
  if (reportStatus === 'completed' && lighthouseReport.scores.accessibility === undefined) {
    return <Card title="Accessibility Audit"><p className="text-slate-500">Accessibility audit was likely skipped or no score was provided.</p></Card>;
  }

  return (
    <Card title="Accessibility">
      {renderContent()}
    </Card>
  );
};

export default AccessibilitySection;
