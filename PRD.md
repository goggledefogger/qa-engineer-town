# AI QA Engineer Assistant - Product Requirements Document

## 1. Elevator Pitch

An AI-powered assistant for freelance QA engineers that automates the process of testing small-to-medium websites. This assistant is envisioned to be deeply familiar with popular site development platforms (e.g., Squarespace, Shopify, WordPress, Wix), understanding their nuances, common issues, and limitations. Users provide a URL, and the tool scans the site (initially a single page), runs standard QA checks using tools like Lighthouse and Playwright, leverages AI for analysis (like accessibility), and generates a concise, interactive web report highlighting critical performance metrics and accessibility issues, streamlining the initial QA assessment for clients.

## 2. Who is this app for?

This application is designed for freelance QA engineers who work with clients owning or managing small to medium-sized websites. It helps them quickly perform initial assessments, generate professional reports, and identify key areas for improvement without extensive manual testing for the first pass.

## 3. Functional Requirements

*   **Input:** Accept a single, publicly accessible website URL from the user.
*   **Scanning (Initial):**
    *   Navigate to the provided URL using a headless browser (Playwright).
    *   Take a screenshot of the rendered page.
    *   Run a Lighthouse audit on the provided URL.
*   **Analysis (Initial):**
    *   Extract key performance metrics from the Lighthouse report (e.g., TTFB, LCP, overall scores).
    *   Extract key accessibility findings from the Lighthouse report.
    *   (Future: Utilize AI models like Gemini/GPT-4o-mini with vision capabilities to analyze screenshots for visual/UX issues and text content for accessibility. The AI should also leverage its understanding of common website platforms like WordPress, Shopify, Wix, Squarespace, etc., to provide platform-specific insights or identify common pitfalls where applicable).
*   **Reporting:**
    *   Generate a simple, interactive web-based report.
    *   Display the extracted Lighthouse scores and key performance metrics clearly.
    *   Display major accessibility violations identified.
    *   Show the screenshot taken.
*   **Technology (Initial):**
    *   Frontend: React, TypeScript, Tailwind CSS
    *   Backend: TypeScript (Firebase Functions)
    *   Infrastructure: Firebase (Auth - Anonymous, Functions, Hosting, Realtime Database for storing report results, Storage for screenshots).
    *   QA Tools: Playwright, Lighthouse.

## 4. User Stories

*   As a freelance QA engineer, I want to enter a client's website URL into the tool so that I can quickly initiate an automated QA scan.
*   As a freelance QA engineer, I want the tool to run standard performance checks (like Lighthouse) so that I can identify critical loading time issues.
*   As a freelance QA engineer, I want the tool to check for major accessibility problems so that I can advise my client on compliance.
*   As a freelance QA engineer, I want to receive a simple, interactive web report summarizing the key findings (performance, accessibility, screenshot) so that I can easily understand and share the results with my client.
*   (Future) As a freelance QA engineer, I want the tool to analyze screenshots using AI vision models to identify potential visual layout or UX issues.
*   (Future) As a freelance QA engineer, I want the tool to help draft communication summaries based on the report findings to send to my client.

## 5. User Interface

*   A clean, minimalist web interface.
*   A single input field for the target URL.
*   A prominent "Start Scan" or "Analyze" button.
*   A loading/progress indicator while the scan is running.
*   A dedicated view to display the interactive report, clearly sectioned for Performance, Accessibility, and the Screenshot.
*   (Future) Options for configuring scan depth or specific tests.
*   (Future) History of previous scans/reports.
