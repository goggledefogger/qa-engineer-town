import * as logger from "firebase-functions/logger";
import * as fs from "fs";
import * as path from "path";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import {
  LighthouseReportData,
  PlaywrightReport,
  AiUxDesignSuggestions,
  LLMReportSummary,
  ScreenshotUrls,
  LLMExplainedAuditItem,
} from "../types";
import type { AiProviderConfig } from "./aiProviderService";

interface TextGenerationOptions {
  temperature?: number;
  maxOutputTokens?: number;
  systemPrompt?: string;
  responseFormat?: "text" | "json_object";
}

const DEFAULT_TEMPERATURE = 0.4;
const DEFAULT_MAX_TOKENS = 1024;

const loadPrompt = (relativePath: string, reportId: string): string | null => {
  const promptPath = path.join(__dirname, "..", "prompts", relativePath);
  try {
    return fs.readFileSync(promptPath, "utf-8");
  } catch (e: any) {
    logger.error(`Failed to read prompt template ${relativePath}: ${e.message}`, { reportId, path: promptPath });
    return null;
  }
};

const callGeminiText = async (
  context: AiProviderConfig,
  prompt: string,
  options: TextGenerationOptions
): Promise<string> => {
  const genAI = new GoogleGenAI({ apiKey: context.apiKey });
  const generationConfig = {
    temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    maxOutputTokens: options.maxOutputTokens ?? DEFAULT_MAX_TOKENS,
  };
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];
  const result = await genAI.models.generateContent({
    model: context.model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    ...generationConfig,
    config: { safetySettings },
  });
  return result.text || "";
};

const callOpenAiText = async (
  context: AiProviderConfig,
  prompt: string,
  options: TextGenerationOptions
): Promise<string> => {
  const openai = new OpenAI({ apiKey: context.apiKey });
  const messages: Array<{ role: "system" | "user"; content: any }> = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const response = await openai.chat.completions.create({
    model: context.model,
    temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: options.maxOutputTokens ?? DEFAULT_MAX_TOKENS,
    messages,
    ...(options.responseFormat === "json_object" ? { response_format: { type: "json_object" } } : {}),
  });

  let content = response.choices?.[0]?.message?.content;
  if (!content) return "";
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === "string" ? part : (part as { text?: string }).text || ""))
      .join("\n");
  }
  return content;
};

const callAnthropicText = async (
  context: AiProviderConfig,
  prompt: string,
  options: TextGenerationOptions
): Promise<string> => {
  const anthropic = new Anthropic({ apiKey: context.apiKey });
  const response = await anthropic.messages.create({
    model: context.model,
    temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: options.maxOutputTokens ?? DEFAULT_MAX_TOKENS,
    ...(options.systemPrompt ? { system: options.systemPrompt } : {}),
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: prompt }],
      },
    ],
  });
  return response.content
    .filter((part) => part.type === "text")
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("\n");
};

const invokeTextModel = async (
  context: AiProviderConfig,
  prompt: string,
  options: TextGenerationOptions,
  reportId: string
): Promise<string> => {
  switch (context.provider) {
    case "gemini":
      return callGeminiText(context, prompt, options);
    case "openai":
      return callOpenAiText(context, prompt, options);
    case "anthropic":
      return callAnthropicText(context, prompt, options);
    default:
      throw new Error(`Unsupported AI provider: ${context.provider}`);
  }
};

