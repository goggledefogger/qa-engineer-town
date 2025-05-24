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
import ReportAuditList from './ReportAuditList';

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
        <ReportAuditList
          items={accessibilityAudits || []}
          title="Lighthouse Accessibility Issues"
          explanationField="description"
          emptyMessage="No Lighthouse accessibility issues found."
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
          title="AI-Explained Accessibility Issues"
          explanationField="llmExplanation"
          emptyMessage="No AI-explained accessibility issues found."
          initialVisibleCount={5}
          itemClassName="p-3 sm:p-4 bg-white rounded-md sm:rounded-lg shadow border border-slate-200"
          showStatus={true}
        />
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
