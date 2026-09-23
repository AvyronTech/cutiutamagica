import { useEffect, useRef, useState } from "react";
import { SceneAtmosphere } from "./SceneAtmosphere";
import type { FooterDepthScene } from "./footer-depth-scene";

/** Decorative layers load near the footer; links and copy never move with the scene. */
export function FooterScene() {
  const host = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const node = host.current;
    const footer = node?.closest("footer");
    if (!node || !footer) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    let disposed = false,
      visible = false,
      loading = false;
    let scene: FooterDepthScene | undefined;
    const sync = () => {
      const animate = visible && !document.hidden && !reduced.matches && !connection?.saveData;
      setActive(animate);
      if (scene) scene.setActive(animate);
      if (!animate || scene || loading) return;
      loading = true;
      void import("./footer-depth-scene")
        .then(({ mountFooterDepthScene }) => {
          if (disposed || reduced.matches || document.hidden || !visible) {
            loading = false;
            return;
          }
          try {
            scene = mountFooterDepthScene(node, footer);
            scene.setActive(true);
          } catch {
            /* The composed artwork and CSS atmosphere remain available without WebGL. */
          }
        })
        .catch(() => {
          /* Keep the static artwork. */
        });
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(footer);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      scene?.dispose();
    };
  }, []);
  return (
    <div className={`footer-scene ${active ? "footer-scene--active" : ""}`} aria-hidden>
      <div className="footer-scene__art">
        <img
          src="/scenes/footer-atelier.webp"
          srcSet="/scenes/footer-atelier-960.webp 960w, /scenes/footer-atelier.webp 1672w"
          sizes="100vw"
          width={1672}
          height={941}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          alt=""
        />
      </div>
      <div className="footer-scene__mist footer-scene__mist--amber" />
      <div className="footer-scene__mist footer-scene__mist--teal" />
      <div className="footer-scene__shade" />
      <div ref={host} className="footer-scene__depth" />
      <SceneAtmosphere />
      <div className="footer-scene__edge" />
    </div>
  );
}
