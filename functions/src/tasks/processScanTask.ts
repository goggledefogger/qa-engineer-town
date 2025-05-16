import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onTaskDispatched } from "firebase-functions/v2/tasks";
// @ts-ignore: No types for playwright-aws-lambda
import * as playwright from "playwright-aws-lambda";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Part } from "@google/genai";
import {
  ReportData,
  LighthouseReportData,
  PlaywrightReport,
  ScanTaskPayload,
  AiUxDesignSuggestions, // Assuming this type exists or we define it based on usage
} from "../types";

// Helper function for Playwright scan
async function performPlaywrightScan(urlToScan: string, reportId: string): Promise<PlaywrightReport> {
  logger.info("Launching browser for Playwright screenshot...", { reportId });
  let browser = null;
  try {
    browser = await playwright.launchChromium({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    logger.info(`Navigating to ${urlToScan} for screenshot...`, { reportId });
    await page.goto(urlToScan, { waitUntil: "networkidle", timeout: 60000 });

    const pageTitle = await page.title();
    const screenshotBuffer = await page.screenshot({ type: "jpeg", quality: 80 });
    logger.info("Screenshot captured.", { reportId });

    const bucket = admin.storage().bucket(); // Default bucket
    const screenshotFileName = `screenshots/${reportId}/screenshot.jpg`;
    const file = bucket.file(screenshotFileName);
    await file.save(screenshotBuffer, {
      metadata: { contentType: "image/jpeg" },
    });
    await file.makePublic();
    const screenshotUrl = file.publicUrl();
    logger.info("Screenshot uploaded and made public.", { reportId, screenshotUrl });

    return {
      success: true,
      pageTitle: pageTitle,
      screenshotUrl: screenshotUrl,
    };
  } catch (playwrightError: any) {
    logger.error("Error during Playwright screenshot capture or upload:", { reportId, errorMessage: playwrightError.message, stack: playwrightError.stack, detail: playwrightError });
    return {
      success: false,
      error: `Playwright operation failed: ${playwrightError.message}`,
    };
  } finally {
    if (browser) {
      logger.info("Closing browser (Playwright)...", { reportId });
      await browser.close();
    }
  }
}

// Helper function for Lighthouse scan
async function performLighthouseScan(urlToScan: string, reportId: string, pagespeedApiKey: string | undefined): Promise<LighthouseReportData> {
  if (!pagespeedApiKey) {
    logger.warn("PAGESPEED_API_KEY is not set. Skipping Lighthouse audit.", { reportId });
    return {
      success: false,
      error: "PageSpeed API Key not configured. Lighthouse audit skipped.",
    };
  }

  try {
    logger.info("Starting Lighthouse audit via PageSpeed API...", { reportId, urlToScan });
    const fetchModule = await import("node-fetch");
    const fetch = fetchModule.default;
    const categories = ["performance", "accessibility", "best-practices", "seo"];
    const categoryParams = categories.map((cat) => `category=${cat}`).join("&");
    const psApiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(urlToScan)}&${categoryParams}&key=${pagespeedApiKey}&strategy=DESKTOP`;

    const psResponse = await fetch(psApiUrl);
    if (!psResponse.ok) {
      const errorBody = await psResponse.text();
      logger.error("PageSpeed API request failed", { reportId, status: psResponse.status, statusText: psResponse.statusText, body: errorBody });
      throw new Error(`PageSpeed API request failed with status ${psResponse.status}: ${errorBody}`);
    }
    const psJson = await psResponse.json() as any;

    if (psJson.lighthouseResult && psJson.lighthouseResult.categories) {
      const reportData: LighthouseReportData = { success: true, scores: {} };
      for (const categoryId in psJson.lighthouseResult.categories) {
        if (Object.prototype.hasOwnProperty.call(psJson.lighthouseResult.categories, categoryId)) {
          const category = psJson.lighthouseResult.categories[categoryId];
          if (reportData.scores && category.score !== null && category.score !== undefined) {
            (reportData.scores as any)[categoryId] = Math.round(category.score * 100);
          }
        }
      }

      const accessibilityCategory = psJson.lighthouseResult.categories["accessibility"];
      if (accessibilityCategory && accessibilityCategory.auditRefs && Array.isArray(accessibilityCategory.auditRefs)) {
        reportData.accessibilityIssues = accessibilityCategory.auditRefs
          .filter((auditRef: any) =>
            auditRef && auditRef.relevant &&
            psJson.lighthouseResult.audits && psJson.lighthouseResult.audits[auditRef.id] &&
            psJson.lighthouseResult.audits[auditRef.id].score !== null &&
            psJson.lighthouseResult.audits[auditRef.id].score < 1 &&
            psJson.lighthouseResult.audits[auditRef.id].details
          )
          .map((auditRef: any) => {
            const audit = psJson.lighthouseResult.audits[auditRef.id];
            return {
              id: audit.id,
              title: audit.title,
              description: audit.description,
              score: audit.score,
            };
          })
          .slice(0, 10);
      } else {
        logger.warn("Accessibility category or its auditRefs are missing/not an array.", { reportId, accessibilityCategory });
        reportData.accessibilityIssues = [];
      }

      const audits = psJson.lighthouseResult.audits;
      if (psJson.lighthouseResult.auditRefs && Array.isArray(psJson.lighthouseResult.auditRefs) && audits) {
        reportData.performanceOpportunities = psJson.lighthouseResult.auditRefs
          .filter((auditRef: any) =>
            auditRef && auditRef.group === "opportunities" &&
            audits[auditRef.id] && audits[auditRef.id].details &&
            (audits[auditRef.id].details.overallSavingsMs > 0 || audits[auditRef.id].details.overallSavingsBytes > 0)
          )
          .map((auditRef: any) => {
            const audit = audits[auditRef.id];
            return {
              id: audit.id,
              title: audit.title,
              description: audit.description,
              overallSavingsMs: audit.details.overallSavingsMs,
              overallSavingsBytes: audit.details.overallSavingsBytes,
            };
          })
          .sort((a: any, b: any) => (b.overallSavingsMs || 0) - (a.overallSavingsMs || 0))
          .slice(0, 3);
      } else {
        logger.warn("Lighthouse global auditRefs are missing/not an array or audits object is missing.", { reportId });
        reportData.performanceOpportunities = [];
      }

      reportData.detailedMetrics = {
        firstContentfulPaint: audits["first-contentful-paint"]?.numericValue,
        largestContentfulPaint: audits["largest-contentful-paint"]?.numericValue,
        totalBlockingTime: audits["total-blocking-time"]?.numericValue,
        cumulativeLayoutShift: audits["cumulative-layout-shift"]?.numericValue,
        speedIndex: audits["speed-index"]?.numericValue,
      };

      const extractCategoryAudits = (categoryKey: string, maxItems: number = 3) => {
        const category = psJson.lighthouseResult.categories[categoryKey];
        if (!category || !category.auditRefs || !Array.isArray(category.auditRefs) || !psJson.lighthouseResult.audits) {
            logger.warn(`Audit refs missing or not an array for category: ${categoryKey}, or global audits missing.`, { reportId, categoryKey });
            return [];
        }
        return category.auditRefs
          .filter((auditRef: any) => {
            const audit = psJson.lighthouseResult.audits[auditRef.id];
            return auditRef && audit && (audit.score !== 1 || audit.details); // include items that failed or have details
          })
          .map((auditRef: any) => {
            const audit = psJson.lighthouseResult.audits[auditRef.id];
            return {
              id: audit.id,
              title: audit.title,
              description: audit.description,
              score: audit.score,
            };
          })
          .sort((a: any, b: any) => (a.score === null ? 1 : a.score) - (b.score === null ? 1 : b.score))
          .slice(0, maxItems);
      };

      reportData.seoAudits = extractCategoryAudits("seo");
      reportData.bestPracticesAudits = extractCategoryAudits("best-practices");
      reportData.success = true;
      logger.info("Lighthouse audit successful.", { reportId });
      return reportData;
    } else {
      logger.warn("Lighthouse result categories not found in PageSpeed API response", { reportId, response: psJson });
      throw new Error("Lighthouse result categories not found in PageSpeed API response.");
    }
  } catch (lighthouseError: any) {
    logger.error(
      "Error during Lighthouse audit via PageSpeed API: " + lighthouseError.message,
      {
        reportId,
        errorStack: lighthouseError.stack,
        errorDetails: JSON.stringify(lighthouseError),
      },
    );
    return {
      success: false,
      error: `Lighthouse audit failed: ${lighthouseError.message}`,
    };
  }
}

// Helper function for Gemini AI analysis
async function performGeminiAnalysis(
  screenshotUrl: string, // Keep for logging or future use if direct URL needed
  reportId: string,
  geminiApiKey: string | undefined,
  geminiModelName: string | undefined
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
    };
  }

  try {
    logger.info(`Starting AI UX/Design analysis with Gemini model: ${geminiModelName}...`, { reportId, screenshotUrl });

    // Construct the file path directly, consistent with how it was saved
    const screenshotFileName = `screenshots/${reportId}/screenshot.jpg`;
    const bucket = admin.storage().bucket(); // Get default bucket

    logger.info(`Attempting to download screenshot from gs://${bucket.name}/${screenshotFileName}`, { reportId });
    const [screenshotBuffer] = await bucket.file(screenshotFileName).download();
    logger.info(`Screenshot (${screenshotBuffer.length} bytes) fetched successfully for Gemini analysis.`, { reportId });

    const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
    const prompt = `Analyze the user interface and user experience of the webpage in this screenshot. Provide a list of actionable suggestions to improve it. Focus on clarity, usability, accessibility, and overall design effectiveness. For each suggestion, briefly explain the reasoning. Format each suggestion as a separate point. Limit to 10 concise suggestions.`;
    const imagePart: Part = { inlineData: { data: screenshotBuffer.toString("base64"), mimeType: "image/jpeg" } };
    const textPart: Part = { text: prompt };
    const generationConfig = { temperature: 0.3, topK: 32, topP: 1, maxOutputTokens: 2048 };
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

    const suggestionsArray = responseText ? responseText.split("\n").map((s: string) => s.trim()).filter((s: string) => s.length > 0) : [];
    const parsedSuggestions = suggestionsArray.map((s: string) => ({ suggestion: s, reasoning: "Provided by AI" }));

    return {
      status: "completed",
      suggestions: parsedSuggestions.slice(0, 10),
      modelUsed: geminiModelName,
    };
  } catch (aiError: any) {
    logger.error(
      "Error during AI UX/Design analysis: " + aiError.message,
      {
        reportId,
        errorStack: aiError.stack,
        errorDetails: JSON.stringify(aiError),
      },
    );
    return {
      status: "error",
      error: `AI analysis failed: ${aiError.message}`,
      suggestions: [],
      modelUsed: geminiModelName,
    };
  }
}

export const processScanTask = onTaskDispatched<ScanTaskPayload>(
  {
    retryConfig: {
      maxAttempts: 3,
      minBackoffSeconds: 30,
    },
    rateLimits: {
      maxConcurrentDispatches: 10,
    },
    memory: "1GiB",
    timeoutSeconds: 540,
  },
  async (request) => {
    const rtdb = admin.database();
    const { reportId, urlToScan } = request.data;
    logger.info(`Processing scan task for reportId: ${reportId}, url: ${urlToScan}`);

    const reportRef = rtdb.ref(`reports/${reportId}`);

    // Initial status update
    await reportRef.update({ status: "processing", updatedAt: Date.now() });

    try {
      logger.info("Starting parallel scans for Playwright and Lighthouse...", { reportId });
      const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY;
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL;

      // Perform Playwright and Lighthouse scans in parallel
      const [playwrightReport, lighthouseReport] = await Promise.all([
        performPlaywrightScan(urlToScan, reportId),
        performLighthouseScan(urlToScan, reportId, PAGESPEED_API_KEY),
      ]);
      logger.info("Completed parallel scans. Playwright success: " + playwrightReport.success + ", Lighthouse success: " + lighthouseReport.success, { reportId });

      // Prepare data for RTDB update
      const updateData: Partial<ReportData> = {
        playwrightReport: playwrightReport,
        lighthouseReport: lighthouseReport,
        updatedAt: Date.now(),
      };

      // Update RTDB with Playwright and Lighthouse results
      logger.info("Updating report with Playwright and Lighthouse results...", { reportId, dataKeys: Object.keys(updateData) });
      await reportRef.update(updateData);
      logger.info("Report updated with Playwright and Lighthouse results.", { reportId });

      // Perform Gemini analysis if Playwright was successful and screenshot is available
      let aiUxDesignSuggestions: AiUxDesignSuggestions | undefined = undefined;
      if (playwrightReport.success && playwrightReport.screenshotUrl) {
        logger.info("Playwright successful, proceeding with Gemini analysis.", { reportId });
        aiUxDesignSuggestions = await performGeminiAnalysis(
          playwrightReport.screenshotUrl,
          reportId,
          GEMINI_API_KEY,
          GEMINI_MODEL_NAME
        );
        logger.info(`Gemini analysis result status: ${aiUxDesignSuggestions.status}`, { reportId });
        await reportRef.child("aiUxDesignSuggestions").update(aiUxDesignSuggestions);
        logger.info("Report updated with AI UX design suggestions.", { reportId });
      } else {
        logger.info("Skipping Gemini analysis due to Playwright failure or no screenshot URL.", { reportId, playwrightSuccess: playwrightReport.success, hasScreenshot: !!playwrightReport.screenshotUrl });
        aiUxDesignSuggestions = {
            status: "skipped",
            error: "AI analysis skipped due to Playwright failure or missing screenshot.",
            suggestions: [],
            modelUsed: GEMINI_MODEL_NAME || undefined,
        };
        await reportRef.child("aiUxDesignSuggestions").update(aiUxDesignSuggestions);
        logger.info("Report updated with skipped AI UX design suggestions.", { reportId });
      }

      await reportRef.update({ status: "completed", updatedAt: Date.now() });
      logger.info(`processScanTask completed for reportId: ${reportId}`);

    } catch (criticalError: any) {
      logger.error(
        `Critical error in processScanTask for reportId: ${reportId}: ` + criticalError.message,
        {
          reportId,
          errorStack: criticalError.stack,
          errorDetails: JSON.stringify(criticalError),
        }
      );
      try {
        logger.warn("Attempting to update report status to failed due to critical error.", { reportId });
        await reportRef.update({ status: "failed", error: `Critical task failure: ${criticalError.message}`, updatedAt: Date.now() });
        logger.info("Report status updated to failed.", { reportId });
      } catch (rtdbUpdateError: any) {
        logger.error("Failed to update report status to failed after critical error.", {
            reportId,
            updateErrorMesssage: rtdbUpdateError.message,
            originalCriticalErrorMessage: criticalError.message
        });
      }
    }
  }
);

// Ensure AiUxDesignSuggestions type is robust if not already defined in ../types
// Example local definition if not in types.ts:
// interface AiUxDesignSuggestions {
//   status: "completed" | "error" | "pending" | "skipped";
//   suggestions: Array<{ suggestion: string; reasoning: string }>;
//   modelUsed?: string;
//   error?: string;
// }
