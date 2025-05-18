import * as logger from "firebase-functions/logger";
import * as fs from "fs";
import * as path from "path";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai"; // Part is not directly used by these functions
import {
  LighthouseReportData,
  PlaywrightReport,
  AiUxDesignSuggestions, // For performLLMReportSummary signature
  LLMReportSummary,
  ScreenshotUrls, // For performLLMReportSummary signature
  LLMExplainedAuditItem,
} from "../types";

// Helper function for LLM Report Summary Generation
export async function performLLMReportSummary(
  reportId: string,
  urlToScan: string,
  playwrightReport: PlaywrightReport | undefined,
  lighthouseReport: LighthouseReportData | undefined,
  aiUxDesignSuggestions: AiUxDesignSuggestions | undefined,
  geminiApiKey: string | undefined,
  geminiModelName: string | undefined
): Promise<LLMReportSummary> {
  if (!geminiApiKey || !geminiModelName) {
    logger.info("Skipping LLM Report Summary: GEMINI_API_KEY or GEMINI_MODEL not configured.", { reportId });
    return Promise.resolve({
      status: "skipped",
      error: "Gemini API Key or Model not configured.",
    });
  }
  logger.info(`Starting LLM Report Summary generation with Gemini model: ${geminiModelName}...`, { reportId });

  const condensedReportData: any = {
    url: urlToScan,
    playwright: {
      pageTitle: playwrightReport?.pageTitle,
      screenshotsAvailable: playwrightReport?.screenshotUrls ? Object.keys(playwrightReport.screenshotUrls).filter(k => playwrightReport?.screenshotUrls?.[k as keyof ScreenshotUrls]) : [],
      error: playwrightReport?.error,
    },
    lighthouse: {
      overallScores: lighthouseReport?.scores,
      accessibilityIssues: lighthouseReport?.accessibilityIssues?.slice(0, 3).map((issue: { title: string; description: string; score: number | null; }) => ({ title: issue.title, description: issue.description, score: issue.score })),
      performanceOpportunities: lighthouseReport?.performanceOpportunities?.slice(0, 2).map((opp: { title: string; overallSavingsMs?: number; description: string; }) => ({ title: opp.title, potentialSavingsMs: opp.overallSavingsMs, description: opp.description })),
      seoIssues: lighthouseReport?.seoAudits?.filter((a: { score: number | null; }) => a.score !== null && a.score < 1).slice(0,2).map((a: {title: string; description: string; score: number | null;}) => ({title: a.title, description: a.description, score: a.score})),
      bestPracticesIssues: lighthouseReport?.bestPracticesAudits?.filter((a: { score: number | null; }) => a.score !== null && a.score < 1).slice(0,2).map((a: {title: string; description: string; score: number | null;}) => ({title: a.title, description: a.description, score: a.score})),
      error: lighthouseReport?.error,
    },
    aiUxSuggestions: {
      status: aiUxDesignSuggestions?.status,
      suggestions: aiUxDesignSuggestions?.suggestions?.slice(0, 5).map((s: { suggestion: string; }) => s.suggestion),
      error: aiUxDesignSuggestions?.error,
    },
  };

  const promptTemplatePath = path.join(__dirname, "..", "prompts", "llm_summary_prompt.md");
  let promptTemplate = "";
  try {
    promptTemplate = fs.readFileSync(promptTemplatePath, "utf-8");
  } catch (e: any) {
    logger.error("Failed to read LLM prompt template file: " + e.message, { reportId, path: promptTemplatePath });
    return Promise.resolve({
      status: "error",
      error: `Failed to read LLM prompt template: ${e.message}`,
      modelUsed: geminiModelName,
    });
  }
  const prompt = promptTemplate
    .replace("__URL_TO_SCAN__", urlToScan)
    .replace("__CONDENSED_REPORT_DATA_JSON__", JSON.stringify(condensedReportData, null, 2));

  try {
    const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
    const generationConfigForSummary = { temperature: 0.5, maxOutputTokens: 1024 };
    const result = await genAI.models.generateContent({
      model: geminiModelName,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      ...generationConfigForSummary,
    });
    const summaryText = result.text;
    logger.info("LLM Report Summary generated successfully.", { reportId });
    return Promise.resolve({
      status: "completed",
      summaryText: summaryText,
      modelUsed: geminiModelName,
    });
  } catch (e: any) {
    logger.error("Error during LLM Report Summary generation: " + e.message, { reportId, errorStack: e.stack, errorDetails: JSON.stringify(e) });
    return Promise.resolve({
      status: "error",
      error: `LLM summary generation failed: ${e.message}`,
      modelUsed: geminiModelName,
    });
  }
}

