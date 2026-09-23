import { useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import type { Product } from "@/data/products";
import { ProductImage } from "./ProductImage";
import { ProductInterest } from "./ProductInterest";

export function UpcomingCollection({ products }: { products: Product[] }) {
  const reduced = useReducedMotion();
  const plugin = useMemo(
    () =>
      AutoScroll({
        speed: 0.55,
        playOnInit: false,
        stopOnInteraction: true,
        stopOnMouseEnter: true,
        stopOnFocusIn: true,
      }),
    [],
  );
  const [ref, api] = useEmblaCarousel({ loop: products.length > 3, align: "start" }, [plugin]);
  const [paused, setPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!api) return;
    const update = () => setPlaying(plugin.isPlaying());
    api.on("autoScroll:play", update).on("autoScroll:stop", update);
    const node = api.rootNode();
    let visible = false;
    const sync = () => {
      if (
        visible &&
        !document.hidden &&
        !reduced &&
        !paused &&
        !node.matches(":hover") &&
        !node.contains(document.activeElement) &&
        products.length > 3
      )
        plugin.play();
      else plugin.stop();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      plugin.stop();
      api.off("autoScroll:play", update).off("autoScroll:stop", update);
    };
  }, [api, paused, plugin, products.length, reduced]);
  if (!products.length) return null;
  return (
    <section
      id="in-curand"
      data-world="future"
      className="upcoming-scene"
      aria-labelledby="upcoming-title"
    >
      <header className="scene-heading" data-reveal>
        <p className="scene-eyebrow">
          04 <span>Următorul capitol</span>
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
      >
        <div className="upcoming-track">
          {products.map((p) => (
            <article key={p.id} className="upcoming-card" data-magic-card>
              <Link to="/produs/$id" params={{ id: p.id }} className="upcoming-image">
                <ProductImage src={p.image} alt={p.name} sizes="(max-width: 640px) 78vw, 300px" />
                <span>
                  {p.availability === "out_of_stock" ? "Revine în colecție" : "În curând"}
                </span>
              </Link>
              <div className="upcoming-copy">
                <p className="scene-eyebrow">{p.category}</p>
                <h3>
                  <Link to="/produs/$id" params={{ id: p.id }}>
                    {p.shortName || p.name}
                  </Link>
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
          onClick={() => {
            setPaused(true);
            api?.scrollPrev();
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (playing) {
              setPaused(true);
              plugin.stop();
            } else {
              setPaused(false);
              if (!reduced) plugin.play();
            }
          }}
          aria-label={playing ? "Oprește derularea automată" : "Pornește derularea automată"}
          disabled={!!reduced || products.length <= 3}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          type="button"
          aria-label="Modelele următoare"
          onClick={() => {
            setPaused(true);
            api?.scrollNext();
          }}
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}
