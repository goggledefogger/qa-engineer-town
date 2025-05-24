import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
// @ts-ignore: No types for playwright-aws-lambda
// import * as playwright from "playwright-aws-lambda"; // No longer launching browser here
import { Page } from "playwright-core"; // Added import
import { ScreenshotUrls, PlaywrightReport, AccessibilityKeyboardCheckResult, ColorContrastResult, ContrastIssue, VisualOrderResult, VisualOrderIssue } from "../types";

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
 * Checks interactive elements for accessible name and ARIA state attributes.
 */
export async function performAccessibilityNameAndStateChecks(page: Page): Promise<{
  elementsMissingName: Array<{
    selector: string;
    tag: string;
    id: string | null;
    className: string | null;
    role: string | null;
    type: string | null;
    text: string;
  }>;
  elementsMissingState: Array<{
    selector: string;
    tag: string;
    id: string | null;
    className: string | null;
    role: string | null;
    type: string | null;
    text: string;
    missingStates: string[];
  }>;
  error?: string;
}> {
  try {
    return await page.evaluate(() => {
      function getAccessibleName(el: Element): string | null {
        // Try aria-label, aria-labelledby, alt, label, innerText, value
        if (el.hasAttribute('aria-label')) return el.getAttribute('aria-label');
        if (el.hasAttribute('aria-labelledby')) {
          const ids = el.getAttribute('aria-labelledby')?.split(' ') || [];
          return ids.map(id => {
            const ref = document.getElementById(id);
            return ref ? ref.innerText : '';
          }).join(' ').trim() || null;
        }
        if ((el as HTMLImageElement).alt) return (el as HTMLImageElement).alt;
        const labels = (el as HTMLInputElement).labels;
        if (labels && labels.length > 0)
          return Array.from(labels).map(l => l.innerText).join(' ');
        if ((el as HTMLElement).innerText) return (el as HTMLElement).innerText;
        if ((el as HTMLInputElement).value) return (el as HTMLInputElement).value;
        return null;
      }
      function getRole(el: Element): string | null {
        return el.getAttribute('role') || null;
      }
      function getType(el: Element): string | null {
        return (el as HTMLInputElement).type || null;
      }
      const interactiveSelectors = [
        'a[href]:not([tabindex="-1"]):not([disabled])',
        'button:not([tabindex="-1"]):not([disabled])',
        'input:not([type="hidden"]):not([tabindex="-1"]):not([disabled])',
        'select:not([tabindex="-1"]):not([disabled])',
        'textarea:not([tabindex="-1"]):not([disabled])',
        '[tabindex]:not([tabindex="-1"]):not([disabled])'
      ];
      const elements = Array.from(document.querySelectorAll(interactiveSelectors.join(',')));
      const elementsMissingName = [];
      const elementsMissingState = [];
      const stateAttrs = ['aria-pressed', 'aria-expanded', 'aria-checked', 'aria-selected', 'aria-disabled'];
      for (const el of elements) {
        const accessibleName = getAccessibleName(el);
        if (!accessibleName || accessibleName.trim().length === 0) {
          elementsMissingName.push({
            selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.className ? `.${el.className.toString().replace(/\s+/g, '.')}` : ''),
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            className: el.className || null,
            role: getRole(el),
            type: getType(el),
            text: (el as HTMLElement).innerText || (el as HTMLInputElement).value || '',
          });
        }
        // Check for missing state attributes if role/button/input
        const missingStates = stateAttrs.filter(attr => !el.hasAttribute(attr));
        if (
          ['button', 'input', 'a', 'select', 'textarea'].includes(el.tagName.toLowerCase()) ||
          getRole(el)
        ) {
          if (missingStates.length > 0) {
            elementsMissingState.push({
              selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.className ? `.${el.className.toString().replace(/\s+/g, '.')}` : ''),
              tag: el.tagName.toLowerCase(),
              id: el.id || null,
              className: el.className || null,
              role: getRole(el),
              type: getType(el),
              text: (el as HTMLElement).innerText || (el as HTMLInputElement).value || '',
              missingStates,
            });
          }
        }
      }
      return { elementsMissingName, elementsMissingState };
    });
  } catch (error: any) {
    return { elementsMissingName: [], elementsMissingState: [], error: error.message || String(error) };
  }
}

