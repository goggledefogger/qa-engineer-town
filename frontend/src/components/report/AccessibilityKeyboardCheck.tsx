// Component to display keyboard accessibility check results
import React from "react";
import type { AccessibilityKeyboardCheckResult, ScreenshotUrls, KeyboardCheckElement } from "../../types/reportTypes";
import ExpandableList from "../ui/ExpandableList";
// HighlightableImage import removed as it's no longer used directly in this component
import { useHighlight } from "../../contexts";

interface AccessibilityKeyboardCheckProps {
  result: AccessibilityKeyboardCheckResult;
  screenshotUrls?: ScreenshotUrls; // Kept for potential future use or if hasScreenshotAndBoundingBox logic is retained for other purposes
}

const AccessibilityKeyboardCheck: React.FC<AccessibilityKeyboardCheckProps> = ({ result, screenshotUrls }) => {
  const { setActiveHighlight } = useHighlight();

  const renderElementItem = (el: KeyboardCheckElement, idx: number) => {
    // const hasScreenshotAndBoundingBox = screenshotUrls?.desktop && el.boundingBox; // This variable is no longer needed for rendering inline image

    const handleMouseEnter = () => {
      if (el.boundingBox) {
        setActiveHighlight(el.boundingBox);
      }
    };

    const handleMouseLeave = () => {
      setActiveHighlight(null);
    };

    return (
      <li key={idx} className="bg-slate-50 rounded p-3 border border-slate-200 mb-2">
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="cursor-default p-2 hover:bg-slate-100 transition-colors duration-150 rounded" 
        >
          <div>
            <span className="font-mono text-xs text-slate-700">{el.selector}</span>
            {el.text && <span className="ml-2 text-slate-600">"{el.text.trim().slice(0, 40)}{el.text.trim().length > 40 ? '...' : ''}"</span>}
          </div>
          {/* Inline HighlightableImage and its wrapper div removed */}
        </div>
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
