import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import * as fs from "fs";
import * as path from "path";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Part } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import {
  AiUxDesignSuggestions,
  ScreenContextType,
} from "../types";
import type { AiProviderConfig } from "./aiProviderService";

function unwrapJsonMarkdown(rawText: string | undefined | null): string {
  if (!rawText) {
    return "";
  }
  const match = rawText.match(/^\s*`{3}(?:json)?\s*([\s\S]*?)\s*`{3}\s*$/);
  if (match && typeof match[1] === "string") {
    return match[1].trim();
  }
  return rawText.trim();
}

const getPromptTemplate = (reportId: string): string | null => {
  const promptFilePath = path.join(__dirname, "..", "prompts", "ai_ux_design_prompt.md");
  try {
    return fs.readFileSync(promptFilePath, "utf-8");
  } catch (e: any) {
    logger.error("Failed to read AI UX Design prompt template file: " + e.message, { reportId, path: promptFilePath });
    return null;
  }
};

const downloadScreenshot = async (screenshotUrl: string, reportId: string): Promise<Buffer> => {
  const bucket = admin.storage().bucket();
  const gcsPublicPrefix = `https://storage.googleapis.com/${bucket.name}/`;
  const gcsUriPrefix = `gs://${bucket.name}/`;
  let filePath: string | null = null;

  if (screenshotUrl.startsWith(gcsPublicPrefix)) {
    filePath = decodeURIComponent(screenshotUrl.substring(gcsPublicPrefix.length));
  } else if (screenshotUrl.startsWith(gcsUriPrefix)) {
    filePath = decodeURIComponent(screenshotUrl.substring(gcsUriPrefix.length));
  }

  if (!filePath) {
    logger.error("Screenshot URL does not have an expected GCS prefix.", { reportId, screenshotUrlProvided: screenshotUrl });
    throw new Error("Invalid screenshot URL format. Expected GCS public URL or GS URI.");
  }

  const [buffer] = await bucket.file(filePath).download();
  logger.info(`Screenshot (${buffer.length} bytes) fetched for AI analysis.`, { reportId });
  return buffer;
};

const callGeminiVision = async (
  context: AiProviderConfig,
  prompt: string,
  screenshotBase64: string,
  reportId: string
): Promise<string> => {
  const genAI = new GoogleGenAI({ apiKey: context.apiKey });
  const imagePart: Part = { inlineData: { data: screenshotBase64, mimeType: "image/jpeg" } };
  const textPart: Part = { text: prompt };
  const generationConfig = { temperature: 0.4, topK: 32, topP: 1, maxOutputTokens: 2048 };
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

  const result = await genAI.models.generateContent({
    model: context.model,
    contents: [{ role: "user", parts: [textPart, imagePart] }],
    ...generationConfig,
    config: { safetySettings },
  });
  logger.info("Gemini analysis response received.", { reportId });
  return result.text || "";
};

