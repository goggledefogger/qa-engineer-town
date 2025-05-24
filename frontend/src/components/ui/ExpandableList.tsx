import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/20/solid'; // Assuming Heroicons are available

interface ExpandableListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  initialVisibleCount?: number;
  title?: string;
  emptyMessage?: string;
  itemKey?: (item: T, index: number) => string; // Optional function to generate unique keys
}

const ExpandableList = <T,>({
  items,
  renderItem,
  initialVisibleCount = 5,
  title,
  emptyMessage = "No items to display.",
  itemKey,
}: ExpandableListProps<T>) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleItems = isExpanded ? items : items.slice(0, initialVisibleCount);
  const showToggleButton = items.length > initialVisibleCount;

  return (
    <div className="font-sans">
      {title && <h4 className="font-semibold text-sky-700 mb-2">{title}</h4>}
      {items.length === 0 ? (
        <p className="text-slate-500 italic">{emptyMessage}</p>
      ) : (
        <ul className="space-y-2">
          {visibleItems.map((item, index) => (
            <React.Fragment key={itemKey ? itemKey(item, index) : index}>
              {renderItem(item, index)}
            </React.Fragment>
          ))}
        </ul>
      )}

      {showToggleButton && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {isExpanded ? (
              <>
                Show Less <ChevronUpIcon className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
              </>
            ) : (
              <>
                Show More ({items.length - initialVisibleCount} hidden) <ChevronDownIcon className="ml-2 -mr-1 h-5 w-5" aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ExpandableList;
