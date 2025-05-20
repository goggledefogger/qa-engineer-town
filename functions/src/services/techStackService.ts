import * as logger from "firebase-functions/logger";
let fetchFn: typeof import('node-fetch').default | undefined;
async function getFetch() {
  if (!fetchFn) {
    const { default: importedFetch } = await import('node-fetch');
    fetchFn = importedFetch;
  }
  return fetchFn;
}
import { TechStackData, DetectedTechnology } from "../types";

// Removed Browser and Page imports from playwright-core

const WHATCMS_API_ENDPOINT = "https://whatcms.org/API/Tech";

function sanitizeTechnology(tech: any): DetectedTechnology {
  return {
    name: typeof tech.name === "string" ? tech.name : "Unknown",
    slug: typeof tech.name === "string"
      ? tech.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      : "unknown",
    version: typeof tech.version === "string" ? tech.version : null,
    categories: Array.isArray(tech.categories) ? tech.categories : [],
    confidence: 100,
    icon: tech.icon ?? null,
    website: typeof tech.website === "string" ? tech.website : null,
    whatCmsId: tech.id ?? null,
    whatCmsUrl: typeof tech.url === "string" ? tech.url : null,
  };
}

/**
 * Performs technology stack detection on a given URL using the WhatCMS.org API.
 * @param urlToScan The URL to analyze.
 * @param reportId The ID of the report for logging purposes.
 * @returns A Promise resolving to TechStackData.
 */
export async function performTechStackScan(urlToScan: string, reportId: string): Promise<TechStackData> {
  logger.info("[TechStackService] Starting Tech Stack scan using WhatCMS.org API...", { reportId, urlToScan });

  const apiKey = process.env.WHATCMS_API_KEY;
  if (!apiKey) {
    logger.error("[TechStackService] WHATCMS_API_KEY is not set.", { reportId });
    return { status: "error", error: "Tech Stack scan failed: WHATCMS_API_KEY is not configured." };
  }

  const requestUrl = `${WHATCMS_API_ENDPOINT}?key=${apiKey}&url=${encodeURIComponent(urlToScan)}`;

  try {
    logger.info("[TechStackService] Calling WhatCMS.org API...", { reportId, requestUrl });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds timeout

    let response;
    try {
      const dynamicFetch = await getFetch();
      response = await dynamicFetch(requestUrl, {
        method: 'GET',
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("[TechStackService] WhatCMS.org API request failed.", {
        reportId,
        urlToScan,
        status: response.status,
        statusText: response.statusText,
        errorBody: errorBody.substring(0, 500), // Log a snippet of the body
      });
      return { status: "error", error: `Tech Stack scan failed: WhatCMS API error - ${response.status} ${response.statusText}` };
    }

    const data: any = await response.json();
    logger.info("[TechStackService] WhatCMS.org API response received.", { reportId, resultCode: data?.result?.code });

    if (data?.result?.code !== 200) {
      logger.warn("[TechStackService] WhatCMS.org API returned non-success code.", {
        reportId,
        urlToScan,
        apiResultCode: data?.result?.code,
        apiResultMessage: data?.result?.msg,
      });
      // Check for specific codes like 201 (not detected) which isn't strictly an error for us
      if (data?.result?.code === 201) { // CMS/Host/Theme not detected
        return { status: "completed", detectedTechnologies: [] }; // No technologies found is a valid completed state
      }
      return { status: "error", error: `Tech Stack scan failed: WhatCMS API reported code ${data?.result?.code} - ${data?.result?.msg}` };
    }

    if (!data.results || !Array.isArray(data.results)) {
      logger.warn("[TechStackService] WhatCMS.org API response missing 'results' array.", { reportId, urlToScan, responseData: data });
      return { status: "completed", detectedTechnologies: [] }; // Treat as no tech found
    }

    const detectedTechnologies: DetectedTechnology[] = data.results.map((tech: any) => sanitizeTechnology(tech));

    logger.info("[TechStackService] Tech Stack scan completed successfully using WhatCMS.org.", { reportId, count: detectedTechnologies.length });
    return { status: "completed", detectedTechnologies };

  } catch (error: any) {
    logger.error("[TechStackService] Error during Tech Stack scan with WhatCMS.org API:", {
      reportId,
      urlToScan,
      errorMessage: error.message,
      errorStack: error.stack,
    });
    return { status: "error", error: `Tech Stack scan failed: ${error.message}` };
  }
}
