import React from 'react';

interface ReportPageLayoutProps {
  sidebarContent: React.ReactNode;
  mainContent: React.ReactNode;
}

const ReportPageLayout: React.FC<ReportPageLayoutProps> = ({ sidebarContent, mainContent }) => {
  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      <aside className="w-full md:w-64 lg:w-72 flex-shrink-0">
        <div className="sticky top-6 bg-white shadow-sm rounded-lg p-4">
          {sidebarContent}
        </div>
      </aside>
      <section className="flex-grow min-w-0">
        {/* Main content will often be a series of Cards or other components */}
        {mainContent}
      </section>
    </div>
  );
};

export default ReportPageLayout;
