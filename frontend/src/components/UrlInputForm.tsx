import React, { useState } from 'react';
import { Input } from './forms'; // Corrected import path
import { Button } from './ui'; // Corrected import path

interface UrlInputFormProps {
  onSubmitUrl: (url: string) => void; // Callback function to handle submission
  isSubmitting?: boolean; // Optional: To disable button during submission
  loadingAuth?: boolean; // Add prop for auth loading state
}

const UrlInputForm: React.FC<UrlInputFormProps> = ({ onSubmitUrl, isSubmitting = false, loadingAuth = false }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    let submittedUrl = url.trim();

    if (!submittedUrl) {
      setError("URL cannot be empty.");
      return;
    }

    // Check if a protocol seems missing entirely (no ://)
    if (!submittedUrl.includes('://')) {
        // Check if it looks like a domain name that needs a protocol prepended
        if (submittedUrl.includes('.') && !submittedUrl.includes(' ')) {
            submittedUrl = `https://${submittedUrl}`;
            console.log('Prepended https:// to URL:', submittedUrl); // Log for debugging
        } else {
            // Doesn't look like a domain needing a protocol
            setError("Invalid format. Include http(s):// or a valid domain.");
            return;
        }
    }

    // Now, validate the potentially modified URL
    try {
      const parsedUrl = new URL(submittedUrl);
      // Also explicitly check the protocol after parsing
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        setError("URL must use http or https protocol.");
        return;
      }
    } catch (e) {
      setError("Invalid URL format provided."); // Catch errors from new URL() e.g., ftp:
      return;
    }

    // If all checks pass, submit
    onSubmitUrl(submittedUrl);
  };

  return (
    <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-xl shadow-xl mx-auto self-center">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="urlInput" className="block text-sm font-medium text-slate-700 mb-1">
            Website URL
          </label>
          <Input
            type="text"
            id="urlInput"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="example.com or https://example.com"
            required
            disabled={isSubmitting || loadingAuth}
            className={`w-full ${error ? 'border-red-500 ring-red-500' : ''} ${isSubmitting || loadingAuth ? 'bg-slate-100' : ''}`}
            aria-describedby={error ? "url-error" : undefined}
          />
          {error && (
            <p id="url-error" className="mt-1.5 text-xs text-red-600">
              {error}
            </p>
          )}
        </div>
        <Button
          type="submit"
          disabled={isSubmitting || loadingAuth}
          className="w-full h-[42px] flex justify-center items-center"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Analyzing...</span>
            </>
          ) : (
            'Analyze Website'
          )}
        </Button>
      </form>
    </div>
  );
};

export default UrlInputForm;