export async function performLLMReportSummary(
  reportId: string,
  urlToScan: string,
  playwrightReport: PlaywrightReport | undefined,
  lighthouseReport: LighthouseReportData | undefined,
  aiUxDesignSuggestions: AiUxDesignSuggestions | undefined,
  aiContext: AiProviderConfig | null | undefined,
  fallbackReason?: string
): Promise<LLMReportSummary> {
  if (!aiContext) {
    const reason = fallbackReason || "AI provider not configured.";
    logger.info("Skipping LLM Report Summary: AI provider context not available.", {
      reportId,
      fallbackReason,
    });
    return {
      status: "skipped",
      error: reason,
    };
  }
  logger.info(`Starting LLM Report Summary with provider ${aiContext.provider} and model ${aiContext.model}...`, { reportId });

  const condensedReportData: any = {
    url: urlToScan,
    playwright: {
      pageTitle: playwrightReport?.pageTitle,
      screenshotsAvailable: playwrightReport?.screenshotUrls ? Object.keys(playwrightReport.screenshotUrls).filter((k) => playwrightReport?.screenshotUrls?.[k as keyof ScreenshotUrls]) : [],
      error: playwrightReport?.error,
    },
    lighthouse: {
      overallScores: lighthouseReport?.scores,
      accessibilityIssues: lighthouseReport?.accessibilityIssues?.slice(0, 3).map((issue: { title: string; description: string; score: number | null }) => ({ title: issue.title, description: issue.description, score: issue.score })),
      performanceOpportunities: lighthouseReport?.performanceOpportunities?.slice(0, 2).map((opp: { title: string; overallSavingsMs?: number; description: string }) => ({ title: opp.title, potentialSavingsMs: opp.overallSavingsMs, description: opp.description })),
      seoIssues: lighthouseReport?.seoAudits?.filter((a: { score: number | null }) => a.score !== null && a.score < 1).slice(0, 2).map((a: { title: string; description: string; score: number | null }) => ({ title: a.title, description: a.description, score: a.score })),
      bestPracticesIssues: lighthouseReport?.bestPracticesAudits?.filter((a: { score: number | null }) => a.score !== null && a.score < 1).slice(0, 2).map((a: { title: string; description: string; score: number | null }) => ({ title: a.title, description: a.description, score: a.score })),
      error: lighthouseReport?.error,
    },
    aiUxSuggestions: {
      status: aiUxDesignSuggestions?.status,
      suggestions: aiUxDesignSuggestions?.suggestions?.slice(0, 5).map((s: { suggestion: string }) => s.suggestion),
      error: aiUxDesignSuggestions?.error,
    },
  };

  const promptTemplate = loadPrompt("llm_summary_prompt.md", reportId);
  if (!promptTemplate) {
    return {
      status: "error",
      error: "Failed to read LLM summary prompt template.",
      modelUsed: aiContext.model,
      providerUsed: aiContext.provider,
    };
  }

  const prompt = promptTemplate
    .replace("__URL_TO_SCAN__", urlToScan)
    .replace("__CONDENSED_REPORT_DATA_JSON__", JSON.stringify(condensedReportData, null, 2));

  try {
    const summaryText = await invokeTextModel(
      aiContext,
      prompt,
      {
        temperature: 0.5,
        maxOutputTokens: 1024,
        systemPrompt: "You are a senior QA engineer summarizing website quality findings in a concise, client-ready tone.",
      },
      reportId
    );

    if (!summaryText || summaryText.trim() === "") {
      logger.warn("LLM summary returned empty content.", { reportId });
      return {
        status: "error",
        error: "AI summary generation returned empty content.",
        modelUsed: aiContext.model,
        providerUsed: aiContext.provider,
      };
    }

    logger.info("LLM Report Summary generated successfully.", { reportId });
    return {
      status: "completed",
      summaryText,
      modelUsed: aiContext.model,
      providerUsed: aiContext.provider,
    };
  } catch (e: any) {
    logger.error("Error during LLM Report Summary generation: " + e.message, {
      reportId,
      errorStack: e.stack,
      errorDetails: JSON.stringify(e),
    });
    return {
      status: "error",
      error: `LLM summary generation failed: ${e.message}`,
      modelUsed: aiContext.model,
      providerUsed: aiContext.provider,
    };
  }
}

