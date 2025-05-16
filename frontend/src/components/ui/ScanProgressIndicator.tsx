import React from 'react';

interface ScanProgressIndicatorProps {
  status: 'pending' | 'processing' | 'complete' | 'error' | string; // Allow any string for flexibility
  message?: string;
}

const ScanProgressIndicator: React.FC<ScanProgressIndicatorProps> = ({ status, message }) => {
  let statusMessage = message;
  let bgColor = 'bg-slate-100';
  let textColor = 'text-slate-700';
  let showSpinner = false;

  if (!statusMessage) {
    switch (status) {
      case 'pending':
        statusMessage = 'Scan is pending and will start shortly...';
        bgColor = 'bg-amber-100';
        textColor = 'text-amber-800';
        showSpinner = true;
        break;
      case 'processing':
        statusMessage = 'Scan is currently processing. Results will appear as they become available...';
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        showSpinner = true;
        break;
      case 'complete':
        // No global indicator needed for complete, sections will show data or their own messages.
        return null;
      case 'error':
        // Errors are usually handled more globally or within sections.
        return null;
      default:
        statusMessage = `Scan status: ${status}`;
        break;
    }
  }

  if (status === 'complete' || status === 'error') return null; // Don't show for terminal states

  return (
    <div className={`p-4 mb-6 rounded-md shadow ${bgColor} ${textColor} flex items-center font-sans`}>
      {showSpinner && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      <p>{statusMessage}</p>
    </div>
  );
};

export default ScanProgressIndicator;
