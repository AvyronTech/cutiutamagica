import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ProductCard } from "@/components/site/ProductCard";
import type { Product } from "@/data/products";

type Props = {
  products: Product[];
  intervalMs?: number;
  eyebrow?: string;
};

export function RotatingSpotlight({ products, intervalMs = 4600, eyebrow }: Props) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useRef(true);
  const reduced = useReducedMotion();

  // Pause when offscreen — saves work on long pages with 3 rotators.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => { inView.current = entry.isIntersecting; },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (products.length <= 1 || reduced) return;
    const t = window.setInterval(() => {
      if (paused || !inView.current || document.hidden) return;
      setI((v) => (v + 1) % products.length);
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [products.length, intervalMs, paused, reduced]);

  if (!products.length) return null;
  const current = products[i];

  return (
    <div
      ref={containerRef}
      className="mt-8 md:mt-10 flex flex-col items-center"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {eyebrow && (
        <div className="flex items-center gap-3 mb-4 text-[color:var(--gold)]">
          <span aria-hidden className="h-px w-8 bg-[color:var(--gold)]/60" />
          <span className="text-[10px] md:text-[11px] uppercase tracking-[0.32em]">{eyebrow}</span>
          <span aria-hidden className="h-px w-8 bg-[color:var(--gold)]/60" />
        </div>
      )}

      <div
        className="relative w-[min(92vw,320px)] sm:w-[340px]"
        style={{ transform: "translateZ(0)" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current.id}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.96, filter: "blur(6px)" }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.98, filter: "blur(4px)" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{ willChange: "transform, opacity, filter" }}
          >
            <ProductCard product={current} variant="glass" />
          </motion.div>
        </AnimatePresence>
      </div>

      {products.length > 1 && (
        <div
          className="mt-4 flex items-center gap-1.5"
          role="tablist"
          aria-label="Selectează produsul afișat"
        >
          {products.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={idx === i}
              aria-label={`Arată ${p.name}`}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                idx === i
                  ? "w-6 bg-[color:var(--gold)]"
                  : "w-1.5 bg-[color:var(--cream)]/40 hover:bg-[color:var(--cream)]/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
