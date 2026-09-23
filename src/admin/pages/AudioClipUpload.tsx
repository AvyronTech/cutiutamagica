import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Music2, Upload } from "lucide-react";
import { encodeAudioClip } from "@/lib/audio-clip";

export function AudioClipUpload({
  busy,
  onUpload,
  title = "Melodia acestei cutiuțe",
}: {
  busy: boolean;
  onUpload: (file: File) => void;
  title?: string;
}) {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null),
    [start, setStart] = useState(0),
    [duration, setDuration] = useState(20),
    [decoding, setDecoding] = useState(false),
    [error, setError] = useState("");
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const clip = useMemo(
    () =>
      buffer ? encodeAudioClip(buffer, start, Math.min(duration, buffer.duration - start)) : null,
    [buffer, start, duration],
  );
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!clip) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(clip);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [clip]);
  async function select(file: File) {
    const id = ++request.current;
    setError("");
    setBuffer(null);
    if (file.size > 30_000_000) {
      setError("Alege un fișier de cel mult 30 MB.");
      return;
    }
    setDecoding(true);
    let context: AudioContext | undefined;
    try {
      context = new AudioContext({ sampleRate: 44100 });
      const decoded = await context.decodeAudioData(await file.arrayBuffer());
      if (decoded.duration < 15 || decoded.duration > 600)
        throw new Error("Înregistrarea trebuie să aibă între 15 secunde și 10 minute.");
      if (id !== request.current) return;
      setStart(0);
      setDuration(Math.min(20, Math.floor(decoded.duration)));
      setBuffer(decoded);
    } catch (e) {
      if (id === request.current)
        setError(
          e instanceof Error
            ? e.message
            : "Înregistrarea nu poate fi citită. Încearcă MP3, WAV sau M4A.",
        );
    } finally {
      await context?.close();
      if (id === request.current) setDecoding(false);
    }
  }
  return (
    <div className="rounded-2xl border bg-card p-4 space-y-4">
      <div>
        <h3 className="flex items-center gap-2 font-semibold">
          <Music2 size={18} />
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Încarcă înregistrarea reală. Alege un fragment de 15–30 secunde, apoi ascultă-l înainte de
          salvare.
        </p>
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm">
        <Upload size={16} />
        Alege înregistrarea
        <input
          className="sr-only"
          type="file"
          accept="audio/*,.m4a"
          disabled={busy || decoding}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void select(f);
            e.target.value = "";
          }}
        />
      </label>
      {decoding && (
        <p role="status" className="flex gap-2 text-sm">
          <Loader2 className="animate-spin" size={16} />
          Pregătim înregistrarea…
        </p>
      )}
      {buffer && (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-sm">
              Început: {start}s
              <input
                aria-label="Început fragment"
                className="w-full"
                type="range"
                min={0}
                max={Math.max(0, Math.floor(buffer.duration - duration))}
                step={1}
                value={start}
                disabled={busy}
                onChange={(e) => setStart(Number(e.target.value))}
              />
            </label>
            <label className="text-sm">
              Durată: {duration}s
              <input
                aria-label="Durată fragment"
                className="w-full"
                type="range"
                min={15}
                max={Math.min(30, Math.floor(buffer.duration))}
                step={1}
                value={duration}
                disabled={busy}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setDuration(n);
                  setStart((v) => Math.min(v, Math.max(0, Math.floor(buffer.duration - n))));
                }}
              />
            </label>
          </div>
          {preview && (
            <audio key={preview} src={preview} controls preload="metadata" className="w-full" />
          )}
          <button
            type="button"
            disabled={busy || !clip}
            className="rounded-lg bg-primary px-4 py-3 text-primary-foreground disabled:opacity-50"
            onClick={() => {
              if (clip) onUpload(new File([clip], "melodie-cutiuta.wav", { type: "audio/wav" }));
            }}
          >
            {busy ? "Se încarcă…" : "Salvează fragmentul"}
          </button>
          <p className="text-xs text-muted-foreground">
            După încărcare, selectează fragmentul din listă și activează afișarea publică.
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
