import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onTaskDispatched } from "firebase-functions/v2/tasks";
// @ts-ignore: No types for playwright-aws-lambda
// import * as playwright from "playwright-aws-lambda"; // No longer needed here
import {
  ReportData,
  // LighthouseReportData, // <<< REMOVE THIS
  // PlaywrightReport, // <<< REMOVE THIS
  ScanTaskPayload,
  AiUxDesignSuggestions,
  LLMReportSummary,
  ScreenshotUrls,
  ScreenContextType,
} from "../types";
// import * as fs from "fs"; // Already removed
// import * as path from "path"; // Already removed
import { performPlaywrightScan } from "../services/playwrightService";
import { performLighthouseScan } from "../services/lighthouseService";
import { performGeminiAnalysis } from "../services/geminiVisionService";
import {
  performLLMReportSummary,
  generateLighthouseItemExplanations,
} from "../services/geminiTextService";

// Helper function for Playwright scan - REMOVED
// async function performPlaywrightScan(...) { ... } // Entire function removed

// Helper function for Lighthouse scan
// async function performLighthouseScan(urlToScan: string, reportId: string, pagespeedApiKey: string | undefined): Promise<LighthouseReportData> { ... } // Entire function removed

// Helper function for Gemini AI analysis - REMOVED
// async function performGeminiAnalysis(...) { ... } // Removed

// Helper function for LLM Report Summary Generation - REMOVED
// async function performLLMReportSummary(...) { ... } // Removed

// NEW HELPER FUNCTION to get LLM explanation for a single Lighthouse item - REMOVED
// async function getExplanationForLighthouseItem(...) { ... } // Removed

// NEW MAIN HELPER FUNCTION to generate all Lighthouse item explanations - REMOVED
// async function generateLighthouseItemExplanations(...) { ... } // Removed

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
    await reportRef.update({ status: "processing", updatedAt: Date.now() });

    try {
      logger.info("Starting Playwright scan...", { reportId });
      const PAGESPEED_API_KEY = process.env.PAGESPEED_API_KEY;
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL;

      const playwrightReport = await performPlaywrightScan(urlToScan, reportId);
      logger.info("Playwright scan completed. Success: " + playwrightReport.success, { reportId });
      await reportRef.child("playwrightReport").update(playwrightReport);
      logger.info("Report updated with Playwright results.", { reportId });

      logger.info("Starting parallel Lighthouse and Gemini AI scans...", { reportId });
      const lighthousePromise = performLighthouseScan(urlToScan, reportId, PAGESPEED_API_KEY);
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

      let [lighthouseData, aiUxDesignSuggestions] = await Promise.all([
        lighthousePromise,
        geminiPromise,
      ]);
      logger.info("Initial Lighthouse and Gemini AI (UX/Design) scans completed.", { reportId, lighthouseSuccess: lighthouseData.success, aiStatus: aiUxDesignSuggestions.status });

      if (lighthouseData.success) {
        logger.info("Proceeding with LLM explanations for Lighthouse items.", { reportId });
        // logger.debug("[processScanTask] Lighthouse data BEFORE generating explanations:",
        //   {
        //     reportId,
        //     hasAccessibilityIssues: !!lighthouseData.accessibilityIssues?.length,
        //     accessibilityIssuesCount: lighthouseData.accessibilityIssues?.length,
        //     hasPerformanceOpportunities: !!lighthouseData.performanceOpportunities?.length,
        //     performanceOpportunitiesCount: lighthouseData.performanceOpportunities?.length,
        //     // exampleAccessibilityIssue: lighthouseData.accessibilityIssues?.[0]?.title,
        //     // examplePerformanceOpportunity: lighthouseData.performanceOpportunities?.[0]?.title
        //   }
        // );

        lighthouseData = await generateLighthouseItemExplanations(
          lighthouseData,
          reportId,
          GEMINI_API_KEY,
          GEMINI_MODEL_NAME
        );
        logger.info("LLM explanations for Lighthouse items completed processing.", { reportId });

        // logger.debug("[processScanTask] Lighthouse data AFTER generating explanations:",
        //   {
        //     reportId,
        //     hasLlmExplainedAccessibility: !!lighthouseData.llmExplainedAccessibilityIssues?.length,
        //     llmExplainedAccessibilityCount: lighthouseData.llmExplainedAccessibilityIssues?.length,
        //     hasLlmExplainedPerformance: !!lighthouseData.llmExplainedPerformanceOpportunities?.length,
        //     llmExplainedPerformanceCount: lighthouseData.llmExplainedPerformanceOpportunities?.length,
        //     // exampleLlmAccessibility: lighthouseData.llmExplainedAccessibilityIssues?.[0]?.title,
        //     // exampleLlmPerformance: lighthouseData.llmExplainedPerformanceOpportunities?.[0]?.title
        //   }
        // );

      } else {
        logger.warn("Skipping LLM explanations for Lighthouse items due to Lighthouse scan failure.", { reportId, lighthouseError: lighthouseData.error });
        lighthouseData.llmExplainedAccessibilityIssues = [];
        lighthouseData.llmExplainedPerformanceOpportunities = [];
        lighthouseData.llmExplainedSeoAudits = [];
        lighthouseData.llmExplainedBestPracticesAudits = [];
      }

      const updatesForLighthouseAndAi: Partial<ReportData> = {
        lighthouseReport: lighthouseData,
        aiUxDesignSuggestions: aiUxDesignSuggestions,
        updatedAt: Date.now(),
      };
      await reportRef.update(updatesForLighthouseAndAi);
      logger.info("Report updated with Lighthouse and AI UX Design results (including LLM item explanations if processed).", { reportId });

      let llmReportSummary: LLMReportSummary | undefined = undefined;
      if (GEMINI_API_KEY && GEMINI_MODEL_NAME) {
        logger.info("Proceeding with LLM Report Summary generation.", { reportId });
        llmReportSummary = await performLLMReportSummary(
          reportId,
          urlToScan,
          playwrightReport,
          lighthouseData,
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
