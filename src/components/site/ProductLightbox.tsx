import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect } from "react";
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
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [go, onClose]);

  const image = images[index] ?? images[0];
  if (!image) return null;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} — fotografii`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[oklch(0.16_0.03_45/0.92)] p-4 backdrop-blur-md"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Închide fotografiile"
        className="absolute right-4 top-4 rounded-full border border-[color:var(--gold)]/40 bg-black/30 p-2 text-[color:var(--cream)] transition hover:bg-black/50"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className="relative flex max-h-[82vh] w-full max-w-4xl items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        {count > 1 && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Fotografia anterioară"
            className="absolute left-0 z-10 rounded-full border border-[color:var(--gold)]/40 bg-black/35 p-2 text-[color:var(--cream)] transition hover:bg-black/60 md:-left-14"
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
            className="relative overflow-hidden rounded-2xl border border-[color:var(--gold)]/35 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
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
            className="absolute right-0 z-10 rounded-full border border-[color:var(--gold)]/40 bg-black/35 p-2 text-[color:var(--cream)] transition hover:bg-black/60 md:-right-14"
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
    </motion.div>
  );
}