async function getExplanationForLighthouseItem(
  item: { id: string; title: string; description: string; overallSavingsMs?: number; overallSavingsBytes?: number },
  itemType: "accessibility" | "performance" | "seo" | "best-practice",
  reportId: string,
  aiContext: AiProviderConfig
): Promise<LLMExplainedAuditItem> {
  const baseExplainedItem: LLMExplainedAuditItem = {
    id: item.id,
    title: item.title,
    status: "pending",
  };

  let promptFile = "";
  switch (itemType) {
    case "accessibility":
      promptFile = "llm_lighthouse_accessibility_prompt.md";
      break;
    case "performance":
      promptFile = "llm_lighthouse_performance_prompt.md";
      break;
    case "seo":
      promptFile = "llm_lighthouse_seo_prompt.md";
      break;
    case "best-practice":
      promptFile = "llm_lighthouse_best_practices_prompt.md";
      break;
    default:
      logger.error("Unknown item type for LLM explanation", { reportId, itemType });
      return { ...baseExplainedItem, status: "error", error: "Unknown item type" };
  }

  const promptTemplate = loadPrompt(promptFile, reportId);
  if (!promptTemplate) {
    return { ...baseExplainedItem, status: "error", error: "Failed to read prompt template" };
  }

  let finalPrompt = promptTemplate
    .replace("__ITEM_TITLE__", item.title)
    .replace("__ITEM_DESCRIPTION__", item.description);

  if (itemType === "performance") {
    const savingsMs = item.overallSavingsMs || 0;
    const savingsKb = item.overallSavingsBytes ? (item.overallSavingsBytes / 1024).toFixed(1) : "0";
    const savingsString = savingsMs > 0 ? `${savingsMs}ms` : item.overallSavingsBytes ? `${savingsKb}KiB` : "some resources";
    finalPrompt = finalPrompt.replace("__ITEM_SAVINGS__", savingsString);
  }

  try {
    const explanationText = await invokeTextModel(
      aiContext,
      finalPrompt,
      {
        temperature: 0.4,
        maxOutputTokens: 768,
        systemPrompt: "You are a senior QA engineer providing actionable, empathetic explanations to a web development team. Keep responses concise and practical.",
      },
      reportId
    );

    if (!explanationText || explanationText.trim() === "") {
      logger.warn(`[LLM Item Explanation] Empty response for ${itemType} - ${item.id}`, { reportId });
      return { ...baseExplainedItem, status: "completed", llmExplanation: "No explanation provided by AI." };
    }

    return {
      ...baseExplainedItem,
      status: "completed",
      llmExplanation: explanationText.trim(),
    };
  } catch (e: any) {
    logger.error(`[LLM Item Explanation] Error for ${itemType} - ${item.id}: ${e.message}`, {
      reportId,
      itemTitle: item.title,
      errorStack: e.stack,
    });
    return {
      ...baseExplainedItem,
      status: "error",
      error: e.message,
    };
  }
}

export async function generateLighthouseItemExplanations(
  lighthouseReport: LighthouseReportData,
  reportId: string,
  aiContext: AiProviderConfig | null | undefined
): Promise<LighthouseReportData> {
  if (!aiContext) {
    logger.info("Skipping LLM explanations for Lighthouse items: AI provider not configured.", { reportId });
    return {
      ...lighthouseReport,
      llmExplainedAccessibilityIssues: [],
      llmExplainedPerformanceOpportunities: [],
      llmExplainedSeoAudits: [],
      llmExplainedBestPracticesAudits: [],
      llmExplainedNonPerfectPerformanceAudits: [],
    };
  }

  const updatedReport = { ...lighthouseReport };

  const buildPromises = <T extends { id: string }>(
    items: T[] | undefined,
    itemType: "accessibility" | "performance" | "seo" | "best-practice",
    targetKey: keyof LighthouseReportData
  ) => {
    if (!items || items.length === 0) {
      (updatedReport as any)[targetKey] = [];
      return [];
    }
    const promises = items.map((item) =>
      getExplanationForLighthouseItem(
        item as any,
        itemType,
        reportId,
        aiContext
      )
    );
    return promises;
  };

  const accessibilityPromises = buildPromises(lighthouseReport.accessibilityIssues, "accessibility", "llmExplainedAccessibilityIssues");
  const performancePromises = buildPromises(lighthouseReport.performanceOpportunities, "performance", "llmExplainedPerformanceOpportunities");
  const seoPromises = buildPromises(lighthouseReport.seoAudits, "seo", "llmExplainedSeoAudits");
  const bestPracticesPromises = buildPromises(lighthouseReport.bestPracticesAudits, "best-practice", "llmExplainedBestPracticesAudits");
  const nonPerfectPerformancePromises = buildPromises(lighthouseReport.nonPerfectPerformanceAudits, "performance", "llmExplainedNonPerfectPerformanceAudits");

  const results = await Promise.allSettled([
    Promise.all(accessibilityPromises),
    Promise.all(performancePromises),
    Promise.all(seoPromises),
    Promise.all(bestPracticesPromises),
    Promise.all(nonPerfectPerformancePromises),
  ]);

  const applyResult = (index: number, key: keyof LighthouseReportData) => {
    const result = results[index];
    if (result.status === "fulfilled") {
      (updatedReport as any)[key] = result.value;
    } else {
      logger.error(`Failed to generate explanations for ${String(key)}: ${result.reason}`, { reportId });
      (updatedReport as any)[key] = [];
    }
  };

  applyResult(0, "llmExplainedAccessibilityIssues");
  applyResult(1, "llmExplainedPerformanceOpportunities");
  applyResult(2, "llmExplainedSeoAudits");
  applyResult(3, "llmExplainedBestPracticesAudits");
  applyResult(4, "llmExplainedNonPerfectPerformanceAudits");

  return updatedReport;
}
