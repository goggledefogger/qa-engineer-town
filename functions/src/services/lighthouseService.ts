import * as logger from "firebase-functions/logger";
import { LighthouseReportData } from "../types";

// Helper function for Lighthouse scan
export async function performLighthouseScan(urlToScan: string, reportId: string, pagespeedApiKey: string | undefined): Promise<LighthouseReportData> {
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
        logger.info(`[LighthouseService] Accessibility: Found ${accessibilityCategory.auditRefs.length} auditRefs.`, { reportId });
        reportData.accessibilityIssues = accessibilityCategory.auditRefs
          .filter((auditRef: any) => {
            if (!auditRef) { return false; }
            const audit = psJson.lighthouseResult.audits && psJson.lighthouseResult.audits[auditRef.id];
            if (!audit) { return false; }
            if (audit.score === null) { return false; }
            if (audit.score >= 1) { return false; }
            if (!audit.details) { return false; }
            return true;
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
          .slice(0, 10);
      } else {
        logger.warn("Accessibility category or its auditRefs are missing/not an array.", { reportId, accessibilityCategory });
        reportData.accessibilityIssues = [];
      }

      const audits = psJson.lighthouseResult.audits;
      if (psJson.lighthouseResult.auditRefs && Array.isArray(psJson.lighthouseResult.auditRefs) && audits) {
        logger.info(`[LighthouseService] Performance: Found ${psJson.lighthouseResult.auditRefs.length} global auditRefs to check for opportunities.`, { reportId });
        reportData.performanceOpportunities = psJson.lighthouseResult.auditRefs
          .filter((auditRef: any) => {
            if (!auditRef) { return false; }
            const audit = audits[auditRef.id];
            if (!audit) { return false; }
            if (auditRef.group !== "opportunities") { return false; }
            if (!audit.details) { return false; }
            if (!(audit.details.overallSavingsMs > 0 || audit.details.overallSavingsBytes > 0)) { return false; }
            return true;
          })
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

      // Add non-perfect performance audits (score < 1, not core metrics, not opportunities)
      const coreMetricIds = [
        "first-contentful-paint",
        "largest-contentful-paint",
        "total-blocking-time",
        "cumulative-layout-shift",
        "speed-index"
      ];
      const opportunityIds = (reportData.performanceOpportunities || []).map(o => o.id);
      reportData.nonPerfectPerformanceAudits = Object.values(audits)
        .filter((audit: any) => {
          if (!audit || typeof audit.id !== "string") return false;
          if (coreMetricIds.includes(audit.id)) return false;
          if (opportunityIds.includes(audit.id)) return false;
          if (typeof audit.score !== "number" || audit.score === 1) return false;
          if (audit.score === null) return false;
          if (audit.score > 1 || audit.score < 0) return false;
          // Only include audits from the performance category
          if (!audit.category || audit.category !== "performance") {
            // Some audits may not have a category, so fallback: include if referenced in performance category
            const perfCat = psJson.lighthouseResult.categories["performance"];
            if (
              !perfCat ||
              !perfCat.auditRefs ||
              !perfCat.auditRefs.some((ref: any) => ref.id === audit.id)
            ) {
              return false;
            }
          }
          return true;
        })
        .map((audit: any) => ({
          id: audit.id,
          title: audit.title,
          description: audit.description,
          score: audit.score,
          numericValue: audit.numericValue ?? null,
          displayValue: audit.displayValue ?? null,
          explanation: audit.explanation ?? null,
          thresholds: audit.thresholds ?? null,
        }))
        .sort((a: any, b: any) => (a.score === null ? 1 : a.score) - (b.score === null ? 1 : b.score));

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
