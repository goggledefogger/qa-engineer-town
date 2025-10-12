# AI QA Engineer Assistant

An AI-powered assistant for QA engineers to generate a test report for small-to-medium websites. Users provide a URL, the tool scans the site (for now a single page), runs standard QA checks using tools like Lighthouse and Playwright, uses AI for analysis of design, UX, and accessibility, and generates an interactive web report highlighting critical performance metrics, accessibility issues, and actionable design feedback, providing initial QA assessment for clients.

## Demo: https://roytown.net

<img width="600" alt="image" src="https://github.com/user-attachments/assets/f7b4268c-6cd8-41bb-aee8-bdf1b9689865" />


## Core Features (Initial Prototype)

*   Accepts a single website URL
*   Restricted access via Firebase Email Link Authentication
*   Runs Lighthouse audit via PageSpeed Insights API
*   Uses Playwright to capture screenshots at multiple viewports (desktop, tablet, mobile)
*   Utilizes configurable AI vision models (Gemini, OpenAI, or Anthropic Claude) to analyze screenshots for UX, design, layout, and styling suggestions
*   Generates an LLM-powered summary of the entire report
*   Displays results in an interactive web report
*   Uses Firebase for backend (Cloud Functions, Cloud Tasks), database (Realtime Database), storage (Cloud Storage), and hosting

## Tech Stack

*   **Frontend:** React, TypeScript, Tailwind CSS, Vite
*   **Backend:** Firebase Functions (TypeScript / Node.js), Google Cloud Tasks
*   **Database:** Firebase Realtime Database
*   **Storage:** Firebase Cloud Storage
*   **Hosting:** Firebase Hosting
*   **Authentication:** Firebase Email Link Authentication
*   **QA Tools:** Playwright (running in Cloud Functions), PageSpeed Insights API
*   **AI Providers:**
    * 🧠📸 Google Gemini (2.5 series multimodal models)
    * 🧠📸 OpenAI (GPT-4o/5 and o-series reasoning models)
    * 🧠📸 Anthropic Claude (Opus/Sonnet/Haiku with image + text)

> Legend: 🧠 = language & reasoning, 📸 = vision/multimodal analysis
*   **AI:** Google Gemini, OpenAI, or Anthropic Claude for vision analysis and LLM summaries
*   **Package Manager:** npm (workspaces)

## Project Structure

```
/
├── frontend/         # React Frontend Code
│   ├── src/
│   ├── public/
│   ├── .env.example  # Frontend environment variables template
│   ├── .env          # Frontend environment variables (gitignored)
│   ├── package.json
│   └── ...
├── functions/        # Firebase Functions (Backend) Code
│   ├── src/
│   ├── .env.example  # Backend environment variables template
│   ├── .env          # Backend environment variables (gitignored)
│   ├── package.json
│   └── ...
├── .firebaserc       # Firebase project association
├── firebase.json     # Firebase services configuration (hosting, functions, rules)
├── database.rules.json # Firebase Realtime Database security rules
├── storage.rules     # Firebase Cloud Storage security rules
├── .gitignore
├── package.json      # Root package.json (for npm workspaces)
├── README.md
└── TASKS.md          # Project tasks and progress
```

## Getting Started

### Prerequisites

1.  **Node.js and npm:** Ensure you have Node.js (preferably LTS version, see `.nvmrc`) and npm installed. If using nvm, run `nvm use` in the project root.
2.  **Firebase CLI:** Install or update the Firebase CLI: `npm install -g firebase-tools`
3.  **Google Cloud SDK (gcloud):** Install the gcloud CLI for managing Google Cloud resources like Cloud Tasks. Follow instructions at [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install).

### Initial Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  **Install dependencies:**
    This project uses npm workspaces. Install all dependencies from the root directory:
    ```bash
    npm install
    ```
