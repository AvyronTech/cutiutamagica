import { Volume2, VolumeX } from "lucide-react";
import { playChime, setSoundEnabled } from "@/lib/sound";
import { useSoundEnabled } from "@/lib/use-sound";

export function SoundToggle({ compact }: { compact: boolean }) {
  const on = useSoundEnabled();

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Oprește sunetele" : "Pornește sunetele"}
      title={on ? "Sunete pornite" : "Sunete oprite"}
      onClick={() => {
        const next = !on;
        setSoundEnabled(next);
        // Clicul e gestul care deblochează audio în browser: confirmăm auditiv.
        if (next) playChime();
      }}
      className={`group relative inline-flex items-center justify-center rounded-full border backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_6px_18px_-8px_rgba(120,80,40,0.35)] hover:border-[color:var(--gold)] hover:bg-[color:var(--cream)]/85 hover:-translate-y-0.5 transition-all duration-500 ${
        on
          ? "border-[color:var(--gold)]/80 bg-[color:var(--gold)]/20"
          : "border-[color:var(--gold)]/40 bg-[color:var(--cream)]/55"
      } ${compact ? "w-9 h-9" : "w-9 h-9 sm:w-11 sm:h-11"}`}
    >
      {on ? (
        <Volume2
          className={`text-[color:var(--wood-dark)] ${compact ? "w-[17px] h-[17px]" : "w-[17px] h-[17px] sm:w-[20px] sm:h-[20px]"}`}
        />
      ) : (
        <VolumeX
          className={`text-[color:var(--wood-dark)]/70 ${compact ? "w-[17px] h-[17px]" : "w-[17px] h-[17px] sm:w-[20px] sm:h-[20px]"}`}
        />
      )}
      {on && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full animate-[sound-ring_2.4s_ease-out_infinite] motion-reduce:animate-none"
          style={{ boxShadow: "0 0 0 0 oklch(0.8 0.15 75 / 0.5)" }}
        />
      )}
    </button>
  );
}
