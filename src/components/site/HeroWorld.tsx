import { useEffect, useRef, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { LandingBackdrop } from "./LandingBackdrop";
import { HeroFeatures } from "./HeroFeatures";
import { useLandingInteractions } from "./useLandingInteractions";
import { currentVisualEffectsTier } from "@/lib/visual-performance";

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
    if (!node || reduced || currentVisualEffectsTier() !== "full") return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (connection?.saveData) return;
    // Keep the continuous scene on small touch screens, without tying a parallax write to every frame.
    if (matchMedia("(max-width: 767px) and (pointer: coarse)").matches) return;
    let frame = 0,
      visible = false;
    let lastDepth = "";
    const draw = () => {
      frame = 0;
      if (!visible || document.hidden) return;
      const y = Math.max(0, Math.min(1, -node.getBoundingClientRect().top / innerHeight));
      const depth = `${(y * 18).toFixed(1)}px`;
      if (depth !== lastDepth) {
        lastDepth = depth;
        node.style.setProperty("--hero-depth", depth);
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
  const bridge = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const node = bridge.current;
    if (!node || reduced) return;
    let frame = 0;
    const draw = () => {
      frame = 0;
      const bounds = node.getBoundingClientRect();
      const start = innerHeight * 0.86;
      const end = innerHeight * 0.28;
      const progress = Math.max(
        0,
        Math.min(1, (start - bounds.top) / (bounds.height + start - end)),
      );
      node.style.setProperty("--thread-offset", (1 - progress).toFixed(3));
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    request();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", request);
    };
  }, [reduced]);
  return (
    <div className="hero-story-bridge" ref={bridge}>
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
