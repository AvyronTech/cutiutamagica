import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ProductImage } from "@/components/site/ProductImage";
import { playTick, playWood } from "@/lib/sound";
import type { ProductGalleryImage } from "@/data/products";

/**
 * Vizualizare mare a fotografiilor de produs: fundal cald cu blur, ramă aurie,
 * navigare cu săgeți, swipe sau tastatură. Se închide cu Esc, cu clic pe fundal
 * sau pe butonul de închidere.
 */
export function ProductLightbox({
  images,
  index,
  productName,
  onClose,
  onIndexChange,
}: {
  images: ProductGalleryImage[];
  index: number;
  productName: string;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}) {
  const count = images.length;
  const swipe = useRef<{ x: number; y: number; at: number } | null>(null);
  const go = useCallback(
    (delta: number) => {
      if (count < 2) return;
      playTick();
      onIndexChange((index + delta + count) % count);
    },
    [count, index, onIndexChange],
  );

  useEffect(() => {
    playWood();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    // Cât timp galeria e deschisă, pagina din spate nu se mai mișcă.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("product-lightbox-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove("product-lightbox-open");
    };
  }, [go, onClose]);

  const image = images[index] ?? images[0];
  if (!image || typeof document === "undefined") return null;

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} — fotografii`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      className="product-lightbox fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[oklch(0.16_0.03_45/0.92)] p-3 backdrop-blur-md sm:p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Închide fotografiile"
        className="absolute right-3 top-3 z-30 rounded-full border border-[color:var(--gold)]/40 bg-black/55 p-2 text-[color:var(--cream)] transition hover:bg-black/70 sm:right-4 sm:top-4"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="product-lightbox__stage relative flex max-h-[82vh] w-full max-w-4xl items-center justify-center"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse") return;
          swipe.current = { x: event.clientX, y: event.clientY, at: performance.now() };
        }}
        onPointerUp={(event) => {
          const start = swipe.current;
          swipe.current = null;
          if (!start || event.pointerType === "mouse") return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (
            performance.now() - start.at < 700 &&
            Math.abs(dx) > 46 &&
            Math.abs(dx) > Math.abs(dy) * 1.2
          )
            go(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        {count > 1 && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Fotografia anterioară"
            className="product-lightbox__nav product-lightbox__nav--previous absolute left-2 z-20 rounded-full border border-[color:var(--gold)]/55 bg-black/60 p-2.5 text-[color:var(--cream)] shadow-lg backdrop-blur transition hover:bg-black/75 sm:left-4 md:-left-14"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={image.src}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="product-lightbox__media relative overflow-hidden rounded-2xl border border-[color:var(--gold)]/35 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
          >
            <ProductImage
              src={image.src}
              alt={`${productName} — ${image.label}`}
              loading="eager"
              sizes="(max-width: 768px) 92vw, 900px"
              className="max-h-[78vh] w-auto max-w-full object-contain"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,oklch(0.95_0.12_85/0.12),transparent_60%)]"
            />
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Fotografia următoare"
            className="product-lightbox__nav product-lightbox__nav--next absolute right-2 z-20 rounded-full border border-[color:var(--gold)]/55 bg-black/60 p-2.5 text-[color:var(--cream)] shadow-lg backdrop-blur transition hover:bg-black/75 sm:right-4 md:-right-14"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-[color:var(--cream)]/85">
        {image.label}
        {count > 1 && (
          <span className="ml-2 text-[color:var(--cream)]/55">
            {index + 1} / {count}
          </span>
        )}
      </p>
      {count > 1 && (
        <p className="mt-1 text-center text-[11px] uppercase tracking-[0.16em] text-[color:var(--cream)]/50 sm:hidden">
          Glisează stânga sau dreapta
        </p>
      )}
    </motion.div>,
    document.body,
  );
}
