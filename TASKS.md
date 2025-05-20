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
- [x] Create basic React frontend layout (Landing Page `/` with URL input)
- [x] Refine frontend layout and styling (Responsiveness, Spacing, Alignment)
- [x] **Implement Firebase Email Link Authentication (Restricted Access)**
  - [x] Configure Firebase Console for Email Link & disable Anonymous Auth.
  - [x] Create `authService.ts` for Firebase auth functions (send link, complete sign-in, state change, sign out).
  - [x] Develop `SignInPage.tsx` for user email input.
  - [x] Develop `HandleSignInPage.tsx` to process the email link and verify allowed email.
  - [x] Update `AppLayout.tsx` to display user email and Sign Out button.
- [x] **Setup Cloud Tasks for Asynchronous Scanning**
  - [x] Create Google Cloud Tasks Queue (`scan-processing-queue` in `us-central1`).
  - [x] Grant necessary IAM permissions:
    - [x] Service account for `apiScan` needs `roles/cloudtasks.enqueuer`.
    - [x] Service account invoking `processScanTask` (via OIDC token) needs `roles/cloudfunctions.invoker` for `processScanTask` (and `roles/run.invoker` for the underlying Cloud Run service).
  - [x] Configure `PROCESS_SCAN_TASK_URL` environment variable for `apiScan` (e.g., via `functions/.env` file, with `functions/.env.example` as a template).
- [x] **Implement Task Enqueueing in `apiScan` Function**
  - [x] Add `@google-cloud/tasks` dependency to `functions/package.json`.
  - [x] Modify `apiScan` in `functions/src/index.ts` to create and enqueue a task to `processScanTask` containing `reportId` and `urlToScan` (payload sent as raw JSON, not base64 encoded).
  - [x] Include OIDC token in task creation for secure invocation of `processScanTask`.
- [x] **Implement Task Handler Function `processScanTask`**
  - [x] Define `processScanTask` in `functions/src/index.ts` using `onTaskDispatched()`.
  - [x] Configure retry, rate limits, memory, and timeout for `processScanTask`.
  - [x] Implement logic in `processScanTask` to parse payload (`reportId`, `urlToScan`).
  - [x] Update RTDB: status to 'processing', add `processedAt` timestamp.
  - [x] Implement Playwright integration within `processScanTask`.
    - [x] Capture screenshot.
    - [x] Upload screenshot to Firebase Storage.
    - [x] Save screenshot URL to RTDB.
    - [x] Implement robust error handling for Playwright-specific errors (e.g., navigation failures, timeouts) to capture errors in the `playwrightReport` object in RTDB.
  - [x] Implement Google PageSpeed Insights API for Lighthouse results (no local Chrome needed).
      - [x] Parse and store scores from PageSpeed API response.
      - [x] Added `node-fetch` and `@types/node-fetch` for API requests in Node.js.
      - [x] Added support for `PAGESPEED_API_KEY` in `.env` and `.env.example` (user must provide key).
    - [x] Save Lighthouse scores and any errors to RTDB within `lighthouseReport` object. (Fixed issues with variable API response structures causing errors; now handles missing data gracefully).
    - [x] Save detailed Lighthouse performance metrics, opportunities, and specific SEO/Best Practices audit details.
  - [x] Update RTDB: status to 'complete' or 'failed', add `completedAt`, results/error message.
    - [x] Implement robust error handling in the main `processScanTask` orchestrator to catch critical errors and update RTDB to 'failed' without re-throwing, thus preventing infinite Cloud Tasks retries. Tested with invalid URLs.
- [x] **Implement AI-Powered UX & Design Analysis in `processScanTask`**
  - [x] Add dependencies for AI Vision Model SDKs (e.g., OpenAI, Google AI) to `functions/package.json`. (Using `@google/genai`)
  - [x] Implement logic to call the chosen AI vision model API(s) with the captured screenshot (or its URL) and relevant context (e.g., URL, device type if emulated). (Successfully calling Gemini API).
  - [x] Define a clear data structure for storing AI-generated UX/design suggestions in RTDB (under `reportData.aiUxDesignSuggestions`).
  - [x] Parse the API response from the vision model(s) and transform it into the defined data structure.
  - [x] Update RTDB with the AI-generated suggestions.
  - [x] Add environment variables for AI API keys (`OPENAI_API_KEY`, `GEMINI_API_KEY`, etc.) in `.env` and `.env.example`.
  - [x] Implement robust error handling for AI API calls (e.g., API errors, rate limits, content moderation issues) and store relevant error information in RTDB. (Fixed screenshot fetching issue by using direct file path).
