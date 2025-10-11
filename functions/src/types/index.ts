export interface ScreenshotUrls {
  desktop?: string;
  tablet?: string;
  mobile?: string;
}

export interface PlaywrightReport {
  success: boolean;
  pageTitle?: string;
  screenshotUrls?: ScreenshotUrls;
  error?: string;
}

export interface ContrastIssue {
  selector: string; // Simplified selector
  textSnippet: string; // First ~100 chars of text
  fontSize: string;
  fontWeight: string;
  textColor: string;
  backgroundColor: string;
  contrastRatio: number;
  expectedRatio: number; // 4.5 or 3
  status: 'fail' | 'pass'; // Though we'd only return fails
}

export interface ColorContrastResult {
  issues: ContrastIssue[];
  error?: string;
}

export interface LighthouseReportData {
  success: boolean;
  error?: string;
  scores?: {
    performance?: number;
    accessibility?: number;
    bestPractices?: number;
    seo?: number;
    pwa?: number;
  };
  accessibilityIssues?: Array<{
    id: string; // Audit ID
    title: string; // Audit title
    description: string; // Audit description
    score: number | null; // Audit score (0 to 1, null if not applicable)
  }>;
  detailedMetrics?: {
    firstContentfulPaint?: number; // ms
    largestContentfulPaint?: number; // ms
    totalBlockingTime?: number; // ms
    cumulativeLayoutShift?: number; // decimal value
    speedIndex?: number; // ms
  };
  performanceOpportunities?: Array<{
    id: string; // Audit ID
    title: string;
    description: string;
    overallSavingsMs?: number;
    overallSavingsBytes?: number;
  }>;
  /**
   * All performance audits with score < 1 (excluding core metrics and opportunities).
   */
  nonPerfectPerformanceAudits?: Array<{
    id: string;
    title: string;
    description: string;
    score: number | null;
    numericValue?: number;
    displayValue?: string;
    explanation?: string;
    thresholds?: Record<string, number>;
  }>;
  seoAudits?: Array<{
    id: string;
    title: string;
    description: string;
    score: number | null;
  }>;
  bestPracticesAudits?: Array<{
    id: string;
    title: string;
    description: string;
    score: number | null;
  }>;
  llmExplainedAccessibilityIssues?: Array<LLMExplainedAuditItem>;
  llmExplainedSeoAudits?: Array<LLMExplainedAuditItem>;
  llmExplainedBestPracticesAudits?: Array<LLMExplainedAuditItem>;
  llmExplainedPerformanceOpportunities?: Array<LLMExplainedAuditItem>;
  llmExplainedNonPerfectPerformanceAudits?: Array<LLMExplainedAuditItem>;
}

export interface LLMExplainedAuditItem {
  id: string; // Original audit ID
  title: string; // Original audit title
  status: "pending" | "completed" | "error" | "skipped";
  llmExplanation?: string; // AI-generated explanation/advice
  error?: string; // Error message if LLM explanation failed
}

export type ScreenContextType = 'desktop' | 'tablet' | 'mobile' | 'general';

export interface AiUxDesignSuggestionItem {
  suggestion: string;
  reasoning: string;
  screenContext?: ScreenContextType; // Indicates the primary screenshot view used for this suggestion
}

export interface AiUxDesignSuggestions {
  status: "pending" | "processing" | "completed" | "error" | "skipped";
  introductionText?: string; // New field
  suggestions?: AiUxDesignSuggestionItem[];
  error?: string;
  modelUsed?: string;
}

export interface LLMReportSummary {
  status: "pending" | "processing" | "completed" | "error" | "skipped";
  summaryText?: string;
  error?: string;
  modelUsed?: string;
}

export interface ReportData {
  id: string;
  analysisId?: string;
  url: string;
  status: "pending" | "processing" | "completed" | "failed";
  playwrightReport?: PlaywrightReport;
  lighthouseReport?: LighthouseReportData;
  aiUxDesignSuggestions?: AiUxDesignSuggestions;
  llmReportSummary?: LLMReportSummary;
  techStack?: TechStackData;
  colorContrastCheck?: ColorContrastResult; // Add new check result
  visualOrderCheck?: VisualOrderResult; // Add new check result
  createdAt: number;
  updatedAt: number;
  error?: string;
}

export interface ScanTaskPayload {
  reportId: string;
  urlToScan: string;
}

export interface DetectedTechnology {
  name: string;
  slug: string; // Derived from name, e.g., for CSS classes or keys
  version: string | null;
  categories: string[]; // Simplified to array of strings from WhatCMS
  confidence?: number; // WhatCMS doesn't provide directly, can default or be omitted
  icon?: string; // WhatCMS doesn't provide directly
  website?: string; // WhatCMS provides a link to their own info page, not the tech's official site
  whatCmsId?: number; // To store the ID from WhatCMS API
  whatCmsUrl?: string; // To store the URL to WhatCMS description page
}

export interface TechStackData {
  status: "pending" | "processing" | "completed" | "error" | "skipped";
  error?: string;
  detectedTechnologies?: DetectedTechnology[];
}

export enum ScreenContext {
  // ... existing code ...
}

export interface AccessibilityKeyboardCheckResult {
  domOrder: Array<{
    selector: string;
    tag: string;
    text: string;
    id: string | null;
    className: string | null;
  }>;
  focusOrder: Array<{
    selector: string;
    tag: string;
    text: string;
    id: string | null;
    className: string | null;
  }>;
  notReachableByTab: Array<{
    selector: string;
    tag: string;
    text: string;
    id: string | null;
    className: string | null;
  }>;
  tabOrderMatchesDomOrder: boolean;
  error?: string;
}

export interface VisualOrderIssue {
  element: {
    selector: string;
    tag: string;
    textSnippet: string;
  };
  domIndex: number;
  visualIndex: number;
  reason: string; // e.g., "Visual order deviates from DOM order"
}

export interface VisualOrderResult {
  issues: VisualOrderIssue[];
  domOrderMatchesVisualOrder: boolean;
  error?: string;
}
