/**
 * Fotografiile de produs livrate în cea mai bună variantă pe care o acceptă browserul.
 *
 * Pentru pozele din `public/produse` există trei fișiere pe imagine:
 *   nume.avif      — AVIF, cel mai mic la aceeași calitate
 *   nume@2x.avif   — aceeași imagine la 1,75×, pentru ecrane retina
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
const hasOptimizedVariants = (src: string) => src.startsWith("/produse/") && src.endsWith(".webp");

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
  const img = (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      sizes={sizes}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding={decoding}
      width={width}
      height={height}
    />
  );

  if (!hasOptimizedVariants(src)) return img;

  const base = src.slice(0, -".webp".length);
  return (
    <picture className="contents">
      <source type="image/avif" srcSet={`${base}.avif 1x, ${base}@2x.avif 2x`} sizes={sizes} />
      <source type="image/webp" srcSet={src} sizes={sizes} />
      {img}
    </picture>
  );
}
