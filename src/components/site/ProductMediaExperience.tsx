import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Film, Pause, Play, Rotate3D } from "lucide-react";

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
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

export function ProductAudioOverlay({ audio }: { audio: NonNullable<ProductExperience["audio"]> }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  async function togglePlayback() {
    const element = audioRef.current;
    if (!element) return;
    if (element.paused) {
      await element.play();
    } else {
      element.pause();
    }
  }

  return (
    <div className="absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-white/40 bg-background/90 px-2 py-1.5 shadow-soft backdrop-blur">
      <audio
        ref={audioRef}
        src={audio.url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={togglePlayback}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90"
        aria-label={playing ? "Pauză melodie" : "Redă melodia"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>
      <span className="truncate pr-2 text-xs font-medium">
        {audio.display_name || "Ascultă melodia"}
      </span>
    </div>
  );
}

export function ProductSpinViewer({
  spin,
  productName,
}: {
  spin: NonNullable<ProductExperience["spin360"]>;
  productName: string;
}) {
  const [frameIndex, setFrameIndex] = useState(0);
  const dragStart = useRef<{ x: number; frame: number } | null>(null);
  const frames = spin.frames;

  useEffect(() => {
    if (spin.spin_type !== "image_sequence") return;
    const eager = frames.slice(0, Math.min(6, frames.length));
    eager.forEach((frame) => {
      const image = new Image();
      image.src = frame.url;
    });
    const timer = window.setTimeout(() => {
      frames.slice(eager.length).forEach((frame) => {
        const image = new Image();
        image.src = frame.url;
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [frames, spin.spin_type]);

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
  if (spin.spin_type !== "image_sequence" || frames.length < 2) return null;

  function move(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const delta = event.clientX - dragStart.current.x;
    const step = Math.round(delta / 12);
    const next =
      (((dragStart.current.frame + step) % frames.length) + frames.length) % frames.length;
    setFrameIndex(next);
  }

  function shift(direction: number) {
    setFrameIndex(
      (current) => (((current + direction) % frames.length) + frames.length) % frames.length,
    );
  }

  return (
    <div
      className="relative aspect-square select-none overflow-hidden rounded-xl bg-card outline-none ring-primary focus-visible:ring-2"
      role="img"
      tabIndex={0}
      aria-label={`Vedere 360 pentru ${productName}. Folosește săgețile sau glisează.`}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") shift(-1);
        if (event.key === "ArrowRight") shift(1);
      }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        dragStart.current = { x: event.clientX, frame: frameIndex };
      }}
      onPointerMove={move}
      onPointerUp={() => {
        dragStart.current = null;
      }}
      onPointerCancel={() => {
        dragStart.current = null;
      }}
      style={{ touchAction: "none" }}
    >
      <img
        src={frames[frameIndex].url}
        alt=""
        draggable={false}
        className="h-full w-full object-contain"
      />
      <span className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border bg-background/90 px-3 py-1.5 text-xs font-medium shadow-soft backdrop-blur">
        <Rotate3D className="h-4 w-4" /> Rotește cutiuța
      </span>
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
