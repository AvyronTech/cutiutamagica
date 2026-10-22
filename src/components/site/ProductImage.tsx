import { useEffect, useRef, useState } from "react";
import { productImageFallback } from "@/lib/product-image-source";

/**
 * Fotografiile de produs livrate în cea mai bună variantă pe care o acceptă browserul.
 *
 * Pentru pozele din `public/produse` există trei fișiere pe imagine:
 *   nume.avif      — AVIF, cel mai mic la aceeași calitate
 *   nume.webp      — rezerva pentru browserele fără AVIF
 * Restul surselor (media din admin, R2) sunt randate ca `<img>` simplu.
 */

type Props = {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  sizes?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  decoding?: "async" | "sync" | "auto";
  width?: number;
  height?: number;
  thumbnail?: boolean;
};

/** Doar pozele procesate de noi au variantele AVIF alături. */
const hasOptimizedVariants = (src: string) =>
  /^\/produse\/(hp-keeper|got-winter|sunshine|kitten|halloween)\//.test(src) &&
  src.endsWith(".webp");

export function ProductImage({
  src,
  alt,
  className,
  style,
  sizes,
  loading = "lazy",
  fetchPriority,
  decoding = "async",
  width,
  height,
  thumbnail = false,
}: Props) {
  const thumbnailSrc =
    thumbnail && hasOptimizedVariants(src) ? src.replace(/\.webp$/, "-thumb.webp") : null;
  const [resolvedSrc, setResolvedSrc] = useState(thumbnailSrc ?? src);
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => setResolvedSrc(thumbnailSrc ?? src), [src, thumbnailSrc]);
  useEffect(() => {
    const fallback = thumbnailSrc && resolvedSrc === thumbnailSrc ? src : productImageFallback(src);
    const image = imageRef.current;
    // O eroare poate surveni înainte ca React să atașeze onError la HTML-ul inițial.
    if (fallback && image?.complete && image.naturalWidth === 0) {
      setResolvedSrc(fallback);
    }
  }, [src, resolvedSrc, thumbnailSrc]);
  const img = (
    <img
      ref={imageRef}
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={style}
      sizes={sizes}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding={decoding}
      width={width}
      height={height}
      onError={() => {
        const fallback = thumbnailSrc && resolvedSrc === thumbnailSrc ? src : productImageFallback(src);
        if (fallback && resolvedSrc !== fallback) setResolvedSrc(fallback);
      }}
    />
  );

  if ((thumbnailSrc && resolvedSrc === thumbnailSrc) || !hasOptimizedVariants(resolvedSrc))
    return img;

  const base = resolvedSrc.slice(0, -".webp".length);
  return (
    <picture className="contents">
      <source type="image/avif" srcSet={`${base}.avif`} sizes={sizes} />
      <source type="image/webp" srcSet={resolvedSrc} sizes={sizes} />
      {img}
    </picture>
  );
}