/**
 * Performs color contrast checks on text elements.
 */
export async function performColorContrastCheck(page: Page): Promise<ColorContrastResult> {
  try {
    return await page.evaluate(() => {
      // Helper to convert sRGB to linear RGB
      function sRGBtoLinear(c: number): number {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      }

      // Helper to calculate luminance
      function getLuminance(r: number, g: number, b: number): number {
        return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
      }

      // Helper to parse CSS color strings (rgb, rgba, hex, named colors)
      function parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) return null;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        return { r: data[0], g: data[1], b: data[2], a: data[3] / 255 };
      }

      // Helper to get the effective background color, considering transparency
      function getEffectiveBackgroundColor(element: Element): { r: number; g: number; b: number; a: number } | null {
        let currentElement: Element | null = element;
        let bgColor: { r: number; g: number; b: number; a: number } | null = null;

        while (currentElement && currentElement !== document.documentElement) {
          const style = window.getComputedStyle(currentElement);
          const currentBgColor = parseColor(style.backgroundColor);

          if (currentBgColor && currentBgColor.a === 1) { // Opaque background found
            bgColor = currentBgColor;
            break;
          } else if (currentBgColor && currentBgColor.a < 1) { // Semi-transparent, blend with parent
            // This is a simplified blending. For full accuracy, one would need to
            // recursively blend with all parent backgrounds. For this check,
            // we prioritize finding an opaque background.
            // If no opaque background is found, we'll default to white.
            if (!bgColor) { // If this is the first semi-transparent layer
              bgColor = currentBgColor;
            } else { // Blend current semi-transparent with previously found background
              // Simplified alpha blending: C_final = C_fg * alpha + C_bg * (1 - alpha)
              const alpha = currentBgColor.a;
              bgColor = {
                r: Math.round(currentBgColor.r * alpha + bgColor.r * (1 - alpha)),
                g: Math.round(currentBgColor.g * alpha + bgColor.g * (1 - alpha)),
                b: Math.round(currentBgColor.b * alpha + bgColor.b * (1 - alpha)),
                a: 1 // Treat as opaque after blending
              };
            }
          }
          currentElement = currentElement.parentElement;
        }

        // Default to white if no opaque background found up the tree
        return bgColor || { r: 255, g: 255, b: 255, a: 1 };
      }

      // Helper to calculate contrast ratio
      function getContrastRatio(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number {
        const lum1 = getLuminance(color1.r, color1.g, color1.b);
        const lum2 = getLuminance(color2.r, color2.g, color2.b);
        const lighter = Math.max(lum1, lum2);
        const darker = Math.min(lum1, lum2);
        return (lighter + 0.05) / (darker + 0.05);
      }

      const textElements = Array.from(document.querySelectorAll(
        'p, span, a, h1, h2, h3, h4, h5, h6, li, td, th, label, input[type="text"], input[type="email"], input[type="password"], input[type="search"], textarea, button'
      )).filter(el => {
        const style = window.getComputedStyle(el);
        // Filter out hidden elements or elements with no text content
        return style.display !== 'none' && style.visibility !== 'hidden' && el.textContent && el.textContent.trim().length > 0;
      });

      const issues: ContrastIssue[] = [];

      for (const el of textElements) {
        const style = window.getComputedStyle(el);
        const textColor = parseColor(style.color);
        const backgroundColor = getEffectiveBackgroundColor(el);

        if (!textColor || !backgroundColor) continue; // Skip if colors can't be parsed

        const contrastRatio = getContrastRatio(textColor, backgroundColor);
        const fontSizePx = parseFloat(style.fontSize);
        const fontWeight = parseFloat(style.fontWeight);

        // WCAG 2.1 AA requirements:
        // Normal text: 4.5:1
        // Large text (18pt / 24px or 14pt bold / 18.66px bold): 3:1
        const isLargeText = fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
        const expectedRatio = isLargeText ? 3 : 4.5;

        if (contrastRatio < expectedRatio) {
          issues.push({
            selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.className ? `.${el.className.toString().replace(/\s+/g, '.')}` : ''),
            textSnippet: el.textContent!.trim().substring(0, 100),
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            textColor: style.color,
            backgroundColor: `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`, // Store as RGB for consistency
            contrastRatio: parseFloat(contrastRatio.toFixed(2)),
            expectedRatio: expectedRatio,
            status: 'fail',
          });
        }
      }
      return { issues };
    });
  } catch (error: any) {
    return { issues: [], error: error.message || String(error) };
  }
}

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

