import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import * as fs from "fs";
import * as path from "path";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Part } from "@google/genai";
import {
  AiUxDesignSuggestions,
  ScreenContextType,
} from "../types";

// Helper function for Gemini AI analysis (UX/Design from screenshot)
export async function performGeminiAnalysis(
  screenshotUrl: string,
  analyzedDeviceType: ScreenContextType,
  reportId: string,
  geminiApiKey: string | undefined,
  geminiModelName: string | undefined,
  urlToScan: string // Though unused in current prompt, kept for potential future use
): Promise<AiUxDesignSuggestions> {
  if (!geminiApiKey || !geminiModelName) {
    let skipReason = "";
    if (!geminiApiKey) skipReason = "GEMINI_API_KEY not configured.";
    else if (!geminiModelName) skipReason = "GEMINI_MODEL not configured.";
    logger.info(`Skipping AI UX/Design analysis: ${skipReason}`, { reportId });
    return {
      status: "skipped",
      error: `AI analysis skipped: ${skipReason}`,
      suggestions: [],
      modelUsed: geminiModelName,
    };
  }

  const promptFilePath = path.join(__dirname, "..", "prompts", "ai_ux_design_prompt.md");
  let promptTemplate = "";
  try {
    promptTemplate = fs.readFileSync(promptFilePath, "utf-8");
  } catch (e: any) {
    logger.error("Failed to read AI UX Design prompt template file: " + e.message, { reportId, path: promptFilePath });
    return {
      status: "error",
      error: `Failed to read AI UX Design prompt template: ${e.message}`,
      suggestions: [],
      modelUsed: geminiModelName,
    };
  }
  const finalPrompt = promptTemplate; // Placeholder for urlToScan if it were used in prompt

  try {
    logger.info(`Starting AI UX/Design analysis with Gemini model: ${geminiModelName}...`, { reportId, screenshotUrlToAnalyze: screenshotUrl });
    const bucket = admin.storage().bucket();
    const urlPrefix = `https://storage.googleapis.com/${bucket.name}/`;
    let screenshotBuffer: Buffer;

    if (screenshotUrl.startsWith(urlPrefix)) {
      const filePathInBucket = screenshotUrl.substring(urlPrefix.length);
      const decodedFilePathInBucket = decodeURIComponent(filePathInBucket);
      logger.info(`Attempting to download screenshot from GCS public URL path: gs://${bucket.name}/${decodedFilePathInBucket}`, { reportId });
      [screenshotBuffer] = await bucket.file(decodedFilePathInBucket).download();
    } else {
      const gsUrlPrefix = `gs://${bucket.name}/`;
      if (screenshotUrl.startsWith(gsUrlPrefix)) {
        const filePathFromGsUrl = screenshotUrl.substring(gsUrlPrefix.length);
        const decodedFilePathFromGsUrl = decodeURIComponent(filePathFromGsUrl);
        logger.info(`Attempting to download screenshot using GS URI path: gs://${bucket.name}/${decodedFilePathFromGsUrl}`, { reportId });
        [screenshotBuffer] = await bucket.file(decodedFilePathFromGsUrl).download();
      } else {
        logger.error("Screenshot URL does not have an expected GCS public URL or GS URI prefix.", { reportId, screenshotUrlProvided: screenshotUrl });
        throw new Error("Invalid screenshot URL format. Expected GCS public URL or GS URI.");
      }
    }
    logger.info(`Screenshot (${screenshotBuffer.length} bytes) fetched for Gemini analysis.`, { reportId });

    const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
    const imagePart: Part = { inlineData: { data: screenshotBuffer.toString("base64"), mimeType: "image/jpeg" } };
    const textPart: Part = { text: finalPrompt }; // Use the loaded prompt
    const generationConfig = { temperature: 0.4, topK: 32, topP: 1, maxOutputTokens: 2048 };
    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    const result = await genAI.models.generateContent({
      model: geminiModelName,
      contents: [{ role: "user", parts: [textPart, imagePart] }],
      ...generationConfig,
      config: { safetySettings: safetySettings },
    });
    const responseText = result.text;
    logger.info("Gemini analysis response received.", { reportId });

    if (!responseText) {
      logger.warn("Gemini analysis returned an empty response.", { reportId });
      return {
        status: "error",
        error: "AI analysis returned an empty response.",
        suggestions: [],
        introductionText: "",
        modelUsed: geminiModelName,
      };
    }

    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError: any) {
      logger.error("Failed to parse LLM response as JSON: " + parseError.message, { reportId, responseText });
      return {
        status: "error",
        error: "Failed to parse LLM response as JSON.",
        suggestions: [],
        introductionText: "",
        modelUsed: geminiModelName,
      };
    }

    const introductionText = parsedResponse.introduction || "";
    const suggestionsFromJson = parsedResponse.suggestions;

    if (!Array.isArray(suggestionsFromJson)) {
      logger.warn("LLM response JSON does not contain a valid 'suggestions' array.", { reportId, parsedResponse });
      return {
        status: "error",
        error: "LLM response JSON does not contain a valid 'suggestions' array.",
        suggestions: [],
        introductionText: introductionText,
        modelUsed: geminiModelName,
      };
    }

    const processedSuggestions = suggestionsFromJson.map((item: any) => ({
      suggestion: item.suggestion || "No suggestion text provided",
      reasoning: item.reasoning || "No reasoning provided",
      screenContext: analyzedDeviceType,
    }));

    return {
      status: "completed",
      suggestions: processedSuggestions.slice(0, 10), // Keep the limit of 10
      introductionText: introductionText,
      modelUsed: geminiModelName,
    };
  } catch (aiError: any) {
    logger.error("Error during AI UX/Design analysis: " + aiError.message, { reportId, errorStack: aiError.stack, errorDetails: JSON.stringify(aiError), screenshotUrlProvided: screenshotUrl });
    // Ensure introductionText is included in error returns as well, matching the expected structure if possible
    return {
      status: "error",
      error: `AI analysis failed: ${aiError.message}`,
      suggestions: [],
      introductionText: "", // Default empty string for introductionText in case of error
      modelUsed: geminiModelName,
    };
  }
}
