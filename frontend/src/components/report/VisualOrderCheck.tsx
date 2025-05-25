import React from "react";
import type { VisualOrderResult, ScreenshotUrls, VisualOrderIssue } from '../../types/reportTypes'; // Added ScreenshotUrls and VisualOrderIssue
import ExpandableList from "../ui/ExpandableList"; // Import the new component
import { HighlightableImage } from "../ui"; // Import HighlightableImage

interface VisualOrderCheckProps { // New props interface
  result: VisualOrderResult;
  screenshotUrls?: ScreenshotUrls; // Added prop
}

const VisualOrderCheck: React.FC<VisualOrderCheckProps> = ({ result, screenshotUrls }) => { // Use new props and destructure screenshotUrls
  if (result.error) {
    return (
      <div className="mt-8 pt-6 border-t border-red-200">
        <h3 className="text-lg sm:text-xl font-semibold text-red-700 mb-3 sm:mb-4 text-center">
          Error in Visual Order Check
        </h3>
        <p className="text-red-500">{result.error}</p>
      </div>
    );
  }

  const issues = result.issues || [];

  const renderIssueItem = (issue: VisualOrderIssue, idx: number) => {
    const hasHighlight = screenshotUrls?.desktop && issue.element.boundingBox;
    return (
      <li key={`${issue.element.selector}-${idx}`} className="bg-slate-50 rounded p-4 border border-slate-200 shadow-sm mb-2">
        <div>
          <div className="font-medium text-slate-700 mb-2">
            <span className="font-mono text-sm bg-slate-200 px-1 rounded">{issue.element.tag}</span>
            {issue.element.textSnippet && <span className="ml-2 text-slate-600 italic">"{issue.element.textSnippet}{issue.element.textSnippet.length >= 100 ? '...' : ''}"</span>}
          </div>
          <div className="text-sm text-slate-600 mb-1">
            DOM Position: <span className="font-semibold">{issue.domIndex + 1}</span>
          </div>
          <div className="text-sm text-red-600 font-semibold">
            Visually Appears At: <span className="font-semibold">{issue.visualIndex + 1}</span>
          </div>
          <p className="text-sm text-slate-700 mt-2">{issue.reason}</p>
        </div>
        {hasHighlight && (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <HighlightableImage
              src={screenshotUrls.desktop!}
              highlights={[issue.element.boundingBox!]} // issue.element.boundingBox is checked by hasHighlight
              alt={`Highlight for visual order issue on ${issue.element.selector}`}
              containerClassName="max-w-full sm:max-w-md mx-auto rounded overflow-hidden shadow-md"
              imageClassName="w-full h-auto"
              highlightClassName="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-30" // Using blue for visual order issues
            />
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="mt-8 pt-6 border-t border-slate-200">
      <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4 text-center">
        Visual Order vs. DOM Order
      </h3>
      <ExpandableList
        items={issues}
        renderItem={renderIssueItem}
        emptyMessage="Visual order on the page generally follows the DOM order."
        initialVisibleCount={5}
        itemKey={(item, idx) => `${item.element.selector}-${idx}`}
      />
    </div>
  );
};

export default VisualOrderCheck;
