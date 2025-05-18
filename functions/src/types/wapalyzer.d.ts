declare module 'wapalyzer' {
  // Basic Wappalyzer class structure based on usage
  // This is a minimal declaration to satisfy TypeScript
  // It can be expanded if more specific types are needed from the Wappalyzer instance
  class Wappalyzer {
    constructor(options?: any);
    init(): Promise<void>;
    open(url: string, headers?: any, storage?: any): Promise<Site>;
    destroy(): Promise<void>;
  }

  interface Site {
    analyze(): Promise<WappalyzerResults>;
    on(event: string, callback: (...args: any[]) => void): void;
  }

  interface WappalyzerResults {
    urls: any;
    technologies: Array<{
      name: string;
      slug: string;
      confidence: number;
      version?: string | null;
      icon?: string;
      website?: string;
      cpe?: string;
      categories: Array<{ id: number; name: string; slug: string }>;
      [key: string]: any; // For any other properties
    }>;
  }

  export default Wappalyzer;
} 