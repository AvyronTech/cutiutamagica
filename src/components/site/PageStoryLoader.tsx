import { useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { isPublicStoryPath, pageStoryProfile } from "@/lib/page-loading";
import { BrandMark } from "./BrandMark";

const MIN_ROUTE_VISIBLE_MS = 520;
const INITIAL_VISIBLE_MS = 1100;
const MAX_ACTIVE_MS = 1900;
const EXIT_MS = 280;

type ActiveStory = {
  id: number;
  path: string;
  phase: "enter" | "visible" | "exit";
  initial: boolean;
};

type NavigatorConnection = { saveData?: boolean; effectiveType?: string };

export function PageStoryLoader({ initialPath }: { initialPath: string }) {
  const routeState = useRouterState({
    select: (state) => ({ status: state.status, path: state.location.pathname }),
  });
  const [active, setActive] = useState<ActiveStory | null>(() =>
    isPublicStoryPath(initialPath)
      ? { id: 1, path: initialPath, phase: "enter", initial: true }
      : null,
  );
  const [sceneReady, setSceneReady] = useState(false);
  const activeId = active?.id;
  const activeRef = useRef(active);
  const startedAt = useRef(Date.now());
  const counter = useRef(1);
  const host = useRef<HTMLDivElement>(null);
  const minimumTimer = useRef<number | undefined>(undefined);
  const maximumTimer = useRef<number | undefined>(undefined);
  const removalTimer = useRef<number | undefined>(undefined);

  const clearTimers = useCallback(() => {
    window.clearTimeout(minimumTimer.current);
    window.clearTimeout(maximumTimer.current);
    window.clearTimeout(removalTimer.current);
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
      setSceneReady(false);
    }, EXIT_MS);
  }, []);

  const start = useCallback(
    (path: string, initial = false) => {
      if (!isPublicStoryPath(path) || activeRef.current?.path === path) return;
      clearTimers();
      const next = { id: ++counter.current, path, phase: "enter" as const, initial };
      startedAt.current = Date.now();
      activeRef.current = next;
      setSceneReady(false);
      setActive(next);
      requestAnimationFrame(() => {
        setActive((current) => {
          if (!current || current.id !== next.id) return current;
          const visible = { ...current, phase: "visible" as const };
          activeRef.current = visible;
          return visible;
        });
      });
      maximumTimer.current = window.setTimeout(finish, MAX_ACTIVE_MS);
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
    const current = activeRef.current;
    if (!current?.initial) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    minimumTimer.current = window.setTimeout(finish, reduced ? 120 : INITIAL_VISIBLE_MS);
    maximumTimer.current = window.setTimeout(finish, MAX_ACTIVE_MS);
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
    if (routeState.status === "pending") start(routeState.path);
    else resolve();
  }, [resolve, routeState.path, routeState.status, start]);

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

  useEffect(() => {
    const current = activeRef.current;
    if (!current || current.id !== activeId || current.phase === "exit" || !host.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const compact = window.matchMedia("(max-width: 720px)").matches;
    const connection = (navigator as Navigator & { connection?: NavigatorConnection }).connection;
    const constrained = connection?.saveData || connection?.effectiveType?.includes("2g");
    if (reduced || compact || constrained || document.hidden) return;
    let disposed = false;
    let scene: { dispose(): void } | undefined;
    void import("./PageStoryScene")
      .then(({ mountPageStoryScene }) => {
        if (disposed || !host.current) return;
        const profile = pageStoryProfile(current.path);
        try {
          scene = mountPageStoryScene(host.current, profile.scene, profile.accent);
          setSceneReady(true);
        } catch {
          /* The lightweight CSS/SVG scene remains complete without WebGL. */
        }
      })
      .catch(() => {
        /* A route transition never depends on its decorative 3D layer. */
      });
    return () => {
      disposed = true;
      scene?.dispose();
    };
  }, [activeId]);

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
      style={style}
      role="status"
      aria-live="polite"
      aria-label={`${profile.eyebrow}. ${profile.title}`}
    >
      <div className="page-story-loader__backdrop" aria-hidden>
        <span className="page-story-loader__horizon" />
        <span className="page-story-loader__arch" />
        <span className="page-story-loader__dust page-story-loader__dust--one" />
        <span className="page-story-loader__dust page-story-loader__dust--two" />
      </div>
      <div className="page-story-loader__stage" aria-hidden>
        <div ref={host} className={`page-story-loader__canvas ${sceneReady ? "is-ready" : ""}`} />
        <BrandMark className={`page-story-loader__mark ${sceneReady ? "is-hidden" : ""}`} />
        <span className="page-story-loader__symbol">{profile.symbol}</span>
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
      <button type="button" onClick={finish} aria-label="Închide animația și continuă">
        Continuă <span aria-hidden>↗</span>
      </button>
    </div>
  );
}