// Helper function to get LLM explanation for a single Lighthouse item (UNEXPORTED)
async function getExplanationForLighthouseItem(
  item: { id: string; title: string; description: string; overallSavingsMs?: number; overallSavingsBytes?: number },
  itemType: "accessibility" | "performance" | "seo" | "best-practice",
  reportId: string,
  geminiApiKey: string,
  geminiModelName: string
): Promise<LLMExplainedAuditItem> {
  const baseExplainedItem: LLMExplainedAuditItem = {
    id: item.id,
    title: item.title,
    status: "pending",
  };
  let promptTemplate = "";
  let promptFilePath = "";

  switch (itemType) {
    case "accessibility":
      promptFilePath = path.join(__dirname, "..", "prompts", "llm_lighthouse_accessibility_prompt.md");
      break;
    case "performance":
      promptFilePath = path.join(__dirname, "..", "prompts", "llm_lighthouse_performance_prompt.md");
      break;
    case "seo":
      promptFilePath = path.join(__dirname, "..", "prompts", "llm_lighthouse_seo_prompt.md");
      break;
    case "best-practice":
      promptFilePath = path.join(__dirname, "..", "prompts", "llm_lighthouse_best_practices_prompt.md");
      break;
    default:
      logger.error("Unknown item type for LLM explanation", { reportId, itemType });
      return Promise.resolve({ ...baseExplainedItem, status: "error", error: "Unknown item type" });
  }

  try {
    promptTemplate = fs.readFileSync(promptFilePath, "utf-8");
  } catch (e: any) {
    logger.error(`Failed to read LLM prompt template file for ${itemType}: ${e.message}`, { reportId, path: promptFilePath });
    return Promise.resolve({ ...baseExplainedItem, status: "error", error: `Failed to read prompt template: ${e.message}` });
  }
  let finalPrompt = promptTemplate
    .replace("__ITEM_TITLE__", item.title)
    .replace("__ITEM_DESCRIPTION__", item.description);

  if (itemType === "performance") {
    const savingsMs = item.overallSavingsMs || 0;
    const savingsKb = item.overallSavingsBytes ? (item.overallSavingsBytes / 1024).toFixed(1) : "0";
    const savingsString = savingsMs > 0 ? `${savingsMs}ms` : (item.overallSavingsBytes ? `${savingsKb}KiB` : "some resources");
    finalPrompt = finalPrompt.replace("__ITEM_SAVINGS__", savingsString);
  }

  try {
    const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
    const generationConfig = { temperature: 0.4, maxOutputTokens: 512 };
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];
    const result = await genAI.models.generateContent({
      model: geminiModelName,
      contents: [{ role: "user", parts: [{ text: finalPrompt }] }],
      ...generationConfig,
      config: { safetySettings: safetySettings },
    });
    const explanationText = result.text;
    if (!explanationText || explanationText.trim() === "") {
        logger.warn(`[LLM Item Explanation] Gemini returned empty for ${itemType} - ${item.id}`, { reportId });
        return Promise.resolve({ ...baseExplainedItem, status: "completed", llmExplanation: "No explanation provided by AI." });
    }
    return Promise.resolve({
      ...baseExplainedItem,
      status: "completed",
      llmExplanation: explanationText.trim(),
    });
  } catch (e: any) {
    logger.error(`[LLM Item Explanation] Error for ${itemType} - ${item.id}: ${e.message}`, { reportId, itemTitle: item.title, errorStack: e.stack });
    return Promise.resolve({
      ...baseExplainedItem,
      status: "error",
      error: e.message,
    });
  }
}

