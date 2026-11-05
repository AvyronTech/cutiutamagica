import { memo } from "react";

function BrandMarkImpl({
  className = "",
  sizes = "128px",
  priority = false,
}: {
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <span className={`music-box-mark ${className}`} aria-hidden="true">
      <img
        src="/brand/music-box-universal.webp"
        srcSet="/brand/music-box-universal-128.webp 128w, /brand/music-box-universal-320.webp 320w, /brand/music-box-universal.webp 800w"
        sizes={sizes}
        alt=""
        width={800}
        height={800}
        decoding="async"
        loading={priority ? "eager" : undefined}
        fetchPriority={priority ? "high" : undefined}
        className="music-box-mark__image"
      />
    </span>
  );
}

export const BrandMark = memo(BrandMarkImpl);
