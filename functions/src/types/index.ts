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
  url: string;
  status: "pending" | "processing" | "completed" | "failed";
  playwrightReport?: PlaywrightReport;
  lighthouseReport?: LighthouseReportData;
  aiUxDesignSuggestions?: AiUxDesignSuggestions;
  llmReportSummary?: LLMReportSummary;
  techStack?: TechStackData;
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
  slug: string; // Wappalyzer's unique key for the technology
  version?: string | null;
  confidence: number;
  // Wappalyzer category structure: Array of { id: number, name: string, slug: string }
  categories: Array<{ id: number; name: string; slug: string }>;
  icon?: string; // e.g., "React.svg"
  website?: string;
}

export interface TechStackData {
  status: "pending" | "processing" | "completed" | "error" | "skipped";
  error?: string;
  detectedTechnologies?: DetectedTechnology[];
}

export enum ScreenContext {
  // ... existing code ...
}
