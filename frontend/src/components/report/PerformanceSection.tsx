import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, OverallScoreGauge, MetricDisplay } from '../ui';
import type { LighthouseReportData, ReportData, LLMExplainedAuditItem } from '../../types/report';
import { lighthouseMetricDetails } from '../../types/report';
import type { PerformanceCategory } from '../ui/MetricDisplay';
import { unwrapMarkdown } from '../../utils/textUtils';

interface PerformanceSectionProps {
  lighthouseReport: LighthouseReportData | undefined;
  reportStatus: ReportData['status'];
}

const PerformanceSection: React.FC<PerformanceSectionProps> = ({ lighthouseReport, reportStatus }) => {
  // const perfScores = lighthouseReport?.scores;
  const detailedMetrics = lighthouseReport?.detailedMetrics;
  const rawOpportunities = lighthouseReport?.performanceOpportunities;
  const llmExplainedOpportunities = lighthouseReport?.llmExplainedPerformanceOpportunities;
  // console.log('[PerformanceSection] Props:', { lighthouseReport, reportStatus });
  // console.log('[PerformanceSection] Raw Opps:', rawOpportunities, 'LLM Opps:', llmExplainedOpportunities);

  const renderDetailedMetrics = () => {
    if (!detailedMetrics || Object.keys(detailedMetrics).length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">Core Web Vitals & Key Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(detailedMetrics).map(([key, value]) => {
            const metricConfig = lighthouseMetricDetails[key as keyof typeof lighthouseMetricDetails];
            if (!metricConfig || typeof value !== 'number') return null;
            // Use getCategory from metricConfig directly
            const category = metricConfig.getCategory(value) as PerformanceCategory;
            return (
              <MetricDisplay
                key={key}
                metricName={metricConfig.name} // MetricDisplay expects metricName
                value={value}
                unit={metricConfig.unit}
                category={category}
                explanation={metricConfig.explanation}
                // thresholds={metricConfig.thresholds} // MetricDisplay doesn't take thresholds directly
              />
            );
          })}
        </div>
      </div>
    );
  };

  const renderOpportunitiesList = () => {
    const items: Array<LLMExplainedAuditItem & { rawDescription?: string; overallSavingsMs?: number; overallSavingsBytes?: number }> = [];

    if (rawOpportunities && rawOpportunities.length > 0) {
      rawOpportunities.forEach(rawOpp => {
        const llmOpp = llmExplainedOpportunities?.find(lo => lo.id === rawOpp.id);
        if (llmOpp) {
          items.push({
            ...llmOpp,
            rawDescription: rawOpp.description, // Keep raw description for fallback or context
            overallSavingsMs: rawOpp.overallSavingsMs,
            overallSavingsBytes: rawOpp.overallSavingsBytes,
          });
        } else {
          // Raw opportunity exists, but no corresponding LLM item yet (or ever, if processing skipped/failed for it)
          items.push({
            id: rawOpp.id,
            title: rawOpp.title,
            llmExplanation: rawOpp.description, // Display raw description as the main content
            status: reportStatus === 'processing' || reportStatus === 'pending' ? 'pending' : 'completed', // if main report is processing, AI is pending for this
            rawDescription: rawOpp.description,
            overallSavingsMs: rawOpp.overallSavingsMs,
            overallSavingsBytes: rawOpp.overallSavingsBytes,
          });
        }
      });
    } else if (llmExplainedOpportunities && llmExplainedOpportunities.length > 0) {
      // Only LLM opportunities are present (should not typically happen if rawOpportunities is the source of truth)
      // This case might indicate LLM items were added without corresponding raw items, or raw items cleared.
      // For safety, map them, though they might lack raw context like savings.
      llmExplainedOpportunities.forEach(llmOpp => items.push(llmOpp));
    }

    if (items.length === 0) {
      if (reportStatus === 'complete' && lighthouseReport?.success) {
         // Check if there were opportunities in the raw data, even if filtered out or not processed by LLM
        if (!lighthouseReport?.performanceOpportunities || lighthouseReport.performanceOpportunities.length === 0) {
            return <p className="text-slate-600 text-center py-4">No specific performance opportunities found by Lighthouse.</p>;
        }
      }
      return null; // No items, and not explicitly "no opportunities found" state
    }

    return (
      <div className="mt-8 pt-6 border-t border-slate-200">
        <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">Performance Opportunities & AI Advice</h3>
        <ul className="space-y-4 list-none p-0">
          {items.map((item) => {
            const explanationText = item.status === 'completed' && item.llmExplanation ? item.llmExplanation : item.rawDescription;
            const showPendingMessage = item.status === 'pending';
            const showError = item.status === 'error' && item.error;

            return (
              <li key={item.id} className="p-4 bg-white rounded-lg shadow border border-slate-200">
                <h5 className="font-semibold text-sky-700 mb-2">{item.title}</h5>
                {item.overallSavingsMs !== undefined && (
                    <p className="text-xs text-slate-500 mb-1.5">Est. savings: <span className="font-medium">{item.overallSavingsMs.toLocaleString()} ms</span></p>
                )}
                {item.overallSavingsBytes !== undefined && !(item.overallSavingsMs && item.overallSavingsMs > 0) && (
                    <p className="text-xs text-slate-500 mb-1.5">Est. savings: <span className="font-medium">{(item.overallSavingsBytes / 1024).toFixed(1)} KiB</span></p>
                )}

                {explanationText && (
                  <div className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-medium prose-h3:text-base prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:font-mono">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {unwrapMarkdown(explanationText)}
                    </ReactMarkdown>
                  </div>
                )}
                {showPendingMessage && (
                  <p className="text-xs text-slate-400 mt-2 italic">AI-powered explanation & advice pending...</p>
                )}
                {showError && (
                  <p className="text-xs text-red-500 mt-1">AI explanation error: {item.error}</p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const renderContent = () => {
    // State 1: Initial loading phase (waiting for any Lighthouse data)
    if (reportStatus === 'pending' || (reportStatus === 'processing' && !lighthouseReport)) {
      return <p className="text-slate-500 text-center py-8">Performance analysis in progress...</p>;
    }

    // State 2: Lighthouse explicitly failed
    if (lighthouseReport?.success === false && lighthouseReport.error) {
      return <p className="text-red-500 text-center py-8">Performance analysis failed: {lighthouseReport.error}</p>;
    }

    // State 3: Overall report generation error (and not a more specific Lighthouse error already shown)
    if (reportStatus === 'error') {
      return <p className="text-red-500 text-center py-8">Performance analysis could not be completed or data is unavailable.</p>;
    }

    // State 4: Data display phase
    // At this point, reportStatus is 'processing' (with lighthouseReport available), or 'complete'.

    const hasPerformanceScore = typeof lighthouseReport?.scores?.performance === 'number';
    const hasDetailedMetrics = lighthouseReport?.detailedMetrics && Object.keys(lighthouseReport.detailedMetrics).length > 0;

    // If the report is fully complete, Lighthouse was successful, but absolutely no performance data was found.
    if (reportStatus === 'complete' && lighthouseReport?.success === true &&
        !hasPerformanceScore && !hasDetailedMetrics &&
        (!lighthouseReport?.performanceOpportunities || lighthouseReport.performanceOpportunities.length === 0)) {
      return <p className="text-slate-500 text-center py-8">No performance data available for this report.</p>;
    }

    return (
      <>
        {hasPerformanceScore && (
          <div className="flex flex-col items-center mb-8">
            <OverallScoreGauge score={lighthouseReport!.scores!.performance!} categoryName="Performance" />
          </div>
        )}
        {renderDetailedMetrics()}
        {renderOpportunitiesList()}
      </>
    );
  };

  return (
    <Card title="Performance">
      {renderContent()}
    </Card>
  );
};

export default PerformanceSection;