- [x] **Firebase Security & Rules**
  - [x] Secure backend API (`/api/scan`) to only allow access from admin users (verified via Firebase Custom Claims).
    - [x] Verify Firebase ID token in `apiScan`.
    - [x] Check decoded token for `admin: true` custom claim.
    - [x] Update frontend to send ID token in `Authorization` header for `/api/scan`.
    - [x] Add `predeploy` hook to `firebase.json` for `hosting` to ensure `npm run build --workspace=frontend` runs before deploy.
  - [x] Secure Firebase Realtime Database rules to only allow read/write by admin users (using `auth.token.admin === true` custom claim).
  - [x] Secure Firebase Storage rules to only allow read/write by admin users (using `request.auth.token.admin == true` custom claim).
- [x] Create backend Firebase Function (`/api/scan`) structure
- [x] Connect frontend form submission to /api/scan backend function
- [x] Implement URL validation in the backend function
- [x] Implement backend logic to create initial 'pending' report entry in RTDB
- [x] Save screenshot URL to RTDB (from `processScanTask`)
- [x] Create frontend Report Page (`/report/:reportId`) structure (Sidebar, Main Content)
  - [x] Display screenshot on Report Page when available
  - [x] Display Lighthouse (PageSpeed) scores on Report Page as soon as they are available from the backend
  - [x] Display Lighthouse SEO score on Report Page
  - [x] Display Lighthouse Best Practices score on Report Page
  - [x] Display detailed Lighthouse Performance metrics (FCP, LCP, TBT, CLS, Speed Index) on Report Page
  - [x] Display top Lighthouse Performance Opportunities on Report Page
  - [x] Display top failing/relevant Lighthouse SEO audits on Report Page
  - [x] Display top failing/relevant Lighthouse Best Practices audits on Report Page
  - [x] Display AI-generated UX & Design suggestions on Report Page in a dedicated section/tab
- [x] Implement frontend logic to call `/api/scan` function
- [x] Implement frontend logic to navigate to Report Page with `reportId`
- [x] Implement frontend logic to listen for real-time updates on the RTDB report entr
- [x] Implement frontend progress/loading indicator on Report Page (basic global indicator for pending/processing status added)
- [x] Display Accessibility issues on Report Page when available
- [x] Implement basic styling with Tailwind CSS for all components (core components styled; ongoing polish as needed)
- [x] Set up Firebase Hosting for deployment (firebase.json configured, frontend build script in place)
- [x] Basic responsive design for mobile/desktop (foundational responsive classes sm:, md:, lg: used in layouts)

## In Progress Tasks

- [ ] **AI-Assisted Playwright for User Flow Testing & Interactive Suggestions:**
    - [ ] Research AI-assisted browser control libraries/frameworks compatible with Playwright/Node.js (e.g., exploring options that can intelligently interact with web elements).
    - [ ] Define a set of common key user flows to test automatically (e.g., login, registration, product search, add to cart, checkout process).
    - [ ] Integrate the chosen AI-assisted library to drive Playwright through these defined user flows.
    - [ ] Develop logic to capture interaction issues, gather data on task completion success/failure, and identify elements контекст for screen-specific interactivity suggestions.
    - [ ] Explore how AI can provide feedback on the ease of use and intuitiveness of these flows, especially on different screen contexts (e.g., mobile navigation).
    - [ ] Update RTDB and frontend reporting to include findings from these interactive user flow tests and any AI-generated interactivity suggestions.

## Completed Tasks

