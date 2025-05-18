import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
// @ts-ignore: No types for playwright-aws-lambda
import * as playwright from "playwright-aws-lambda";
import { ScreenshotUrls, PlaywrightReport } from "../types";

// Helper function for Playwright scan
export async function performPlaywrightScan(urlToScan: string, reportId: string): Promise<PlaywrightReport> {
  logger.info("Launching browser for Playwright screenshots...", { reportId });
  let browser = null;
  const screenshotUrls: ScreenshotUrls = {};
  let pageTitle: string | undefined;
  let overallSuccess = false; // Track if at least one screenshot succeeds

  const viewports: Array<{ name: keyof ScreenshotUrls; width: number; height: number }> = [
    { name: "desktop", width: 1280, height: 720 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ];

  try {
    browser = await playwright.launchChromium({ headless: true });
    const context = await browser.newContext({ deviceScaleFactor: 1 });
    const page = await context.newPage();

    logger.info(`Navigating to ${urlToScan} for screenshots...`, { reportId });
    await page.goto(urlToScan, { waitUntil: "load", timeout: 120000 });
    pageTitle = await page.title();

    const bucket = admin.storage().bucket();
    const capturedScreenshotData: Array<{ name: keyof ScreenshotUrls; buffer: Buffer }> = [];

    // Step 1: Sequentially capture all screenshot buffers
    for (const viewport of viewports) {
      try {
        logger.info(`Setting viewport to ${viewport.name} (${viewport.width}x${viewport.height}) and capturing screenshot...`, { reportId, viewport: viewport.name });
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(1000); // Wait for reflow
        const screenshotBuffer = await page.screenshot({ type: "jpeg", quality: 80 });
        capturedScreenshotData.push({ name: viewport.name, buffer: screenshotBuffer });
        logger.info(`Screenshot captured for ${viewport.name}.`, { reportId, viewport: viewport.name });
      } catch (captureError: any) {
        logger.error(`Failed to capture screenshot for viewport: ${viewport.name}`, { reportId, viewport: viewport.name, error: captureError.message, stack: captureError.stack });
        // Continue to next viewport even if one fails
      }
    }

    // Step 2: Parallelize uploading of captured buffers
    if (capturedScreenshotData.length > 0) {
      const uploadPromises = capturedScreenshotData.map(async (data) => {
        try {
          const screenshotFileName = `screenshots/${reportId}/screenshot_${data.name}.jpg`;
          const file = bucket.file(screenshotFileName);
          await file.save(data.buffer, {
            metadata: { contentType: "image/jpeg" },
          });
          await file.makePublic();
          const publicUrl = file.publicUrl();
          logger.info(`Screenshot for ${data.name} uploaded and made public.`, { reportId, viewport: data.name, url: publicUrl });
          return { name: data.name, url: publicUrl, status: 'fulfilled' as const };
        } catch (uploadError: any) {
          logger.error(`Failed to upload screenshot for viewport: ${data.name}`, { reportId, viewport: data.name, error: uploadError.message, stack: uploadError.stack });
          return { name: data.name, error: uploadError.message, status: 'rejected' as const };
        }
      });

      const uploadResults = await Promise.allSettled(uploadPromises);

      uploadResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value.status === 'fulfilled') {
          screenshotUrls[result.value.name] = result.value.url;
          overallSuccess = true;
        } else if (result.status === 'rejected') {
          logger.error(`Upload promise for a viewport was rejected directly.`, { reportId, reason: result.reason });
        } else if (result.value.status === 'rejected') {
          logger.warn(`Screenshot upload failed for viewport: ${result.value.name}`, { reportId, viewport: result.value.name, error: result.value.error });
        }
      });
    }

    if (!overallSuccess && Object.keys(screenshotUrls).length === 0) {
      const initialCaptureAttempts = viewports.length;
      const errorMsg = capturedScreenshotData.length === 0 && initialCaptureAttempts > 0 ? "All screenshot captures failed." : "All screenshot uploads failed or no screenshots were captured.";
      throw new Error(errorMsg);
    }

    return {
      success: overallSuccess,
      pageTitle: pageTitle,
      screenshotUrls: screenshotUrls,
    };
  } catch (playwrightError: any) {
    logger.error("Error during Playwright screenshot capture or upload:", { reportId, errorMessage: playwrightError.message, stack: playwrightError.stack, detail: playwrightError });
    return {
      success: false,
      pageTitle: pageTitle,
      screenshotUrls: screenshotUrls,
      error: `Playwright operation failed: ${playwrightError.message}`,
    };
  } finally {
    if (browser) {
      logger.info("Closing browser (Playwright)...", { reportId });
      await browser.close();
    }
  }
}