3.  **Firebase Project Setup:**
    *   Go to the [Firebase Console](https://console.firebase.google.com/) and create a new Firebase project or select an existing one.
    *   Associate your local project with your Firebase project:
        ```bash
        firebase login
        firebase use --add
        ```
        Select your project ID when prompted. This will create/update `.firebaserc`.
    *   **Enable Firebase Services:**
        *   **Authentication:**
            *   Go to Authentication > Sign-in method.
            *   Enable "Email/Password" provider.
            *   Within "Email/Password", enable "Email link (passwordless sign-in)".
            *   Disable "Anonymous" sign-in if it was previously enabled.
            *   Under Settings > Authorized domains, ensure your Firebase Hosting domain (`<project-id>.web.app`, `<project-id>.firebaseapp.com`) and any custom domains are listed. Also add `localhost` for local development if you plan to test sign-in flows locally (though links might need to be adapted).
        *   **Realtime Database:** Create a Realtime Database instance (e.g., in `us-central1`). Start in **locked mode**. Rules will be deployed later.
        *   **Storage:** Enable Cloud Storage. Default rules are usually fine to start, but will be deployed.
        *   **Functions:** No specific enablement needed here beyond general project setup, but ensure your project is on the "Blaze (pay as you go)" plan as Cloud Functions and Cloud Tasks require it.

4.  **Google Cloud Setup (Beyond Firebase):**
    *   **Enable APIs:** In the Google Cloud Console for your Firebase project:
        *   Ensure "Cloud Tasks API" is enabled.
        *   Ensure "Cloud Build API" is enabled (usually enabled by default for Firebase Functions).
        *   Ensure "Google Generative Language API" (for Gemini) is enabled.
        *   Ensure "PageSpeed Insights API" is enabled.
    *   **Create Cloud Tasks Queue:**
        ```bash
        gcloud tasks queues create scanProcessingQueue --location=us-central1
        ```
        (If it exists, this command will report it. If it was recently deleted, you might need to wait or use a different name and update `functions/src/api/apiScan.ts` accordingly).
    *   **Service Account Permissions:** The default App Engine service account (`<project-id>@appspot.gserviceaccount.com`), which is often used by Cloud Functions by default for some operations and for creating OIDC tokens for Cloud Tasks, needs:
        *   `roles/cloudtasks.enqueuer` (to allow `apiScan` to enqueue tasks).
        *   `roles/run.invoker` (if `processScanTask` is a Gen 2 function, it runs on Cloud Run; this allows invocation).
        *   `roles/cloudfunctions.invoker` (for `processScanTask` if it were a Gen 1 function, or for other inter-function calls).
        *   The service account that *executes* `processScanTask` (the default compute service account for Gen 2 functions) needs permissions to access Storage, Realtime Database, and any Google APIs it calls (Gemini, PageSpeed). These are often covered by `roles/firebase.sdkAdmin` or more granular roles like `roles/firebasedatabase.admin`, `roles/storage.admin`.

### Environment Variables

Create `.env` files for both the `frontend` and `functions` workspaces. Copy the corresponding `.env.example` files (create these first if they don't exist) and fill in the values.

**1. Frontend (`frontend/.env`):**

Create `frontend/.env.example` with:
```
# Firebase Configuration (obtain from Firebase Console > Project settings > Your apps > Web app)
VITE_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
VITE_FIREBASE_AUTH_DOMAIN="YOUR_FIREBASE_AUTH_DOMAIN"
VITE_FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
VITE_FIREBASE_STORAGE_BUCKET="YOUR_FIREBASE_STORAGE_BUCKET"
VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_FIREBASE_MESSAGING_SENDER_ID"
VITE_FIREBASE_APP_ID="YOUR_FIREBASE_APP_ID"
VITE_FIREBASE_DATABASE_URL="YOUR_FIREBASE_DATABASE_URL"
VITE_DEFAULT_AI_PROVIDER="gemini" # Optional: gemini | openai | anthropic
VITE_DEFAULT_GEMINI_MODEL="gemini-2.5-flash" # Optional: preselects the Gemini model in the dropdown
VITE_DEFAULT_OPENAI_MODEL="gpt-4o" # Optional: preselects an OpenAI model
VITE_DEFAULT_ANTHROPIC_MODEL="claude-sonnet-4-5" # Optional: preselects a Claude model
```
Then copy to `frontend/.env` and fill in the actual values.
*   `VITE_DEFAULT_AI_PROVIDER`: Optional. Sets which provider is preselected in the scan form dropdown. Users can still change it per scan.
*   `VITE_DEFAULT_GEMINI_MODEL`, `VITE_DEFAULT_OPENAI_MODEL`, `VITE_DEFAULT_ANTHROPIC_MODEL`: Optional. Prefill the model dropdown for each provider; admins can still override per scan.

**2. Backend (`functions/.env`):**

Create `functions/.env.example` with:
```
# Firebase/Google Cloud Project ID (usually auto-detected, but can be set explicitly)
# GCLOUD_PROJECT="YOUR_PROJECT_ID"

# URL of the processScanTask Cloud Function (Obtain after first deployment of processScanTask)
# Example: https://us-central1-your-project-id.cloudfunctions.net/processScanTask
# For Gen2 functions, it might look like: https://processscantask-xxxxxx-uc.a.run.app
PROCESS_SCAN_TASK_URL="YOUR_PROCESS_SCAN_TASK_FUNCTION_URL"

# AI Provider Defaults
AI_DEFAULT_PROVIDER="gemini" # Optional: gemini | openai | anthropic

# API Keys (local emulators only; production uses Firebase Secrets)
PAGESPEED_API_KEY="YOUR_GOOGLE_PAGESPEED_INSIGHTS_API_KEY"
GEMINI_API_KEY="YOUR_GOOGLE_GEMINI_API_KEY"
OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
ANTHROPIC_API_KEY="YOUR_ANTHROPIC_API_KEY"

# Model Configuration (optional fallbacks if the UI doesn't send a selection)
GEMINI_MODEL="gemini-2.5-flash"
OPENAI_MODEL="gpt-4o"
ANTHROPIC_MODEL="claude-sonnet-4-5"

# Playwright Navigation (optional overrides for emulators)
PLAYWRIGHT_NAV_TIMEOUT_MS="120000"
PLAYWRIGHT_NAV_TIMEOUT_FALLBACK_MS="45000"
```
Then copy to `functions/.env` and fill in the actual values.
*   `PROCESS_SCAN_TASK_URL`: You'll get this URL after you deploy the `processScanTask` function for the first time.
*   `PAGESPEED_API_KEY`: Generate from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) by creating an API key and restricting it to the PageSpeed Insights API if desired.
*   `GEMINI_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY`: Provide whichever providers you plan to use. Only configured providers will execute. When running locally with the emulator these values can live in `.env`, but **in production you must store them as Firebase Secrets** (see below).
*   `GEMINI_MODEL`, `OPENAI_MODEL`, `ANTHROPIC_MODEL`: Optional fallback model names. The admin UI now lets you choose a provider and model per scan; these values are only used when nothing is selected.

**Production Secrets:** Deploying Cloud Functions requires the API keys to be managed via Firebase Secrets. Set each key once using the Firebase CLI:

```bash
firebase functions:secrets:set PAGESPEED_API_KEY
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:set WHATCMS_API_KEY
```

The deploy step will attach these secrets to `processScanTask`, and the function automatically falls back to the `.env` values only when running locally with the Emulator Suite.

### Designating Admin Users

Admin users are managed via Firebase Custom Claims, which are set by a Cloud Function (`manageAdminCustomClaims`) triggered by changes in the Firebase Realtime Database. To designate a user as an admin:

1.  **User Authentication:** The user must first sign into the application at least once using the standard email link authentication. This creates their user account in Firebase Authentication.
2.  **Obtain User UID:** Find the User UID of the account you want to make an admin. You can find this in the Firebase Console under Authentication > Users tab (it's the `User UID` column).
3.  **Set Admin Flag in Realtime Database:**
    *   Go to your Firebase project in the [Firebase Console](https://console.firebase.google.com/).
    *   Navigate to Build > Realtime Database.
    *   In your database, go to the `/adminUsers` path. If it doesn't exist, create it.
    *   Click the `+` icon next to `adminUsers` to add a new child node.
    *   Set the **key** of this new node to the **User UID** you obtained in step 2.
    *   Inside this UID node, add two key-value pairs:
        *   `email`: (String) The email address of the user (e.g., `"admin@example.com"`). This is for informational purposes.
        *   `isAdmin`: (Boolean) Set this to `true`.
    *   It should look like this:
        ```json
        {
          "adminUsers": {
            "USER_UID_FROM_FIREBASE_AUTH": {
              "email": "user@example.com",
              "isAdmin": true
            }
          }
        }
        ```
4.  **Claim Propagation:** The `manageAdminCustomClaims` Cloud Function will automatically detect this change and set an `admin: true` custom claim on the user's Firebase Authentication record.
    *   **Important:** Custom claims are included in the user's ID token. For the changes to take effect immediately for an already signed-in user, they might need to sign out and sign back in, or their ID token needs to be refreshed. ID tokens refresh automatically approximately every hour, or can be forced to refresh by the application. New sign-ins will get the claim immediately.

To remove admin privileges, you can either set `isAdmin: false` for the user under `/adminUsers/{UID}` or delete the `/adminUsers/{UID}` node entirely. The Cloud Function will then remove the custom claim.

### Building and Running Locally

**1. Frontend:**
   Navigate to the frontend directory and start the Vite development server:
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will typically be available at `http://localhost:5173`.

**2. Backend (Firebase Functions):**
   Firebase Functions are usually tested by deploying them or using the Firebase Emulator Suite. For local development with email link authentication that requires a real deployed environment for link handling, direct local serving of functions that need auth can be tricky.
   *   **To emulate functions (without full auth simulation for email links):**
      ```bash
      # From project root
      firebase emulators:start --only functions,database,storage,auth
      ```
      You would need to configure the emulators (ports, etc.) and potentially seed data.
      Note: Email link authentication flow is difficult to test fully with emulators as it involves actual email sending and link redirection.
   *   **Primary testing method:** Deploy functions and test against the deployed versions.

### Deployment

1.  **Build Frontend:**
    Ensure you are in the project root directory. The `firebase.json` `predeploy` hook for hosting should handle this, but you can also run it manually:
    ```bash
    npm run build --workspace=frontend
    ```

2.  **Deploy Firebase Resources:**
    From the project root:
    *   **Deploy everything (Functions, Hosting, Rules):**
        ```bash
        firebase deploy
        ```
    *   **Deploy only specific parts:**
        ```bash
        firebase deploy --only functions
        firebase deploy --only hosting
        firebase deploy --only database # For database.rules.json
        firebase deploy --only storage  # For storage.rules
        ```

    **After the first deployment of `processScanTask` function:**
    *   Go to the Firebase Console > Functions.
    *   Find the `processScanTask` function.
    *   Copy its Trigger URL.
    *   Update the `PROCESS_SCAN_TASK_URL` in `functions/.env`.
    *   Redeploy the `apiScan` function (or all functions) so it picks up the new environment variable:
        ```bash
        firebase deploy --only functions # Or specifically target apiScan if needed
        ```

3.  **Set Firebase Rules:**
    The `database.rules.json` and `storage.rules` in the root of the project are deployed with `firebase deploy`. These rules are now configured to use Firebase Authentication custom claims (`auth.token.admin === true`) to grant access to admin users. No manual editing of email addresses within these rule files is required. Ensure they are deployed as part of your `firebase deploy` command.

## Development Notes

*   **NPM Workspaces:** Remember to run `npm install <package> --workspace=<frontend|functions>` from the project root when adding dependencies to specific workspaces.
*   **Firebase Emulators:** For extensive local backend testing (excluding full email link auth flow), consider setting up and using the Firebase Emulator Suite.
*   **Cloud Function Logs:** Check logs for your Firebase Functions in the Google Cloud Console under "Logs Explorer" or via Firebase CLI (`firebase functions:log`).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