- [x] Implement Tech Stack Detection (Frontend & Backend):
    - [x] Create a new section/tab in the frontend `ReportPage` (e.g., `TechStackSection.tsx`) to display the tech stack information.
    - [x] Fetch and display detected technologies from `reportData.techStack.detectedTechnologies`.
    - [x] Design UI to present technologies clearly (e.g., cards, list with icons).
    - [x] Group technologies by category (using `tech.categories`).
    - [x] Display technology name, version (if available), icon (if available or use a default), and link to technology website.
    - [x] Ensure robust error handling and loading states for tech stack section.
    - [x] Tech stack results update as soon as available, independently of LLM explanations or other sections.
    - [x] UI and backend support for incremental, per-section updates and loading/progress indicators.
    - [x] Added robust sanitizer for DetectedTechnology to ensure all fields are string/null and never undefined for RTDB compatibility.
    - [x] Fixed backend to prevent undefined/null errors in RTDB updates for tech stack.

## Future Tasks (Initial Prototype - MVP)

(All MVP tasks completed)

## Future Tasks (Post-MVP)

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
- [ ] **NEW: Automate Manual Accessibility Checks (from PageSpeed Insights / Lighthouse):**
    - [ ] Interactive controls are keyboard focusable (Playwright)
    - [ ] Interactive elements indicate their purpose and state (Playwright + AI for complex cases)
    - [ ] The page has a logical tab order (Playwright)
    - [ ] Visual order on the page follows DOM order (Playwright + AI/DOM analysis)
    - [ ] User focus is not accidentally trapped in a region (Playwright)
    - [ ] The user's focus is directed to new content added to the page (Playwright for dynamic content)
    - [ ] HTML5 landmark elements are used to improve navigation (DOM analysis, potentially Playwright for dynamic rendering)
    - [ ] Offscreen content is hidden from assistive technology (DOM analysis, Playwright for CSS checks)
    - [ ] Custom controls have associated labels (DOM analysis, Playwright for interactions)
    - [ ] Custom controls have ARIA roles (DOM analysis)
- [x] **NEW: Implement LLM-Powered Report Summary Generation:**
    - [x] Design a prompt to send complete report data (Playwright, Lighthouse, existing AI UX suggestions) to an LLM (e.g., Gemini).
    - [x] Implement logic in `processScanTask` (or a subsequent task) to call the LLM with the full report context after all scans are complete.
    - [x] The LLM should generate a concise, user-friendly summary including:
        - An overall assessment of the scanned page.
        - A list of the highest-priority issues to address.
        - Clear explanations of key findings and their impact.
    - [x] Define a data structure in RTDB for storing this comprehensive summary (e.g., `reportData.llmReportSummary`).
    - [x] Update the frontend Report Page to display this summary prominently.
    - [x] Refine LLM prompt for clarity, tone (non-technical), and desired output format (Markdown).
    - [x] Externalize LLM prompt to a separate .md file (`functions/src/prompts/llm_summary_prompt.md`) for easier maintenance. ✅
    - [x] Enhance frontend to correctly render Markdown for the LLM summary.
    - [x] Enhance LLM prompts (summary and UX/design) to be page-type aware for more contextual feedback. ✅
- [x] **NEW: Implement Tech Stack Detection (Backend):**
    - [x] Researched and selected Wappalyzer (community fork `Lissy93/wapalyzer`) for local analysis.
    - [x] Installed `Lissy93/wapalyzer#main` into `functions` workspace.
    - [x] Defined `TechStackData` and `DetectedTechnology` types in `functions/src/types/index.ts`.
    - [x] Added `techStack` field to `ReportData` in `functions/src/types/index.ts`.
    - [x] Created `functions/src/types/wapalyzer.d.ts` for basic type declarations. (REMOVED - Wappalyzer replaced)
    - [x] Implemented `performTechStackScan` in `functions/src/services/techStackService.ts`. (REWORKED for WhatCMS API)
    - [x] Integrated `performTechStackScan` into `functions/src/tasks/processScanTask.ts` to run in parallel and save results to RTDB. (Call signature updated)