export async function performVisualOrderCheck(page: Page): Promise<VisualOrderResult> {
  try {
    return await page.evaluate(() => {
      // Helper to get bounding box and calculate center
      function getElementPosition(el: Element) {
        const rect = el.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          centerX: rect.x + rect.width / 2,
          centerY: rect.y + rect.height / 2,
        };
      }

      // Get all visible elements that might contain text or be interactive
      const elements = Array.from(document.querySelectorAll(
        'p, span, a, h1, h2, h3, h4, h5, h6, li, td, th, label, input, select, textarea, button, div:not([aria-hidden="true"])'
      )).filter(el => {
        const style = window.getComputedStyle(el);
        // Filter out hidden elements, or elements with no meaningful content/size
        return style.display !== 'none' && style.visibility !== 'hidden' &&
               el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height > 0 &&
               (el.textContent && el.textContent.trim().length > 0 || el.children.length > 0 || el.tagName === 'IMG' || el.tagName === 'BUTTON' || el.tagName === 'INPUT');
      });

      const elementsWithPositions = elements.map((el, index) => ({
        element: el,
        domIndex: index,
        position: getElementPosition(el),
        selector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.className ? `.${el.className.toString().replace(/\s+/g, '.')}` : ''),
        textSnippet: (el.textContent || '').trim().substring(0, 100),
      }));

      // Sort elements by visual position (top-to-bottom, then left-to-right)
      const visuallySortedElements = [...elementsWithPositions].sort((a, b) => {
        // Primary sort by Y-coordinate (top to bottom)
        if (a.position.centerY !== b.position.centerY) {
          return a.position.centerY - b.position.centerY;
        }
        // Secondary sort by X-coordinate (left to right) for elements on the same line
        return a.position.centerX - b.position.centerX;
      });

      const issues: VisualOrderIssue[] = [];
      const domOrderMatchesVisualOrder = elementsWithPositions.every((el, index) => {
        // Check if the element at this DOM index is the same as the element at this visual index
        // This is a simplified check. A more robust check would compare the relative order of all pairs.
        return el.selector === visuallySortedElements[index].selector;
      });

      if (!domOrderMatchesVisualOrder) {
        // If the simple check fails, find specific discrepancies
        for (let i = 0; i < elementsWithPositions.length; i++) {
          const domEl = elementsWithPositions[i];
          const visualEl = visuallySortedElements[i];

          if (domEl.selector !== visualEl.selector) {
            // Find the actual visual index of the DOM element
            const actualVisualIndex = visuallySortedElements.findIndex(e => e.selector === domEl.selector);
            issues.push({
              element: {
                selector: domEl.selector,
                tag: domEl.element.tagName.toLowerCase(),
                textSnippet: domEl.textSnippet,
              },
              domIndex: domEl.domIndex,
              visualIndex: actualVisualIndex,
              reason: `Element appears visually at position ${actualVisualIndex + 1} but is at DOM position ${domEl.domIndex + 1}.`,
            });
          }
        }
      }

      return {
        issues: issues,
        domOrderMatchesVisualOrder: issues.length === 0, // If issues exist, order does not match
      };
    });
  } catch (error: any) {
    return { issues: [], domOrderMatchesVisualOrder: false, error: error.message || String(error) };
  }
}
