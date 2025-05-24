import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
// @ts-ignore: No types for playwright-aws-lambda
// import * as playwright from "playwright-aws-lambda"; // No longer launching browser here
import { Page } from "playwright-core"; // Added import
import { ScreenshotUrls, PlaywrightReport, AccessibilityKeyboardCheckResult } from "../types";

// Helper function for Playwright scan
export async function performPlaywrightScan(page: Page, urlToScan: string, reportId: string): Promise<PlaywrightReport> {
  logger.info("Starting Playwright screenshot capture using provided page...", { reportId, urlToScan });
  const screenshotUrls: ScreenshotUrls = {};
  let pageTitle: string | undefined;
  let overallSuccess = false; // Track if at least one screenshot succeeds

  const viewports: Array<{ name: keyof ScreenshotUrls; width: number; height: number }> = [
    { name: "desktop", width: 1280, height: 720 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 },
  ];

  try {
    // Browser and context are now managed externally
    // const context = await browser.newContext({ deviceScaleFactor: 1 });
    // const page = await context.newPage();

    logger.info(`Navigating to ${urlToScan} for screenshots (or using current page)...`, { reportId });
    // Ensure the page is at the correct URL. If it's already there, this is fine.
    // If the page was used for something else, this navigates.
    await page.goto(urlToScan, { waitUntil: "load", timeout: 120000 });
    pageTitle = await page.title();

    const bucket = admin.storage().bucket();
    const capturedScreenshotData: Array<{ name: keyof ScreenshotUrls; buffer: Buffer }> = [];

    // Step 1: Sequentially capture all screenshot buffers
    for (const viewport of viewports) {
      try {
        logger.info(`Setting viewport to ${String(viewport.name)} (${viewport.width}x${viewport.height}) and capturing screenshot...`, { reportId, viewport: String(viewport.name) });
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(1000); // Wait for reflow
        const screenshotBuffer = await page.screenshot({ type: "jpeg", quality: 80 });
        capturedScreenshotData.push({ name: viewport.name, buffer: screenshotBuffer });
        logger.info(`Screenshot captured for ${String(viewport.name)}.`, { reportId, viewport: String(viewport.name) });
      } catch (captureError: any) {
        logger.error(`Failed to capture screenshot for viewport: ${String(viewport.name)}`, { reportId, viewport: String(viewport.name), error: captureError.message, stack: captureError.stack });
        // Continue to next viewport even if one fails
      }
    }

    // Step 2: Parallelize uploading of captured buffers
    if (capturedScreenshotData.length > 0) {
      const uploadPromises = capturedScreenshotData.map(async (data) => {
        try {
          const screenshotFileName = `screenshots/${reportId}/screenshot_${String(data.name)}.jpg`;
          const file = bucket.file(screenshotFileName);
          await file.save(data.buffer, {
            metadata: { contentType: "image/jpeg" },
          });
          await file.makePublic();
          const publicUrl = file.publicUrl();
          logger.info(`Screenshot for ${String(data.name)} uploaded and made public.`, { reportId, viewport: String(data.name), url: publicUrl });
          return { name: data.name, url: publicUrl, status: 'fulfilled' as const };
        } catch (uploadError: any) {
          logger.error(`Failed to upload screenshot for viewport: ${String(data.name)}`, { reportId, viewport: String(data.name), error: uploadError.message, stack: uploadError.stack });
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
          logger.warn(`Screenshot upload failed for viewport: ${String(result.value.name)}`, { reportId, viewport: String(result.value.name), error: result.value.error });
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
    // Browser is no longer closed here; it's managed by the caller (processScanTask)
    // if (browser) {
    //   logger.info("Closing browser (Playwright)...", { reportId });
    //   await browser.close();
    // }
    logger.info("Playwright scan operations finished for this service.", {reportId});
  }
}

/**
 * Perform keyboard accessibility checks:
 * - Collects all interactive elements in DOM order.
 * - Simulates Tab navigation to record focus order.
 * - Identifies elements not reachable by Tab.
 * - Compares DOM order to focus order.
 */
export async function performAccessibilityKeyboardChecks(page: Page): Promise<AccessibilityKeyboardCheckResult> {
  try {
    // 1. Get all interactive elements in DOM order
    const domOrder = await page.evaluate(() => {
      const interactiveSelectors = [
        'a[href]:not([tabindex="-1"]):not([disabled])',
        'button:not([tabindex="-1"]):not([disabled])',
        'input:not([type="hidden"]):not([tabindex="-1"]):not([disabled])',
        'select:not([tabindex="-1"]):not([disabled])',
        'textarea:not([tabindex="-1"]):not([disabled])',
        '[tabindex]:not([tabindex="-1"]):not([disabled])'
      ];
      const elements = Array.from(document.querySelectorAll(interactiveSelectors.join(',')));
      return elements.map(el => ({
        selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.className ? `.${el.className.toString().replace(/\s+/g, '.')}` : ''),
        tag: el.tagName.toLowerCase(),
        text: (el as HTMLElement).innerText || (el as HTMLInputElement).value || '',
        id: el.id || null,
        className: el.className || null,
      }));
    });

    // 2. Simulate Tab navigation to record focus order
    const focusOrder = await page.evaluate(async () => {
      function isVisible(el: Element) {
        const style = window.getComputedStyle(el);
        return style && style.visibility !== 'hidden' && style.display !== 'none';
      }
      const focusables = Array.from(document.querySelectorAll(
        'a[href]:not([tabindex="-1"]):not([disabled]),' +
        'button:not([tabindex="-1"]):not([disabled]),' +
        'input:not([type="hidden"]):not([tabindex="-1"]):not([disabled]),' +
        'select:not([tabindex="-1"]):not([disabled]),' +
        'textarea:not([tabindex="-1"]):not([disabled]),' +
        '[tabindex]:not([tabindex="-1"]):not([disabled])'
      )).filter(isVisible);

      const visited: Element[] = [];
      // Focus the body to start
      (document.body as HTMLElement).focus();
      for (let i = 0; i < focusables.length + 10; i++) {
        // Press Tab
        const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
        document.dispatchEvent(event);
        // Try to move focus
        let found = false;
        for (const el of focusables) {
          if (el === document.activeElement && !visited.includes(el)) {
            visited.push(el);
            found = true;
            break;
          }
        }
        if (!found) {
          // Try to manually focus next
          for (const el of focusables) {
            if (!visited.includes(el)) {
              (el as HTMLElement).focus();
              if (el === document.activeElement) {
                visited.push(el);
                break;
              }
            }
          }
        }
        if (visited.length === focusables.length) break;
      }
      return visited.map(el => ({
        selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.className ? `.${el.className.toString().replace(/\s+/g, '.')}` : ''),
        tag: el.tagName.toLowerCase(),
        text: (el as HTMLElement).innerText || (el as HTMLInputElement).value || '',
        id: el.id || null,
        className: el.className || null,
      }));
    });

    // 3. Identify elements not reachable by Tab
    const notReachableByTab = domOrder.filter(
      domEl => !focusOrder.some(focusEl => focusEl.selector === domEl.selector)
    );

    // 4. Compare DOM order to focus order
    const domSelectors = domOrder.map(el => el.selector);
    const focusSelectors = focusOrder.map(el => el.selector);
    const tabOrderMatchesDomOrder = JSON.stringify(domSelectors) === JSON.stringify(focusSelectors);

    return {
      domOrder,
      focusOrder,
      notReachableByTab,
      tabOrderMatchesDomOrder,
    };
  } catch (error: any) {
    return {
      domOrder: [],
      focusOrder: [],
      notReachableByTab: [],
      tabOrderMatchesDomOrder: false,
      error: error.message || String(error),
    };
  }
}
