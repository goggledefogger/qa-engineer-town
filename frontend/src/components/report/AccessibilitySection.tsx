import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, OverallScoreGauge } from '../ui';
import type { LighthouseReportData, ReportData, LLMExplainedAuditItem } from '../../types/report';

interface AccessibilitySectionProps {
  lighthouseReport: LighthouseReportData | undefined;
  reportStatus: ReportData['status'];
}

const AccessibilitySection: React.FC<AccessibilitySectionProps> = ({ lighthouseReport, reportStatus }) => {
  const accessibilityScore = lighthouseReport?.scores?.accessibility;
  const accessibilityIssues = lighthouseReport?.accessibilityIssues;
  const llmExplainedIssues = lighthouseReport?.llmExplainedAccessibilityIssues;

  const noIssuesFound = accessibilityIssues && accessibilityIssues.length === 0;
  const hasExplicitError = lighthouseReport?.success === false && lighthouseReport?.error;

  if (!lighthouseReport && (reportStatus === 'pending' || reportStatus === 'processing')) {
    return (
      <Card title="Accessibility (Lighthouse)" className="font-sans">
        <div className="flex flex-col items-center mb-6">
          <OverallScoreGauge score={undefined} categoryName="Overall Accessibility" />
        </div>
        <p className="text-slate-600 text-center py-8">Accessibility issues will appear here when the scan is complete.</p>
      </Card>
    );
  }

  return (
    <Card title="Accessibility (Lighthouse)" className="font-sans">
      <div className="flex flex-col items-center mb-6">
        <OverallScoreGauge score={accessibilityScore} categoryName="Overall Accessibility" />
      </div>

      {accessibilityIssues && accessibilityIssues.length > 0 ? (
        <>
          <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">Identified Accessibility Issues</h3>
          <ul className="space-y-3 list-none p-0">
            {accessibilityIssues.map((issue) => (
              <li key={issue.id} className="p-3 bg-slate-50 rounded-md shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <h4 className="font-semibold text-md text-slate-800 mb-0.5">{issue.title}</h4>
                <p className="text-xs text-slate-500 mb-1.5 font-mono">ID: {issue.id} | Score: {issue.score === null ? 'N/A' : issue.score}</p>
                <div className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-200 prose-code:px-1 prose-code:rounded">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{issue.description}</ReactMarkdown>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : hasExplicitError ? (
        <p className="text-slate-600 text-center py-4">Accessibility check could not be completed due to an error: {lighthouseReport?.error}</p>
      ) : (reportStatus === 'processing' || reportStatus === 'pending') && !accessibilityScore ? (
        // If still processing AND no score yet, show pending message
        <p className="text-slate-600 text-center py-8">Accessibility issues will appear here when the scan is complete.</p>
      ) : accessibilityScore !== undefined && noIssuesFound ? (
        // If score is present and no issues, it means no issues were found
        <p className="text-slate-600 text-center py-4">No specific accessibility issues flagged by Lighthouse. Great job!</p>
      ) : (
        // Fallback for other states (e.g. report complete, but no accessibility data at all)
        <p className="text-slate-600 text-center py-4">Accessibility data is not available. The check might not have run or an unknown error occurred.</p>
      )}

      {/* This is a more specific error message if issues array is empty but there was a general LH error */}
      {lighthouseReport?.error && (!accessibilityIssues || accessibilityIssues.length === 0) && (
          <p className="text-red-600 mt-4 text-sm text-center">Lighthouse Accessibility check error: {lighthouseReport.error}</p>
      )}

      {/* LLM Enhanced Explanations for Accessibility Issues */}
      {(accessibilityIssues && accessibilityIssues.length > 0 || llmExplainedIssues) && (
        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">Simplified Explanations & Advice (AI-Powered)</h3>
          {(!llmExplainedIssues || llmExplainedIssues.length === 0) &&
           (reportStatus === 'processing' || reportStatus === 'pending') &&
           (accessibilityIssues && accessibilityIssues.length > 0) && (
            <p className="text-slate-500 text-center py-4">Generating enhanced accessibility advice... This may take a few moments.</p>
          )}
          {llmExplainedIssues && llmExplainedIssues.length > 0 && (
            <ul className="space-y-4 list-none p-0">
              {llmExplainedIssues.map((explainedIssue) => (
                <li key={explainedIssue.id} className="p-4 bg-white rounded-lg shadow border border-slate-200">
                  <h5 className="font-semibold text-sky-700 mb-2">Enhanced Look: {explainedIssue.title}</h5>
                  {explainedIssue.status === 'pending' && <p className="text-sm text-slate-500 italic">Loading explanation...</p>}
                  {explainedIssue.status === 'error' && <p className="text-sm text-red-500">Error loading explanation: {explainedIssue.error}</p>}
                  {explainedIssue.status === 'completed' && explainedIssue.llmExplanation && (
                    <div className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-medium prose-h3:text-base prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:font-mono">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{explainedIssue.llmExplanation}</ReactMarkdown>
                    </div>
                  )}
                  {explainedIssue.status === 'completed' && !explainedIssue.llmExplanation && (
                      <p className="text-sm text-slate-500 italic">Enhanced explanation was processed but is empty.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {llmExplainedIssues?.length === 0 && reportStatus === 'complete' &&
            (accessibilityIssues && accessibilityIssues.length > 0) && (
              <p className="text-slate-500 text-center py-4">No enhanced accessibility advice generated or available for these issues.</p>
          )}
        </div>
      )}
    </Card>
  );
};

export default AccessibilitySection;