const callOpenAiVision = async (
  context: AiProviderConfig,
  prompt: string,
  screenshotBase64: string,
  reportId: string
): Promise<string> => {
  const openai = new OpenAI({ apiKey: context.apiKey });
  const response = await openai.chat.completions.create({
    model: context.model,
    temperature: 0.4,
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a senior UX design QA assistant. Reply ONLY with a JSON object following the expected schema.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` } },
        ],
      },
    ],
  });
  const messageContent = response.choices?.[0]?.message?.content;
  logger.info("OpenAI analysis response received.", { reportId });
  if (!messageContent) return "";
  if (Array.isArray(messageContent)) {
    return messageContent
      .map((part) => (typeof part === "string" ? part : (part as { text?: string }).text || ""))
      .join("\n");
  }
  return messageContent;
};

const callAnthropicVision = async (
  context: AiProviderConfig,
  prompt: string,
  screenshotBase64: string,
  reportId: string
): Promise<string> => {
  const anthropic = new Anthropic({ apiKey: context.apiKey });
  const response = await anthropic.messages.create({
    model: context.model,
    temperature: 0.4,
    max_tokens: 2048,
    system: "You are a senior UX design QA assistant. Reply ONLY with a JSON object matching the expected schema.",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: screenshotBase64 } },
        ],
      },
    ],
  });
  logger.info("Anthropic analysis response received.", { reportId });
  return response.content
    .filter((part) => part.type === "text")
    .map((part) => part.type === "text" ? part.text : "")
    .join("\n");
};

const invokeVisionModel = async (
  context: AiProviderConfig,
  prompt: string,
  screenshotBase64: string,
  reportId: string
): Promise<string> => {
  switch (context.provider) {
    case "gemini":
      return callGeminiVision(context, prompt, screenshotBase64, reportId);
    case "openai":
      return callOpenAiVision(context, prompt, screenshotBase64, reportId);
    case "anthropic":
      return callAnthropicVision(context, prompt, screenshotBase64, reportId);
    default:
      throw new Error(`Unsupported AI provider: ${context.provider}`);
  }
};

const parseSuggestionsFromJson = (
  rawText: string,
  analyzedDeviceType: ScreenContextType,
  reportId: string
): {
  introductionText: string;
  suggestions: Array<{ suggestion: string; reasoning: string; screenContext: ScreenContextType }>;
} | { error: string } => {
  const unwrappedText = unwrapJsonMarkdown(rawText);
  if (!unwrappedText) {
    return { error: "AI analysis returned an empty response." };
  }

  try {
    const parsedResponse = JSON.parse(unwrappedText);
    const suggestionsFromJson = parsedResponse.suggestions;
    const introductionText = parsedResponse.introduction || "";

    if (!Array.isArray(suggestionsFromJson)) {
      return { error: "LLM response JSON does not contain a valid 'suggestions' array." };
    }

    const processedSuggestions = suggestionsFromJson.map((item: any) => ({
      suggestion: item.suggestion || "No suggestion text provided",
      reasoning: item.reasoning || "No reasoning provided",
      screenContext: analyzedDeviceType,
    }));

    return {
      introductionText,
      suggestions: processedSuggestions.slice(0, 10),
    };
  } catch (parseError: any) {
    logger.error("Failed to parse AI UX response as JSON: " + parseError.message, { reportId, unwrappedText });
    return { error: "Failed to parse AI response as JSON." };
  }
};

export async function performAiUxAnalysis(
  screenshotUrl: string,
  analyzedDeviceType: ScreenContextType,
  reportId: string,
  aiContext: AiProviderConfig,
  _urlToScan: string
): Promise<AiUxDesignSuggestions> {
  const promptTemplate = getPromptTemplate(reportId);
  if (!promptTemplate) {
    return {
      status: "error",
      error: "Failed to load AI UX prompt template.",
      suggestions: [],
      introductionText: "",
      modelUsed: aiContext.model,
      providerUsed: aiContext.provider,
    };
  }

  try {
    logger.info(`Starting AI UX/Design analysis with provider ${aiContext.provider} and model ${aiContext.model}...`, {
      reportId,
      screenshotUrlToAnalyze: screenshotUrl,
    });
    const screenshotBuffer = await downloadScreenshot(screenshotUrl, reportId);
    const screenshotBase64 = screenshotBuffer.toString("base64");
    const responseText = await invokeVisionModel(aiContext, promptTemplate, screenshotBase64, reportId);

    const parsed = parseSuggestionsFromJson(responseText, analyzedDeviceType, reportId);
    if ("error" in parsed) {
      logger.warn("AI UX analysis returned malformed data.", { reportId, provider: aiContext.provider });
      return {
        status: "error",
        error: parsed.error,
        suggestions: [],
        introductionText: "",
        modelUsed: aiContext.model,
        providerUsed: aiContext.provider,
      };
    }

    return {
      status: "completed",
      suggestions: parsed.suggestions,
      introductionText: parsed.introductionText,
      modelUsed: aiContext.model,
      providerUsed: aiContext.provider,
    };
  } catch (aiError: any) {
    logger.error("Error during AI UX/Design analysis: " + aiError.message, {
      reportId,
      errorStack: aiError.stack,
      errorDetails: JSON.stringify(aiError),
      screenshotUrlProvided: screenshotUrl,
    });
    return {
      status: "error",
      error: `AI analysis failed: ${aiError.message}`,
      suggestions: [],
      introductionText: "",
      modelUsed: aiContext.model,
      providerUsed: aiContext.provider,
    };
  }
}
