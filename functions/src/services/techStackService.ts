import * as logger from "firebase-functions/logger";
import Wappalyzer from 'wapalyzer'; // Community fork
import { TechStackData, DetectedTechnology } from "../types"; // Assuming types are in ../types/index.ts

// Default options for Wappalyzer. Fine-tuned for Cloud Function environment.
const DEFAULT_WAPPALYZER_OPTIONS = {
  debug: false,
  delay: 200, // Lower delay, as we primarily analyze one page
  maxDepth: 1, // Only analyze the given URL, no deep crawling
  maxUrls: 1,  // Process only the initial URL
  maxWait: 15000, // Max time to wait for page resources (15 seconds)
  recursive: false, // No recursive crawling
  probe: true, // Enable deeper inspection (DNS, specific file checks)
  userAgent: "QAEngineerTown-Bot/1.0 (+https://github.com/YourOrg/YourRepo)", // Example, make it specific
  htmlMaxCols: 2000,
  htmlMaxRows: 2000,
  noScripts: false, // Allow scripts to run, for better detection
  noRedirect: false, // Allow redirects to an extent
};

/**
 * Performs technology stack detection on a given URL using Wappalyzer.
 * @param urlToScan The URL to analyze.
 * @param reportId The ID of the report for logging purposes.
 * @returns A Promise resolving to TechStackData.
 */
export async function performTechStackScan(urlToScan: string, reportId: string): Promise<TechStackData> {
  logger.info("Starting Tech Stack scan...", { reportId, urlToScan });

  // The 'wapalyzer' package from Lissy93 fork is expected to be a class.
  const wappalyzer = new Wappalyzer(DEFAULT_WAPPALYZER_OPTIONS);

  try {
    logger.info("Initializing Wappalyzer...", { reportId });
    await wappalyzer.init(); // Initializes Puppeteer etc.
    logger.info("Wappalyzer initialized. Opening URL...", { reportId, urlToScan });
    const site = await wappalyzer.open(urlToScan);
    logger.info("URL opened. Analyzing site for technologies...", { reportId });
    const results = await site.analyze();
    logger.info("Site analysis complete.", { reportId });

    // Ensure results.technologies is an array before mapping
    const technologiesDetected = results.technologies && Array.isArray(results.technologies) ? results.technologies : [];

    const detectedTechnologies: DetectedTechnology[] = technologiesDetected.map((tech: any) => ({
      name: tech.name || "Unknown",
      slug: tech.slug || "unknown",
      version: tech.version || null,
      confidence: tech.confidence || 0,
      categories: Array.isArray(tech.categories) ? tech.categories : [],
      icon: tech.icon,
      website: tech.website,
    }));

    await wappalyzer.destroy();
    logger.info("Tech Stack scan completed successfully.", { reportId, count: detectedTechnologies.length });
    logger.debug("[techStackService] Attempting to return technologies:", { reportId, urlToScan, detectedTechnologies: JSON.stringify(detectedTechnologies) });
    return { status: "completed", detectedTechnologies };
  } catch (error: any) {
    logger.error("Error during Tech Stack scan:", {
      reportId,
      urlToScan,
      errorMessage: error.message,
      errorStack: error.stack,
      // errorDetails: JSON.stringify(error) // Can be too verbose
    });
    // Attempt to destroy Wappalyzer even if an error occurred during init or analyze
    try {
      await wappalyzer.destroy();
    } catch (destroyError: any) {
      logger.warn("Error destroying Wappalyzer instance after a scan error:", { reportId, destroyErrorMessage: destroyError.message });
    }
    return { status: "error", error: `Tech Stack scan failed: ${error.message}` };
  }
} 