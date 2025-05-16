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
  - [x] Grant necessary IAM permissions:
    - [x] Service account for `apiScan` needs `roles/cloudtasks.enqueuer`.
    - [x] Service account invoking `processScanTask` (via OIDC token) needs `roles/cloudfunctions.invoker` for `processScanTask` (and `roles/run.invoker` for the underlying Cloud Run service).
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
  - [x] Display screenshot on Report Page when available (Note: Added debug logging to investigate intermittent display issue where URL is saved but not shown)
  - [x] Display Lighthouse (PageSpeed) scores on Report Page as soon as they are available from the backend
  - [x] Display Lighthouse SEO score on Report Page
  - [x] Display Lighthouse Best Practices score on Report Page
  - [x] **NEW:** Display AI-generated UX & Design suggestions on Report Page in a dedicated section/tab (UI structure in place, pending backend implementation).
- [x] Implement frontend logic to call `/api/scan` function
- [x] Implement frontend logic to navigate to Report Page with `reportId`
- [x] Implement frontend logic to listen for real-time updates on the RTDB report entry (foundational listener in place)
- [x] Implement frontend progress/loading indicator on Report Page (basic global indicator for pending/processing status added)
- [x] Display Accessibility issues on Report Page when available
- [x] Implement basic styling with Tailwind CSS for all components (core components styled; ongoing polish as needed)
- [x] Set up Firebase Hosting for deployment (firebase.json configured, frontend build script in place)
- [x] Basic responsive design for mobile/desktop (foundational responsive classes sm:, md:, lg: used in layouts)

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
- [ ] **NEW: Implement AI-Powered Remediation Advice & Interactive Help:**
    - [ ] Research and select appropriate AI Language Model API(s) for generating contextual help and remediation steps.
    - [ ] Design and implement backend logic to query the LLM with issue details (e.g., from Lighthouse, or custom checks) and site context.
    - [ ] Develop frontend UI components to display AI-generated advice within relevant report sections (e.g., Accessibility, Performance).
    - [ ] Design data structures in RTDB for storing and retrieving AI-generated remediation advice.
    - [ ] (Long-Term) Explore and implement an interactive chat-like interface for users to ask follow-up questions about report findings and AI suggestions.

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
- If the payload is not wrapped in a `data`
