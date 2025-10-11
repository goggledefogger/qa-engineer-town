import type { PerformanceCategory } from '../components/ui/MetricDisplay';
export type { PerformanceCategory } from '../components/ui/MetricDisplay';

// Copied from ReportPage.tsx

// New interface for LLM Explained Audit Item
export interface LLMExplainedAuditItem {
  id: string; // Original audit/opportunity ID
  title: string; // Original title, useful for matching or display
  llmExplanation?: string; // LLM-generated explanation (Markdown format)
  status: 'pending' | 'completed' | 'error';
  error?: string;
}

// Define an interface for Lighthouse report data
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
  // Fields for LLM-enhanced explanations
  llmExplainedAccessibilityIssues?: Array<LLMExplainedAuditItem>;
  llmExplainedSeoAudits?: Array<LLMExplainedAuditItem>;
  llmExplainedBestPracticesAudits?: Array<LLMExplainedAuditItem>;
  llmExplainedPerformanceOpportunities?: Array<LLMExplainedAuditItem>;
}

// Define an interface for the LLM Report Summary data structure
export interface LLMReportSummary {
  status: "pending" | "processing" | "completed" | "error" | "skipped";
  summaryText?: string;
  error?: string;
  modelUsed?: string;
  providerUsed?: string;
}

// Define an interface for Screenshot URLs (matching backend)
export interface ScreenshotUrls {
  desktop?: string;
  tablet?: string;
  mobile?: string;
}

// Define an interface for Playwright report data (matching backend)
export interface PlaywrightReport {
  success?: boolean;
  pageTitle?: string;
  screenshotUrls?: ScreenshotUrls;
  error?: string;
}

// Define ScreenContextType matching backend
export type ScreenContextType = 'desktop' | 'tablet' | 'mobile' | 'general';

// Define AiUxDesignSuggestionItem matching backend
export interface AiUxDesignSuggestionItem {
  suggestion: string;
  reasoning: string;
  screenContext?: ScreenContextType;
}

// Define an interface for the report data structure
export type ReportStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  // Legacy values kept for backward compatibility with older data
  | 'complete'
  | 'error';

export interface ReportData {
  id?: string;
  analysisId?: string;
  url: string;
  status: ReportStatus;
  createdAt: number; // Timestamp
  aiConfig?: {
    geminiModel?: string;
  };
  playwrightReport?: PlaywrightReport;
  lighthouseReport?: LighthouseReportData;
  aiUxDesignSuggestions?: {
    status: "completed" | "error" | "pending" | "skipped";
    suggestions?: AiUxDesignSuggestionItem[];
    modelUsed?: string;
    providerUsed?: string;
    error?: string;
  };
  llmReportSummary?: LLMReportSummary;
  errorMessage?: string;
  completedAt?: number;
}

// Helper data for Lighthouse Performance Metrics - to be moved to PerformanceSection.tsx if specific
export const lighthouseMetricDetails: Record<string, {
  name: string;
  unit?: string;
  explanation: string;
  thresholds: { good: string; needsImprovement: string; poor: string; };
  getCategory: (value: number) => PerformanceCategory;
}> = {
  firstContentfulPaint: {
    name: 'First Contentful Paint (FCP)',
    unit: 'ms',
    explanation: 'FCP marks the time at which the first text or image is painted. It indicates when users first see something on the screen.',
    thresholds: { good: '<= 1800 ms', needsImprovement: '<= 3000 ms', poor: '> 3000 ms' },
    getCategory: (value: number) => {
      if (value <= 1800) return 'Good';
      if (value <= 3000) return 'Needs Improvement';
      return 'Poor';
    },
  },
  largestContentfulPaint: {
    name: 'Largest Contentful Paint (LCP)',
    unit: 'ms',
    explanation: 'LCP marks the time at which the largest text or image is painted. It measures perceived load speed.',
    thresholds: { good: '<= 2500 ms', needsImprovement: '<= 4000 ms', poor: '> 4000 ms' },
    getCategory: (value: number) => {
      if (value <= 2500) return 'Good';
      if (value <= 4000) return 'Needs Improvement';
      return 'Poor';
    },
  },
  totalBlockingTime: {
    name: 'Total Blocking Time (TBT)',
    unit: 'ms',
    explanation: 'TBT measures the total amount of time that the main thread was blocked long enough to prevent input responsiveness. It is a lab proxy for Interaction to Next Paint (INP).',
    thresholds: { good: '<= 200 ms', needsImprovement: '<= 600 ms', poor: '> 600 ms' },
    getCategory: (value: number) => {
      if (value <= 200) return 'Good';
      if (value <= 600) return 'Needs Improvement';
      return 'Poor';
    },
  },
  cumulativeLayoutShift: {
    name: 'Cumulative Layout Shift (CLS)',
    explanation: 'CLS measures visual stability by quantifying how much visible content shifts unexpectedly. A low CLS helps ensure that the page is delightful.',
    thresholds: { good: '<= 0.1', needsImprovement: '<= 0.25', poor: '> 0.25' },
    getCategory: (value: number) => {
      if (value <= 0.1) return 'Good';
      if (value <= 0.25) return 'Needs Improvement';
      return 'Poor';
    },
  },
  speedIndex: {
    name: 'Speed Index (SI)',
    unit: 'ms',
    explanation: 'Speed Index shows how quickly the contents of a page are visibly populated. It measures how quickly visual content is displayed during page load.',
    thresholds: { good: '<= 3400 ms', needsImprovement: '<= 5800 ms', poor: '> 5800 ms' },
    getCategory: (value: number) => {
      if (value <= 3400) return 'Good';
      if (value <= 5800) return 'Needs Improvement';
      return 'Poor';
    },
  },
};
