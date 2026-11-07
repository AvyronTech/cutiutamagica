import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useReducedMotion } from "framer-motion";
import AutoScroll from "embla-carousel-auto-scroll";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import type { Product } from "@/data/products";
import { ProductCard } from "./ProductCard";

export function ProductCardCarousel({
  products,
  ariaLabel,
  renderMeta,
  compact = false,
  continuous = false,
  hideArrows = false,
}: {
  products: Product[];
  ariaLabel: string;
  renderMeta?: (product: Product) => ReactNode;
  compact?: boolean;
  continuous?: boolean;
  hideArrows?: boolean;
}) {
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const autoScroll = useMemo(
    () =>
      AutoScroll({
        speed: 0.45,
        playOnInit: false,
        stopOnInteraction: true,
        stopOnMouseEnter: false,
        stopOnFocusIn: false,
      }),
    [],
  );
  const [viewportRef, api] = useEmblaCarousel(
    {
      align: "start",
      loop: products.length > 1,
      skipSnaps: false,
      dragFree: continuous,
    },
    continuous ? [autoScroll] : [],
  );
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
    if (!api || reduced || continuous || products.length < 2) return;
    const timer = window.setInterval(
      () => {
        const node = root.current;
        if (
          !node ||
          document.hidden ||
          node.matches(":hover") ||
          node.contains(document.activeElement)
        )
          return;
        api.scrollNext();
      },
      compact ? 4600 : 6500,
    );
    return () => window.clearInterval(timer);
  }, [api, compact, continuous, products.length, reduced]);

  useEffect(() => {
    const node = root.current;
    if (!api || !continuous || !node || products.length < 2 || snapCount < 2 || reduced || paused) {
      autoScroll.stop();
      return;
    }
    let visible = false;
    let dragging = false;
    const canHover = window.matchMedia("(hover: hover)").matches;
    const sync = () => {
      if (
        visible &&
        !document.hidden &&
        !dragging &&
        !(canHover && node.matches(":hover")) &&
        !node.querySelector(".product-card-rail__viewport")?.contains(document.activeElement)
      )
        autoScroll.play();
      else autoScroll.stop();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { threshold: 0.1 },
    );
    const afterFocus = () => queueMicrotask(sync);
    const pointerDown = () => {
      dragging = true;
      autoScroll.stop();
    };
    const pointerUp = () => {
      dragging = false;
      sync();
    };
    observer.observe(node);
    document.addEventListener("visibilitychange", sync);
    node.addEventListener("pointerenter", sync);
    node.addEventListener("pointerleave", sync);
    node.addEventListener("focusin", sync);
    node.addEventListener("focusout", afterFocus);
    api.on("pointerDown", pointerDown).on("pointerUp", pointerUp).on("reInit", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      node.removeEventListener("pointerenter", sync);
      node.removeEventListener("pointerleave", sync);
      node.removeEventListener("focusin", sync);
      node.removeEventListener("focusout", afterFocus);
      api.off("pointerDown", pointerDown).off("pointerUp", pointerUp).off("reInit", sync);
      autoScroll.stop();
    };
  }, [api, autoScroll, continuous, paused, products.length, reduced, snapCount]);

  if (!products.length) return null;

  return (
    <div ref={root} className="product-card-rail" data-compact={compact || undefined}>
      {hideArrows ? (
        continuous &&
        !reduced &&
        products.length > 1 &&
        snapCount > 1 && (
          <div className="product-card-rail__controls product-card-rail__controls--auto">
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              aria-label={paused ? "Pornește derularea automată" : "Oprește derularea automată"}
              aria-pressed={paused}
            >
              {paused ? <Play size={15} aria-hidden /> : <Pause size={15} aria-hidden />}
            </button>
          </div>
        )
      ) : (
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
      )}
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
              <ProductCard product={product} index={index} variant="solid" compact={compact} />
            </div>
          ))}
        </div>
      </div>
      <p className="product-card-rail__hint">Glisează pentru a continua</p>
    </div>
  );
}
