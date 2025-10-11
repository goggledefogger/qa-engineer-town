export type AiProvider = 'gemini' | 'openai' | 'anthropic';

export interface AiProviderOption {
  value: AiProvider;
  label: string;
}

export interface AiModelOption {
  value: string;
  label: string;
  provider: AiProvider;
  note?: string;
}

export const DEFAULT_PROVIDER: AiProvider = 'gemini';

export const AI_PROVIDER_OPTIONS: AiProviderOption[] = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude' },
];

export const AI_MODEL_OPTIONS: Record<AiProvider, AiModelOption[]> = {
  gemini: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'gemini' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini' },
    { value: 'gemini-2.5-flash-preview-09-2025', label: 'Gemini 2.5 Flash (Preview 09/2025)', provider: 'gemini', note: 'Latest preview release' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', provider: 'gemini', note: 'Lite tier' },
    { value: 'gemini-2.5-flash-lite-preview-09-2025', label: 'Gemini 2.5 Flash Lite (Preview 09/2025)', provider: 'gemini' },
    { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image', provider: 'gemini', note: 'Image generation' },
    { value: 'gemini-2.5-flash-image-preview', label: 'Gemini 2.5 Flash Image (Preview)', provider: 'gemini' },
    { value: 'gemini-2.5-flash-native-audio-preview-09-2025', label: 'Gemini 2.5 Flash Native Audio (Preview 09/2025)', provider: 'gemini' },
    { value: 'gemini-2.5-flash-preview-tts', label: 'Gemini 2.5 Flash TTS (Preview)', provider: 'gemini', note: 'Text-to-Speech' },
    { value: 'gemini-live-2.5-flash-preview', label: 'Gemini Live 2.5 Flash (Preview)', provider: 'gemini' },
  ],
  openai: [
    { value: 'gpt-5', label: 'GPT-5', provider: 'openai', note: 'Flagship' },
    { value: 'gpt-5-pro', label: 'GPT-5 Pro', provider: 'openai' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini', provider: 'openai' },
    { value: 'gpt-5-nano', label: 'GPT-5 Nano', provider: 'openai' },
    { value: 'gpt-5-chat', label: 'GPT-5 Chat', provider: 'openai' },
    { value: 'gpt-5-codex', label: 'GPT-5 Codex', provider: 'openai', note: 'Code generation' },
    { value: 'gpt-4.1', label: 'GPT-4.1', provider: 'openai' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', provider: 'openai' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', provider: 'openai' },
    { value: 'gpt-4o', label: 'GPT-4o', provider: 'openai', note: 'Multimodal' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai', note: 'Balanced cost' },
    { value: 'o4', label: 'o4', provider: 'openai', note: 'Reasoning series' },
    { value: 'o4-mini', label: 'o4 Mini', provider: 'openai' },
    { value: 'o3', label: 'o3', provider: 'openai' },
    { value: 'o3-pro', label: 'o3 Pro', provider: 'openai' },
    { value: 'o3-mini', label: 'o3 Mini', provider: 'openai' },
  ],
  anthropic: [
    { value: 'claude-opus-4-1', label: 'Claude Opus 4.1', provider: 'anthropic', note: 'Snapshot: claude-opus-4-1-20250805' },
    { value: 'claude-opus-4-0', label: 'Claude Opus 4.0', provider: 'anthropic', note: 'Snapshot: claude-opus-4-20250514' },
    { value: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'anthropic', note: 'Snapshot: claude-sonnet-4-5-20250929' },
    { value: 'claude-sonnet-4-0', label: 'Claude Sonnet 4.0', provider: 'anthropic', note: 'Snapshot: claude-sonnet-4-20250514' },
    { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet (Latest)', provider: 'anthropic', note: 'Snapshot: claude-3-7-sonnet-20250219' },
    { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku (Latest)', provider: 'anthropic', note: 'Snapshot: claude-3-5-haiku-20241022' },
  ],
};

export const DEFAULT_MODEL_BY_PROVIDER: Record<AiProvider, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-5',
};

export const getProviderLabel = (provider: AiProvider | string | undefined): string | undefined => {
  if (!provider) return undefined;
  const normalized = provider.toLowerCase() as AiProvider;
  return AI_PROVIDER_OPTIONS.find(option => option.value === normalized)?.label;
};

export const resolveInitialProvider = (overrideProvider?: string | null): AiProvider => {
  const normalized = overrideProvider?.trim().toLowerCase() as AiProvider | undefined;
  if (normalized && AI_PROVIDER_OPTIONS.some(option => option.value === normalized)) {
    return normalized;
  }
  return DEFAULT_PROVIDER;
};

export const resolveInitialModel = (provider: AiProvider, overrideModel?: string | null): string => {
  const trimmedOverride = overrideModel?.trim();
  if (!trimmedOverride) {
    return DEFAULT_MODEL_BY_PROVIDER[provider];
  }
  const modelOptions = AI_MODEL_OPTIONS[provider];
  if (modelOptions.some(option => option.value === trimmedOverride)) {
    return trimmedOverride;
  }
  return trimmedOverride;
};

export const getModelOptionsForProvider = (provider: AiProvider): AiModelOption[] => {
  return AI_MODEL_OPTIONS[provider] ?? [];
};
