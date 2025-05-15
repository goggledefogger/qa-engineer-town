# AI QA Engineer Assistant Implementation

Tracking tasks for building the initial prototype of the AI QA Engineer Assistant.

## Completed Tasks

- [x] Define Product Requirements (PRD.md)
- [x] Define Software Requirements (SRS.md)
- [x] Define User Interface Design (UIDD.md)
- [x] Create initial README.md
- [x] Create initial TASKS.md
- [x] Set up project structure (Monorepo with `frontend` and `functions` workspaces)
- [x] Configure Tailwind CSS V4 and PostCSS for frontend
- [x] Initialize Firebase SDK in both frontend and functions
- [x] Implement Firebase Anonymous Authentication on the frontend
- [x] Create basic React frontend layout (Landing Page `/` with URL input)
- [x] Refine frontend layout and styling (Responsiveness, Spacing, Alignment)
- [x] Remove Firebase Emulator usage from project configuration, scripts, and documentation.

## In Progress Tasks

- [ ] **Setup Cloud Tasks for Asynchronous Scanning**
  - [x] Create Google Cloud Tasks Queue (`scan-processing-queue` in `us-central1`).
  - [ ] Grant necessary IAM permissions:
    - Service account for `apiScan` needs `roles/cloudtasks.enqueuer`.
    - Service account invoking `processScanTask` (via OIDC token) needs `roles/cloudfunctions.invoker` for `processScanTask`.
  - [x] Configure `PROCESS_SCAN_TASK_URL` environment variable for `apiScan` (e.g., via `functions/.env` file, with `functions/.env.example` as a template).
- [ ] **Implement Task Enqueueing in `apiScan` Function**
  - [x] Add `@google-cloud/tasks` dependency to `functions/package.json`.
  - [x] Modify `apiScan` in `functions/src/index.ts` to create and enqueue a task to `processScanTask` containing `reportId` and `urlToScan` (payload sent as raw JSON, not base64 encoded).
  - [x] Include OIDC token in task creation for secure invocation of `processScanTask`.
