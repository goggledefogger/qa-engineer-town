import React from 'react';

import { ChartBarSquareIcon } from '@heroicons/react/24/outline';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import { CameraIcon } from '@heroicons/react/24/outline';
import { BoltIcon } from '@heroicons/react/24/outline';
import { EyeIcon } from '@heroicons/react/24/outline';
import { MagnifyingGlassCircleIcon } from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/outline';
import { LightBulbIcon } from '@heroicons/react/24/outline';
import { CpuChipIcon } from '@heroicons/react/24/outline';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const reportSections: NavItem[] = [
  { id: 'summary', label: 'Summary', icon: <DocumentTextIcon className="w-5 h-5" /> },
  { id: 'llm-summary', label: 'AI-Generated Overview', icon: <LightBulbIcon className="w-5 h-5" /> },
  { id: 'screenshot', label: 'Screenshot', icon: <CameraIcon className="w-5 h-5" /> },
  { id: 'performance', label: 'Performance', icon: <BoltIcon className="w-5 h-5" /> },
  { id: 'accessibility', label: 'Accessibility', icon: <EyeIcon className="w-5 h-5" /> },
  { id: 'seo', label: 'SEO', icon: <MagnifyingGlassCircleIcon className="w-5 h-5" /> },
  { id: 'best-practices', label: 'Best Practices', icon: <CheckBadgeIcon className="w-5 h-5" /> },
  { id: 'ai-ux-design', label: 'AI UX & Design Insights', icon: <ChartBarSquareIcon className="w-5 h-5" /> },
  { id: 'tech-stack', label: 'Tech Stack', icon: <CpuChipIcon className="w-5 h-5" /> },
];

export type SectionStatus = 'LOADING' | 'COMPLETED' | 'ERROR' | 'SKIPPED' | 'PENDING';

export interface SectionStatuses {
  [sectionId: string]: SectionStatus;
}

interface SidebarNavProps {
  activeSection?: string;
  onSelectSection?: (sectionId: string) => void;
  sectionStatuses?: SectionStatuses;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({
  activeSection,
  onSelectSection,
  sectionStatuses,
  collapsed = false,
  onToggleCollapse,
}) => {
  return (
    <nav className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 px-3">
        {!collapsed && (
          <h3 className="text-xs font-semibold uppercase text-slate-500 tracking-wider">
            Report Sections
          </h3>
        )}
        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggleCollapse}
          className="p-1 rounded hover:bg-slate-200 transition"
        >
          <svg
            className={`w-5 h-5 text-slate-500 transition-transform ${collapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5l-7 7 7 7" />
          </svg>
        </button>
      </div>
      <ul className="space-y-1 list-none p-0 m-0 flex-1">
        {reportSections.map((item) => {
          const isActive = activeSection === item.id;
          const status = sectionStatuses ? sectionStatuses[item.id] : 'PENDING';

          let statusClasses = "";
          let statusTextSuffix = "";

          switch (status) {
            case 'LOADING':
              statusClasses = "text-slate-400 italic";
              statusTextSuffix = " (loading...)";
              break;
            case 'ERROR':
              statusClasses = "text-red-500";
              statusTextSuffix = " (error)";
              break;
            case 'SKIPPED':
              statusClasses = "text-slate-400";
              statusTextSuffix = " (skipped)";
              break;
            case 'COMPLETED':
              statusClasses = isActive ? "text-blue-600 font-semibold" : "text-slate-700 hover:text-blue-600";
              break;
            case 'PENDING':
            default:
              statusClasses = isActive ? "text-blue-600 font-semibold" : "text-slate-500 hover:text-blue-600";
              break;
          }

          return (
            <li key={item.id}>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onSelectSection?.(item.id);
                }}
                className={`group flex items-center ${collapsed ? "justify-center" : ""} px-3 py-2 text-sm rounded-md transition-colors duration-150 ease-in-out
                  ${isActive ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-slate-100 border-l-4 border-transparent'}
                  ${statusClasses}
                `}
                title={collapsed ? item.label : undefined}
              >
                <span className="mr-0.5">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="ml-2">{item.label}</span>
                    {statusTextSuffix && <span className="text-xs ml-1.5 opacity-80">{statusTextSuffix}</span>}
                  </>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default SidebarNav;
