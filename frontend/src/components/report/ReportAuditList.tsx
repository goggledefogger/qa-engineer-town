// ReportAuditList.tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ExpandableList } from '../ui';
import { unwrapMarkdown } from '../../utils/textUtils';

interface ReportAuditItem {
  id: string;
  title: string;
  description?: string;
  llmExplanation?: string;
  status?: 'pending' | 'error';
  error?: string;
}

interface ReportAuditListProps {
  items: ReportAuditItem[];
  title: string;
  explanationField?: 'description' | 'llmExplanation';
  emptyMessage?: string;
  initialVisibleCount?: number;
  itemClassName?: string;
  markdownClassName?: string;
  showStatus?: boolean;
}

const ReportAuditList: React.FC<ReportAuditListProps> = ({
  items,
  title,
  explanationField = 'description',
  emptyMessage = 'No issues found.',
  initialVisibleCount = 5,
  itemClassName = 'p-3 sm:p-4 bg-slate-50 rounded-md sm:rounded-lg shadow border border-slate-200',
  markdownClassName = 'text-sm sm:text-base text-slate-700 prose prose-sm sm:prose-base max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-medium prose-h3:text-base prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:rounded prose-code:font-mono',
  showStatus = false,
}) => {
  if (!items || items.length === 0) {
    return null;
  }
  return (
    <div className="mt-8 pt-6 border-t border-slate-200">
      <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 sm:mb-4 text-center">
        {title}
      </h3>
      <ExpandableList
        items={items}
        renderItem={(item: ReportAuditItem) => (
          <li key={item.id} className={itemClassName}>
            <h5 className="font-semibold text-sky-700 mb-1 sm:mb-2 text-base sm:text-lg">
              {item.title}
            </h5>
            {item[explanationField] && (
              <div className={markdownClassName}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {unwrapMarkdown(item[explanationField] as string)}
                </ReactMarkdown>
              </div>
            )}
            {showStatus && (
              <>
                {item.status === 'pending' && (
                  <p className="text-xs text-slate-400 mt-1">
                    AI explanation pending...
                  </p>
                )}
                {item.status === 'error' && item.error && (
                  <p className="text-xs text-red-500 mt-1">
                    AI explanation error: {item.error}
                  </p>
                )}
              </>
            )}
          </li>
        )}
        emptyMessage={emptyMessage}
        initialVisibleCount={initialVisibleCount}
        itemKey={(item: ReportAuditItem) => item.id}
      />
    </div>
  );
};

export default ReportAuditList;
