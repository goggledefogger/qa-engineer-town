import { defineSecret } from "firebase-functions/params";

const GEMINI_API_KEY_SECRET = defineSecret("GEMINI_API_KEY");
const OPENAI_API_KEY_SECRET = defineSecret("OPENAI_API_KEY");
const ANTHROPIC_API_KEY_SECRET = defineSecret("ANTHROPIC_API_KEY");
const PAGESPEED_API_KEY_SECRET = defineSecret("PAGESPEED_API_KEY");
const WHATCMS_API_KEY_SECRET = defineSecret("WHATCMS_API_KEY");

export const RUNTIME_SECRETS = [
  GEMINI_API_KEY_SECRET,
  OPENAI_API_KEY_SECRET,
  ANTHROPIC_API_KEY_SECRET,
  PAGESPEED_API_KEY_SECRET,
  WHATCMS_API_KEY_SECRET,
] as const;

export type SupportedProvider = "gemini" | "openai" | "anthropic";

export interface RuntimeSecrets {
  geminiApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  pageSpeedApiKey?: string;
  whatCmsApiKey?: string;
}

export interface RuntimeAiDefaults {
  provider?: string | null;
  models: Partial<Record<SupportedProvider, string | undefined>>;
}

export interface RuntimeConfig {
  secrets: RuntimeSecrets;
  aiDefaults: RuntimeAiDefaults;
}

const secretValueOrEnv = (secret: ReturnType<typeof defineSecret>, envVar: string): string | undefined =>
  secret.value() || process.env[envVar]?.trim();

export const loadRuntimeConfig = (): RuntimeConfig => ({
  secrets: {
    geminiApiKey: secretValueOrEnv(GEMINI_API_KEY_SECRET, "GEMINI_API_KEY"),
    openaiApiKey: secretValueOrEnv(OPENAI_API_KEY_SECRET, "OPENAI_API_KEY"),
    anthropicApiKey: secretValueOrEnv(ANTHROPIC_API_KEY_SECRET, "ANTHROPIC_API_KEY"),
    pageSpeedApiKey: secretValueOrEnv(PAGESPEED_API_KEY_SECRET, "PAGESPEED_API_KEY"),
    whatCmsApiKey: secretValueOrEnv(WHATCMS_API_KEY_SECRET, "WHATCMS_API_KEY"),
  },
  aiDefaults: {
    provider: process.env.AI_DEFAULT_PROVIDER,
    models: {
      gemini: process.env.GEMINI_MODEL,
      openai: process.env.OPENAI_MODEL,
      anthropic: process.env.ANTHROPIC_MODEL,
    },
  },
});
