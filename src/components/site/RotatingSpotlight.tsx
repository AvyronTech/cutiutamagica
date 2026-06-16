import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ProductCard } from "@/components/site/ProductCard";
import type { Product } from "@/data/products";

type Props = {
  products: Product[];
  intervalMs?: number;
  eyebrow?: string;
};

export function RotatingSpotlight({ products, intervalMs = 4200, eyebrow = "Aleasă pentru tine" }: Props) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (products.length <= 1) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % products.length), intervalMs);
    return () => window.clearInterval(t);
  }, [products.length, intervalMs]);

  if (!products.length) return null;
  const current = products[i];

  return (
    <div className="mt-8 md:mt-10 flex flex-col items-center">
      <div className="flex items-center gap-3 mb-4 text-[color:var(--gold)]">
        <span aria-hidden className="h-px w-8 bg-[color:var(--gold)]/60" />
        <span className="text-[10px] md:text-[11px] uppercase tracking-[0.32em]">{eyebrow}</span>
        <span aria-hidden className="h-px w-8 bg-[color:var(--gold)]/60" />
      </div>

      <div className="relative w-[min(92vw,320px)] sm:w-[340px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProductCard product={current} variant="glass" />
          </motion.div>
        </AnimatePresence>
      </div>

      {products.length > 1 && (
        <div className="mt-4 flex items-center gap-1.5">
          {products.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              aria-label={`Arată ${p.name}`}
              onClick={() => setI(idx)}
              className={`h-1.5 rounded-full transition-all ${
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
