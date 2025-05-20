import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onTaskDispatched } from "firebase-functions/v2/tasks";
// @ts-ignore: No types for playwright-aws-lambda
import * as playwright from "playwright-aws-lambda"; // Import playwright
import { Browser, Page } from "playwright-core"; // Import Browser and Page
import {
  ScanTaskPayload,
  AiUxDesignSuggestions,
  ScreenshotUrls,
  ScreenContextType,
} from "../types/index";
import { performPlaywrightScan } from "../services/playwrightService";
import { performLighthouseScan } from "../services/lighthouseService";
import { performGeminiAnalysis } from "../services/geminiVisionService";
import {
  generateLighthouseItemExplanations,
  performLLMReportSummary,
} from "../services/geminiTextService";
import { performTechStackScan } from "../services/techStackService";

export const processScanTask = onTaskDispatched<ScanTaskPayload>(
  {
    retryConfig: {
      maxAttempts: 3,
      minBackoffSeconds: 30,
    },
    rateLimits: {
      maxConcurrentDispatches: 10,
    },
    memory: "2GiB",
    timeoutSeconds: 540,
  },
  async (request) => {
    const rtdb = admin.database();
    const { reportId, urlToScan } = request.data;
    logger.info(`Processing scan task for reportId: ${reportId}, url: ${urlToScan}`);

    const reportRef = rtdb.ref(`reports/${reportId}`);
    await reportRef.update({ status: "processing", updatedAt: Date.now() });

    let browser: Browser | null = null; // Define browser variable

    try {
      logger.info("Launching Playwright browser...", { reportId });
      browser = await playwright.launchChromium({ headless: true });
      const context = await browser.newContext({ deviceScaleFactor: 1 });
      const page: Page = await context.newPage();
      logger.info("Playwright browser launched and page created.", { reportId });

      logger.info("Starting Playwright scan...", { reportId });
      const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY;
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL;

      const playwrightReport = await performPlaywrightScan(page, urlToScan, reportId);
      logger.info("Playwright scan completed. Success: " + playwrightReport.success, { reportId });
      await reportRef.child("playwrightReport").update(playwrightReport);
      logger.info("Report updated with Playwright results.", { reportId });

      logger.info("Starting parallel Lighthouse, Gemini AI, and Tech Stack scans...", { reportId });
      const lighthousePromise = performLighthouseScan(urlToScan, reportId, PAGESPEED_API_KEY);
      // Tech stack scan no longer needs browser or page
      const techStackPromise = performTechStackScan(urlToScan, reportId);

      let geminiPromise: Promise<AiUxDesignSuggestions>;
      if (playwrightReport && playwrightReport.success && playwrightReport.screenshotUrls && Object.keys(playwrightReport.screenshotUrls).length > 0) {
        let screenshotUrlForAnalysis: string | undefined = undefined;
        let deviceTypeForAnalysis: ScreenContextType = 'general';

        if (playwrightReport.screenshotUrls.desktop) {
          screenshotUrlForAnalysis = playwrightReport.screenshotUrls.desktop;
          deviceTypeForAnalysis = 'desktop';
        } else if (playwrightReport.screenshotUrls.tablet) {
          screenshotUrlForAnalysis = playwrightReport.screenshotUrls.tablet;
          deviceTypeForAnalysis = 'tablet';
        } else if (playwrightReport.screenshotUrls.mobile) {
          screenshotUrlForAnalysis = playwrightReport.screenshotUrls.mobile;
          deviceTypeForAnalysis = 'mobile';
        } else {
          const firstAvailableUrl = Object.values(playwrightReport.screenshotUrls).find(url => typeof url === 'string');
          if (firstAvailableUrl) {
            screenshotUrlForAnalysis = firstAvailableUrl;
            const deviceKey = (Object.keys(playwrightReport.screenshotUrls) as Array<keyof ScreenshotUrls>).find(key => playwrightReport.screenshotUrls![key] === firstAvailableUrl);
            if (deviceKey && (deviceKey === 'desktop' || deviceKey === 'tablet' || deviceKey === 'mobile')) {
              deviceTypeForAnalysis = deviceKey;
            }
          }
        }

        if (screenshotUrlForAnalysis) {
          geminiPromise = performGeminiAnalysis(
            screenshotUrlForAnalysis,
            deviceTypeForAnalysis,
            reportId,
            GEMINI_API_KEY,
            GEMINI_MODEL_NAME,
            urlToScan
          );
        } else {
          logger.warn("Skipping Gemini analysis as no valid screenshot URL found despite Playwright success.", { reportId });
          geminiPromise = Promise.resolve({
            status: "skipped",
            error: "AI analysis skipped as no screenshot URL was available after Playwright scan.",
            suggestions: [],
            modelUsed: GEMINI_MODEL_NAME || undefined,
          });
        }
      } else {
        logger.info("Skipping Gemini analysis due to Playwright failure or no screenshot URLs.", { reportId, playwrightSuccess: playwrightReport?.success, hasScreenshots: !!(playwrightReport?.screenshotUrls && Object.keys(playwrightReport.screenshotUrls).length > 0) });
        geminiPromise = Promise.resolve({
          status: "skipped",
          error: "AI analysis skipped due to Playwright failure or missing screenshots.",
          suggestions: [],
          modelUsed: GEMINI_MODEL_NAME || undefined,
        });
      }

      // Execute all scan promises in parallel and handle partial failures using Promise.allSettled
      const results = await Promise.allSettled([
        lighthousePromise,
        geminiPromise,
        techStackPromise,
      ]);

      const lighthouseData = results[0].status === "fulfilled" && results[0].value && typeof results[0].value.success === "boolean"
        ? results[0].value
        : {
            status: "error",
            error: "Lighthouse scan failed",
            success: false,
            llmExplainedAccessibilityIssues: [],
            llmExplainedPerformanceOpportunities: [],
            llmExplainedSeoAudits: [],
            llmExplainedBestPracticesAudits: [],
          };
      const aiUxDesignSuggestions = results[1].status === "fulfilled" && results[1].value && typeof results[1].value.status === "string"
        ? results[1].value as AiUxDesignSuggestions
        : { status: "skipped", error: "Gemini analysis failed", suggestions: [], modelUsed: GEMINI_MODEL_NAME || undefined } as AiUxDesignSuggestions;
      const techStackData = results[2].status === "fulfilled" ? results[2].value : { status: "error", error: "Tech Stack scan failed", detectedTechnologies: [] };

      logger.info("Lighthouse scan raw data available.", { reportId, lighthouseSuccess: lighthouseData.success });
      await reportRef.child("lighthouseReport").update(lighthouseData);

      logger.info("Gemini AI UX suggestions available.", { reportId, aiStatus: aiUxDesignSuggestions.status });
      await reportRef.child("aiUxDesignSuggestions").update(aiUxDesignSuggestions);

      logger.info("Tech stack scan data available.", { reportId, techStackStatus: techStackData.status });
      await reportRef.child("techStack").update(techStackData);

      // Now process LLM explanations for Lighthouse items if Lighthouse scan was successful
      if (lighthouseData.success) {
        logger.info("Proceeding with LLM explanations for Lighthouse items.", { reportId });
        const explainedLighthouseData = await generateLighthouseItemExplanations(
          lighthouseData,
          reportId,
          GEMINI_API_KEY,
          GEMINI_MODEL_NAME
        );
        logger.info("LLM explanations for Lighthouse items completed processing.", { reportId });
        await reportRef.child("lighthouseReport").update(explainedLighthouseData);
      } else {
        logger.warn("Skipping LLM explanations for Lighthouse items due to Lighthouse scan failure.", { reportId, lighthouseError: lighthouseData.error });
        lighthouseData.llmExplainedAccessibilityIssues = [];
        lighthouseData.llmExplainedPerformanceOpportunities = [];
        lighthouseData.llmExplainedSeoAudits = [];
        lighthouseData.llmExplainedBestPracticesAudits = [];
        await reportRef.child("lighthouseReport").update(lighthouseData);
      }

      // Generate and save LLM report summary after all other sections
      logger.info("Starting LLM report summary generation...", { reportId });
      const llmSummary = await performLLMReportSummary(
        reportId,
        urlToScan,
        playwrightReport,
        lighthouseData,
        aiUxDesignSuggestions,
        GEMINI_API_KEY,
        GEMINI_MODEL_NAME
      );
      await reportRef.child("llmReportSummary").set(llmSummary);
      logger.info("LLM report summary saved to RTDB.", { reportId, summaryStatus: llmSummary.status });

      // Update overall report status to completed
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
    } finally {
      // Add finally block to close the browser
      if (browser) {
        logger.info("Closing Playwright browser in processScanTask...", { reportId });
        await browser.close();
        logger.info("Playwright browser closed.", { reportId });
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
