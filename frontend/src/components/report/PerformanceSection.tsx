import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, OverallScoreGauge, MetricDisplay, ExpandableList } from '../ui';
import type { LighthouseReportData, ReportData, LLMExplainedAuditItem } from '../../types/reportTypes';
import { lighthouseMetricDetails } from '../../types/reportTypes';
import type { PerformanceCategory } from '../ui/MetricDisplay';
import { unwrapMarkdown } from '../../utils/textUtils';
import ReportAuditList from './ReportAuditList';

interface PerformanceSectionProps {
  lighthouseReport?: LighthouseReportData;
  reportStatus?: ReportData['status'];
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
        <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4 text-center">
          Core Web Vitals & Key Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
    // Compose items array as before
    const items: Array<LLMExplainedAuditItem & { rawDescription?: string; overallSavingsMs?: number; overallSavingsBytes?: number }> = [];

    if (rawOpportunities && rawOpportunities.length > 0) {
      rawOpportunities.forEach(rawOpp => {
        const llmOpp = llmExplainedOpportunities?.find(lo => lo.id === rawOpp.id);
        if (llmOpp) {
          items.push({
            ...llmOpp,
            rawDescription: rawOpp.description,
            overallSavingsMs: rawOpp.overallSavingsMs,
            overallSavingsBytes: rawOpp.overallSavingsBytes,
          });
        } else {
          items.push({
            id: rawOpp.id,
            title: rawOpp.title,
            llmExplanation: rawOpp.description,
            status: reportStatus === 'processing' || reportStatus === 'pending' ? 'pending' : 'completed',
            rawDescription: rawOpp.description,
            overallSavingsMs: rawOpp.overallSavingsMs,
            overallSavingsBytes: rawOpp.overallSavingsBytes,
          });
        }
      });
    } else if (llmExplainedOpportunities && llmExplainedOpportunities.length > 0) {
      llmExplainedOpportunities.forEach(llmOpp => items.push(llmOpp));
    }

    if (items.length === 0) {
      if (reportStatus === 'completed' && lighthouseReport?.success) {
        if (!lighthouseReport?.performanceOpportunities || lighthouseReport.performanceOpportunities.length === 0) {
          return <p className="text-slate-600 text-center py-4">No specific performance opportunities found by Lighthouse.</p>;
        }
      }
      return null;
    }

    // Map status for ReportAuditList
    const mappedItems = items.map(item => ({
      ...item,
      status: item.status === "pending" || item.status === "error" ? item.status : undefined,
      description: item.rawDescription,
    }));

    return (
      <ReportAuditList
        items={mappedItems}
        title="Performance Opportunities & AI Advice"
        explanationField="llmExplanation"
        emptyMessage="No specific performance opportunities found by Lighthouse."
        initialVisibleCount={5}
        itemClassName="p-3 sm:p-4 bg-white rounded-md sm:rounded-lg shadow border border-slate-200"
        showStatus={true}
      />
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
    if (reportStatus === 'failed') {
      return <p className="text-red-500 text-center py-8">Performance analysis could not be completed or data is unavailable.</p>;
    }

    // State 4: Data display phase
    // At this point, reportStatus is 'processing' (with lighthouseReport available), or 'complete'.

    const hasPerformanceScore = typeof lighthouseReport?.scores?.performance === 'number';
    const hasDetailedMetrics = lighthouseReport?.detailedMetrics && Object.keys(lighthouseReport.detailedMetrics).length > 0;

    // If the report is fully complete, Lighthouse was successful, but absolutely no performance data was found.
    if (reportStatus === 'completed' && lighthouseReport?.success === true &&
        !hasPerformanceScore && !hasDetailedMetrics &&
        (!lighthouseReport?.performanceOpportunities || lighthouseReport.performanceOpportunities.length === 0)) {
      return <p className="text-slate-500 text-center py-8">No performance data available for this report.</p>;
    }

    const hasNonPerfectAudits = lighthouseReport?.nonPerfectPerformanceAudits && lighthouseReport.nonPerfectPerformanceAudits.length > 0;
    const showScoreReasoningBanner =
      hasPerformanceScore &&
      lighthouseReport?.scores?.performance! < 100 &&
      (!rawOpportunities || rawOpportunities.length === 0) &&
      hasNonPerfectAudits;

    const renderNonPerfectAudits = () => {
      if (!hasNonPerfectAudits) return null;

      const renderAuditItem = (audit: {
        id: string;
        title: string;
        score?: number | null;
        displayValue?: string;
        numericValue?: number;
        explanation?: string;
        description: string;
      }, _idx: number) => (
        <li className="p-3 sm:p-4 bg-white rounded-md sm:rounded-lg shadow border border-slate-200">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sky-700 text-base sm:text-lg">
              {audit.title}
            </span>
            {typeof audit.score === "number" && (
              <span className="text-xs text-slate-500">
                Score: {(audit.score * 100).toFixed(0)} / 100
              </span>
            )}
            {audit.displayValue && (
              <span className="text-xs text-slate-500">
                Value: {audit.displayValue}
              </span>
            )}
            {audit.numericValue !== undefined && !audit.displayValue && (
              <span className="text-xs text-slate-500">
                Value: {audit.numericValue}
              </span>
            )}
            {audit.explanation && (
              <span className="text-xs text-slate-500">
                {audit.explanation}
              </span>
            )}
            <div className="text-sm sm:text-base text-slate-700 mt-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {unwrapMarkdown(audit.description)}
              </ReactMarkdown>
            </div>
          </div>
        </li>
      );

      return (
        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4 text-center">
            Other Performance Factors
          </h3>
          <ExpandableList
            items={lighthouseReport!.nonPerfectPerformanceAudits!}
            renderItem={renderAuditItem}
            emptyMessage="No other performance factors to show."
            initialVisibleCount={5}
            itemKey={(item: {
              id: string;
              title: string;
              score?: number | null;
              displayValue?: string;
              numericValue?: number;
              explanation?: string;
              description: string;
            }) => item.id}
          />
        </div>
      );
    };

    return (
      <>
        {hasPerformanceScore && (
          <div className="flex flex-col items-center mb-8">
            <OverallScoreGauge score={lighthouseReport!.scores!.performance!} categoryName="Performance" />
          </div>
        )}
        {showScoreReasoningBanner && (
          <div className="mb-4 px-4 py-2 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded">
            Your performance score is not perfect because some metrics or audits are close to, but not at, the optimal range. See details below.
          </div>
        )}
        {renderDetailedMetrics()}
        {renderOpportunitiesList()}
        {renderNonPerfectAudits()}
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
