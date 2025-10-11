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
  gemini: "gemini-2.5-flash-preview-09-2025",
  openai: "gpt-4o-mini",
  anthropic: "claude-3.5-sonnet",
};

const getEnvDefaultModel = (provider: SupportedAiProvider): string | undefined => {
  switch (provider) {
    case "gemini":
      return process.env.GEMINI_MODEL?.trim();
    case "openai":
      return process.env.OPENAI_MODEL?.trim();
    case "anthropic":
      return process.env.ANTHROPIC_MODEL?.trim();
    default:
      return undefined;
  }
};

const getApiKeyForProvider = (provider: SupportedAiProvider): string | undefined => {
  switch (provider) {
    case "gemini":
      return process.env.GEMINI_API_KEY?.trim();
    case "openai":
      return process.env.OPENAI_API_KEY?.trim();
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY?.trim();
    default:
      return undefined;
  }
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

const resolveDefaultProvider = (): SupportedAiProvider => {
  const envDefault = normalizeProvider(process.env.AI_DEFAULT_PROVIDER);
  return envDefault || "gemini";
};

export const resolveAiProviderConfig = (
  requestedProvider?: string | null,
  requestedModel?: string | null
): AiProviderResolution => {
  const normalizedRequestedProvider = normalizeProvider(requestedProvider);
  const provider = normalizedRequestedProvider || resolveDefaultProvider();

  const apiKey = getApiKeyForProvider(provider);
  if (!apiKey) {
    return {
      error: `Missing API key for provider ${provider}`,
      reason: "missing_api_key",
      provider,
    };
  }

  const trimmedModel = requestedModel?.trim();
  const model =
    trimmedModel && trimmedModel.length > 0
      ? trimmedModel
      : getEnvDefaultModel(provider) || DEFAULT_MODEL_FALLBACK[provider];

  return {
    config: {
      provider,
      model,
      apiKey,
    },
    provider,
  };
};
