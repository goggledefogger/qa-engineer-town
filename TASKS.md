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

## In Progress Tasks

- [ ] **Setup Cloud Tasks for Asynchronous Scanning**
  - [ ] Create Google Cloud Tasks Queue (e.g., `scan-processing-queue`)
  - [ ] Grant necessary IAM permissions for `apiScan` to enqueue tasks and for Cloud Tasks to invoke `processScanTask`.
- [ ] **Implement Task Enqueueing in `apiScan` Function**
  - [x] Add `@google-cloud/tasks` dependency to `functions/package.json`.
  - [x] Modify `apiScan` in `functions/src/index.ts` to create and enqueue a task to `processScanTask` containing `reportId` and `urlToScan`.
  - [x] Include OIDC token in task creation for secure invocation of `processScanTask`.
- [ ] **Implement Task Handler Function `processScanTask`**
  - [x] Define `processScanTask` in `functions/src/index.ts` using `taskQueue().onDispatch()`.
  - [x] Configure retry, rate limits, memory, and timeout for `processScanTask`.
  - [x] Implement logic in `processScanTask` to parse payload (`reportId`, `urlToScan`).
  - [x] Update RTDB: status to 'processing', add `processedAt` timestamp.
  - [ ] Implement Playwright integration within `processScanTask`.
  - [ ] Implement Lighthouse integration within `processScanTask`.
  - [x] Update RTDB: status to 'complete' or 'error', add `completedAt`, results/error message (with placeholder data for now).

## Future Tasks (Initial Prototype - MVP)

- [x] Create backend Firebase Function (`/api/scan`) structure
- [x] Connect frontend form submission to /api/scan backend function
- [x] Implement URL validation in the backend function
- [x] Add frontend logic to prepend https:// to URL if missing
- [x] Implement backend logic to create initial 'pending' report entry in RTDB
- [ ] Integrate Firebase Storage in backend to upload screenshot (within `processScanTask`)
- [ ] Update RTDB entry with screenshot URL (from `processScanTask`)
- [ ] Create frontend Report Page (`/report/:reportId`) structure (Sidebar, Main Content)
- [ ] Implement frontend logic to call `/api/scan` function
- [ ] Implement frontend logic to navigate to Report Page with `reportId`
- [ ] Implement frontend logic to listen for real-time updates on the RTDB report entry
- [ ] Implement frontend progress/loading indicator on Report Page
- [ ] Display screenshot on Report Page when available
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

- `PRD.md` - Product Requirements Document
- `SRS.md` - Software Requirements Specification
- `UIDD.md` - User Interface Description Document
- `README.md` - Project Overview & Setup
- `TASKS.md` - This task list
- `firebase.json` - Firebase project config
- `functions/package.json` - Backend dependencies ✅
- `functions/src/index.ts` - Backend Cloud Functions (apiScan, processScanTask) ✅
- `frontend/.env.example` - Example environment variables for frontend Firebase config
