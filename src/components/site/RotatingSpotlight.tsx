import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useReducedMotion } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight, Music2, ShoppingBag } from "lucide-react";
import { ProductImage } from "./ProductImage";
import type { Product } from "@/data/products";
import { LimitedEditionBadge } from "./LimitedEditionBadge";
import { ProductPrice } from "./ProductPrice";
import { useShop } from "@/store/shop";
import { animateIntoCart } from "@/lib/cart-flight";
import { notifyAddedToCart } from "@/lib/notify";
import { isAvailable } from "@/data/products";

function SpotlightCard({ product }: { product: Product }) {
  const { addToCart, products } = useShop();
  const navigate = useNavigate();
  product = products.find((candidate) => candidate.id === product.id) ?? product;
  const available = isAvailable(product);

  return (
    <article className="spotlight-card" data-magic-card>
      <Link
        to="/produs/$id"
        params={{ id: product.id }}
        className="spotlight-card__media"
        aria-label={`Descoperă ${product.name}`}
      >
        <ProductImage
          src={product.image}
          alt={product.name}
          className="spotlight-card__image"
          sizes="(max-width: 640px) 78vw, 330px"
          width={720}
          height={720}
        />
        <LimitedEditionBadge edition={product.limitedEdition} surface="card" />
        <span className="spotlight-card__category">{product.category}</span>
      </Link>
      <div className="spotlight-card__copy">
        <h3>
          <Link to="/produs/$id" params={{ id: product.id }}>
            {product.shortName || product.name}
          </Link>
        </h3>
        <p>{product.tagline}</p>
        <div className="spotlight-card__meta">
          <span>
            <Music2 aria-hidden /> {product.melody || "Melodie mecanică"}
          </span>
          <ProductPrice product={product} size="compact" showSavings={false} />
        </div>
        <div className="spotlight-card__actions">
          {available && (
            <button
              type="button"
              className="spotlight-card__add"
              onClick={(event) => {
                const added = addToCart(product.id, 1);
                animateIntoCart(event.currentTarget, product.image, added);
                notifyAddedToCart(product.name, added, () => navigate({ to: "/comanda" }));
              }}
            >
              <ShoppingBag aria-hidden /> Adaugă în coș
            </button>
          )}
          <Link className="spotlight-card__link" to="/produs/$id" params={{ id: product.id }}>
            Vezi cutiuța <ArrowUpRight aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

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
    duration: 24,
    skipSnaps: false,
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
    const timer = window.setTimeout(() => api.scrollNext(), 4800);
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
              data-selected={selected === i || undefined}
            >
              <SpotlightCard product={product} />
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
