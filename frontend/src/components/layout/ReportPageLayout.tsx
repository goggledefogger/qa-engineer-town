import React from 'react';

interface ReportPageLayoutProps {
  sidebarContent: React.ReactNode;
  mainContent: React.ReactNode;
  sidebarCollapsed?: boolean;
}

const ReportPageLayout: React.FC<ReportPageLayoutProps> = ({
  sidebarContent,
  mainContent,
  sidebarCollapsed = false,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-6 h-full w-full">
      <aside
        className={`w-full flex-shrink-0 transition-all duration-200
          ${sidebarCollapsed ? "md:w-16 lg:w-20" : "md:w-64 lg:w-72"}
        `}
      >
        <div
          className={`sticky top-6 bg-white shadow-sm rounded-lg p-4 h-full transition-all duration-200
            ${sidebarCollapsed ? "px-2 py-4" : ""}
            overflow-y-auto max-h-[calc(100vh-3rem)]
          `}
        >
          {sidebarContent}
        </div>
      </aside>
      <section className="flex-grow min-w-0">
        {mainContent}
      </section>
    </div>
  );
};

export default ReportPageLayout;
