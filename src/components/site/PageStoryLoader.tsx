import { useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { isPublicStoryPath, pageStoryProfile } from "@/lib/page-loading";
import { BrandMark } from "./BrandMark";
import { currentVisualEffectsTier } from "@/lib/visual-performance";

const INITIAL_FULL_MS = 1550;
const INITIAL_BALANCED_MS = 1250;
const MIN_ROUTE_VISIBLE_MS = 480;
const MAX_INITIAL_ACTIVE_MS = 1850;
const MAX_ROUTE_ACTIVE_MS = 1050;
const EXIT_MS = 220;
const INTRO_SESSION_KEY = "cutiuta:cinematic-intro:v3";

type ActiveStory = {
  id: number;
  path: string;
  phase: "enter" | "visible" | "exit";
  initial: boolean;
};

export function PageStoryLoader({ initialPath }: { initialPath: string }) {
  const routeState = useRouterState({
    select: (state) => ({ status: state.status, path: state.location.pathname }),
  });
  // Render the first cinematic frame with the document, so it can never flash in late.
  // A tiny head script hides this SSR shell before paint when the session already saw it.
  const [active, setActive] = useState<ActiveStory | null>(() =>
    initialPath === "/" ? { id: 1, path: initialPath, phase: "enter", initial: true } : null,
  );
  const [preview, setPreview] = useState(false);
  const activeRef = useRef(active);
  const startedAt = useRef(Date.now());
  const counter = useRef(1);
  const minimumTimer = useRef<number | undefined>(undefined);
  const maximumTimer = useRef<number | undefined>(undefined);
  const removalTimer = useRef<number | undefined>(undefined);
  const introTimer = useRef<number | undefined>(undefined);

  const clearTimers = useCallback(() => {
    window.clearTimeout(minimumTimer.current);
    window.clearTimeout(maximumTimer.current);
    window.clearTimeout(removalTimer.current);
    window.clearTimeout(introTimer.current);
  }, []);

  const finish = useCallback(() => {
    const current = activeRef.current;
    if (!current || current.phase === "exit") return;
    const exiting = { ...current, phase: "exit" as const };
    activeRef.current = exiting;
    setActive(exiting);
    window.clearTimeout(maximumTimer.current);
    removalTimer.current = window.setTimeout(() => {
      activeRef.current = null;
      setActive(null);
    }, EXIT_MS);
  }, []);

  const start = useCallback(
    (path: string, initial = false) => {
      if (!isPublicStoryPath(path) || activeRef.current?.path === path) return;
      clearTimers();
      const next = { id: ++counter.current, path, phase: "enter" as const, initial };
      startedAt.current = Date.now();
      activeRef.current = next;
      setActive(next);
      requestAnimationFrame(() => {
        setActive((current) => {
          if (!current || current.id !== next.id) return current;
          const visible = { ...current, phase: "visible" as const };
          activeRef.current = visible;
          return visible;
        });
      });
      maximumTimer.current = window.setTimeout(finish, MAX_ROUTE_ACTIVE_MS);
    },
    [clearTimers, finish],
  );

  const resolve = useCallback(() => {
    const current = activeRef.current;
    if (!current || current.initial || current.phase === "exit") return;
    const elapsed = Date.now() - startedAt.current;
    window.clearTimeout(minimumTimer.current);
    minimumTimer.current = window.setTimeout(finish, Math.max(0, MIN_ROUTE_VISIBLE_MS - elapsed));
  }, [finish]);

  useEffect(() => {
    if (!isPublicStoryPath(routeState.path)) {
      clearTimers();
      activeRef.current = null;
      setActive(null);
      return;
    }
    if (routeState.status === "pending") start(routeState.path);
    else resolve();
  }, [clearTimers, resolve, routeState.path, routeState.status, start]);

  useEffect(() => {
    const current = activeRef.current;
    if (!current?.initial) return;
    const isPreview =
      import.meta.env.DEV && new URLSearchParams(window.location.search).has("story-preview");
    setPreview(isPreview);
    let seen = false;
    try {
      seen = sessionStorage.getItem(INTRO_SESSION_KEY) === "1";
    } catch {
      /* A private browsing policy must not block the storefront. */
    }
    if (seen && !isPreview) {
      activeRef.current = null;
      setActive(null);
      return;
    }
    if (!isPreview)
      try {
        sessionStorage.setItem(INTRO_SESSION_KEY, "1");
      } catch {
        /* The animation remains safe when storage is unavailable. */
      }

    const tier = currentVisualEffectsTier();
    introTimer.current = window.setTimeout(
      finish,
      isPreview
        ? 120_000
        : tier === "minimal"
          ? 160
          : tier === "balanced"
            ? INITIAL_BALANCED_MS
            : INITIAL_FULL_MS,
    );
    if (!isPreview) maximumTimer.current = window.setTimeout(finish, MAX_INITIAL_ACTIVE_MS);
    requestAnimationFrame(() => {
      setActive((story) => {
        if (!story?.initial) return story;
        const visible = { ...story, phase: "visible" as const };
        activeRef.current = visible;
        return visible;
      });
    });
    return clearTimers;
  }, [clearTimers, finish]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.pathname === window.location.pathname ||
        !isPublicStoryPath(destination.pathname)
      )
        return;
      start(destination.pathname);
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [start]);

  if (!active) return null;
  const profile = pageStoryProfile(active.path);
  const style = {
    "--page-loader-accent": profile.accent,
    "--page-loader-glow": profile.glow,
  } as CSSProperties;

  return (
    <div
      className={`page-story-loader page-story-loader--${active.phase}`}
      data-scene={profile.scene}
      data-initial={active.initial ? "true" : undefined}
      data-preview={preview ? "true" : undefined}
      style={style}
      role="status"
      aria-live="polite"
      aria-label={`${profile.eyebrow}. ${profile.title}`}
    >
      <div className="page-story-loader__backdrop" aria-hidden>
        <span className="page-story-loader__light" />
      </div>
      <div className="page-story-loader__stage" aria-hidden>
        <div className="page-story-loader__artifact">
          <BrandMark
            className="page-story-loader__box-body"
            sizes="(max-width: 640px) 280px, 390px"
            priority={active.initial}
          />
          <BrandMark
            className="page-story-loader__box-lid"
            sizes="(max-width: 640px) 280px, 390px"
          />
          <svg
            className="page-story-loader__crank"
            viewBox="0 0 120 94"
            fill="none"
            focusable="false"
          >
            <path
              d="M2 12h22c7 0 9 5 9 11v22l43 21"
              stroke="#d6c7ad"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M71 64l35 16" stroke="#9b8770" strokeWidth="10" strokeLinecap="round" />
            <path d="M88 70l25 11" stroke="#38281f" strokeWidth="15" strokeLinecap="round" />
            <path d="M88 67l25 11" stroke="#765944" strokeWidth="8" strokeLinecap="round" />
          </svg>
          <span className="page-story-loader__lid-glint" />
          <span className="page-story-loader__note page-story-loader__note--one">♪</span>
          <span className="page-story-loader__note page-story-loader__note--two">♫</span>
          <span className="page-story-loader__note page-story-loader__note--three">♪</span>
        </div>
        <span className="page-story-loader__shadow" />
      </div>
      <div className="page-story-loader__copy">
        <span>{profile.eyebrow}</span>
        <h2>{profile.title}</h2>
        <p>{profile.detail}</p>
      </div>
      <div className="page-story-loader__progress" aria-hidden>
        <i />
      </div>
      <button type="button" onClick={finish} aria-label="Continuă — închide animația">
        Continuă <span aria-hidden>↗</span>
      </button>
    </div>
  );
}
