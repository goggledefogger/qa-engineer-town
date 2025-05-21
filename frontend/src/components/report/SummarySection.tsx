import React from 'react';
import { Card, DetailItem } from '../ui';
import type { ReportData } from '../../types/reportTypes';

interface SummarySectionProps {
  reportData: ReportData | null;
}

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
      <div className="space-y-2 sm:space-y-3">
        <DetailItem label="Status">
          <span
            className={`capitalize font-medium text-sm sm:text-base
            ${
              reportData.status === 'pending'
                ? 'text-amber-600'
                : reportData.status === 'processing'
                ? 'text-blue-600'
                : reportData.status === 'completed'
                ? 'text-green-600'
                : reportData.status === 'failed'
                ? 'text-red-600'
                : 'text-slate-600'
            }
          `}
          >
            {reportData.status}
          </span>
        </DetailItem>
        <DetailItem label="URL">
          <a
            href={reportData.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all text-sm sm:text-base"
          >
            {reportData.url}
          </a>
        </DetailItem>
        <DetailItem label="Created">
          <span className="text-sm sm:text-base">
            {new Date(reportData.createdAt).toLocaleString()}
          </span>
        </DetailItem>
        {reportData.completedAt && (
          <DetailItem label="Completed">
            <span className="text-sm sm:text-base">
              {new Date(reportData.completedAt).toLocaleString()}
            </span>
          </DetailItem>
        )}
        {reportData.errorMessage && (
          <DetailItem label="Error">
            <span className="text-red-600 text-sm sm:text-base">
              {reportData.errorMessage}
            </span>
          </DetailItem>
        )}
      </div>
    </Card>
  );
};

export default SummarySection;
