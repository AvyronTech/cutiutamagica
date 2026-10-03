import { useEffect, useRef, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Product } from "@/data/products";
import { ProductCard } from "./ProductCard";

export function ProductCardCarousel({
  products,
  ariaLabel,
  renderMeta,
}: {
  products: Product[];
  ariaLabel: string;
  renderMeta?: (product: Product) => ReactNode;
}) {
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const [viewportRef, api] = useEmblaCarousel({
    align: "start",
    loop: products.length > 1,
    skipSnaps: false,
  });
  const [selected, setSelected] = useState(0);
  const [snapCount, setSnapCount] = useState(1);

  useEffect(() => {
    if (!api) return;
    const update = () => {
      setSelected(api.selectedScrollSnap());
      setSnapCount(Math.max(api.scrollSnapList().length, 1));
    };
    update();
    api.on("select", update).on("reInit", update);
    return () => {
      api.off("select", update).off("reInit", update);
    };
  }, [api]);

  useEffect(() => {
    if (!api || reduced || products.length < 2) return;
    const timer = window.setInterval(() => {
      const node = root.current;
      if (
        !node ||
        document.hidden ||
        node.matches(":hover") ||
        node.contains(document.activeElement)
      )
        return;
      api.scrollNext();
    }, 6500);
    return () => window.clearInterval(timer);
  }, [api, products.length, reduced]);

  if (!products.length) return null;

  return (
    <div ref={root} className="product-card-rail">
      <div className="product-card-rail__controls">
        <span aria-live="polite">
          {selected + 1} / {snapCount}
        </span>
        <button type="button" onClick={() => api?.scrollPrev()} aria-label="Produsele precedente">
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => api?.scrollNext()} aria-label="Produsele următoare">
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
      <div
        ref={viewportRef}
        className="product-card-rail__viewport"
        role="region"
        aria-roledescription="carusel"
        aria-label={ariaLabel}
      >
        <div className="product-card-rail__track">
          {products.map((product, index) => (
            <div className="product-card-rail__slide" key={product.id}>
              {renderMeta?.(product)}
              <ProductCard product={product} index={index} variant="solid" />
            </div>
          ))}
        </div>
      </div>
      <p className="product-card-rail__hint">Glisează pentru a continua</p>
    </div>
  );
}
