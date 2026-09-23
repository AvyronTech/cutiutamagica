import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/data/products";

export function RotatingSpotlight({
  products,
  eyebrow,
}: {
  products: Product[];
  eyebrow?: string;
}) {
  const [viewport, api] = useEmblaCarousel({ loop: products.length > 1, align: "center" });
  const [selected, setSelected] = useState(0);
  const update = useCallback(() => setSelected(api?.selectedScrollSnap() ?? 0), [api]);
  useEffect(() => {
    if (!api) return;
    update();
    api.on("select", update).on("reInit", update);
    return () => {
      api.off("select", update).off("reInit", update);
    };
  }, [api, update]);
  if (!products.length)
    return (
      <p className="collection-empty">
        Pregătim următoarea cutiuță din această poveste. Descoperă modelele din „Magia care
        urmează”.
      </p>
    );
  return (
    <div
      className="collection-spotlight"
      role="region"
      aria-roledescription="carusel"
      aria-label={eyebrow || "Cutiuțele colecției"}
    >
      {eyebrow && <p className="scene-eyebrow">{eyebrow}</p>}
      <div ref={viewport} className="spotlight-viewport">
        <div className="spotlight-track">
          {products.map((product, i) => (
            <div
              className="spotlight-slide"
              key={product.id}
              aria-hidden={selected !== i}
              inert={selected !== i ? true : undefined}
            >
              <ProductCard product={product} variant="glass" compact />
            </div>
          ))}
        </div>
      </div>
      {products.length > 1 && (
        <div className="carousel-controls">
          <button type="button" aria-label="Cutiuța precedentă" onClick={() => api?.scrollPrev()}>
            <ArrowLeft size={17} />
          </button>
          <span aria-live="polite" aria-atomic="true">
            {String(selected + 1).padStart(2, "0")} <span aria-hidden>/</span>{" "}
            {String(products.length).padStart(2, "0")}
          </span>
          <button type="button" aria-label="Cutiuța următoare" onClick={() => api?.scrollNext()}>
            <ArrowRight size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
