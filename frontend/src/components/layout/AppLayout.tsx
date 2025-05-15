import React from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col">
      {/* Header could go here if we had one application-wide */}
      {/* <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-slate-900">AI QA Engineer</h1>
        </div>
      </header> */}
      <main className="flex-grow w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
      {/* Footer could go here */}
      {/* <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} AI QA Engineer Assistant
        </div>
      </footer> */}
    </div>
  );
};

export default AppLayout;
