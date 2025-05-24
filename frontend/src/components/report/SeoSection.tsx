import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, OverallScoreGauge } from '../ui';
import type { LighthouseReportData, ReportData } from '../../types/reportTypes';
import { unwrapMarkdown } from '../../utils/textUtils';
import ReportAuditList from './ReportAuditList';

interface SeoSectionProps {
  lighthouseReport?: LighthouseReportData;
  reportStatus?: ReportData['status'];
}

const SeoSection: React.FC<SeoSectionProps> = ({ lighthouseReport, reportStatus }) => {
  // Simplified initial checks
  if (reportStatus === 'pending' || reportStatus === 'processing') {
    return <Card title="SEO Audit"><p className="text-slate-500">SEO analysis is pending or in progress...</p></Card>;
  }

  if (lighthouseReport?.success === false && lighthouseReport.error) {
    return <Card title="SEO Audit"><p className="text-red-500">SEO analysis failed: {lighthouseReport.error}</p></Card>;
  }

  if (reportStatus === 'failed') {
    return <Card title="SEO Audit"><p className="text-red-500">SEO analysis could not be completed due to a report failure.</p></Card>;
  }

  // If report is completed or in an unknown state, but no specific Lighthouse error, try to display data
  const seoScore = lighthouseReport?.scores?.seo;
  const seoAudits = lighthouseReport?.seoAudits;
  const llmExplainedAudits = lighthouseReport?.llmExplainedSeoAudits;

  if (typeof seoScore === 'undefined' &&
      (!seoAudits || seoAudits.length === 0) &&
      (!llmExplainedAudits || llmExplainedAudits.length === 0)) {
    // This condition means no score, no raw audits, and no LLM-explained audits.
    // It also covers cases where lighthouseReport might be undefined but status is 'completed'.
    return <Card title="SEO Audit"><p className="text-slate-500">No SEO data or audits are available for this report.</p></Card>;
  }

  return (
    <Card title="SEO">
      {typeof seoScore === 'number' && (
        <div className="flex flex-col items-center mb-8">
          <OverallScoreGauge score={seoScore} categoryName="SEO" />
        </div>
      )}

      <ReportAuditList
        items={seoAudits || []}
        title="Lighthouse SEO Audits"
        explanationField="description"
        emptyMessage="No Lighthouse SEO audits found."
        initialVisibleCount={5}
      />
      <ReportAuditList
        items={
          (llmExplainedAudits || []).map(item => ({
            ...item,
            status: item.status === "pending" || item.status === "error" ? item.status : undefined,
          }))
        }
        title="AI-Explained SEO Audits"
        explanationField="llmExplanation"
        emptyMessage="No AI-explained SEO audits found."
        initialVisibleCount={5}
        itemClassName="p-3 sm:p-4 bg-white rounded-md sm:rounded-lg shadow border border-slate-200"
        showStatus={true}
      />
    </Card>
  );
};

export default SeoSection;
