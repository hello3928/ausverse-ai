"use client";

import { useRef } from "react";

interface Props {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function SmartImage({ src, alt, className, style }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);

  async function handleLoad() {
    const img = imgRef.current;
    if (!img) return;

    // Try Face Detection API (Chrome/Edge only)
    if ("FaceDetector" in window) {
      try {
        // @ts-expect-error — FaceDetector is not in TS lib yet
        const detector = new FaceDetector({ fastMode: true });
        const faces = await detector.detect(img);
        if (faces.length > 0) {
          const face = faces[0].boundingBox;
          const xPct = ((face.x + face.width / 2) / img.naturalWidth) * 100;
          const yPct = ((face.y + face.height / 2) / img.naturalHeight) * 100;
          img.style.objectPosition = `${xPct.toFixed(1)}% ${yPct.toFixed(1)}%`;
          return;
        }
      } catch {
        // FaceDetector failed — fall through to default
      }
    }

    // Fallback: position top-center (faces are usually near the top of portraits)
    img.style.objectPosition = "center 20%";
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={className}
      style={{ objectPosition: "center 20%", ...style }}
      onLoad={handleLoad}
    />
  );
}
