import { memo } from "react";

function BrandMarkImpl({ className = "" }: { className?: string }) {
  return (
    <span className={`music-box-mark ${className}`} aria-hidden="true">
      <img
        src="/brand/music-box-universal.webp"
        alt=""
        width={800}
        height={800}
        decoding="async"
        className="music-box-mark__image"
      />
    </span>
  );
}

export const BrandMark = memo(BrandMarkImpl);
