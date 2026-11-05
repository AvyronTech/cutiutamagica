import { setSoundEnabled, playChime } from "@/lib/sound";
import { useEffect, useRef, useState } from "react";
import { BrandMark } from "./BrandMark";

export function StoryLoadingScreen() {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("cutiuta:story-intro") === "1";
      sessionStorage.setItem("cutiuta:story-intro", "1");
    } catch {
      /* Intro still closes when storage is unavailable. */
    }
    if (seen) {
      setVisible(false);
      return;
    }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    const started = performance.now();
    const timer = window.setTimeout(
      () => {
        cancelled = true;
        cleanup?.();
        setVisible(false);
      },
      reduced ? 180 : 1750,
    );
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (!reduced && !connection?.saveData)
      void import("./IntroMusicBox")
        .then(({ mountIntroMusicBox }) => {
          if (cancelled || !host.current || performance.now() - started > 1100) return;
          try {
            cleanup = mountIntroMusicBox(host.current);
            setReady(true);
          } catch {
            /* SVG stays visible if WebGL is unavailable. */
          }
        })
        .catch(() => {});
    const dismiss = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Tab") {
        cancelled = true;
        cleanup?.();
        setVisible(false);
      }
    };
    window.addEventListener("keydown", dismiss);
    return () => {
      cancelled = true;
      cleanup?.();
      clearTimeout(timer);
      window.removeEventListener("keydown", dismiss);
    };
  }, []);
  if (!visible) return null;
  return (
    <div
      className="story-loader story-loader--crafted"
      role="status"
      aria-label="Se deschide Cutiuța Magică"
    >
      <div className="story-loader__glow" aria-hidden />
      <div className="story-loader-object">
        <div ref={host} className={`story-loader-canvas ${ready ? "is-ready" : ""}`} aria-hidden />
        {!ready && <BrandMark className="story-loader-mark" />}
      </div>
      <div className="story-loader-progress" aria-hidden>
        <i />
      </div>
      <p>O rotire. O melodie. O amintire.</p>
      <span className="story-loader-signature">Cutiuța Magică</span>
      <button
        type="button"
        className="story-loader-sound"
        onClick={() => {
          setSoundEnabled(true);
          playChime();
        }}
      >
        ♪ Pornește sunetul introductiv
      </button>
    </div>
  );
}
