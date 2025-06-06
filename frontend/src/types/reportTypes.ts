// Mirrored types from functions/src/types/index.ts for frontend use.
// Ideally, these would be in a shared package or managed by TS path aliases.

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

export interface LLMExplainedAuditItem {
  id: string; // Original audit ID
  title: string; // Original audit title
  status: "pending" | "completed" | "error" | "skipped";
  llmExplanation?: string; // AI-generated explanation/advice
  error?: string; // Error message if LLM explanation failed
}

export interface LighthousePerformanceAudit {
  id: string;
  title: string;
  description: string;
  score: number | null;
  numericValue?: number;
  displayValue?: string;
  explanation?: string;
  thresholds?: Record<string, number>;
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
    id: string;
    title: string;
    description: string;
    score: number | null;
  }>;
  detailedMetrics?: {
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
    totalBlockingTime?: number;
    cumulativeLayoutShift?: number;
    speedIndex?: number;
  };
  performanceOpportunities?: Array<{
    id: string;
    title: string;
    description: string;
    overallSavingsMs?: number;
    overallSavingsBytes?: number;
  }>;
  /**
   * All performance audits with score < 1 (excluding core metrics and opportunities).
   */
  nonPerfectPerformanceAudits?: LighthousePerformanceAudit[];
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

export type ScreenContextType = 'desktop' | 'tablet' | 'mobile' | 'general';

// Defining ScreenContext enum based on ScreenContextType usage
export enum ScreenContext {
  DESKTOP = 'desktop',
  TABLET = 'tablet',
  MOBILE = 'mobile',
  GENERAL = 'general',
}

export interface AiUxDesignSuggestionItem {
  suggestion: string;
  reasoning: string;
  screenContext?: ScreenContextType;
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

export interface DetectedTechnology {
  name: string;
  slug: string;
  version?: string | null;
  confidence: number;
  categories: Array<{ id: number; name: string; slug: string }>;
  icon?: string;
  website?: string;
}

export interface TechStackData {
  status: "pending" | "processing" | "completed" | "error" | "skipped";
  error?: string;
  detectedTechnologies?: DetectedTechnology[];
}

export interface AccessibilityKeyboardCheckResult {
  domOrder: Array<{
    selector: string;
    tag: string;
    text: string;
    id?: string;
    className?: string;
  }>;
  focusOrder: Array<{
    selector: string;
    tag: string;
    text: string;
    id?: string;
    className?: string;
  }>;
  notReachableByTab: Array<{
    selector: string;
    tag: string;
    text: string;
    id?: string;
    className?: string;
  }>;
  tabOrderMatchesDomOrder: boolean;
  error?: string;
}

export interface AccessibilityNameAndStateCheckResult {
  elementsMissingName: Array<{
    selector: string;
    tag: string;
    id: string | null;
    className: string | null;
    role: string | null;
    type: string | null;
    text: string;
  }>;
  elementsMissingState: Array<{
    selector: string;
    tag: string;
    id: string | null;
    className: string | null;
    role: string | null;
    type: string | null;
    text: string;
    missingStates: string[];
  }>;
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

export interface ReportData {
  id: string;
  url: string;
  status: "pending" | "processing" | "completed" | "failed"; // Status strings from functions
  createdAt: number;
  updatedAt?: number;
  playwrightReport?: PlaywrightReport;
  lighthouseReport?: LighthouseReportData;
  aiUxDesignSuggestions?: AiUxDesignSuggestions;
  llmReportSummary?: LLMReportSummary;
  techStack?: TechStackData;
  accessibilityKeyboardCheck?: AccessibilityKeyboardCheckResult;
  accessibilityNameAndStateCheck?: AccessibilityNameAndStateCheckResult; // Add new check result
  colorContrastCheck?: ColorContrastResult; // Add new check result
  visualOrderCheck?: VisualOrderResult; // Add new check result
  errorMessage?: string; // For top-level report errors
  completedAt?: number;
}

// NEW: Lighthouse Performance Metric Details
// Values from Lighthouse documentation (e.g., web.dev/performance-scores/)
// FCP, LCP, Speed Index, TBT are in milliseconds (ms)
// CLS is unitless

type PerformanceMetricCategory = 'Good' | 'Needs Improvement' | 'Poor';

interface MetricDetail {
  name: string;
  unit: string;
  explanation: string;
  thresholds: { good: number; needsImprovement: number };
  getCategory: (value: number) => PerformanceMetricCategory;
}

const getCategoryFunction = (goodThreshold: number, needsImprovementThreshold: number) => (value: number): PerformanceMetricCategory => {
  if (value <= goodThreshold) return 'Good';
  if (value <= needsImprovementThreshold) return 'Needs Improvement';
  return 'Poor';
};

// Note: Values in detailedMetrics from Lighthouse are in MILLISECONDS for time-based metrics.
// The 'unit' here is for display purposes; conversions might be needed if display prefers seconds.
export const lighthouseMetricDetails: { [key: string]: MetricDetail } = {
  firstContentfulPaint: {
    name: 'First Contentful Paint (FCP)',
    unit: 'ms', // Stored in ms, displayed in ms
    explanation: 'Measures how long it takes the browser to render the first piece of DOM content after a user navigates to your page.',
    thresholds: { good: 1800, needsImprovement: 3000 }, // ms
    getCategory: getCategoryFunction(1800, 3000),
  },
  largestContentfulPaint: {
    name: 'Largest Contentful Paint (LCP)',
    unit: 'ms', // Stored in ms, displayed in ms
    explanation: 'Measures when the largest content element in the viewport becomes visible. It can be used to determine when the main content of the page has finished rendering on the screen.',
    thresholds: { good: 2500, needsImprovement: 4000 }, // ms
    getCategory: getCategoryFunction(2500, 4000),
  },
  totalBlockingTime: {
    name: 'Total Blocking Time (TBT)',
    unit: 'ms', // Stored in ms, displayed in ms
    explanation: 'Measures the total amount of time that a page is blocked from responding to user input, such as mouse clicks, screen taps, or keyboard presses.',
    thresholds: { good: 200, needsImprovement: 600 }, // ms
    getCategory: getCategoryFunction(200, 600),
  },
  cumulativeLayoutShift: {
    name: 'Cumulative Layout Shift (CLS)',
    unit: '', // Unitless
    explanation: 'Measures the visual stability of a page. A low CLS helps ensure that the page is delightful.',
    thresholds: { good: 0.1, needsImprovement: 0.25 }, // Unitless
    getCategory: getCategoryFunction(0.1, 0.25),
  },
  speedIndex: {
    name: 'Speed Index',
    unit: 'ms', // Stored in ms, displayed in ms
    explanation: 'Measures how quickly content is visually displayed during page load.',
    thresholds: { good: 3400, needsImprovement: 5800 }, // ms
    getCategory: getCategoryFunction(3400, 5800),
  },
  // Possible future additions:
  // timeToInteractive: { name: 'Time to Interactive (TTI)', unit: 'ms', ... }
  // serverResponseTime: { name: 'Server Response Time (TTFB)', unit: 'ms', ... }
};
