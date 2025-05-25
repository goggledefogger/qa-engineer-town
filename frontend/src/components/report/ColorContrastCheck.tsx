import React from "react";
import type { ColorContrastResult, ScreenshotUrls, ContrastIssue } from '../../types/reportTypes';
import ExpandableList from "../ui/ExpandableList";
// HighlightableImage import removed
import { useHighlight } from "../../contexts";

interface ColorContrastCheckProps {
  result: ColorContrastResult;
  screenshotUrls?: ScreenshotUrls;
}

interface ColorSwatchProps {
  color: string;
}

const ColorSwatch: React.FC<ColorSwatchProps> = ({ color }) => (
  <span
    className="inline-block w-4 h-4 rounded-full border border-slate-300 align-middle mr-1"
    style={{ backgroundColor: color }}
    title={color}
  ></span>
);

const ColorContrastCheck: React.FC<ColorContrastCheckProps> = ({ result, screenshotUrls }) => {
  const { setActiveHighlight } = useHighlight();

  if (result.error) {
    return (
      <div className="mt-8 pt-6 border-t border-red-200">
        <h3 className="text-lg sm:text-xl font-semibold text-red-700 mb-3 sm:mb-4 text-center">
          Error in Color Contrast Check
        </h3>
        <p className="text-red-500">{result.error}</p>
      </div>
    );
  }

  const issues = result.issues || [];

  const renderIssueItem = (issue: ContrastIssue, idx: number) => {
    // const hasScreenshotAndBoundingBox = screenshotUrls?.desktop && issue.boundingBox; // No longer needed here

    const handleMouseEnter = () => {
      if (issue.boundingBox) {
        setActiveHighlight(issue.boundingBox);
      }
    };
    const handleMouseLeave = () => setActiveHighlight(null);

    return (
      <li key={issue.selector + idx} className="bg-slate-50 rounded p-4 border border-slate-200 shadow-sm mb-2">
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="cursor-default p-2 hover:bg-slate-100 transition-colors duration-150 rounded"
        >
          <div>
            <div className="font-medium text-slate-700 mb-2">
              <span className="font-mono text-sm bg-slate-200 px-1 rounded">{issue.selector.split('.')[0].split('#')[0]}</span>
              {issue.selector.includes('#') && <span className="font-mono text-sm text-purple-700">#{issue.selector.split('#')[1].split('.')[0]}</span>}
              {issue.textSnippet && <span className="ml-2 text-slate-600 italic">"{issue.textSnippet}{issue.textSnippet.length >= 100 ? '...' : ''}"</span>}
            </div>
            <div className="text-sm text-slate-600 mb-2">
              <p className="mb-1">
                <ColorSwatch color={issue.textColor} /> Text Color: <code className="bg-slate-100 px-0.5 rounded">{issue.textColor}</code>
              </p>
              <p>
                <ColorSwatch color={issue.backgroundColor} /> Background Color: <code className="bg-slate-100 px-0.5 rounded">{issue.backgroundColor}</code>
              </p>
            </div>
            <div className="text-sm text-red-600 font-semibold">
              Contrast Ratio: {issue.contrastRatio}:1 (Required: {issue.expectedRatio}:1)
            </div>
            {/* Visual Preview */}
            <div
              className="mt-3 p-2 rounded border border-slate-300 text-center"
              style={{
                backgroundColor: issue.backgroundColor,
                color: issue.textColor,
                fontSize: issue.fontSize,
                fontWeight: issue.fontWeight,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {issue.textSnippet || "Example Text"}
            </div>
          </div>
          {/* Inline HighlightableImage removed */}
        </div>
      </li>
    );
  };

  return (
    <div className="mt-8 pt-6 border-t border-slate-200">
      <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4 text-center">
        Color Contrast Issues
      </h3>
      <ExpandableList
        items={issues}
        renderItem={renderIssueItem}
        emptyMessage="All checked text elements meet minimum color contrast requirements."
        initialVisibleCount={5}
        itemKey={(item, idx) => item.selector + idx}
      />
    </div>
  );
};

export default ColorContrastCheck;
