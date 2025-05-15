# AI QA Engineer Assistant

## Elevator Pitch

An AI-powered assistant for freelance QA engineers that automates the process of testing small-to-medium websites. This assistant is envisioned to be deeply familiar with popular site development platforms (e.g., Squarespace, Shopify, WordPress, Wix), understanding their nuances, common issues, and limitations. Users provide a URL, and the tool scans the site (initially a single page), runs standard QA checks using tools like Lighthouse and Playwright, leverages AI for analysis (like accessibility), and generates a concise, interactive web report highlighting critical performance metrics and accessibility issues, streamlining the initial QA assessment for clients.

## Core Features (Initial Prototype)

*   Accepts a single website URL.
*   Runs Lighthouse audit to gather performance and accessibility metrics.
*   Uses Playwright to navigate and take a screenshot.
*   Displays results (Lighthouse scores, key metrics, accessibility issues, screenshot) in an interactive web report.
*   Displays Lighthouse (PageSpeed) scores in the frontend report as soon as they are available, for a responsive user experience.
*   Uses Firebase for backend, database, and hosting.

## Tech Stack

*   **Frontend:** React, TypeScript, Tailwind CSS
*   **Backend:** Firebase Functions (TypeScript / Node.js)
*   **Database:** Firebase Realtime Database
*   **Storage:** Firebase Storage
*   **Hosting:** Firebase Hosting
*   **Authentication:** Firebase Authentication (Anonymous)
*   **QA Tools:** Playwright, Lighthouse
*   **Package Manager:** npm (or yarn)

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  **Install dependencies:**
    This project might be a monorepo (e.g., using npm workspaces) with separate `frontend` and `functions` directories, or have dependencies managed at the root.
    ```bash
    npm install # Or potentially run install in subdirectories
    ```
3.  **Configure Firebase:**
    *   Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/).
    *   Enable the following services: Authentication (Anonymous sign-in), Realtime Database, Storage, Functions, Hosting.
    *   Obtain your Firebase project configuration credentials.
    *   Create a `.env` file in the appropriate location (likely the frontend and/or functions directory) and add your Firebase config keys (e.g., `REACT_APP_FIREBASE_API_KEY`, `REACT_APP_FIREBASE_AUTH_DOMAIN`, etc.). Note that backend functions (in the `functions` directory) may also require their own `.env` file for specific operational variables (e.g., service URLs). **Do not commit `.env` files.** Refer to Firebase documentation for setting up the SDK.
    *   You may need to install the Firebase CLI (`npm install -g firebase-tools`) and log in (`firebase login`).
4.  **Run the project:**
    *   Running the frontend dev server (e.g., `npm run dev` or `npm start` in the frontend directory).
    *   Refer to specific instructions within `frontend` or `functions` directories once created.

## Project Structure (Example)

```
/
├── frontend/         # React Frontend Code
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
├── functions/        # Firebase Functions (Backend) Code
│   ├── src/
│   ├── package.json
│   └── ...
├── .gitignore
├── package.json      # Root package.json (if using workspaces)
├── firebase.json     # Firebase configuration
├── README.md
├── PRD.md
├── SRS.md
├── UIDD.md
└── TASKS.md
```
