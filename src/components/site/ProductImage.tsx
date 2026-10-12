import { useEffect, useRef, useState } from "react";

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
};

/** Doar pozele procesate de noi au variantele AVIF alături. */
const hasOptimizedVariants = (src: string) =>
  /^\/produse\/(hp-keeper|got-winter|sunshine|kitten|halloween)\//.test(src) &&
  src.endsWith(".webp");

// Fotografii reale ale produselor, folosite numai când fișierul public din R2 lipsește.
const localMediaFallbacks: Record<string, string> = {
  media_hp_keeper_hero: "/produse/hp-keeper/card.webp",
  media_halloween_hero: "/produse/halloween/card.webp",
  media_hp_always_hero: "/produse/archive/hp-always.webp",
  media_pirates_hero: "/produse/archive/pirates.webp",
  media_kitten_hero: "/produse/kitten/card.webp",
  media_starwars_dad_hero: "/produse/archive/starwars-dad.webp",
  media_lotr_rings_hero: "/produse/archive/lotr-rings.webp",
  media_fairy_hero: "/produse/archive/fairy.webp",
};

function productImageFallback(src: string): string | null {
  const mediaId = /^\/media\/([a-zA-Z0-9_-]+)$/.exec(src)?.[1];
  return mediaId ? (localMediaFallbacks[mediaId] ?? null) : null;
}

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
}: Props) {
  const [resolvedSrc, setResolvedSrc] = useState(src);
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => setResolvedSrc(src), [src]);
  useEffect(() => {
    const fallback = productImageFallback(src);
    const image = imageRef.current;
    // O eroare poate surveni înainte ca React să atașeze onError la HTML-ul inițial.
    if (fallback && resolvedSrc === src && image?.complete && image.naturalWidth === 0) {
      setResolvedSrc(fallback);
    }
  }, [src, resolvedSrc]);
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
        const fallback = productImageFallback(src);
        if (fallback && resolvedSrc !== fallback) setResolvedSrc(fallback);
      }}
    />
  );

  if (!hasOptimizedVariants(resolvedSrc)) return img;

  const base = resolvedSrc.slice(0, -".webp".length);
  return (
    <picture className="contents">
      <source type="image/avif" srcSet={`${base}.avif`} sizes={sizes} />
      <source type="image/webp" srcSet={resolvedSrc} sizes={sizes} />
      {img}
    </picture>
  );
}
