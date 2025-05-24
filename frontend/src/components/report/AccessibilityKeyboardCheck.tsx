// Component to display keyboard accessibility check results
import React from "react";
import type { AccessibilityKeyboardCheckResult } from "../../types/reportTypes";

interface Props {
  result: AccessibilityKeyboardCheckResult;
}

const ElementList: React.FC<{ elements?: Props["result"]["domOrder"]; label: string; emptyText?: string; className?: string }> = ({
  elements,
  label,
  emptyText = "None",
  className = "",
}) => {
  const safeElements = Array.isArray(elements) ? elements : [];
  return (
    <div className={className}>
      <strong>{label}</strong>
      {safeElements.length === 0 ? (
        <span className="ml-2 text-green-700">{emptyText}</span>
      ) : (
        <ul className="list-disc ml-6 mt-1 text-red-700">
          {safeElements.map((el, idx) => (
            <li key={idx}>
              <code>{el.selector}</code>
              {el.text && ` — "${el.text.trim().slice(0, 40)}"`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const OrderList: React.FC<{ elements?: Props["result"]["domOrder"]; label: string }> = ({
  elements,
  label,
}) => {
  const safeElements = Array.isArray(elements) ? elements : [];
  return (
    <details className="mb-2">
      <summary className="cursor-pointer text-blue-700 underline">{label}</summary>
      <ol className="list-decimal ml-6 mt-1 text-slate-700">
        {safeElements.map((el, idx) => (
          <li key={idx}>
            <code>{el.selector}</code>
            {el.text && ` — "${el.text.trim().slice(0, 40)}"`}
          </li>
        ))}
      </ol>
    </details>
  );
};

const AccessibilityKeyboardCheck: React.FC<Props> = ({ result }) => (
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
    <ElementList elements={result.notReachableByTab} label="Elements Not Reachable by Tab:" />
    <OrderList elements={result.focusOrder} label="Show Tab Focus Order" />
    <OrderList elements={result.domOrder} label="Show DOM Order of Interactive Elements" />
  </div>
);

export default AccessibilityKeyboardCheck;
