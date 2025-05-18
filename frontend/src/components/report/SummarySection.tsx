import React from 'react';
import { Card } from '../ui';
import type { ReportData } from '../../types/report';

interface SummarySectionProps {
  reportData: ReportData | null;
}

// Helper for consistent label-value pairs, copied from ReportPage
const DetailItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <p className="text-sm text-slate-700">
    <span className="font-semibold text-slate-800">{label}:</span> {children}
  </p>
);

const SummarySection: React.FC<SummarySectionProps> = ({ reportData }) => {
  if (!reportData) {
    // This case should ideally be handled by the parent,
    // but as a fallback or if used in a context where reportData might be null initially:
    return (
      <Card title="Scan Summary" className="font-sans">
        <p className="text-slate-600">Loading summary information...</p>
      </Card>
    );
  }

  return (
    <Card title="Scan Summary" className="font-sans">
      <div className="space-y-2">
        <DetailItem label="Status">
          <span className={`capitalize font-medium
            ${
              reportData.status === 'pending' ? 'text-amber-600' :
              reportData.status === 'processing' ? 'text-blue-600' :
              reportData.status === 'complete' ? 'text-green-600' :
              reportData.status === 'error' ? 'text-red-600' : 'text-slate-600'
            }
          `}>{reportData.status}</span>
        </DetailItem>
        <DetailItem label="URL">
          <a href={reportData.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
            {reportData.url}
          </a>
        </DetailItem>
        <DetailItem label="Created">{new Date(reportData.createdAt).toLocaleString()}</DetailItem>
        {reportData.completedAt && <DetailItem label="Completed">{new Date(reportData.completedAt).toLocaleString()}</DetailItem>}
        {reportData.errorMessage && <DetailItem label="Error"><span className="text-red-600">{reportData.errorMessage}</span></DetailItem>}
      </div>
    </Card>
  );
};

export default SummarySection;
