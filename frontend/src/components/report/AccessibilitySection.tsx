import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, OverallScoreGauge, ExpandableList } from '../ui';
import type { LighthouseReportData, ReportData, AccessibilityKeyboardCheckResult, ColorContrastResult, VisualOrderResult } from '../../types/reportTypes';

interface AccessibilityNameAndStateCheckResult {
  elementsMissingName: Array<{
    selector: string;
    tag: string;
    id: string | null;
    className: string | null;
    role: string | null;
    type: string | null;
    text: string;
  }>;
  elementsMissingState: Array<{
    selector: string;
    tag: string;
    id: string | null;
    className: string | null;
    role: string | null;
    type: string | null;
    text: string;
    missingStates: string[];
  }>;
  error?: string;
}
import { unwrapMarkdown } from '../../utils/textUtils';
import AccessibilityKeyboardCheck from './AccessibilityKeyboardCheck';
import AccessibilityNameAndStateCheck from './AccessibilityNameAndStateCheck';
import ColorContrastCheck from './ColorContrastCheck';
import VisualOrderCheck from './VisualOrderCheck';

interface AccessibilitySectionProps {
  lighthouseReport?: LighthouseReportData;
  reportStatus?: ReportData['status'];
  accessibilityKeyboardCheck?: AccessibilityKeyboardCheckResult;
  accessibilityNameAndStateCheck?: AccessibilityNameAndStateCheckResult;
  colorContrastCheck?: ColorContrastResult; // Add new prop
  visualOrderCheck?: VisualOrderResult; // Add new prop
}

const AccessibilitySection: React.FC<AccessibilitySectionProps> = ({
  lighthouseReport,
  reportStatus,
  accessibilityKeyboardCheck,
  accessibilityNameAndStateCheck,
  colorContrastCheck,
  visualOrderCheck, // Destructure new prop
}) => {
  const accessibilityScore = lighthouseReport?.scores?.accessibility;
  const accessibilityAudits = lighthouseReport?.accessibilityIssues;
  const llmExplainedAudits = lighthouseReport?.llmExplainedAccessibilityIssues;
  const hasExplicitError = !!lighthouseReport?.error;

  const isLoading = reportStatus === 'processing' || reportStatus === 'pending';
  const isCompleted = reportStatus === 'completed';
  const isFailed = reportStatus === 'failed' || (isCompleted && lighthouseReport?.success === false && !hasExplicitError);


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
            <ExpandableList
              items={accessibilityAudits}
              renderItem={(issue: any) => (
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
              )}
              emptyMessage="No Lighthouse accessibility issues found."
              initialVisibleCount={5}
              itemKey={(item: any) => item.id}
            />
          </div>
        )}
        {/* Show LLM explanations if available, with pending/error states */}
        {llmExplainedAudits && llmExplainedAudits.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4 text-center">
              AI-Explained Accessibility Issues
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
              emptyMessage="No AI-explained accessibility issues found."
              initialVisibleCount={5}
              itemKey={(item: any) => item.id}
            />
          </div>
        )}
        {/* Keyboard Accessibility Checks */}
        {accessibilityKeyboardCheck && (
          <AccessibilityKeyboardCheck result={accessibilityKeyboardCheck} />
        )}
        {/* Name and State Accessibility Checks */}
        {accessibilityNameAndStateCheck && (
          <AccessibilityNameAndStateCheck result={accessibilityNameAndStateCheck} />
        )}
        {/* Color Contrast Checks */}
        {colorContrastCheck && (
          <ColorContrastCheck result={colorContrastCheck} />
        )}
        {/* Visual Order Checks */}
        {visualOrderCheck && (
          <VisualOrderCheck result={visualOrderCheck} />
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
