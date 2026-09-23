import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
/** CSS-only depth; animations run only while this scene is visible. */
export function SceneAtmosphere() {
  const root = useRef<HTMLDivElement>(null),
    [active, setActive] = useState(false),
    reduced = useReducedMotion();
  useEffect(() => {
    const node = root.current;
    if (!node || reduced) return;
    let visible = false;
    const sync = () => setActive(visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(node);
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [reduced]);
  return (
    <div
      ref={root}
      className={`scene-atmosphere ${active && !reduced ? "scene-atmosphere--active" : ""}`}
      aria-hidden
    >
      {Array.from({ length: 12 }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37 + 11) % 100}%`,
            top: `${(i * 29 + 7) % 100}%`,
            animationDelay: `-${i * 2.7}s`,
            animationDuration: `${18 + (i % 5) * 3}s`,
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
          }}
        />
      ))}
    </div>
  );
}
