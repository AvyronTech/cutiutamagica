import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import type { Product } from "@/data/products";
import { ProductImage } from "./ProductImage";
import { ProductInterest } from "./ProductInterest";
import { productLink } from "@/lib/product-url";
import { currentVisualEffectsTier } from "@/lib/visual-performance";

export function UpcomingCollection({ products }: { products: Product[] }) {
  const reduced = useReducedMotion();
  const [ref, api] = useEmblaCarousel({ loop: false, align: "start", duration: 18 });
  const [paused, setPaused] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [visible, setVisible] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [selected, setSelected] = useState(0);
  const [richEffects, setRichEffects] = useState(true);
  const cooldownTimer = useRef<number | undefined>(undefined);
  const playing =
    richEffects &&
    !reduced &&
    !paused &&
    !cooldown &&
    visible &&
    !interacting &&
    products.length > 1;
  useEffect(() => setRichEffects(currentVisualEffectsTier() === "full"), []);
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
      { threshold: 0.3 },
    );
    observer.observe(node);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [api]);
  useEffect(() => {
    if (!api || !playing) return;
    const timer = window.setTimeout(() => {
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, 5200);
    return () => window.clearTimeout(timer);
  }, [api, playing, selected]);
  useEffect(
    () => () => {
      if (cooldownTimer.current) window.clearTimeout(cooldownTimer.current);
    },
    [],
  );

  const moveManually = (direction: "previous" | "next") => {
    setCooldown(true);
    if (cooldownTimer.current) window.clearTimeout(cooldownTimer.current);
    cooldownTimer.current = window.setTimeout(() => setCooldown(false), 6000);
    if (!api) return;
    if (direction === "previous") {
      if (api.canScrollPrev()) api.scrollPrev();
      else api.scrollTo(api.scrollSnapList().length - 1);
    } else if (api.canScrollNext()) api.scrollNext();
    else api.scrollTo(0);
  };
  if (!products.length) return null;
  return (
    <section
      id="in-curand"
      data-world="future"
      className="upcoming-scene"
      aria-labelledby="upcoming-title"
    >
      <img
        className="scene-backdrop"
        src="/scenes/catalog-atelier.webp"
        alt=""
        aria-hidden
        loading="lazy"
        decoding="async"
        width="1672"
        height="941"
      />
      <header className="scene-heading" data-reveal>
        <p className="scene-eyebrow">
          05 <span>Următorul capitol</span>
        </p>
        <h2 id="upcoming-title">
          Magia care <em>urmează.</em>
        </h2>
        <p>
          Povești noi și melodii care se pregătesc să revină. Păstrează aproape cutiuța care te-a
          ales.
        </p>
      </header>
      <div
        className="upcoming-viewport"
        data-reveal
        style={{ "--reveal-order": 1 } as React.CSSProperties}
        ref={ref}
        role="region"
        aria-roledescription="carusel"
        aria-label="Cutiuțe viitoare"
        onPointerEnter={() => setInteracting(true)}
        onPointerLeave={() => setInteracting(false)}
        onFocusCapture={() => setInteracting(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setInteracting(false);
        }}
      >
        <div className="upcoming-track">
          {products.map((p) => (
            <article key={p.id} className="upcoming-card" data-magic-card>
              <Link {...productLink(p.id)} className="upcoming-image">
                <ProductImage src={p.image} alt={p.name} sizes="(max-width: 640px) 78vw, 300px" />
                <span>
                  {p.availability === "out_of_stock" ? "Revine în colecție" : "În curând"}
                </span>
              </Link>
              <div className="upcoming-copy">
                <p className="scene-eyebrow">{p.category}</p>
                <h3>
                  <Link {...productLink(p.id)}>{p.shortName || p.name}</Link>
                </h3>
                <p>{p.tagline}</p>
                {p.releaseNote && <p className="release-note">{p.releaseNote}</p>}
                <ProductInterest product={p} />
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="carousel-controls">
        <button
          type="button"
          aria-label="Modelele precedente"
          onClick={() => moveManually("previous")}
        >
          <ArrowLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (playing) {
              setPaused(true);
            } else {
              setPaused(false);
              setCooldown(false);
            }
          }}
          aria-label={playing ? "Oprește derularea automată" : "Pornește derularea automată"}
          disabled={!!reduced || !richEffects || products.length <= 1}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button type="button" aria-label="Modelele următoare" onClick={() => moveManually("next")}>
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}
