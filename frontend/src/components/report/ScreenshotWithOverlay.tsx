// Simple overlay for bounding boxes on a screenshot
import React from "react";
import type { BoundingBox } from "../../types/reportTypes";

interface ScreenshotWithOverlayProps {
  screenshotUrl?: string;
  boundingBoxes: BoundingBox[];
}

const BOX_COLOR = "rgba(255, 0, 0, 0.35)";
const BOX_BORDER = "2px solid #e11d48";

const ScreenshotWithOverlay: React.FC<ScreenshotWithOverlayProps> = ({
  screenshotUrl,
  boundingBoxes,
}) => {
  const [imgSize, setImgSize] = React.useState<{ width: number; height: number } | null>(null);

  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (imgRef.current && screenshotUrl) {
      const img = imgRef.current;
      if (img.complete) {
        setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
      } else {
        img.onload = () => {
          setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
        };
      }
    }
  }, [screenshotUrl]);

  // For now, render at 100% width and scale bounding boxes accordingly
  return (
    <div className="relative w-full max-w-3xl mx-auto mb-6">
      {screenshotUrl && (
        <img
          ref={imgRef}
          src={screenshotUrl}
          alt="Page screenshot"
          className="w-full rounded shadow"
          style={{ display: "block" }}
        />
      )}
      {imgSize && boundingBoxes.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {boundingBoxes.map((box, i) => {
            // Scale box coordinates to rendered image size
            const scaleX = imgRef.current ? imgRef.current.width / imgSize.width : 1;
            const scaleY = imgRef.current ? imgRef.current.height / imgSize.height : 1;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: box.x * scaleX,
                  top: box.y * scaleY,
                  width: box.width * scaleX,
                  height: box.height * scaleY,
                  background: BOX_COLOR,
                  border: BOX_BORDER,
                  borderRadius: 4,
                  boxSizing: "border-box",
                  pointerEvents: "none",
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ScreenshotWithOverlay;
