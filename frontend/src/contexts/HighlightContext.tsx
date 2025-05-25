import React, { createContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

// Define BoundingBox type (as per instruction, can be moved to a global types file later)
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Define ScreenshotUrls type (as per instruction, can be moved to a global types file later)
export interface ScreenshotUrls {
  desktop?: string;
  tablet?: string;
  mobile?: string;
}

interface HighlightContextType {
  activeHighlight: BoundingBox | null;
  setActiveHighlight: Dispatch<SetStateAction<BoundingBox | null>>;
  activeScreenshotUrl: string | null;
  setActiveScreenshotUrl: Dispatch<SetStateAction<string | null>>;
  reportScreenshotUrls: ScreenshotUrls | null;
  setReportScreenshotUrls: Dispatch<SetStateAction<ScreenshotUrls | null>>;
}

// Create the context with a default undefined value, will be initialized by provider
export const HighlightContext = createContext<HighlightContextType | undefined>(undefined);

interface HighlightProviderProps {
  children: ReactNode;
}

export const HighlightProvider: React.FC<HighlightProviderProps> = ({ children }) => {
  const [activeHighlight, _setActiveHighlight] = useState<BoundingBox | null>(null); // Renamed original setter
  const [activeScreenshotUrl, setActiveScreenshotUrl] = useState<string | null>(null);
  const [reportScreenshotUrls, setReportScreenshotUrls] = useState<ScreenshotUrls | null>(null);

  // Wrapped setActiveHighlight to include console logging (now removed)
  const setActiveHighlight = (boundingBox: BoundingBox | null) => {
    // console.log('[HighlightContext] setActiveHighlight called with:', boundingBox); // Removed
    _setActiveHighlight(boundingBox);
  };

  return (
    <HighlightContext.Provider
      value={{
        activeHighlight,
        setActiveHighlight, // Pass the wrapped function
        activeScreenshotUrl,
        setActiveScreenshotUrl,
        reportScreenshotUrls,
        setReportScreenshotUrls,
      }}
    >
      {children}
    </HighlightContext.Provider>
  );
};

// Custom hook for easier context consumption (optional but good practice)
export const useHighlight = () => {
  const context = React.useContext(HighlightContext);
  if (context === undefined) {
    throw new Error('useHighlight must be used within a HighlightProvider');
  }
  return context;
};
