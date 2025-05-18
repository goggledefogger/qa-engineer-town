import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, OverallScoreGauge, MetricDisplay } from '../ui';
import type { LighthouseReportData, ReportData, LLMExplainedAuditItem } from '../../types/report';
import { lighthouseMetricDetails } from '../../types/report'; // Import the metric details
import type { PerformanceCategory } from '../ui/MetricDisplay'; // Keep this for getCategory

interface PerformanceSectionProps {
  lighthouseReport: LighthouseReportData | undefined;
  reportStatus: ReportData['status'];
}

const PerformanceSection: React.FC<PerformanceSectionProps> = ({ lighthouseReport, reportStatus }) => {
  const perfScores = lighthouseReport?.scores;
  const detailedMetrics = lighthouseReport?.detailedMetrics;
  const performanceOpportunities = lighthouseReport?.performanceOpportunities;
  const llmExplainedOpportunities = lighthouseReport?.llmExplainedPerformanceOpportunities;

  const noDataYet =
    (!detailedMetrics || Object.keys(detailedMetrics).length === 0) &&
    (!performanceOpportunities || performanceOpportunities.length === 0) &&
    perfScores?.performance === undefined; // Check undefined specifically, as 0 is a valid score

  if (!lighthouseReport && (reportStatus === 'pending' || reportStatus === 'processing')) {
    return (
      <Card title="Performance (Lighthouse)" className="font-sans">
        <p className="text-slate-600 text-center py-8">Performance details will appear here when scan is complete.</p>
      </Card>
    );
  }

  if (lighthouseReport?.error && noDataYet) {
    return (
      <Card title="Performance (Lighthouse)" className="font-sans">
        <p className="text-red-600 mt-4 text-sm text-center">Lighthouse Performance check error: {lighthouseReport.error}</p>
      </Card>
    );
  }

  return (
    <Card title="Performance (Lighthouse)" className="font-sans">
      <div className="flex flex-col items-center mb-8">
        <OverallScoreGauge score={perfScores?.performance} categoryName="Overall Performance" />
      </div>

      {detailedMetrics && Object.keys(detailedMetrics).length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">Core Web Vitals & Key Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(detailedMetrics).map(([key, value]) => {
              const metricConfig = lighthouseMetricDetails[key as keyof typeof lighthouseMetricDetails];
              if (!metricConfig || value === undefined) return null;
              return (
                <MetricDisplay
                  key={key}
                  metricName={metricConfig.name}
                  value={value}
                  unit={metricConfig.unit}
                  category={metricConfig.getCategory(value as number) as PerformanceCategory}
                  explanation={metricConfig.explanation}
                  thresholds={metricConfig.thresholds}
                />
              );
            })}
          </div>
        </div>
      )}

      {performanceOpportunities && performanceOpportunities.length > 0 && (
        <div className="mb-4 mt-8">
          <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">Top Performance Opportunities</h3>
          <ul className="space-y-3 list-none p-0">
            {performanceOpportunities.map((opp) => (
              <li key={opp.id} className="p-4 bg-slate-50 rounded-lg shadow border border-slate-200 hover:shadow-md transition-shadow">
                <h5 className="font-semibold text-slate-800 mb-1">{opp.title}</h5>
                <div className="flex flex-wrap text-xs text-slate-500 mb-1.5 space-x-3">
                  {opp.overallSavingsMs !== undefined && (
                    <p>Est. savings: <span className="font-medium">{opp.overallSavingsMs.toLocaleString()} ms</span></p>
                  )}
                  {opp.overallSavingsBytes !== undefined && (
                    <p>Est. savings: <span className="font-medium">{(opp.overallSavingsBytes / 1024).toFixed(1)} KiB</span></p>
                  )}
                </div>
                <div className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:font-mono">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{opp.description}</ReactMarkdown>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(performanceOpportunities && performanceOpportunities.length > 0 || llmExplainedOpportunities) && (
        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-xl font-semibold text-slate-800 mb-4 text-center">Simplified Explanations & Advice (AI-Powered)</h3>
          {(!llmExplainedOpportunities || llmExplainedOpportunities.length === 0) &&
           (reportStatus === 'processing' || reportStatus === 'pending') &&
           (performanceOpportunities && performanceOpportunities.length > 0) && (
            <p className="text-slate-500 text-center py-4">Generating enhanced performance advice... This may take a few moments.</p>
          )}
          {llmExplainedOpportunities && llmExplainedOpportunities.length > 0 && (
            <ul className="space-y-4 list-none p-0">
              {llmExplainedOpportunities.map((explainedOpp) => (
                <li key={explainedOpp.id} className="p-4 bg-white rounded-lg shadow border border-slate-200">
                  <h5 className="font-semibold text-sky-700 mb-2">Enhanced Look: {explainedOpp.title}</h5>
                  {explainedOpp.status === 'pending' && <p className="text-sm text-slate-500 italic">Loading explanation...</p>}
                  {explainedOpp.status === 'error' && <p className="text-sm text-red-500">Error loading explanation: {explainedOpp.error}</p>}
                  {explainedOpp.status === 'completed' && explainedOpp.llmExplanation && (
                    <div className="text-sm text-slate-700 prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-medium prose-h3:text-base prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:font-mono">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{explainedOpp.llmExplanation}</ReactMarkdown>
                    </div>
                  )}
                  {explainedOpp.status === 'completed' && !explainedOpp.llmExplanation && (
                      <p className="text-sm text-slate-500 italic">Enhanced explanation was processed but is empty.</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {llmExplainedOpportunities?.length === 0 && reportStatus === 'complete' &&
           (performanceOpportunities && performanceOpportunities.length > 0) && (
              <p className="text-slate-500 text-center py-4">No enhanced performance advice generated or available for these opportunities.</p>
          )}
        </div>
      )}

      {noDataYet && !(reportStatus === 'pending' || reportStatus === 'processing') && !lighthouseReport?.error && (
        <p className="text-slate-600 text-center py-8">Performance data is not available for this report, or no specific metrics/opportunities were found.</p>
      )}
      {lighthouseReport?.error && !noDataYet && (
         <p className="text-red-600 mt-4 text-sm text-center">Lighthouse Performance check error: {lighthouseReport.error} (Some data might still be displayed)</p>
      )}
    </Card>
  );
};

export default PerformanceSection;
