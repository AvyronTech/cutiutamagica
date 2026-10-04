import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { StoryScenePublic } from "@/lib/story-scene";
import { setProductAudioPlaying } from "@/lib/sound";

export function useStoryPlayback() {
  const audio = useRef<HTMLAudioElement>(null);
  const visibleStage = useRef<HTMLDivElement>(null);
  const moving = useRef(false);
  const wake = useRef<() => void>(() => {});
  const wanted = useRef(false);
  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [phase, setPhase] = useState<"idle" | "loading" | "playing">("idle");
  const [error, setError] = useState("");
  const config = useQuery({
    queryKey: ["story-scene"],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const r = await fetch("/api/v1/story/scene", { signal });
      if (!r.ok) throw new Error("Scenă indisponibilă.");
      return ((await r.json()) as { data: StoryScenePublic }).data;
    },
  });
  const track = config.data?.audio ?? null;
  const stop = useCallback(() => {
    generation.current++;
    wanted.current = false;
    moving.current = false;
    clearTimeout(timer.current);
    audio.current?.pause();
    setProductAudioPlaying(false);
    setPhase("idle");
    wake.current();
  }, []);
  const playing = () => {
    if (!wanted.current) {
      audio.current?.pause();
      return;
    }
    clearTimeout(timer.current);
    moving.current = true;
    setPhase("playing");
    setProductAudioPlaying(true);
    wake.current();
  };
  const failed = () => {
    stop();
    setError("Melodia nu a putut porni. Apasă din nou pentru a reîncerca.");
  };
  const waiting = () => {
    if (!wanted.current) return;
    moving.current = false;
    setPhase("loading");
    clearTimeout(timer.current);
    timer.current = setTimeout(failed, 15_000);
  };
  const toggle = () => {
    if (wanted.current) {
      stop();
      return;
    }
    wanted.current = true;
    const attempt = ++generation.current;
    setError("");
    if (track && audio.current) {
      const player = audio.current;
      if (player.ended) player.currentTime = 0;
      if (player.error) player.load();
      waiting();
      // Invoked in the click handler so browsers retain the visitor's audio gesture.
      void player.play().catch(() => {
        if (wanted.current && generation.current === attempt) failed();
      });
    } else {
      moving.current = true;
      setPhase("playing");
      wake.current();
      timer.current = setTimeout(stop, 8_000);
    }
  };
  useEffect(() => {
    const player = audio.current;
    const stage = visibleStage.current;
    const hide = () => {
      if (document.hidden) stop();
    };
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) stop();
    });
    if (stage) observer.observe(stage);
    document.addEventListener("visibilitychange", hide);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", hide);
      wanted.current = false;
      moving.current = false;
      clearTimeout(timer.current);
      player?.pause();
      setProductAudioPlaying(false);
    };
  }, [stop]);
  useEffect(() => {
    stop();
    setError("");
  }, [track?.url, stop]);
  return {
    audio,
    visibleStage,
    moving,
    wake,
    track,
    phase,
    error,
    toggle,
    stop,
    playing,
    waiting,
    failed,
  };
}