- [ ] **Implement Task Handler Function `processScanTask`**
  - [x] Define `processScanTask` in `functions/src/index.ts` using `onTaskDispatched()`.
  - [x] Configure retry, rate limits, memory, and timeout for `processScanTask`.
  - [x] Implement logic in `processScanTask` to parse payload (`reportId`, `urlToScan`).
  - [x] Update RTDB: status to 'processing', add `processedAt` timestamp.
  - [ ] Implement Playwright integration within `processScanTask`.
    - [x] Capture screenshot.
    - [x] Upload screenshot to Firebase Storage.
    - [x] Save screenshot URL to RTDB.
    - [x] Implement robust error handling for Playwright-specific errors (e.g., navigation failures, timeouts) to capture errors in the `playwrightReport` object in RTDB.
  - [ ] Implement Lighthouse integration within `processScanTask`.
    - [x] Add `lighthouse` dependency to `functions` workspace (managed from project root).
    - [x] Resolve ERR_REQUIRE_ESM by using dynamic `await import('lighthouse')` in `processScanTask`.
    - [x] Implement Lighthouse audit logic (connect to Playwright's browser instance, run audit, parse scores).
    - [x] Debug runtime issues (e.g., Lighthouse connecting to browser, ensuring browser stays open).
      - [x] Switched to Google PageSpeed Insights API for Lighthouse results (no local Chrome needed).
      - [x] Parse and store scores from PageSpeed API response.
      - [x] Added `node-fetch` and `@types/node-fetch` for API requests in Node.js.
      - [x] Added support for `PAGESPEED_API_KEY` in `.env` and `.env.example` (user must provide key).
    - [x] Save Lighthouse scores and any errors to RTDB within `lighthouseReport` object.
  - [x] Update RTDB: status to 'complete' or 'failed', add `completedAt`, results/error message.
    - [x] Implement robust error handling in the main `processScanTask` orchestrator to catch critical errors and update RTDB to 'failed' without re-throwing, thus preventing infinite Cloud Tasks retries. Tested with invalid URLs.

- [ ] **NEW: Implement AI-Powered UX & Design Analysis in `processScanTask`**
  - [ ] Add dependencies for AI Vision Model SDKs (e.g., OpenAI, Google AI) to `functions/package.json`.
  - [ ] Implement logic to call the chosen AI vision model API(s) with the captured screenshot (or its URL) and relevant context (e.g., URL, device type if emulated).
  - [ ] Define a clear data structure for storing AI-generated UX/design suggestions in RTDB (under `reportData.aiUxDesignSuggestions`).
  - [ ] Parse the API response from the vision model(s) and transform it into the defined data structure.
  - [ ] Update RTDB with the AI-generated suggestions.
  - [ ] Add environment variables for AI API keys (`OPENAI_API_KEY`, `GEMINI_API_KEY`, etc.) in `.env` and `.env.example`.
  - [ ] Implement robust error handling for AI API calls (e.g., API errors, rate limits, content moderation issues) and store relevant error information in RTDB.

## Future Tasks (Initial Prototype - MVP)

- [x] Create backend Firebase Function (`/api/scan`) structure
- [x] Connect frontend form submission to /api/scan backend function
- [x] Implement URL validation in the backend function
- [x] Add frontend logic to prepend https:// to URL if missing
- [x] Implement backend logic to create initial 'pending' report entry in RTDB
- [x] Save screenshot URL to RTDB (from `processScanTask`)
- [ ] Create frontend Report Page (`/report/:reportId`) structure (Sidebar, Main Content)
  - [x] Display screenshot on Report Page when available (Note: UI bug to fix, screenshot URL is saved but not always displaying)
  - [x] Display Lighthouse (PageSpeed) scores on Report Page as soon as they are available from the backend
  - [ ] **NEW:** Display AI-generated UX & Design suggestions on Report Page in a dedicated section/tab.
- [ ] Implement frontend logic to call `/api/scan` function
- [ ] Implement frontend logic to navigate to Report Page with `reportId`
- [ ] Implement frontend logic to listen for real-time updates on the RTDB report entry
- [ ] Implement frontend progress/loading indicator on Report Page
- [ ] Display Accessibility issues on Report Page when available
- [ ] Implement basic styling with Tailwind CSS for all components
- [ ] Set up Firebase Hosting for deployment
- [ ] Basic responsive design for mobile/desktop

## Future Tasks (Post-MVP)

- [x] Refactor scan logic to use Cloud Tasks for asynchronous processing (avoid timeouts) - *This is now In Progress/Partially Complete for MVP*
- [ ] Set up Cloud Run service for Playwright/Lighthouse execution (*Alternative if Firebase Functions approach has limitations*)
- [ ] Implement AI analysis of screenshots (Visual/UX)
- [ ] Implement AI analysis of text content (Advanced Accessibility)
- [ ] Implement Email/Password Authentication
- [ ] Implement user report history
- [ ] Add scan configuration options (depth, specific tests)
- [ ] Refine error reporting and feedback
- [ ] Improve report visualizations
- [ ] Add features to help draft client communications
- [ ] Optimize backend function performance and cost
- [ ] Add unit and integration tests

## Implementation Plan

1.  **Setup:** Initialize project structure, configure Firebase, set up basic frontend and backend communication.
2.  **Backend Core:**
    - Initial HTTP trigger (`apiScan`): Receives URL, validates, creates initial RTDB entry, enqueues task to Cloud Tasks.
    - Task Handler (`processScanTask`): Runs Playwright for screenshot + upload to Firebase Storage, runs Lighthouse + parses results, updates RTDB with status and data.
3.  **Frontend Core:** Implement the landing page UI, trigger the backend scan, implement the report page UI, listen for RTDB updates, display progress, and render results incrementally.
4.  **Styling & Polish:** Apply Tailwind CSS, ensure basic responsiveness.
5.  **Deployment:** Configure and deploy to Firebase Hosting.

## Core Skills / Knowledge (For the AI QA Engineer)

- **Website Platform Expertise:** Deep familiarity with popular site development platforms (e.g., Squarespace, Shopify, WordPress, Wix, and others). This includes understanding their underlying architecture, common plugins/themes, typical limitations for developers/customization, frequent misconfigurations or QA issues specific to these platforms, and staying updated on their evolution.

### Relevant Files

*(To be populated as development progresses)*

- `PRD.md` - Product Requirements Document ✅ (Updated for AI UX/Design)
- `SRS.md` - Software Requirements Specification ✅ (Updated for AI UX/Design)
- `UIDD.md` - User Interface Description Document ✅ (Updated for AI UX/Design)
- `DESIGN.md` - UI Design Options & Final Choice ✅ (Created, reflects AI UX/Design)
- `README.md` - Project Overview & Setup (mentions Firebase CLI, not emulators)
- `TASKS.md` - This task list
- `firebase.json` - Firebase project config
- `functions/package.json` - Backend dependencies ✅ (emulator scripts removed)
- `functions/src/index.ts` - Backend Cloud Functions (apiScan, processScanTask) ✅
- `functions/.env.example` - Example environment variables for backend (e.g., `PROCESS_SCAN_TASK_URL`)
- `package.json` - Root package config (emulator scripts removed)

## Cloud Tasks Payload & Logging Pattern

### Payload Structure

- When enqueuing a Cloud Task to invoke a Firebase Function v2 `onTaskDispatched` handler, **always wrap the payload as**:
  ```json
  { "data": { ... } }
  ```
  Example:
  ```json
  { "data": { "reportId": "...", "urlToScan": "..." } }
  ```
- In the handler function, **access the payload as** `request.data` (not `request.body`, `request.rawBody`, etc).
- If the payload is not wrapped in a `data` property, the function will not receive the expected data and may log an error or fail to process the task.

### Logging & Debugging

- Use diagnostic logging in the handler to dump the incoming request structure for debugging:
  ```ts
  logger.info("processScanTask: FULL REQUEST DUMP", { data: request.data });
  ```
- To query logs for debugging payload issues, use:
  ```sh
  gcloud logging read 'resource.type=("cloud_run_revision" OR "cloud_function") AND jsonPayload.message:"processScanTask: FULL REQUEST DUMP"' --limit=10 --format='table(timestamp, severity, jsonPayload.message, jsonPayload.data)'
  ```
- This helps confirm the payload structure and quickly diagnose issues with task invocation or data parsing.

### Error Handling & Loop Prevention in `processScanTask`

- The `processScanTask` function now uses a nested `try/catch` structure:
  - An **inner `try/catch`** specifically wraps the Playwright (and eventually Lighthouse) execution.
    - If Playwright fails (e.g., navigation error, timeout), this inner catch logs the specific error, updates the `reportData.playwrightReport` object in RTDB with `success: false` and the detailed error message.
    - The error is then re-thrown to be caught by the outer handler.
  - An **outer `try/catch`** wraps the entire task orchestration.
    - If any error bubbles up to this level (including errors from the Playwright block or other critical issues like RTDB update failures), this outer catch logs it as a critical failure.
    - It updates the main report status to "failed" in RTDB.
    - Crucially, **it does not re-throw the error**. This ensures that Cloud Tasks will not retry the task indefinitely for such failures, preventing infinite loops. This has been tested with URLs that cause navigation errors.
- This pattern ensures that scan-specific issues are recorded in the report for the user to see, while systemic or unrecoverable errors correctly terminate the task processing.

### Real-Time Function Log Query (Recommended)

For the most up-to-date logs (including recent invocations that may not appear in the Firebase CLI), use the following `gcloud` command:

```sh
gcloud logging read \
  '(resource.type="cloud_function" resource.labels.function_name="processScanTask" resource.labels.region="us-central1") OR (resource.type="cloud_run_revision" resource.labels.service_name="processscantask" resource.labels.location="us-central1")' \
  --limit=30 \
  --format="table(timestamp, severity, textPayload, jsonPayload.message, jsonPayload.urlToScan)"
```

- This command matches the Cloud Console's log query for both Cloud Functions and Cloud Run revisions.
- It is the most reliable way to see the latest logs for background jobs and async tasks.
- You can adjust the `--limit` or add more fields to the `--format` as needed.

**Note:**
- The Firebase CLI (`firebase functions:log`) may lag several minutes behind the Cloud Console and `gcloud logging read`.
- For real-time debugging, always prefer the Cloud Console or the `gcloud logging read` command above.

### NPM Workspace Dependency Management

- This project uses npm workspaces (defined in the root `package.json`).
- To add a dependency to a specific workspace (e.g., `functions` or `frontend`), run the command from the **project root**:
  ```bash
  npm install <package-name> --workspace=<workspace-name>
  # Example: npm install lighthouse --workspace=functions
  ```
- After adding/changing dependencies, run `npm install` from the **project root** to ensure all workspaces are synchronized.
- The primary `package-lock.json` is the one in the project root. Individual workspaces (like `functions/`) should generally not have their own `package-lock.json` when managed by root workspaces; if one exists, it's often removed/ignored in favor of the root lockfile.

Before deploying or running the backend, ensure the Cloud Tasks queue exists:

```sh
gcloud tasks queues create scanProcessingQueue --location=us-central1
```

If the queue was recently deleted, wait a few minutes before recreating it. If you need to proceed immediately, use a new queue name (e.g., 'scanProcessingQueue').

---
