import React, { useMemo, useState } from 'react';
import { Input } from './forms'; // Corrected import path
import { Button } from './ui'; // Corrected import path
import {
  AI_PROVIDER_OPTIONS,
  AiProvider,
  getModelOptionsForProvider,
  getProviderCapabilities,
  getProviderLabel,
  resolveInitialModel,
  resolveInitialProvider,
} from '../config/aiProviders';

interface SelectedAiConfig {
  provider: AiProvider;
  model: string;
}

interface UrlInputFormProps {
  onSubmitUrl: (url: string, aiConfig: SelectedAiConfig) => void | Promise<void>; // Callback function to handle submission
  isSubmitting?: boolean; // Optional: To disable button during submission
  loadingAuth?: boolean; // Add prop for auth loading state
}

const UrlInputForm: React.FC<UrlInputFormProps> = ({ onSubmitUrl, isSubmitting = false, loadingAuth = false }) => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const envDefaultModels: Partial<Record<AiProvider, string | undefined>> = {
    gemini: import.meta.env.VITE_DEFAULT_GEMINI_MODEL as string | undefined,
    openai: import.meta.env.VITE_DEFAULT_OPENAI_MODEL as string | undefined,
    anthropic: import.meta.env.VITE_DEFAULT_ANTHROPIC_MODEL as string | undefined,
  };
  const initialProvider = resolveInitialProvider(import.meta.env.VITE_DEFAULT_AI_PROVIDER as string | undefined);
  const [selectedProvider, setSelectedProvider] = useState<AiProvider>(initialProvider);
  const [selectedModel, setSelectedModel] = useState<string>(() =>
    resolveInitialModel(initialProvider, envDefaultModels[initialProvider])
  );

  const providerModelOptions = useMemo(() => {
    const baseOptions = getModelOptionsForProvider(selectedProvider);
    if (!selectedModel) {
      return baseOptions;
    }
    if (baseOptions.some(option => option.value === selectedModel)) {
      return baseOptions;
    }
    const providerLabel = getProviderLabel(selectedProvider) ?? selectedProvider;
    return [...baseOptions, { value: selectedModel, label: `${selectedModel} (custom)`, provider: selectedProvider, note: `Custom for ${providerLabel}` }];
  }, [selectedProvider, selectedModel]);

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
    onSubmitUrl(submittedUrl, { provider: selectedProvider, model: selectedModel });
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
        <div className="grid gap-2 sm:gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
          <label htmlFor="aiProvider" className="block text-sm font-medium text-slate-700 sm:self-center">
            AI Provider
          </label>
          <select
            id="aiProvider"
            value={selectedProvider}
            onChange={(event) => {
              const nextProvider = event.target.value as AiProvider;
              setSelectedProvider(nextProvider);
              setSelectedModel(resolveInitialModel(nextProvider, envDefaultModels[nextProvider]));
            }}
            disabled={isSubmitting || loadingAuth}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {AI_PROVIDER_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.capabilities ? `${option.capabilities} ${option.label}` : option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 sm:col-span-2">
            Choose which AI provider powers the accessibility and design analysis.
          </p>
        </div>
        <div className="grid gap-2 sm:gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
          <label htmlFor="aiModel" className="block text-sm font-medium text-slate-700 sm:self-center">
            Model
          </label>
          <select
            id="aiModel"
            value={selectedModel}
            onChange={(event) => setSelectedModel(event.target.value)}
            disabled={isSubmitting || loadingAuth}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {providerModelOptions.map(option => {
              const capabilityBadge = option.capabilities || getProviderCapabilities(option.provider);
              const baseLabel = option.note ? `${option.label} (${option.note})` : option.label;
              return (
                <option key={option.value} value={option.value}>
                  {capabilityBadge ? `${capabilityBadge} ${baseLabel}` : baseLabel}
                </option>
              );
            })}
          </select>
          <p className="text-xs text-slate-500 sm:col-span-2">
            Pick a model optimized for your provider. Recent releases may yield deeper insights at higher cost.
          </p>
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
