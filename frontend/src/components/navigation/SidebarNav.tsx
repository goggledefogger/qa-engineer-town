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
  { id: 'screenshot', label: 'Screenshot' },
  { id: 'performance', label: 'Performance' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'seo', label: 'SEO' },
  { id: 'best-practices', label: 'Best Practices' },
  { id: 'ai-ux-design', label: 'AI UX & Design Insights' },
];

interface SidebarNavProps {
  activeSection?: string; // To highlight the active section
  onSelectSection?: (sectionId: string) => void; // Callback when a section is clicked
}

const SidebarNav: React.FC<SidebarNavProps> = ({ activeSection, onSelectSection }) => {
  return (
    <nav>
      <h3 className="px-3 text-xs font-semibold uppercase text-slate-500 tracking-wider mb-3">
        Report Sections
      </h3>
      <ul className="space-y-1 list-none p-0 m-0">
        {reportSections.map((section) => (
          <li key={section.id}>
            <button
              onClick={() => onSelectSection?.(section.id)}
              className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150
                ${
                  activeSection === section.id
                    ? 'bg-blue-100 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }
              `}
            >
              {section.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default SidebarNav;
