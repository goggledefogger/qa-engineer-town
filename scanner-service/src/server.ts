import express, { Request, Response } from 'express';
import * as admin from 'firebase-admin';
// import { chromium } from 'playwright'; // Keep commented for now
// import lighthouse from 'lighthouse'; // Keep commented for now

// --- Initialization ---
admin.initializeApp();
const rtdb = admin.database();
const app = express();
app.use(express.json()); // Middleware to parse JSON bodies

const PORT = process.env.PORT || 8080; // Cloud Run provides PORT env variable

// --- Helper Functions (Placeholder) ---
const runPlaywrightTasks = async (url: string, reportId: string) => {
  console.log(`[${reportId}] Running Playwright for ${url}...`);
  // TODO: Launch browser, navigate, take screenshot, upload to storage
  // const browser = await chromium.launch(); ...
  // await page.screenshot(...);
  // await storage.bucket().upload(...);
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work
  const screenshotUrl = `https://fake-storage.com/${reportId}.jpg`; // Placeholder
  console.log(`[${reportId}] Playwright tasks complete.`);
  return { screenshotUrl };
};

const runLighthouseTasks = async (url: string, reportId: string) => {
  console.log(`[${reportId}] Running Lighthouse for ${url}...`);
  // TODO: Launch Chrome (maybe reuse Playwright?), run Lighthouse
  // const { lhr } = await lighthouse(url, { ... });
  await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate work
  const scores = { performance: 85, accessibility: 92 }; // Placeholder
  console.log(`[${reportId}] Lighthouse tasks complete.`);
  return { scores };
};

// --- Main Scan Endpoint ---
app.post('/scan', async (req: Request, res: Response) => {
  const { reportId, url } = req.body;

  console.log(`[${reportId}] Received scan request for url: ${url}`);

  if (!reportId || !url) {
    console.error(`[${reportId}] Missing reportId or url in request body`);
    return res.status(400).send({ error: 'Missing reportId or url' });
  }

  // Acknowledge the request immediately (fire-and-forget for the caller)
  res.status(202).send({ message: "Scan accepted", reportId });

  // --- Perform Scan Asynchronously (Simulated) ---
  // IMPORTANT: In a real scenario, long tasks might still timeout here.
  // Cloud Run allows longer processing, but this structure doesn't block the HTTP response.
  try {
    // 1. Update status to 'processing'
    console.log(`[${reportId}] Updating status to processing...`);
    await rtdb.ref(`reports/${reportId}`).update({ status: 'processing' });

    // 2. Run Playwright (Screenshot, etc.)
    const { screenshotUrl } = await runPlaywrightTasks(url, reportId);

    // 3. Run Lighthouse
    const { scores } = await runLighthouseTasks(url, reportId);

    // 4. Update status to 'complete' with results
    console.log(`[${reportId}] Updating status to complete...`);
    const finalReportData = {
      status: 'complete',
      screenshotUrl: screenshotUrl,
      lighthouseScores: scores,
      completedAt: admin.database.ServerValue.TIMESTAMP,
      errorMessage: null, // Clear any previous errors
    };
    await rtdb.ref(`reports/${reportId}`).update(finalReportData);
    console.log(`[${reportId}] Scan completed successfully.`);

  } catch (error) {
    console.error(`[${reportId}] Error during scan process:`, error);
    // Update status to 'error'
    await rtdb.ref(`reports/${reportId}`).update({
      status: 'error',
      errorMessage: error instanceof Error ? error.message : "Unknown scan error",
      completedAt: admin.database.ServerValue.TIMESTAMP,
    }).catch(dbErr => console.error(`[${reportId}] Failed to update error status:`, dbErr));
  }
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`Scanner service listening on port ${PORT}`);
});
