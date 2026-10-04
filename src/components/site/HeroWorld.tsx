import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { LandingBackdrop } from "./LandingBackdrop";
import { HeroFeatures } from "./HeroFeatures";
import { useLandingInteractions } from "./useLandingInteractions";

/** A continuous world spans the landing page, without a permanent WebGL render loop. */
export function HeroWorld({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useLandingInteractions(root);
  useEffect(() => {
    const about = root.current?.querySelector<HTMLElement>(".hero-about");
    if (!about || reduced) return;
    const started = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    about.classList.add("hero-about--waiting");
    const observer = new IntersectionObserver(
      ([entry]) => {
        clearTimeout(timer);
        if (entry.isIntersecting)
          timer = setTimeout(
            () => {
              about.classList.remove("hero-about--waiting");
              about.classList.add("hero-about--revealed");
              observer.disconnect();
            },
            Math.max(0, 2000 - (performance.now() - started)),
          );
      },
      { threshold: 0.3 },
    );
    observer.observe(about);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      about.classList.remove("hero-about--waiting", "hero-about--revealed");
    };
  }, [reduced]);
  useEffect(() => {
    const node = root.current;
    if (!node || reduced) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (connection?.saveData) return;
    const bridge = node.querySelector<HTMLElement>(".hero-story-bridge");
    let frame = 0,
      visible = false;
    const draw = () => {
      frame = 0;
      if (!visible || document.hidden) return;
      const y = Math.max(0, Math.min(1, -node.getBoundingClientRect().top / innerHeight));
      node.style.setProperty("--hero-depth", `${(y * 18).toFixed(2)}px`);
      if (bridge) {
        const p = Math.max(
          0,
          Math.min(1, (innerHeight * 0.8 - bridge.getBoundingClientRect().top) / 280),
        );
        node.style.setProperty("--thread-offset", String(1 - p));
      }
    };
    const request = () => {
      if (visible && !document.hidden && !frame) frame = requestAnimationFrame(draw);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      request();
    });
    observer.observe(node);
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    document.addEventListener("visibilitychange", request);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
      document.removeEventListener("visibilitychange", request);
      node.style.removeProperty("--hero-depth");
      node.style.removeProperty("--thread-offset");
    };
  }, [reduced]);
  return (
    <div className="hero-world-stage" ref={root}>
      <LandingBackdrop />
      {children}
    </div>
  );
}

export function HeroStoryBridge() {
  return (
    <div className="hero-story-bridge">
      <svg
        className="hero-story-thread"
        viewBox="0 0 1000 100"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <path className="hero-thread-guide" d="M0 50 C200 50 280 5 410 38 S700 92 1000 48" />
        <path
          className="hero-thread-light"
          pathLength="1"
          d="M0 50 C200 50 280 5 410 38 S700 92 1000 48"
        />
      </svg>
      <HeroFeatures />
      <span className="hero-bridge-star" aria-hidden="true">
        ✧
      </span>
    </div>
  );
}

export function HeroMechanismHalo() {
  return (
    <svg className="hero-mechanism-halo" viewBox="0 0 600 600" fill="none" aria-hidden="true">
      <circle cx="300" cy="300" r="280" stroke="currentColor" strokeOpacity=".24" />
      <circle
        cx="300"
        cy="300"
        r="268"
        stroke="currentColor"
        strokeOpacity=".28"
        strokeDasharray="1 13"
      />
      <path
        d="M45 280A255 255 0 0 1 420 74 M555 320A255 255 0 0 1 180 526"
        stroke="currentColor"
        strokeOpacity=".65"
      />
      <path
        d="M300 9v22M289 20h22M569 300h22M580 289v22M300 569v22M289 580h22M9 300h22M20 289v22"
        stroke="currentColor"
      />
      <circle cx="495" cy="98" r="4" fill="currentColor" />
      <circle cx="102" cy="493" r="3" fill="currentColor" />
    </svg>
  );
}
