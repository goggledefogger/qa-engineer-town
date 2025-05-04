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

## Future Tasks (Initial Prototype - MVP)

- [x] Create backend Firebase Function (`/api/scan`) structure
- [x] Connect frontend form submission to /api/scan backend function
- [x] Implement URL validation in the backend function
- [x] Add frontend logic to prepend https:// to URL if missing
- [x] Implement backend logic to create initial 'pending' report entry in RTDB
- [ ] Integrate Playwright in backend function to navigate to URL
- [ ] Implement Playwright logic to take a screenshot
- [ ] Integrate Firebase Storage in backend to upload screenshot
- [ ] Update RTDB entry with screenshot URL
- [ ] Integrate Lighthouse (CLI or Node module) in backend function
- [ ] Implement Lighthouse logic to run audit
- [ ] Parse required metrics (Performance, Accessibility) from Lighthouse results
- [ ] Update RTDB entry with Lighthouse data and set status to 'complete'
- [ ] Implement error handling in the backend function and update RTDB status on failure
- [ ] Create frontend Report Page (`/report/:reportId`) structure (Sidebar, Main Content)
- [ ] Implement frontend logic to call `/api/scan` function
- [ ] Implement frontend logic to navigate to Report Page with `reportId`
- [ ] Implement frontend logic to listen for real-time updates on the RTDB report entry
- [ ] Implement frontend progress/loading indicator on Report Page
- [ ] Display screenshot on Report Page when available
- [ ] Display Lighthouse scores/metrics on Report Page when available
- [ ] Display Accessibility issues on Report Page when available
- [ ] Implement basic styling with Tailwind CSS for all components
- [ ] Set up Firebase Hosting for deployment
- [ ] Basic responsive design for mobile/desktop

## Future Tasks (Post-MVP)

- [x] Refactor scan logic to use Cloud Tasks for asynchronous processing (avoid timeouts)
- [ ] Set up Cloud Run service for Playwright/Lighthouse execution
- [ ] Modify apiScan to trigger Cloud Run job instead of running Playwright directly
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
2.  **Backend Core:** Implement the core Firebase Function logic: receive URL, manage RTDB state, run Playwright for screenshot + upload, run Lighthouse + parse results, update RTDB.
3.  **Frontend Core:** Implement the landing page UI, trigger the backend scan, implement the report page UI, listen for RTDB updates, display progress, and render results incrementally.
4.  **Styling & Polish:** Apply Tailwind CSS, ensure basic responsiveness.
5.  **Deployment:** Configure and deploy to Firebase Hosting.

### Relevant Files

*(To be populated as development progresses)*

- `PRD.md` - Product Requirements Document
- `SRS.md` - Software Requirements Specification
- `UIDD.md` - User Interface Description Document
- `README.md` - Project Overview & Setup
- `TASKS.md` - This task list
- `firebase.json` - Firebase project config (deployments, emulators)
- `frontend/.env.example` - Example environment variables for frontend Firebase config
- `functions/.env.example` - Example environment variables for backend Firebase config
