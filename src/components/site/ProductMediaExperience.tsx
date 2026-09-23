import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Film, Pause, Play, Rotate3D } from "lucide-react";
import { playTick, setProductAudioPlaying } from "@/lib/sound";
import {
  decayVelocity,
  easeInOutCubic,
  nearestLoaded,
  positionFromDrag,
  wrapFrame,
} from "@/lib/spin";

export type ProductExperience = {
  product: { id: string; slug: string; name: string };
  gallery: Array<{
    id: string;
    media_type: string;
    slot_code: string;
    title: string | null;
    promo_text_ro: string | null;
    alt_text: string | null;
    url: string;
  }>;
  audio: {
    display_name: string | null;
    media_id: string;
    mime_type: string | null;
    duration_seconds: number | null;
    url: string;
  } | null;
  spin360: {
    spin_type: "image_sequence" | "turntable_video" | "glb_model";
    coverUrl: string | null;
    primaryMediaUrl: string | null;
    frames: Array<{
      media_id: string;
      frame_index: number;
      angle_degrees: number | null;
      url: string;
    }>;
  } | null;
  animation: {
    title: string | null;
    duration_seconds: number | null;
    autoplay_muted_preview: number;
    videoUrl: string;
    posterUrl: string | null;
  } | null;
};

async function loadProductExperience(slug: string): Promise<ProductExperience | null> {
  const response = await fetch(`/api/v1/catalog/products/${encodeURIComponent(slug)}/experience`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Experiența media nu este disponibilă.");
  const payload = (await response.json()) as { data: ProductExperience };
  return payload.data;
}

export function useProductExperience(slug: string) {
  return useQuery({
    queryKey: ["product-experience", slug],
    queryFn: () => loadProductExperience(slug),
    staleTime: 0,
    retry: 1,
  });
}

export function ProductAudioOverlay({ audio }: { audio: NonNullable<ProductExperience["audio"]> }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false),
    [time, setTime] = useState(0),
    [error, setError] = useState("");
  const [duration, setDuration] = useState(audio.duration_seconds ?? 0);
  useEffect(() => {
    const element = audioRef.current;
    const pauseOthers = (e: Event) => {
      if ((e as CustomEvent).detail !== element) element?.pause();
    };
    const hide = () => {
      if (document.hidden) element?.pause();
    };
    window.addEventListener("cm:product-audio", pauseOthers);
    document.addEventListener("visibilitychange", hide);
    return () => {
      element?.pause();
      setProductAudioPlaying(false);
      window.removeEventListener("cm:product-audio", pauseOthers);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [audio.url]);
  async function togglePlayback() {
    const element = audioRef.current;
    if (!element) return;
    if (!element.paused) {
      element.pause();
      return;
    }
    setError("");
    window.dispatchEvent(new CustomEvent("cm:product-audio", { detail: element }));
    try {
      await element.play();
    } catch {
      setError("Melodia nu s-a putut reda. Încearcă din nou.");
    }
  }
  const stop = () => {
    setPlaying(false);
    setProductAudioPlaying(false);
  };
  return (
    <div className="product-melody-player">
      <audio
        ref={audioRef}
        src={audio.url}
        preload="none"
        onPlay={() => {
          setPlaying(true);
          setProductAudioPlaying(true);
        }}
        onPause={stop}
        onEnded={stop}
        onError={() => {
          stop();
          setError("Înregistrarea este momentan indisponibilă.");
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          if (Number.isFinite(e.currentTarget.duration)) setDuration(e.currentTarget.duration);
        }}
      />
      <button
        type="button"
        className="melody-play"
        aria-label={playing ? "Pauză melodie" : "Ascultă melodia cutiuței"}
        aria-pressed={playing}
        onClick={() => void togglePlayback()}
      >
        {playing ? <Pause size={22} /> : <Play size={22} />}
      </button>
      <div className="melody-content">
        <p className="scene-eyebrow">Ascultă înainte să alegi</p>
        <strong>{audio.display_name || "Melodia acestei cutiuțe"}</strong>
        <div className="melody-progress">
          <input
            type="range"
            min={0}
            max={duration || 30}
            step={0.1}
            value={Math.min(time, duration || 30)}
            aria-label="Poziția în melodie"
            disabled={!duration}
            onChange={(e) => {
              if (audioRef.current) {
                audioRef.current.currentTime = Number(e.target.value);
                setTime(Number(e.target.value));
              }
            }}
          />
          <span>
            {Math.floor(time)} / {Math.round(duration || 30)} s
          </span>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Vizualizare 360 dintr-o secvență de cadre randate (turnetă).
 *
 * - cadrele se desenează pe canvas, deci schimbarea unui cadru nu re-randează React
 *   și nu produce flash de decodare;
 * - încărcarea e progresivă, din grosier spre fin (pas 8, 4, 2, 1): rotirea devine
 *   utilizabilă după câteva cadre, apoi se rafinează;
 * - o tragere pe toată lățimea = o rotație completă, oricâte cadre are secvența;
 * - inerție la eliberare, o singură rotire de prezentare când intră în ecran;
 * - tastatură (săgeți, Home), clic discret de lamelă dacă sunetele sunt pornite;
 * - sub prefers-reduced-motion: fără rotire automată și fără inerție.
 */
export function ProductSpinViewer({
  spin,
  productName,
}: {
  spin: NonNullable<ProductExperience["spin360"]>;
  productName: string;
}) {
  const frames = useMemo(
    () => [...spin.frames].sort((a, b) => a.frame_index - b.frame_index),
    [spin.frames],
  );
  const count = frames.length;
  const isSequence = spin.spin_type === "image_sequence" && count >= 2;

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const loadedRef = useRef<boolean[]>([]);
  const posRef = useRef(0);
  const velRef = useRef(0);
  const lastDrawnRef = useRef(-1);
  const rafRef = useRef(0);
  const dragRef = useRef<{ startX: number; startPos: number; lastX: number; lastT: number } | null>(
    null,
  );
  const introRef = useRef<{ start: number; from: number } | null>(null);
  const introDoneRef = useRef(false);
  const reducedRef = useRef(false);

  const [loadedCount, setLoadedCount] = useState(0);
  const [interacted, setInteracted] = useState(false);

  const draw = useCallback(
    (position: number, force = false) => {
      const canvas = canvasRef.current;
      if (!canvas || count === 0) return;
      const idx = nearestLoaded(Math.round(position), loadedRef.current);
      if (idx < 0 || (!force && idx === lastDrawnRef.current)) return;
      const img = imagesRef.current[idx];
      const ctx = canvas.getContext("2d");
      if (!img || !ctx) return;
      const cw = canvas.width;
      const ch = canvas.height;
      const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
      if (dragRef.current && lastDrawnRef.current !== -1) playTick();
      lastDrawnRef.current = idx;
    },
    [count],
  );

  const loop = useCallback(
    (now: number, prev: number) => {
      const dt = Math.min((now - prev) / 1000, 0.05);
      let running = false;

      const intro = introRef.current;
      if (intro) {
        const t = (now - intro.start) / 2400;
        posRef.current = wrapFrame(intro.from + easeInOutCubic(t) * count, count);
        if (t >= 1) {
          introRef.current = null;
          introDoneRef.current = true;
        } else {
          running = true;
        }
      } else if (velRef.current !== 0 && !dragRef.current) {
        posRef.current = wrapFrame(posRef.current + velRef.current * dt, count);
        velRef.current = decayVelocity(velRef.current, dt);
        running = velRef.current !== 0;
      }

      draw(posRef.current);
      rafRef.current = running ? requestAnimationFrame((n) => loop(n, now)) : 0;
    },
    [count, draw],
  );

  const kick = useCallback(() => {
    if (rafRef.current) return;
    const start = performance.now();
    rafRef.current = requestAnimationFrame((n) => loop(n, start));
  }, [loop]);

  // Încărcare progresivă a cadrelor, din grosier spre fin.
  useEffect(() => {
    if (!isSequence) return;
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    imagesRef.current = new Array(count);
    loadedRef.current = new Array(count).fill(false);
    lastDrawnRef.current = -1;
    setLoadedCount(0);
    let cancelled = false;

    const order: number[] = [];
    const seen = new Set<number>();
    for (const stride of [8, 4, 2, 1]) {
      for (let i = 0; i < count; i += stride) {
        if (!seen.has(i)) {
          seen.add(i);
          order.push(i);
        }
      }
    }

    let cursor = 0;
    const CONCURRENCY = 4;
    const next = () => {
      if (cancelled || cursor >= order.length) return;
      const index = order[cursor++];
      const img = new Image();
      img.decoding = "async";
      img.src = frames[index].url;
      const done = () => {
        if (cancelled) return;
        imagesRef.current[index] = img;
        loadedRef.current[index] = true;
        setLoadedCount((c) => c + 1);
        if (lastDrawnRef.current === -1) draw(posRef.current, true);
        next();
      };
      img
        .decode()
        .then(done)
        .catch(() => {
          // Un cadru stricat nu blochează restul secvenței.
          if (!cancelled) next();
        });
    };
    for (let k = 0; k < CONCURRENCY; k++) next();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [isSequence, count, frames, draw]);

  // Canvas la rezoluția reală a ecranului.
  useEffect(() => {
    if (!isSequence) return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(wrap.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(wrap.clientHeight * dpr));
      draw(posRef.current, true);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [isSequence, draw]);

  // O singură rotire de prezentare, când secvența e completă și vizibilă.
  const allLoaded = isSequence && loadedCount >= count;
  useEffect(() => {
    if (!allLoaded || introDoneRef.current || reducedRef.current || interacted) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || introDoneRef.current) return;
        introRef.current = { start: performance.now(), from: posRef.current };
        kick();
        io.disconnect();
      },
      { threshold: 0.6 },
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, [allLoaded, interacted, kick]);

  if (spin.spin_type === "turntable_video" && spin.primaryMediaUrl) {
    return (
      <video
        className="aspect-square w-full rounded-xl bg-card object-contain"
        src={spin.primaryMediaUrl}
        poster={spin.coverUrl ?? undefined}
        controls
        muted
        playsInline
        preload="metadata"
      />
    );
  }
  if (!isSequence) return null;

  function stopMotion() {
    introRef.current = null;
    introDoneRef.current = true;
    velRef.current = 0;
  }

  function step(direction: number) {
    stopMotion();
    setInteracted(true);
    posRef.current = wrapFrame(Math.round(posRef.current) + direction, count);
    draw(posRef.current);
  }

  const progress = count > 0 ? loadedCount / count : 0;

  return (
    <div
      ref={wrapRef}
      className="group/spin relative aspect-square cursor-grab select-none overflow-hidden rounded-xl bg-[radial-gradient(70%_60%_at_50%_42%,oklch(0.99_0.02_80),oklch(0.93_0.03_70))] outline-none ring-[color:var(--gold)] focus-visible:ring-2 active:cursor-grabbing"
      role="img"
      tabIndex={0}
      aria-roledescription="vizualizare 360"
      aria-label={`Vedere 360 pentru ${productName}. Glisează sau folosește săgețile pentru a roti.`}
      style={{ touchAction: "pan-y" }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          step(-1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          step(1);
        } else if (event.key === "Home") {
          event.preventDefault();
          step(-Math.round(posRef.current));
        }
      }}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        stopMotion();
        setInteracted(true);
        event.currentTarget.setPointerCapture(event.pointerId);
        const now = performance.now();
        dragRef.current = {
          startX: event.clientX,
          startPos: posRef.current,
          lastX: event.clientX,
          lastT: now,
        };
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        const wrap = wrapRef.current;
        if (!drag || !wrap) return;
        const now = performance.now();
        posRef.current = positionFromDrag(
          drag.startPos,
          event.clientX - drag.startX,
          wrap.clientWidth,
          count,
        );
        const dt = (now - drag.lastT) / 1000;
        if (dt > 0) {
          const framesPerPx = count / wrap.clientWidth;
          // viteză netezită, ca eliberarea să nu depindă de ultimul eveniment izolat
          velRef.current =
            velRef.current * 0.6 + (((event.clientX - drag.lastX) * framesPerPx) / dt) * 0.4;
        }
        drag.lastX = event.clientX;
        drag.lastT = now;
        draw(posRef.current);
      }}
      onPointerUp={() => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (!drag) return;
        // O pauză înainte de eliberare înseamnă că utilizatorul a vrut să oprească.
        if (performance.now() - drag.lastT > 90 || reducedRef.current) velRef.current = 0;
        if (velRef.current !== 0) kick();
      }}
      onPointerCancel={() => {
        dragRef.current = null;
        velRef.current = 0;
      }}
    >
      {/* Coperta stă dedesubt până apare primul cadru — fără spațiu gol la încărcare. */}
      {loadedCount === 0 && (
        <img
          src={spin.coverUrl ?? frames[0].url}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Umbra de contact: cutiuța stă pe ceva, nu plutește. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[18%] bottom-[9%] h-[7%] rounded-[50%] bg-[radial-gradient(closest-side,oklch(0.3_0.05_40/0.28),transparent)]"
      />

      <span
        className={`pointer-events-none absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-[color:var(--gold)]/40 bg-background/90 px-3 py-1.5 text-xs font-medium shadow-soft backdrop-blur transition-opacity duration-700 ${
          interacted ? "opacity-0" : "opacity-100"
        }`}
      >
        <Rotate3D className="h-4 w-4 text-[color:var(--gold)]" /> Trage ca să rotești cutiuța
      </span>

      {progress < 1 && (
        <span
          className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-2 rounded-full bg-background/85 px-2.5 py-1 text-[11px] tabular-nums text-muted-foreground shadow-soft backdrop-blur"
          aria-live="polite"
        >
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 -rotate-90" aria-hidden>
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeWidth="2.5"
            />
            <circle
              cx="10"
              cy="10"
              r="8"
              fill="none"
              stroke="oklch(0.74 0.14 78)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={`${(progress * 50.27).toFixed(2)} 50.27`}
            />
          </svg>
          360° · {loadedCount}/{count}
        </span>
      )}
    </div>
  );
}

export function ProductAnimation({
  animation,
  productName,
}: {
  animation: NonNullable<ProductExperience["animation"]>;
  productName: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12" aria-labelledby="product-animation-title">
      <div className="mb-5 flex items-center justify-center gap-2 text-center">
        <Film className="h-5 w-5 text-primary" />
        <h2 id="product-animation-title" className="font-display text-3xl">
          {animation.title || `${productName} în mișcare`}
        </h2>
      </div>
      <video
        className="mx-auto max-h-[75vh] w-full max-w-5xl rounded-xl bg-black object-contain shadow-warm"
        src={animation.videoUrl}
        poster={animation.posterUrl ?? undefined}
        autoPlay={Boolean(animation.autoplay_muted_preview)}
        muted
        loop={Boolean(animation.autoplay_muted_preview)}
        controls
        playsInline
        preload="metadata"
      />
    </section>
  );
}