- [x] **REWORKED: Implement Tech Stack Detection (Backend using WhatCMS.org API):**
    - [x] Researched and selected WhatCMS.org API for tech stack detection.
    - [x] Updated `DetectedTechnology` and `TechStackData` types in `functions/src/types/index.ts` for WhatCMS.org API response.
    - [x] Refactored `performTechStackScan` in `functions/src/services/techStackService.ts` to use WhatCMS.org API:
        - [x] Removed Wappalyzer and Playwright dependencies.
        - [x] Implemented API call using `node-fetch`.
        - [x] Added requirement for `WHATCMS_API_KEY` environment variable.
        - [x] Mapped API response to `DetectedTechnology` type.
    - [x] Updated call to `performTechStackScan` in `functions/src/tasks/processScanTask.ts` (removed browser/page args).
    - [x] Added `WHATCMS_API_KEY` to `functions/.env.example` (manual step for user).
- [x] **NEW: Implement Responsive Screenshot Capture and Analysis:**
    - [x] Modify `performPlaywrightScan` to capture screenshots at different viewport sizes (e.g., desktop, tablet, mobile).
    - [x] Store multiple screenshots in Firebase Storage (e.g., `screenshots/{reportId}/screenshot_desktop.jpg`, `screenshot_tablet.jpg`, `screenshot_mobile.jpg`).
    - [x] Update `playwrightReport` in RTDB to include URLs for all screenshot sizes.
    - [x] Adjust `performGeminiAnalysis` to potentially analyze multiple screenshots or a composite view if the AI model supports it, or select the most relevant one. (Selected desktop first, and added screenContext tag)
    - [x] Ensure AI UX/Design suggestions consider responsiveness based on the different viewport captures. (Updated prompt & added screenContext)
    - [x] Update `performLLMReportSummary` to incorporate findings from responsive analysis, highlighting any discrepancies or issues across device types. (Updated prompt to use screenContext)
    - [x] Update the frontend Report Page to display the different screenshots (e.g., in a carousel or tabs) and reflect responsive design feedback in the AI suggestions and summary. (Displays multiple screenshots and screenContext tag)
- [ ] **NEW: AI-Assisted Playwright for User Flow Testing & Interactive Suggestions:**
    - [ ] Research AI-assisted browser control libraries/frameworks compatible with Playwright/Node.js (e.g., exploring options that can intelligently interact with web elements).
    - [ ] Define a set of common key user flows to test automatically (e.g., login, registration, product search, add to cart, checkout process).
    - [ ] Integrate the chosen AI-assisted library to drive Playwright through these defined user flows.
    - [ ] Develop logic to capture interaction issues, gather data on task completion success/failure, and identify elements контекст for screen-specific interactivity suggestions.
    - [ ] Explore how AI can provide feedback on the ease of use and intuitiveness of these flows, especially on different screen contexts (e.g., mobile navigation).
    - [ ] Update RTDB and frontend reporting to include findings from these interactive user flow tests and any AI-generated interactivity suggestions.


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
- `functions/src/prompts/llm_summary_prompt.md` - Markdown template for the LLM report summary prompt. ✅
- `functions/src/prompts/ai_ux_design_prompt.md` - Markdown template for the AI UX & Design Insights prompt. ✅
- `functions/src/services/techStackService.ts` - Service for Wappalyzer integration. ✅
- `functions/src/types/index.ts` - Core type definitions for backend. ✅
- `functions/src/types/wapalyzer.d.ts` - Type declarations for Wappalyzer module. ✅
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

**Note on Non-TypeScript Assets (e.g., Prompt Files):**
- The `functions` workspace build process (`npm run build` within `functions/package.json`) is configured to compile TypeScript files from `src/` to `lib/` and also copy specific non-TS assets.
- For example, Markdown prompt files located in `functions/src/prompts/` are copied to `functions/lib/prompts/` by the `cpx` utility as part of the build script.
- This ensures that these files are available at runtime when the compiled JavaScript in `lib/` tries to read them using relative paths (e.g., `path.join(__dirname, "..", "prompts", "prompt_file.md")` when the code is in `lib/tasks/`).
- If you add new types of non-TS assets that need to be available at runtime, ensure the build script in `functions/package.json` is updated to copy them accordingly.

Before deploying or running the backend, ensure the Cloud Tasks queue exists:

```sh
gcloud tasks queues create scanProcessingQueue --location=us-central1
```

If the queue was recently deleted, wait a few minutes before recreating it. If you need to proceed immediately, use a new queue name (e.g., 'scanProcessingQueue').

---
