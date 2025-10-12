export type SupportedAiProvider = "gemini" | "openai" | "anthropic";

export interface AiProviderConfig {
  provider: SupportedAiProvider;
  model: string;
  apiKey: string;
}

export interface AiProviderResolution {
  config?: AiProviderConfig;
  error?: string;
  reason?: string;
  provider?: SupportedAiProvider;
}

const SUPPORTED_PROVIDERS: SupportedAiProvider[] = ["gemini", "openai", "anthropic"];

const PROVIDER_LABELS: Record<SupportedAiProvider, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
};

const DEFAULT_MODEL_FALLBACK: Record<SupportedAiProvider, string> = {
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-5",
};

const normalizeProvider = (value?: string | null): SupportedAiProvider | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase() as SupportedAiProvider;
  return SUPPORTED_PROVIDERS.includes(normalized) ? normalized : undefined;
};

export const getSupportedProviders = (): SupportedAiProvider[] => [...SUPPORTED_PROVIDERS];

export const getProviderLabel = (provider: SupportedAiProvider | string | undefined): string | undefined => {
  const normalized = normalizeProvider(provider);
  return normalized ? PROVIDER_LABELS[normalized] : undefined;
};

interface ResolveOptions {
  apiKeys: Partial<Record<SupportedAiProvider, string | undefined>>;
  defaultProvider?: string | null;
  modelFallbacks?: Partial<Record<SupportedAiProvider, string | undefined>>;
}

export const resolveAiProviderConfig = (
  requestedProvider: string | null | undefined,
  requestedModel: string | null | undefined,
  options: ResolveOptions
): AiProviderResolution => {
  const normalizedRequestedProvider = normalizeProvider(requestedProvider);
  const normalizedDefaultProvider = normalizeProvider(options.defaultProvider);
  const provider = normalizedRequestedProvider || normalizedDefaultProvider || "gemini";

  const apiKey = options.apiKeys[provider]?.trim();
  if (!apiKey) {
    return {
      error: `Missing API key for provider ${provider}`,
      reason: "missing_api_key",
      provider,
    };
  }

  const trimmedModel = requestedModel?.trim();
  const fallbackModel = options.modelFallbacks?.[provider];
  const model =
    trimmedModel && trimmedModel.length > 0
      ? trimmedModel
      : fallbackModel || DEFAULT_MODEL_FALLBACK[provider];

  return {
    config: {
      provider,
      model,
      apiKey,
    },
    provider,
  };
};
