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
  const imageRef = useRef<HTMLImageElement>(null);
  const [displayedDimensions, setDisplayedDimensions] = useState<{ width: number; height: number } | null>(null);

  const defaultHighlightStyle = 'absolute border border-red-500 bg-red-500 bg-opacity-30';

  // Use provided original dimensions or temporary defaults for testing
  const originalWidth = propOriginalWidth ?? 1280; // Default for testing
  const originalHeight = propOriginalHeight ?? 720; // Default for testing

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
    if (
      originalWidth &&
      originalHeight &&
      displayedDimensions &&
      displayedDimensions.width > 0 &&
      displayedDimensions.height > 0
    ) {
      const scaleX = displayedDimensions.width / originalWidth;
      const scaleY = displayedDimensions.height / originalHeight;

      return highlights.map(box => ({
        ...box,
        x: box.x * scaleX,
        y: box.y * scaleY,
        width: box.width * scaleX,
        height: box.height * scaleY,
      }));
    }
    // If not all conditions met for scaling, return highlights as is (or empty array if highlights is undefined)
    return highlights || [];
  }, [highlights, originalWidth, originalHeight, displayedDimensions]);

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
