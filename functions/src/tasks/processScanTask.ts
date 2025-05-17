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
  AiUxDesignSuggestions,
  LLMReportSummary,
  ScreenshotUrls,
  ScreenContextType,
} from "../types";
import * as fs from "fs";
import * as path from "path";

// Helper function for Playwright scan
async function performPlaywrightScan(urlToScan: string, reportId: string): Promise<PlaywrightReport> {
  logger.info("Launching browser for Playwright screenshots...", { reportId });
  let browser = null;
  const screenshotUrls: ScreenshotUrls = {};
  let pageTitle: string | undefined;

  const viewports: Array<{ name: keyof ScreenshotUrls; width: number; height: number }> = [
    { name: "desktop", width: 1280, height: 720 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ];

  try {
    browser = await playwright.launchChromium({ headless: true });
    const context = await browser.newContext({ deviceScaleFactor: 1 }); // Viewport set per screenshot
    const page = await context.newPage();

    logger.info(`Navigating to ${urlToScan} for screenshots...`, { reportId });
    await page.goto(urlToScan, { waitUntil: "load", timeout: 120000 });
    pageTitle = await page.title();

    const bucket = admin.storage().bucket(); // Default bucket

    for (const viewport of viewports) {
      logger.info(`Setting viewport to ${viewport.name} (${viewport.width}x${viewport.height})`, { reportId });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      // Add a small delay or wait for a specific element if necessary for content to reflow
      await page.waitForTimeout(1000); // Wait 1 second for reflow

      const screenshotBuffer = await page.screenshot({ type: "jpeg", quality: 80 });
      logger.info(`Screenshot captured for ${viewport.name}.`, { reportId });

      const screenshotFileName = `screenshots/${reportId}/screenshot_${viewport.name}.jpg`;
      const file = bucket.file(screenshotFileName);
      await file.save(screenshotBuffer, {
        metadata: { contentType: "image/jpeg" },
      });
      await file.makePublic();
      screenshotUrls[viewport.name] = file.publicUrl();
      logger.info(`Screenshot for ${viewport.name} uploaded and made public.`, { reportId, url: screenshotUrls[viewport.name] });
    }

    return {
      success: true,
      pageTitle: pageTitle,
      screenshotUrls: screenshotUrls, // Use the new structure
    };
  } catch (playwrightError: any) {
    logger.error("Error during Playwright screenshot capture or upload:", { reportId, errorMessage: playwrightError.message, stack: playwrightError.stack, detail: playwrightError });
    return {
      success: false,
      pageTitle: pageTitle, // Still return page title if available
      screenshotUrls: screenshotUrls, // Return any screenshots captured before error
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
  screenshotUrl: string, // This is the specific public URL of the screenshot to analyze
  analyzedDeviceType: ScreenContextType, // Added parameter for screen context
  reportId: string,
  geminiApiKey: string | undefined,
  geminiModelName: string | undefined,
  urlToScan: string
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

  // Read prompt from file (moved up to be available for processScreenshotBuffer if GS path is used)
  const promptFilePath = path.join(__dirname, "..", "prompts", "ai_ux_design_prompt.md");
  let promptTemplate = "";
  try {
    promptTemplate = fs.readFileSync(promptFilePath, "utf-8");
  } catch (e: any) {
    logger.error("Failed to read AI UX Design prompt template file: " + e.message, { reportId, path: promptFilePath });
    return { // Return early if prompt file cannot be read
      status: "error",
      error: `Failed to read AI UX Design prompt template: ${e.message}`,
      suggestions: [],
      modelUsed: geminiModelName,
    };
  }
  const finalPrompt = promptTemplate;

  try {
    logger.info(`Starting AI UX/Design analysis with Gemini model: ${geminiModelName}...`, { reportId, screenshotUrlToAnalyze: screenshotUrl });

    const bucket = admin.storage().bucket();
    const urlPrefix = `https://storage.googleapis.com/${bucket.name}/`;
    let screenshotBuffer: Buffer;

    if (screenshotUrl.startsWith(urlPrefix)) {
      const filePathInBucket = screenshotUrl.substring(urlPrefix.length);
      const decodedFilePathInBucket = decodeURIComponent(filePathInBucket);
      logger.info(`Attempting to download screenshot from extracted GCS public URL path: gs://${bucket.name}/${decodedFilePathInBucket}`, { reportId, originalUrl: screenshotUrl });
      [screenshotBuffer] = await bucket.file(decodedFilePathInBucket).download();
    } else {
      const gsUrlPrefix = `gs://${bucket.name}/`;
      if (screenshotUrl.startsWith(gsUrlPrefix)) {
        const filePathFromGsUrl = screenshotUrl.substring(gsUrlPrefix.length);
        const decodedFilePathFromGsUrl = decodeURIComponent(filePathFromGsUrl);
        logger.info(`Attempting to download screenshot using GS URI path: gs://${bucket.name}/${decodedFilePathFromGsUrl}`, { reportId });
        [screenshotBuffer] = await bucket.file(decodedFilePathFromGsUrl).download();
      } else {
        logger.error("Screenshot URL does not have an expected GCS public URL or GS URI prefix.", {
          reportId,
          screenshotUrlProvided: screenshotUrl,
          expectedGcsPrefix: urlPrefix,
          expectedGsPrefix: gsUrlPrefix
        });
        throw new Error("Invalid screenshot URL format. Expected Google Cloud Storage public URL or GS URI.");
      }
    }

    logger.info(`Screenshot (${screenshotBuffer.length} bytes) fetched successfully for Gemini analysis.`, { reportId });

    const genAI = new GoogleGenAI({ apiKey: geminiApiKey });
    const imagePart: Part = { inlineData: { data: screenshotBuffer.toString("base64"), mimeType: "image/jpeg" } };
    const textPart: Part = { text: finalPrompt };
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

    const suggestionsArray = responseText ? responseText.split("\n").map((s: string) => s.trim()).filter((s: string) => s.length > 0 && s !== "---") : [];
    const parsedSuggestions = suggestionsArray.map((s: string) => ({
      suggestion: s,
      reasoning: "", // Reasoning might be part of the suggestion text itself based on current prompt
      screenContext: analyzedDeviceType
    }));

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
        screenshotUrlProvided: screenshotUrl,
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

// Helper function for LLM Report Summary Generation
async function performLLMReportSummary(
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
    return {
      status: "skipped",
      error: "Gemini API Key or Model not configured.",
    };
  }

  logger.info(`Starting LLM Report Summary generation with Gemini model: ${geminiModelName}...`, { reportId });

  // 1. Collate data for the prompt
  const condensedReportData: any = {
    url: urlToScan,
    playwright: {
      pageTitle: playwrightReport?.pageTitle,
      screenshotsAvailable: playwrightReport?.screenshotUrls ? Object.keys(playwrightReport.screenshotUrls).filter(k => playwrightReport?.screenshotUrls?.[k as keyof ScreenshotUrls]) : [],
      error: playwrightReport?.error,
    },
    lighthouse: {
      overallScores: lighthouseReport?.scores,
      // Select a few key issues/opportunities to keep the prompt concise
      // For example, top 2-3 accessibility issues
      accessibilityIssues: lighthouseReport?.accessibilityIssues?.slice(0, 3).map(issue => ({ title: issue.title, description: issue.description, score: issue.score })),
      // Top 2-3 performance opportunities
      performanceOpportunities: lighthouseReport?.performanceOpportunities?.slice(0, 2).map(opp => ({ title: opp.title, potentialSavingsMs: opp.overallSavingsMs, description: opp.description })),
      seoIssues: lighthouseReport?.seoAudits?.filter(a => a.score !== null && a.score < 1).slice(0,2).map(a => ({title: a.title, description: a.description, score: a.score})),
      bestPracticesIssues: lighthouseReport?.bestPracticesAudits?.filter(a => a.score !== null && a.score < 1).slice(0,2).map(a => ({title: a.title, description: a.description, score: a.score})),
      error: lighthouseReport?.error,
    },
    aiUxSuggestions: {
      status: aiUxDesignSuggestions?.status,
      suggestions: aiUxDesignSuggestions?.suggestions?.slice(0, 5).map(s => s.suggestion), // First 5 suggestions
      error: aiUxDesignSuggestions?.error,
    },
  };

  // 2. Design the prompt
  const promptTemplatePath = path.join(__dirname, "..", "prompts", "llm_summary_prompt.md");
  let promptTemplate = "";
  try {
    promptTemplate = fs.readFileSync(promptTemplatePath, "utf-8");
  } catch (e: any) {
    logger.error("Failed to read LLM prompt template file: " + e.message, { reportId, path: promptTemplatePath });
    return {
      status: "error",
      error: `Failed to read LLM prompt template: ${e.message}`,
      modelUsed: geminiModelName,
    };
  }

  const prompt = promptTemplate
    .replace("__URL_TO_SCAN__", urlToScan)
    .replace("__CONDENSED_REPORT_DATA_JSON__", JSON.stringify(condensedReportData, null, 2));

  try {
    const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

    const generationConfigForSummary = {
        temperature: 0.5,
        maxOutputTokens: 1024,
    };

    const result = await genAI.models.generateContent({
      model: geminiModelName,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      ...generationConfigForSummary,
    });

    const summaryText = result.text;
    logger.info("LLM Report Summary generated successfully.", { reportId });

    return {
      status: "completed",
      summaryText: summaryText,
      modelUsed: geminiModelName,
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

      // Perform Gemini analysis if Playwright was successful and screenshots are available
      let aiUxDesignSuggestions: AiUxDesignSuggestions | undefined = undefined;
      if (playwrightReport && playwrightReport.success && playwrightReport.screenshotUrls && Object.keys(playwrightReport.screenshotUrls).length > 0) {
        logger.info("Playwright successful, proceeding with Gemini analysis.", { reportId });

        let screenshotUrlForAnalysis: string | undefined = undefined;
        let deviceTypeForAnalysis: ScreenContextType = 'general'; // Default context

        if (playwrightReport.screenshotUrls.desktop) {
          screenshotUrlForAnalysis = playwrightReport.screenshotUrls.desktop;
          deviceTypeForAnalysis = 'desktop';
        } else if (playwrightReport.screenshotUrls.tablet) {
          screenshotUrlForAnalysis = playwrightReport.screenshotUrls.tablet;
          deviceTypeForAnalysis = 'tablet';
        } else if (playwrightReport.screenshotUrls.mobile) {
          screenshotUrlForAnalysis = playwrightReport.screenshotUrls.mobile;
          deviceTypeForAnalysis = 'mobile';
        } else { // Fallback to the first available URL if specific ones aren't named or present
          const firstAvailableUrl = Object.values(playwrightReport.screenshotUrls).find(url => typeof url === 'string');
          if (firstAvailableUrl) {
            screenshotUrlForAnalysis = firstAvailableUrl;
            // Try to infer device type from key if possible, otherwise keep 'general'
            const deviceKey = (Object.keys(playwrightReport.screenshotUrls) as Array<keyof ScreenshotUrls>).find(key => playwrightReport.screenshotUrls![key] === firstAvailableUrl);
            if (deviceKey && (deviceKey === 'desktop' || deviceKey === 'tablet' || deviceKey === 'mobile')) {
              deviceTypeForAnalysis = deviceKey;
            }
          }
        }

        if (screenshotUrlForAnalysis) {
          aiUxDesignSuggestions = await performGeminiAnalysis(
            screenshotUrlForAnalysis,
            deviceTypeForAnalysis, // Pass the determined device type
            reportId,
            GEMINI_API_KEY,
            GEMINI_MODEL_NAME,
            urlToScan
          );
          logger.info(`Gemini analysis result status: ${aiUxDesignSuggestions.status}`, { reportId });
          await reportRef.child("aiUxDesignSuggestions").update(aiUxDesignSuggestions);
          logger.info("Report updated with AI UX design suggestions.", { reportId });
        } else {
          logger.warn("Skipping Gemini analysis as no valid screenshot URL found despite Playwright success.", { reportId });
          aiUxDesignSuggestions = {
            status: "skipped",
            error: "AI analysis skipped as no screenshot URL was available after Playwright scan.",
            suggestions: [],
            modelUsed: GEMINI_MODEL_NAME || undefined,
          };
          await reportRef.child("aiUxDesignSuggestions").update(aiUxDesignSuggestions);
        }
      } else {
        logger.info("Skipping Gemini analysis due to Playwright failure or no screenshot URLs.", { reportId, playwrightSuccess: playwrightReport?.success, hasScreenshots: !!(playwrightReport?.screenshotUrls && Object.keys(playwrightReport.screenshotUrls).length > 0) });
        aiUxDesignSuggestions = {
            status: "skipped",
            error: "AI analysis skipped due to Playwright failure or missing screenshots.",
            suggestions: [],
            modelUsed: GEMINI_MODEL_NAME || undefined,
        };
        await reportRef.child("aiUxDesignSuggestions").update(aiUxDesignSuggestions);
        logger.info("Report updated with skipped AI UX design suggestions.", { reportId });
      }

      // Perform LLM Report Summary
      let llmReportSummary: LLMReportSummary | undefined = undefined;
      if (GEMINI_API_KEY && GEMINI_MODEL_NAME) {
        logger.info("Proceeding with LLM Report Summary generation.", { reportId });
        llmReportSummary = await performLLMReportSummary(
          reportId,
          urlToScan,
          playwrightReport,
          lighthouseReport,
          aiUxDesignSuggestions,
          GEMINI_API_KEY,
          GEMINI_MODEL_NAME
        );
        logger.info(`LLM Report Summary result status: ${llmReportSummary.status}`, { reportId });
        await reportRef.child("llmReportSummary").update(llmReportSummary);
        logger.info("Report updated with LLM Report Summary.", { reportId });
      } else {
        logger.info("Skipping LLM Report Summary due to missing Gemini API key or Model Name.", { reportId });
        llmReportSummary = {
          status: "skipped",
          error: "LLM Report Summary skipped due to missing Gemini API key or Model Name.",
        };
        await reportRef.child("llmReportSummary").update(llmReportSummary);
        logger.info("Report updated with skipped LLM Report Summary.", { reportId });
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
