import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Pause, Play, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/products";
import { ProductImage } from "./ProductImage";
import { useShop } from "@/store/shop";
import { animateIntoCart } from "@/lib/cart-flight";
import { notifyAddedToCart } from "@/lib/notify";
import { LimitedEditionBadge } from "./LimitedEditionBadge";

const ROTATION_INTERVAL_MS = 2500;
const productImagePreloadSource = (src: string) =>
  /^\/produse\/(hp-keeper|got-winter|sunshine|kitten|halloween)\//.test(src) &&
  src.endsWith(".webp")
    ? `${src.slice(0, -".webp".length)}.avif`
    : src;

export function HeroProductRotator({ products }: { products: Product[] }) {
  const { addToCart } = useShop();
  const navigate = useNavigate();
  const items = useMemo(() => products.filter((product) => product.image).slice(0, 6), [products]);
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);

  const activeIndex = items.length ? index % items.length : 0;
  const active = items[activeIndex];

  useEffect(() => {
    if (paused || interacting || reduced || items.length < 2) return;
    const timer = window.setTimeout(
      () => setIndex((value) => (value + 1) % items.length),
      ROTATION_INTERVAL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [activeIndex, interacting, items.length, paused, reduced]);

  useEffect(() => {
    if (items.length < 2) return;
    const next = items[(activeIndex + 1) % items.length];
    const image = new Image();
    image.decoding = "async";
    image.fetchPriority = "low";
    image.src = productImagePreloadSource(next.image);
    void image.decode().catch(() => undefined);
  }, [activeIndex, items]);

  if (!active) return null;

  return (
    <div
      className="hero-photo hero-photo--rotator"
      data-magic-card
      onPointerEnter={() => setInteracting(true)}
      onPointerLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setInteracting(false);
      }}
    >
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={active.id}
          className="hero-product-frame"
          initial={reduced ? false : { opacity: 0, scale: 1.025, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, scale: 0.992, y: -2 }}
          transition={{ duration: reduced ? 0 : 0.62, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            to="/produs/$id"
            params={{ id: active.id }}
            aria-label={`Descoperă ${active.name}`}
            className="hero-product-link"
          >
            <ProductImage
              src={active.image}
              alt={active.name}
              loading="eager"
              fetchPriority={activeIndex === 0 ? "high" : "auto"}
              sizes="(max-width: 767px) 78vw, (max-width: 1200px) 42vw, 470px"
              width={800}
              height={800}
            />
          </Link>
          <LimitedEditionBadge edition={active.limitedEdition} surface="hero" />
          <div className="hero-photo-caption">
            <span>
              <small>Cutiuța din cadru</small>
              {active.shortName || active.category}
            </span>
            <span className="hero-photo-actions">
              <Link to="/produs/$id" params={{ id: active.id }}>
                Vezi cutiuța <ArrowUpRight size={14} aria-hidden />
              </Link>
              <button
                type="button"
                onClick={(event) => {
                  const added = addToCart(active.id, 1);
                  animateIntoCart(event.currentTarget, active.image, added);
                  notifyAddedToCart(active.name, added, () => navigate({ to: "/comanda" }));
                }}
              >
                <ShoppingBag size={14} aria-hidden /> Adaugă
              </button>
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      {items.length > 1 && (
        <div className="hero-rotation-controls">
          <span aria-hidden>
            {items.map((product, itemIndex) => (
              <i key={product.id} data-active={itemIndex === activeIndex || undefined} />
            ))}
          </span>
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? "Pornește schimbarea imaginilor" : "Oprește schimbarea imaginilor"}
            title={paused ? "Pornește imaginile" : "Oprește imaginile"}
          >
            {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
          </button>
        </div>
      )}
    </div>
  );
}
