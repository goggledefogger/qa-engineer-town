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
  // Log received highlights prop
  console.log('[HighlightableImage] Received highlights prop:', highlights);

  const imageRef = useRef<HTMLImageElement>(null);
  const [displayedDimensions, setDisplayedDimensions] = useState<{ width: number; height: number } | null>(null);

  const defaultHighlightStyle = 'absolute border border-red-500 bg-red-500 bg-opacity-30';

  // Use provided original dimensions or updated temporary defaults
  const defaultOriginalWidth = 1920;
  const defaultOriginalHeight = 1080;
  const originalWidth = propOriginalWidth ?? defaultOriginalWidth;
  const originalHeight = propOriginalHeight ?? defaultOriginalHeight;


  const handleImageLoad = () => {
    if (imageRef.current) {
      setDisplayedDimensions({
        width: imageRef.current.clientWidth,
        height: imageRef.current.clientHeight,
      });
    }
  };

  // Recalculate displayed dimensions if src changes, which might reload the image
  useEffect(() => {
    if (imageRef.current && imageRef.current.complete) { // If image is already loaded (e.g. from cache)
        handleImageLoad();
    }
    // Reset dimensions if src changes, to handle cases where new image might not load or has different dimensions
    setDisplayedDimensions(null); 
  }, [src]);


  const scaledHighlights = useMemo(() => {
    // Logging inside useMemo, before return
    console.log('[HighlightableImage] Props: originalWidth:', propOriginalWidth, 'originalHeight:', propOriginalHeight);
    console.log('[HighlightableImage] State: displayedDimensions:', displayedDimensions);

    let calculatedHighlights = highlights || []; // Default to original or empty array

    if (
      originalWidth && // This will use the defaulted value if prop is undefined
      originalHeight && // This will use the defaulted value if prop is undefined
      displayedDimensions &&
      displayedDimensions.width > 0 &&
      displayedDimensions.height > 0
    ) {
      // Use the actual originalWidth and originalHeight being used for calculation (which includes defaults)
      const currentOriginalWidth = originalWidth;
      const currentOriginalHeight = originalHeight;

      const scaleX = displayedDimensions.width / currentOriginalWidth;
      const scaleY = displayedDimensions.height / currentOriginalHeight;
      console.log('[HighlightableImage] Calculated scales: scaleX:', scaleX, 'scaleY:', scaleY);

      calculatedHighlights = highlights.map(box => ({
        ...box,
        x: box.x * scaleX,
        y: box.y * scaleY,
        width: box.width * scaleX,
        height: box.height * scaleY,
      }));
    }

    if (calculatedHighlights && calculatedHighlights.length > 0) {
      console.log('[HighlightableImage] First scaledHighlight:', calculatedHighlights[0]);
    } else {
      console.log('[HighlightableImage] No scaled highlights to display or highlights prop is empty.');
    }
    return calculatedHighlights;
  }, [highlights, propOriginalWidth, propOriginalHeight, displayedDimensions, originalWidth, originalHeight]); // Added originalWidth, originalHeight to dependency array as they are now derived outside useMemo but used inside

  return (
    <div className={`relative ${containerClassName}`}>
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className={imageClassName}
        onLoad={handleImageLoad}
      />
      {scaledHighlights.map((box, index) => (
        <div
          key={index}
          className={highlightClassName || defaultHighlightStyle}
          style={{
            top: `${box.y}px`,
            left: `${box.x}px`,
            width: `${box.width}px`,
            height: `${box.height}px`,
          }}
          aria-hidden="true" // Decorative, so hide from screen readers
        />
      ))}
    </div>
  );
};

export default HighlightableImage;
