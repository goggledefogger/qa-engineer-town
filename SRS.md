# AI QA Engineer Assistant - Software Requirements Specification

- **System Design**
    - A web application composed of a React frontend, a serverless backend using Firebase Functions (TypeScript), and Firebase services for database, storage, and hosting.
    - The system interacts with external websites using Playwright for browser automation/screenshots and Lighthouse (via PageSpeed Insights API) for audits.
    - **NEW:** The system integrates with AI vision models (e.g., OpenAI, Gemini) to analyze screenshots for UX, design, layout, and styling suggestions.
    - Report data and artifacts (like screenshots, AI suggestions) are stored in Firebase.
    - **AI-Powered Analysis & Expertise:** The core AI QA assistant is designed with deep knowledge of common website development platforms (e.g., Squarespace, Shopify, WordPress, Wix). This includes understanding their typical structures, limitations, common misconfigurations, and best practices, allowing for more nuanced and platform-aware QA insights (though the initial implementation will focus on general checks).

- **Architecture pattern**
    - Client-Server architecture.
    - Frontend: Single Page Application (SPA) built with React.
    - Backend: Serverless functions (Firebase Functions) triggered via HTTPS requests, responsible for orchestrating the QA tasks.

- **State management**
    - Frontend: Utilize React's built-in Context API or a lightweight state management library (like Zustand or Jotai) for managing UI state and fetched report data. Avoid complex libraries like Redux initially.

- **Data flow**
    1.  User accesses the web application hosted on Firebase Hosting.
    2.  User authenticates anonymously using Firebase Auth.
    3.  User enters a target URL into the React frontend.
    4.  Frontend sends an HTTPS request to a Firebase Function (`/api/scan`) containing the URL.
    5.  The Firebase Function (`apiScan`) is triggered:
        a.  Validates the input URL.
        b.  Creates a new report entry in Firebase Realtime Database with a 'pending' status and associates it with the anonymous user ID.
        c.  Creates a task payload containing the `reportId` and `urlToScan`.
        d.  Enqueues this task to a Google Cloud Tasks queue, targeting the `processScanTask` function.
        e.  `apiScan` responds to the frontend with the `reportId` (e.g., HTTP 202 Accepted).
    6.  The Google Cloud Task service invokes the `processScanTask` function with the payload:
        a.  `processScanTask` updates the report status in RTDB to 'processing'.
        b.  Initiates Playwright to navigate to the URL and take a screenshot.
        c.  Uploads the screenshot to Firebase Storage and saves the URL in the report entry.
        d.  Runs a Lighthouse audit on the URL (via PageSpeed Insights API).
        e.  Parses key metrics (performance, accessibility) from the Lighthouse results.
        f.  **NEW:** Sends the screenshot (or its URL) and relevant context to AI vision model APIs (e.g., OpenAI, Gemini).
        g.  **NEW:** Receives and processes UX/design/layout/styling suggestions from the AI models.
        h.  Updates the report entry in Firebase Realtime Database with the extracted Lighthouse data, screenshot URL, **NEW:** AI-generated UX/design suggestions, and sets the status to 'complete' (or 'error' if issues occurred).
    7.  Frontend listens for real-time updates on the specific report entry in Firebase Realtime Database using the Firebase SDK.
    8.  Once the report status changes (e.g., to 'processing', then 'complete'), the frontend fetches/updates the report data from the database.
    9.  The React components render the interactive report based on the fetched data.

- **Technical Stack**
    - **Frontend:** React, TypeScript, Tailwind CSS
    - **Backend:** Node.js runtime, TypeScript (for Firebase Functions)
    - **Infrastructure:**
        - Firebase Authentication (Anonymous initially, Email later)
        - Firebase Functions (v1 or v2, TypeScript)
        - Firebase Hosting
        - Firebase Realtime Database (for report metadata and results)
        - Firebase Storage (for screenshots)
        - Google Cloud Tasks (for asynchronous task queueing)
    - **QA Tools:** Playwright, PageSpeed Insights API (for Lighthouse audits)
    - **NEW:** AI Vision Model APIs (e.g., OpenAI API, Google Gemini API - specific SDKs or direct HTTPS calls)
    - **Package Manager:** npm or yarn

- **Authentication Process**
    - Initial Phase: Firebase Anonymous Authentication. When a user first visits, they are assigned a temporary anonymous user ID. This ID is associated with any reports they generate during that session.
    - Future Phase: Implement Firebase Email/Password Authentication to allow users to register, log in, and view their history across sessions.

- **Route Design (Frontend - React Router)**
    - `/`: Main page displaying the URL input form.
    - `/report/:reportId`: Page displaying the details of a specific QA report.

- **API Design (Firebase Functions)**
    - `POST /api/scan`:
        - **Request Body:** `{ "url": "string" }`
        - **Response Body (Success):** `{ "reportId": "string" }` (ID for the report being generated)
        - **Response Body (Error):** `{ "error": "string" }`
        - **Action:** Triggers the QA scan and analysis process asynchronously. Creates the initial report record in the database.

- **Database Design (Firebase Realtime Database)**
    - **Path:** `reports`
    - **Node ID:** `<reportId>` (unique identifier)
    - **Fields:**
        - `userId`: string (Firebase Auth user ID - anonymous or permanent)
        - `url`: string (The target URL scanned)
        - `status`: string (`'pending'`, `'processing'`, `'complete'`, `'error'`)
        - `createdAt`: Timestamp
        - `completedAt`: Timestamp (optional)
        - `screenshotUrl`: string (URL to the image in Firebase Storage, optional)
        - `lighthouseScores`: object (e.g., `{ performance: number, accessibility: number, bestPractices: number, seo: number }`, optional)
        - `performanceMetrics`: object (e.g., `{ ttfb: number, lcp: number, cls: number }`, optional)
        - `accessibilityIssues`: array (List of key issues, e.g., `[{ id: string, description: string, helpUrl: string }]`, optional)
        - `errorMessage`: string (If status is 'error', optional)
        - **NEW:** `aiUxDesignSuggestions`: object or array (Structured data containing AI-generated feedback on UX, design, layout, and styling, e.g., `[{ type: 'layout', suggestion: 'string', area: {x,y,w,h} (optional) }]`, optional)

## Future Functional Requirements

*   **FR-USER-AUTH-001:** The system shall allow users to register with an email and password.
*   **FR-USER-AUTH-002:** The system shall allow registered users to log in and view their past reports.
*   **FR-AI-HELP-001:** The system shall integrate with an AI language model to provide contextual explanations and remediation advice for issues reported (e.g., accessibility violations, performance bottlenecks).
*   **FR-AI-HELP-002:** The AI-generated advice should include potential code/design examples and links to authoritative documentation or best practice guides where applicable.
*   **FR-AI-HELP-003 (Future):** The system may provide an interface for users to ask follow-up questions to the AI regarding the provided advice or specific issues on their website.
