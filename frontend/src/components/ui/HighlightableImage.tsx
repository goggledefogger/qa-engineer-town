import React from 'react';

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
}

const HighlightableImage: React.FC<HighlightableImageProps> = ({
  src,
  highlights,
  alt = 'Highlightable image',
  containerClassName = '',
  imageClassName = '',
  highlightClassName = '',
}) => {
  const defaultHighlightStyle = 'absolute border border-red-500 bg-red-500 bg-opacity-30';

  return (
    <div className={`relative ${containerClassName}`}>
      <img src={src} alt={alt} className={imageClassName} />
      {highlights.map((box, index) => (
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
