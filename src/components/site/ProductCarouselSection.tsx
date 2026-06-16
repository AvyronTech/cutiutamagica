import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, BookOpen } from "lucide-react";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaTo?: string;
  secondaryCta?: { label: string; to: string };
  bgImage?: string;
  tone?: "warm" | "cream";
  spotlight?: React.ReactNode;
};

export function ProductCarouselSection({
  eyebrow,
  title,
  description,
  ctaLabel = "Descoperă și alte obiecte magice",
  ctaTo = "/produse",
  secondaryCta,
  bgImage,
  tone = "warm",
  spotlight,
}: Props) {
  const isCream = tone === "cream";

  return (
    <section className="relative overflow-hidden">
      {bgImage ? (
        <>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-cover bg-center"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background: isCream
                ? "linear-gradient(180deg, oklch(0.18 0.04 40 / 0.86) 0%, oklch(0.18 0.04 40 / 0.62) 45%, oklch(0.18 0.04 40 / 0.88) 100%)"
                : "linear-gradient(180deg, oklch(0.95 0.03 75 / 0.6) 0%, oklch(0.95 0.03 75 / 0.4) 45%, oklch(0.95 0.03 75 / 0.75) 100%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-40 -z-10"
            style={{ background: "linear-gradient(180deg, oklch(0.15 0.03 40 / 0.55), transparent)" }}
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-[0.07] mix-blend-overlay bg-[repeating-linear-gradient(115deg,transparent_0_22px,oklch(0.3_0.05_40)_22px_23px)]"
          />
        </>
      ) : (
        <>
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(55%_70%_at_50%_10%,oklch(0.82_0.09_65/0.85),transparent_70%),radial-gradient(60%_55%_at_5%_95%,oklch(0.7_0.13_45/0.55),transparent_65%),radial-gradient(60%_55%_at_95%_95%,oklch(0.74_0.11_75/0.55),transparent_65%),linear-gradient(180deg,oklch(0.85_0.07_60),oklch(0.78_0.09_50))]" />
          <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.07] mix-blend-overlay bg-[repeating-linear-gradient(115deg,transparent_0_22px,oklch(0.3_0.05_40)_22px_23px)]" />
        </>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 md:py-9">
        <div className="text-center mb-5 md:mb-7">
          {eyebrow && (
            <div className={`text-xs uppercase tracking-[0.2em] ${isCream ? "text-[color:var(--gold)]" : "text-[color:var(--wood)]"}`}>{eyebrow}</div>
          )}
          <h2 className={`font-display text-3xl md:text-5xl mt-1 ${isCream ? "text-[color:var(--cream)] drop-shadow-[0_2px_18px_rgba(0,0,0,0.65)]" : ""}`}>{title}</h2>
          {description && (
            <p className={`mt-3 text-sm md:text-base max-w-xl mx-auto ${isCream ? "text-[color:var(--cream)]/95 drop-shadow-[0_1px_6px_rgba(0,0,0,0.55)]" : "text-muted-foreground"}`}>{description}</p>
          )}
          {secondaryCta && (
            <div className="mt-6">
              <Link
                to={secondaryCta.to}
                className="group relative inline-flex items-center gap-2.5 rounded-full px-7 py-3 text-sm md:text-base font-medium text-[color:var(--wood-dark)] bg-[linear-gradient(135deg,oklch(0.92_0.09_85)_0%,oklch(0.82_0.13_70)_55%,oklch(0.72_0.15_55)_100%)] shadow-[0_10px_30px_-8px_rgba(120,70,20,0.65),inset_0_1px_0_rgba(255,255,255,0.4)] border border-[color:var(--gold)]/70 hover:scale-[1.03] hover:shadow-[0_14px_36px_-8px_rgba(120,70,20,0.8),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all overflow-hidden"
              >
                <span aria-hidden className="pointer-events-none absolute -inset-x-10 -top-10 h-16 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)] blur-md translate-x-[-120%] group-hover:translate-x-[120%] transition-transform duration-[1100ms]" />
                <BookOpen className="w-4 h-4 relative" />
                <span className="relative font-display tracking-wide">{secondaryCta.label}</span>
                <Sparkles className="w-3.5 h-3.5 relative text-[color:var(--wood-dark)]/70" />
              </Link>
            </div>
          )}
        </div>

        {spotlight && (
          <div className="flex justify-center">
            {spotlight}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Link
            to={ctaTo}
            className={`group inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium border transition-all backdrop-blur-md ${
              isCream
                ? "bg-[color:var(--cream)]/10 border-[color:var(--gold)]/70 text-[color:var(--cream)] hover:bg-[color:var(--cream)]/20 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.6)]"
                : "bg-[color:var(--cream)]/60 border-[color:var(--gold)]/60 text-[color:var(--wood-dark)] hover:bg-[color:var(--cream)]"
            }`}
          >
            <Sparkles className={`w-4 h-4 ${isCream ? "text-[color:var(--gold)]" : "text-[color:var(--gold)]"}`} />
            {ctaLabel}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
