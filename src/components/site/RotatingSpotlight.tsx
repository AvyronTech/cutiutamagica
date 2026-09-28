import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useReducedMotion } from "framer-motion";
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
  const [viewport, api] = useEmblaCarousel({
    loop: products.length > 1,
    align: "center",
    duration: 28,
  });
  const reduced = useReducedMotion();
  const [selected, setSelected] = useState(0);
  const [visible, setVisible] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const cooldownTimer = useRef<number | undefined>(undefined);
  const update = useCallback(() => setSelected(api?.selectedScrollSnap() ?? 0), [api]);
  useEffect(() => {
    if (!api) return;
    update();
    api.on("select", update).on("reInit", update);
    return () => {
      api.off("select", update).off("reInit", update);
    };
  }, [api, update]);
  useEffect(() => {
    if (!api) return;
    const node = api.rootNode();
    let inView = false;
    const sync = () => setVisible(inView && !document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [api]);
  useEffect(() => {
    if (!api || reduced || !visible || interacting || cooldown || products.length < 2) return;
    const timer = window.setTimeout(() => api.scrollNext(), 5200);
    return () => window.clearTimeout(timer);
  }, [api, cooldown, interacting, products.length, reduced, selected, visible]);
  useEffect(
    () => () => {
      if (cooldownTimer.current) window.clearTimeout(cooldownTimer.current);
    },
    [],
  );

  const moveManually = (direction: "previous" | "next") => {
    setCooldown(true);
    if (cooldownTimer.current) window.clearTimeout(cooldownTimer.current);
    cooldownTimer.current = window.setTimeout(() => setCooldown(false), 6500);
    if (direction === "previous") api?.scrollPrev();
    else api?.scrollNext();
  };
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
      onPointerEnter={() => setInteracting(true)}
      onPointerLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setInteracting(false);
      }}
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
          <button
            type="button"
            aria-label="Cutiuța precedentă"
            onClick={() => moveManually("previous")}
          >
            <ArrowLeft size={17} />
          </button>
          <span aria-live="off" aria-atomic="true">
            {String(selected + 1).padStart(2, "0")} <span aria-hidden>/</span>{" "}
            {String(products.length).padStart(2, "0")}
          </span>
          <button type="button" aria-label="Cutiuța următoare" onClick={() => moveManually("next")}>
            <ArrowRight size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
