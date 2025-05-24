import React from "react";
import ExpandableList from "../ui/ExpandableList"; // Import the new component

interface NameAndStateCheckResult {
  elementsMissingName: Array<{
    selector: string;
    tag: string;
    id: string | null;
    className: string | null;
    role: string | null;
    type: string | null;
    text: string;
  }>;
  elementsMissingState: Array<{
    selector: string;
    tag: string;
    id: string | null;
    className: string | null;
    role: string | null;
    type: string | null;
    text: string;
    missingStates: string[];
  }>;
  error?: string;
}

const AccessibilityNameAndStateCheck: React.FC<{ result: NameAndStateCheckResult }> = ({ result }) => {
  if (result.error) {
    return (
      <div className="mt-8 pt-6 border-t border-red-200">
        <h3 className="text-lg sm:text-xl font-semibold text-red-700 mb-3 sm:mb-4 text-center">
          Error in Name/State Accessibility Check
        </h3>
        <p className="text-red-500">{result.error}</p>
      </div>
    );
  }

  const elementsMissingName = result.elementsMissingName || [];
  const elementsMissingState = result.elementsMissingState || [];

  const renderMissingNameItem = (el: any, idx: number) => (
    <li key={`${el.tag}-${el.id || idx}`} className="bg-slate-50 rounded p-3 border border-slate-200">
      <div className="font-medium text-slate-700">
        <span className="font-mono text-sm bg-slate-200 px-1 rounded">{el.tag}</span>
        {el.id && <span className="font-mono text-sm text-purple-700">#{el.id}</span>}
        {el.text && <span className="ml-2 text-slate-600 italic">"{el.text.substring(0, 100)}{el.text.length > 100 ? '...' : ''}"</span>}
      </div>
      <div className="text-xs text-slate-500 mt-1">
        {el.role && <span className="mr-2">Role: <code className="bg-slate-100 px-0.5 rounded">{el.role}</code></span>}
        {el.type && <span>Type: <code className="bg-slate-100 px-0.5 rounded">{el.type}</code></span>}
      </div>
    </li>
  );

  const renderMissingStateItem = (el: any, idx: number) => (
    <li key={`${el.tag}-${el.id || idx}-state`} className="bg-slate-50 rounded p-3 border border-slate-200">
      <div className="font-medium text-slate-700">
        <span className="font-mono text-sm bg-slate-200 px-1 rounded">{el.tag}</span>
        {el.id && <span className="font-mono text-sm text-purple-700">#{el.id}</span>}
        {el.text && <span className="ml-2 text-slate-600 italic">"{el.text.substring(0,100)}{el.text.length > 100 ? '...' : ''}"</span>}
      </div>
      <div className="text-xs text-slate-500 mt-1 mb-1">
        {el.role && <span className="mr-2">Role: <code className="bg-slate-100 px-0.5 rounded">{el.role}</code></span>}
        {el.type && <span>Type: <code className="bg-slate-100 px-0.5 rounded">{el.type}</code></span>}
      </div>
      <div className="text-sm text-red-600">
        Missing attributes: <span className="font-semibold">{el.missingStates.join(", ")}</span>
      </div>
    </li>
  );

  return (
    <div className="mt-8 pt-6 border-t border-slate-200">
      <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4 text-center">
        Interactive Elements: Accessible Name & State
      </h3>
      {elementsMissingName.length === 0 && elementsMissingState.length === 0 ? (
        <p className="text-green-700 text-center">All interactive elements have accessible names and required ARIA state attributes.</p>
      ) : (
        <>
          {elementsMissingName.length > 0 && (
            <div className="mb-6">
              <ExpandableList
                items={elementsMissingName}
                renderItem={renderMissingNameItem}
                title="Elements Missing Accessible Name"
                emptyMessage="None"
                initialVisibleCount={5}
                itemKey={(item, idx) => `${item.tag}-${item.id || idx}`}
              />
            </div>
          )}
          {elementsMissingState.length > 0 && (
            <div>
              <ExpandableList
                items={elementsMissingState}
                renderItem={renderMissingStateItem}
                title="Elements Missing ARIA State Attributes"
                emptyMessage="None"
                initialVisibleCount={5}
                itemKey={(item, idx) => `${item.tag}-${item.id || idx}-state`}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AccessibilityNameAndStateCheck;
