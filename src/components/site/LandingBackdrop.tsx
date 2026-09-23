import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import bgEmotie from "@/assets/bg-emotie.jpg";
import { worldBlend } from "@/lib/landing-motion";
const scenes = [
  { key: "story", source: "/scenes/library.webp", mobile: "/scenes/library-mobile.webp" },
  { key: "emotion", source: bgEmotie },
  { key: "dedicated", source: "/scenes/dedicated.webp" },
  { key: "future" },
  {
    key: "atelier",
    source: "/scenes/footer-atelier.webp",
    mobile: "/scenes/footer-atelier-960.webp",
  },
];
export function LandingBackdrop() {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const node = root.current,
      world = node?.closest<HTMLElement>(".hero-world-stage");
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData;
    if (!node || !world || reduced || saveData) return;
    const layers = Array.from(node.querySelectorAll<HTMLElement>(".landing-world-image"));
    const markers = scenes.slice(1).map((scene, i) => ({
      index: i + 1,
      node: world.querySelector<HTMLElement>(`[data-world="${scene.key}"]`),
    }));
    const ready = new Set([0, 3]);
    let frame = 0,
      visible = false;
    const draw = () => {
      frame = 0;
      if (!visible || document.hidden) return;
      const blend = worldBlend(
        markers
          .filter((m) => m.node)
          .map((m) => ({
            index: m.index,
            top: m.node!.getBoundingClientRect().top,
            ready: ready.has(m.index),
          })),
        innerHeight,
      );
      layers.forEach((layer, i) => {
        layer.style.opacity = String(
          i === blend.base ? 1 : i === blend.overlay ? blend.progress : 0,
        );
      });
    };
    const request = () => {
      if (visible && !document.hidden && !frame) frame = requestAnimationFrame(draw);
    };
    const listeners: Array<() => void> = [];
    const load = (index: number) => {
      const img = layers[index]?.querySelector("img");
      if (!img) return;
      const done = () => {
        if (img.naturalWidth) {
          ready.add(index);
          request();
        }
      };
      img.addEventListener("load", done);
      listeners.push(() => img.removeEventListener("load", done));
      const scene = scenes[index];
      if (!img.hasAttribute("src"))
        img.src =
          matchMedia("(max-width: 640px)").matches && scene.mobile ? scene.mobile : scene.source!;
      if (img.complete) done();
    };
    const preload = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            const marker = markers.find((m) => m.node === entry.target);
            if (marker) load(marker.index);
            preload.unobserve(entry.target);
          }
      },
      { rootMargin: `${Math.round(innerHeight * 0.85)}px 0px` },
    );
    markers.forEach((m) => {
      if (m.node) preload.observe(m.node);
    });
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      request();
    });
    visibility.observe(world);
    world.classList.add("landing-world--enhanced");
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    document.addEventListener("visibilitychange", request);
    return () => {
      preload.disconnect();
      visibility.disconnect();
      cancelAnimationFrame(frame);
      listeners.forEach((remove) => remove());
      world.classList.remove("landing-world--enhanced");
      layers.forEach((layer, i) => {
        layer.style.opacity = i === 0 ? "1" : "0";
      });
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      document.removeEventListener("visibilitychange", request);
    };
  }, [reduced]);
  return (
    <div className="hero-world-layer" aria-hidden="true" ref={root}>
      <div className="hero-world-sticky">
        {scenes.map((scene, i) => (
          <div
            key={scene.key}
            className={`landing-world-image landing-world-image--${scene.key}`}
            style={{ opacity: i === 0 ? 1 : 0 }}
          >
            {i === 0 ? (
              <picture>
                <source media="(max-width: 640px)" srcSet={scene.mobile} />
                <img
                  src={scene.source}
                  alt=""
                  width={1672}
                  height={941}
                  decoding="async"
                  className="hero-world"
                />
              </picture>
            ) : scene.source ? (
              <img alt="" width={1672} height={941} decoding="async" className="hero-world" />
            ) : (
              <div className="landing-world-stars" />
            )}
          </div>
        ))}
        <div className="hero-world-veil" />
        <div className="hero-world-lantern" />
      </div>
    </div>
  );
}