// MAIN HELPER FUNCTION to generate all Lighthouse item explanations
export async function generateLighthouseItemExplanations(
  lighthouseReport: LighthouseReportData,
  reportId: string,
  geminiApiKey: string | undefined,
  geminiModelName: string | undefined
): Promise<LighthouseReportData> {
  if (!geminiApiKey || !geminiModelName) {
    logger.info("Skipping LLM explanations for Lighthouse items: Gemini API key or Model Name not configured.", { reportId });
    return Promise.resolve({
        ...lighthouseReport,
        llmExplainedAccessibilityIssues: [],
        llmExplainedPerformanceOpportunities: [],
        llmExplainedSeoAudits: [],
        llmExplainedBestPracticesAudits: [],
    });
  }
  const updatedReport = { ...lighthouseReport };
  const processItems = async (
    items: Array<{ id: string; title: string; description: string; overallSavingsMs?: number; overallSavingsBytes?: number }> | undefined,
    itemType: "accessibility" | "performance" | "seo" | "best-practice"
  ): Promise<LLMExplainedAuditItem[]> => {
    if (!items || items.length === 0) {
      logger.info(`[LLM Item Explanation] No items to process for type: ${itemType}`, { reportId });
      return Promise.resolve([]);
    }
    logger.info(`[LLM Item Explanation] Processing ${items.length} items for type: ${itemType}`, { reportId });
    const explanationPromises = items.map(item =>
      getExplanationForLighthouseItem(item, itemType, reportId, geminiApiKey, geminiModelName)
    );
    const results = await Promise.allSettled(explanationPromises);
    return Promise.resolve(results.map(result => {
      if (result.status === "fulfilled") return result.value;
      else {
        logger.error(`[LLM Item Explanation] Promise rejected for ${itemType} item. Should not happen.`, { reportId, reason: result.reason });
        return { id: "unknown", title: "Unknown Item", status: "error", error: "Promise rejected: " + result.reason?.message } as LLMExplainedAuditItem;
      }
    }));
  };

  logger.info("Generating LLM explanations for Accessibility items...", { reportId });
  updatedReport.llmExplainedAccessibilityIssues = await processItems(updatedReport.accessibilityIssues, "accessibility");
  logger.info("Generating LLM explanations for Performance items...", { reportId });
  updatedReport.llmExplainedPerformanceOpportunities = await processItems(updatedReport.performanceOpportunities, "performance");
  logger.info("Generating LLM explanations for SEO items...", { reportId });
  updatedReport.llmExplainedSeoAudits = await processItems(updatedReport.seoAudits, "seo");
  logger.info("Generating LLM explanations for Best Practices items...", { reportId });
  updatedReport.llmExplainedBestPracticesAudits = await processItems(updatedReport.bestPracticesAudits, "best-practice");

  // Log the final updatedReport before returning
  logger.info("[LLM Item Explanation] Final updated Lighthouse report with explanations:",
    {
      reportId,
      llmExplainedAccessibilityIssuesCount: updatedReport.llmExplainedAccessibilityIssues?.length,
      llmExplainedPerformanceOpportunitiesCount: updatedReport.llmExplainedPerformanceOpportunities?.length,
      llmExplainedSeoAuditsCount: updatedReport.llmExplainedSeoAudits?.length,
      llmExplainedBestPracticesAuditsCount: updatedReport.llmExplainedBestPracticesAudits?.length,
      // Optionally log a snippet of the data if it's not too large
      // exampleIssue: updatedReport.llmExplainedAccessibilityIssues?.[0],
      // exampleOpportunity: updatedReport.llmExplainedPerformanceOpportunities?.[0]
    }
  );

  logger.info("All LLM explanations for Lighthouse items processed.", { reportId });
  return Promise.resolve(updatedReport);
}
