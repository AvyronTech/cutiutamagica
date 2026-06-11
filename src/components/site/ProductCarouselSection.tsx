import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import AutoScroll from "embla-carousel-auto-scroll";
import useEmblaCarousel from "embla-carousel-react";
import { ProductCard } from "@/components/site/ProductCard";
import type { Product } from "@/data/products";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  products: Product[];
  ctaLabel?: string;
  ctaTo?: string;
  secondaryCta?: { label: string; to: string };
  bgImage?: string;
  tone?: "warm" | "cream";
  /** Disable auto-scroll — user navigates manually. */
  staticMode?: boolean;
  /** Narrow the carousel so the background image is visible around it. */
  framed?: boolean;
  /** Multiplier for overall section/card size (1 = default). */
  scale?: number;
};

const arrowClasses =
  "h-12 w-12 md:h-14 md:w-14 inline-flex items-center justify-center rounded-full bg-[color:var(--cream)]/90 backdrop-blur border-2 border-[color:var(--gold)]/60 text-[color:var(--wood-dark)] shadow-warm hover:bg-[color:var(--gold)] hover:text-[color:var(--wood-dark)] hover:scale-110 active:scale-95 transition-all";

export function ProductCarouselSection({
  eyebrow,
  title,
  description,
  products,
  ctaLabel = "Descoperă și alte obiecte magice",
  ctaTo = "/produse",
  secondaryCta,
  bgImage,
  tone = "warm",
  staticMode = false,
  framed = false,
  scale = 1,
}: Props) {
  const isCream = tone === "cream";

  const autoScroll = useRef(
    AutoScroll({
      speed: 0.55,
      startDelay: 0,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      stopOnFocusIn: true,
      playOnInit: true,
    }),
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { align: "start", loop: true, dragFree: true, containScroll: false, watchDrag: true, duration: 35 },
    staticMode ? [] : [autoScroll.current],
  );

  const nudge = (dir: "prev" | "next") => {
    if (!emblaApi) return;
    const plugin = emblaApi.plugins().autoScroll as ReturnType<typeof AutoScroll> | undefined;
    plugin?.stop();
    if (dir === "prev") emblaApi.scrollPrev();
    else emblaApi.scrollNext();
    if (!staticMode) window.setTimeout(() => plugin?.play(), 1800);
  };

  return (
    <section className="relative overflow-hidden">
      {bgImage ? (
        <>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-cover bg-center"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
          {/* Heavier readable overlay */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10"
            style={{
              background: isCream
                ? "linear-gradient(180deg, oklch(0.18 0.04 40 / 0.86) 0%, oklch(0.18 0.04 40 / 0.62) 45%, oklch(0.18 0.04 40 / 0.88) 100%)"
                : "linear-gradient(180deg, oklch(0.95 0.03 75 / 0.6) 0%, oklch(0.95 0.03 75 / 0.4) 45%, oklch(0.95 0.03 75 / 0.75) 100%)",
            }}
          />
          {/* Top + bottom vignette for crisp text */}
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

        <div className="relative px-2 md:px-16">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex -ml-3 md:-ml-5">
              {products.map((p, i) => (
                <div
                  key={p.id}
                  className="min-w-0 shrink-0 grow-0 pl-3 md:pl-5 basis-[82%] sm:basis-[60%] md:basis-[46%] lg:basis-[32%]"
                >
                  <ProductCard product={p} index={i} />
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            aria-label="Anterior"
            onClick={() => nudge("prev")}
            className={`hidden md:flex absolute top-1/2 -translate-y-1/2 -left-1 z-10 ${arrowClasses}`}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            aria-label="Următor"
            onClick={() => nudge("next")}
            className={`hidden md:flex absolute top-1/2 -translate-y-1/2 -right-1 z-10 ${arrowClasses}`}
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="md:hidden mt-5 flex items-center justify-center gap-8">
            <button type="button" aria-label="Anterior" onClick={() => nudge("prev")} className={arrowClasses}>
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button type="button" aria-label="Următor" onClick={() => nudge("next")} className={arrowClasses}>
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

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
