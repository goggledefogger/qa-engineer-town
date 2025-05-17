import React from 'react';

// TODO: Define a type for navigation items if they become more complex (e.g., with icons, hrefs)
interface NavItem {
  id: string;
  label: string;
  // href?: string; // For actual navigation later
  // icon?: React.ReactNode;
}

const reportSections: NavItem[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'llm-summary', label: 'AI-Generated Overview' },
  { id: 'screenshot', label: 'Screenshot' },
  { id: 'performance', label: 'Performance' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'seo', label: 'SEO' },
  { id: 'best-practices', label: 'Best Practices' },
  { id: 'ai-ux-design', label: 'AI UX & Design Insights' },
];

export type SectionStatus = 'LOADING' | 'COMPLETED' | 'ERROR' | 'SKIPPED' | 'PENDING';

export interface SectionStatuses {
  [sectionId: string]: SectionStatus;
}

interface SidebarNavProps {
  activeSection?: string; // To highlight the active section
  onSelectSection?: (sectionId: string) => void; // Callback when a section is clicked
  sectionStatuses?: SectionStatuses; // Optional prop to pass status of each section
}

const SidebarNav: React.FC<SidebarNavProps> = ({ activeSection, onSelectSection, sectionStatuses }) => {
  return (
    <nav>
      <h3 className="px-3 text-xs font-semibold uppercase text-slate-500 tracking-wider mb-3">
        Report Sections
      </h3>
      <ul className="space-y-1 list-none p-0 m-0">
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
              statusClasses = isActive ? "text-blue-600 font-semibold" : "text-slate-500 hover:text-blue-600"; // Slightly more muted for pending
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
                className={`group flex items-center px-3 py-2 text-sm rounded-md transition-colors duration-150 ease-in-out
                  ${isActive ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-slate-100 border-l-4 border-transparent'}
                  ${statusClasses}
                `}
              >
                {item.label}
                {statusTextSuffix && <span className="text-xs ml-1.5 opacity-80">{statusTextSuffix}</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default SidebarNav;
