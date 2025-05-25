import React, { useState, useRef, useEffect, useMemo } from 'react';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HighlightableImageProps {
  src: string;
  highlights: Array<BoundingBox>;
  alt?: string;
  containerClassName?: string;
  imageClassName?: string;
  highlightClassName?: string;
  originalWidth?: number;
  originalHeight?: number;
}

const HighlightableImage: React.FC<HighlightableImageProps> = ({
  src,
  highlights,
  alt = 'Highlightable image',
  containerClassName = '',
  imageClassName = '',
  highlightClassName = '',
  originalWidth: propOriginalWidth,
  originalHeight: propOriginalHeight,
}) => {
  // imageRef, displayedDimensions state, handleImageLoad, and useEffect are removed.

  const defaultHighlightStyle = 'absolute border border-red-500 bg-red-500 bg-opacity-30';

  // Use provided original dimensions or updated temporary defaults
  const defaultOriginalWidth = 1920;
  const defaultOriginalHeight = 1080;
  const currentOriginalWidth = propOriginalWidth ?? defaultOriginalWidth;
  const currentOriginalHeight = propOriginalHeight ?? defaultOriginalHeight;

  const processedHighlights = useMemo(() => {
    if (!highlights || highlights.length === 0) {
      return [];
    }

    if (currentOriginalWidth <= 0 || currentOriginalHeight <= 0) {
      // console.warn still useful for developers if this edge case is hit
      console.warn('[HighlightableImage] Invalid originalWidth or originalHeight. Cannot calculate percentage-based highlights. Original W:', currentOriginalWidth, 'H:', currentOriginalHeight);
      return [];
    }

    const calculatedHighlights = highlights.map((box, index) => {
      const leftPercent = (box.x / currentOriginalWidth) * 100;
      const topPercent = (box.y / currentOriginalHeight) * 100;
      const widthPercent = (box.width / currentOriginalWidth) * 100;
      const heightPercent = (box.height / currentOriginalHeight) * 100;

      return {
        key: `highlight-${index}-${box.x}-${box.y}`, // More unique key
        left: leftPercent,
        top: topPercent,
        width: widthPercent,
        height: heightPercent,
        originalBoundingBox: box, // Keep original for debugging or other purposes
      };
    });
    return calculatedHighlights;
  }, [highlights, currentOriginalWidth, currentOriginalHeight]);

  return (
    // Ensure container has overflow:hidden if not already applied by containerClassName
    <div className={`relative overflow-hidden ${containerClassName}`}>
      <img
        // ref={imageRef} // No longer needed
        src={src}
        alt={alt}
        className={imageClassName} // This should include w-full, h-full, object-contain
        // onLoad={handleImageLoad} // No longer needed for this scaling method
      />
      {processedHighlights.map((processedBox) => (
        <div
          key={processedBox.key}
          className={highlightClassName || defaultHighlightStyle}
          style={{
            position: 'absolute', // Explicitly set position absolute
            left: `${processedBox.left}%`,
            top: `${processedBox.top}%`,
            width: `${processedBox.width}%`,
            height: `${processedBox.height}%`,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
};

export default HighlightableImage;
