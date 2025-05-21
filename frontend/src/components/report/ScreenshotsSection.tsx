import React from 'react';
import { Card } from '../ui';
import type { PlaywrightReport, ScreenshotUrls, ReportData } from '../../types/reportTypes'; // <<< CORRECTED PATH

interface ScreenshotsSectionProps {
  playwrightReport: PlaywrightReport | undefined;
  reportStatus: ReportData['status']; // To show appropriate loading/pending messages
}

const ScreenshotsSection: React.FC<ScreenshotsSectionProps> = ({ playwrightReport, reportStatus }) => {
  const hasScreenshots = playwrightReport?.screenshotUrls && Object.values(playwrightReport.screenshotUrls).some(url => !!url);

  if (!playwrightReport && (reportStatus === 'pending' || reportStatus === 'processing')) {
    return (
      <Card title="Screenshots" className="font-sans">
        <p className="text-slate-600">Screenshots will appear here when scan is complete.</p>
      </Card>
    );
  }

  if (playwrightReport?.error) {
    return (
      <Card title="Screenshots" className="font-sans">
        <p className="text-red-600">Error capturing screenshots: {playwrightReport.error}</p>
      </Card>
    );
  }

  if (!hasScreenshots) {
    return (
      <Card title="Screenshots" className="font-sans">
        <p className="text-slate-600">No screenshots available for this report.</p>
        {playwrightReport && (
            <p className="text-xs text-orange-500 mt-2">
                Debug: Playwright report exists, but no valid screenshot URLs found. Status: {reportStatus}
            </p>
        )}
      </Card>
    );
  }

  return (
    <Card title="Screenshots" className="font-sans">
      {playwrightReport?.screenshotUrls && Object.values(playwrightReport.screenshotUrls).some(url => !!url) ? (
        <div className="space-y-8">
          {(Object.entries(playwrightReport.screenshotUrls) as Array<[keyof ScreenshotUrls, string]>)
            .filter(([, url]) => !!url) // Ensure URL is not null or empty
            .map(([device, url]) => (
            <div key={device} className="flex flex-col items-center">
              <h4 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 capitalize text-slate-700">
                {device} View
              </h4>
              <img
                src={url}
                alt={`Website Screenshot on ${device}`}
                className="max-w-full max-h-[70vh] rounded-md sm:rounded-lg shadow-lg border border-slate-300 object-contain bg-slate-100 p-1"
              />
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 sm:mt-4 text-xs sm:text-sm text-blue-600 hover:underline"
              >
                Open full size {device} screenshot
              </a>
            </div>
          ))}
        </div>
      ) : playwrightReport?.error ? (
        <p className="text-red-600">Error capturing screenshots: {playwrightReport.error}</p>
      ) : (
        // This part of the ternary might be redundant due to earlier checks, but kept for safety
        <p className="text-slate-600">Screenshots will appear here when scan is complete.</p>
      )}
       {/* Fallback / Debug message - this condition is mostly covered by the checks above now */}
      {playwrightReport && !(playwrightReport.screenshotUrls && Object.values(playwrightReport.screenshotUrls).some(url => !!url)) && !playwrightReport.error && (
        <p className="text-xs text-orange-500 mt-2">
            Playwright report present, but no screenshots found and no explicit error. Report Status: {reportStatus}
        </p>
      )}
    </Card>
  );
};

export default ScreenshotsSection;
