// Component to display keyboard accessibility check results
import React from "react";
import type { AccessibilityKeyboardCheckResult, ScreenshotUrls } from "../../types/reportTypes"; // Added ScreenshotUrls
import ExpandableList from "../ui/ExpandableList"; // Import the new component
import { HighlightableImage } from "../ui"; // Import HighlightableImage

interface AccessibilityKeyboardCheckProps { // Renamed Props to be more specific
  result: AccessibilityKeyboardCheckResult;
  screenshotUrls?: ScreenshotUrls; // Added prop
}

const AccessibilityKeyboardCheck: React.FC<AccessibilityKeyboardCheckProps> = ({ result, screenshotUrls }) => { // Added screenshotUrls to destructuring
  const renderElementItem = (el: any, idx: number) => {
    // el is expected to be of type KeyboardCheckElement, which has boundingBox
    const hasHighlight = screenshotUrls?.desktop && el.boundingBox;

    return (
      <li key={idx} className="bg-slate-50 rounded p-3 border border-slate-200 mb-2">
        <div>
          <span className="font-mono text-xs text-slate-700">{el.selector}</span>
          {el.text && <span className="ml-2 text-slate-600">"{el.text.trim().slice(0, 40)}{el.text.trim().length > 40 ? '...' : ''}"</span>}
        </div>
        {hasHighlight && (
          <div className="mt-2 border-t border-slate-200 pt-2">
            <HighlightableImage
              src={screenshotUrls.desktop!}
              highlights={[el.boundingBox]}
              alt={`Highlight for element ${el.selector}`}
              containerClassName="max-w-full sm:max-w-md mx-auto rounded overflow-hidden shadow-md"
              imageClassName="w-full h-auto"
              highlightClassName="absolute border-2 border-yellow-400 bg-yellow-400 bg-opacity-30"
            />
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="mt-8 pt-6 border-t border-slate-200">
      <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4 text-center">
        Keyboard Accessibility Checks
      </h3>
      {result.error && (
        <p className="text-red-500">Error: {result.error}</p>
      )}
      <div className="mb-4">
        <strong>Tab Order Matches DOM Order:</strong>{" "}
        <span className={result.tabOrderMatchesDomOrder ? "text-green-700" : "text-red-700"}>
          {result.tabOrderMatchesDomOrder ? "Yes" : "No"}
        </span>
      </div>

      <ExpandableList
        items={result.notReachableByTab || []}
        renderItem={renderElementItem}
        title="Elements Not Reachable by Tab"
        emptyMessage="All interactive elements are reachable by tab."
        initialVisibleCount={5}
        itemKey={(item, idx) => item.selector + idx}
      />

      <div className="mt-6">
        <ExpandableList
          items={result.focusOrder || []}
          renderItem={renderElementItem}
          title="Tab Focus Order"
          emptyMessage="No elements in tab focus order."
          initialVisibleCount={5}
          itemKey={(item, idx) => item.selector + `focus-${idx}`}
        />
      </div>

      <div className="mt-6">
        <ExpandableList
          items={result.domOrder || []}
          renderItem={renderElementItem}
          title="DOM Order of Interactive Elements"
          emptyMessage="No interactive elements found in DOM."
          initialVisibleCount={5}
          itemKey={(item, idx) => item.selector + `dom-${idx}`}
        />
      </div>
    </div>
  );
};

export default AccessibilityKeyboardCheck;
