import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useShop } from "@/store/shop";
import { ScrollFuse } from "./ScrollFuse";
import { BrandMark } from "./BrandMark";

export function Header() {
  const { totalQty } = useShop();
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const next = window.scrollY > 72;
      if (next !== compactRef.current) {
        compactRef.current = next;
        setCompact(next);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 isolate" data-compact={compact || undefined}>
      <ScrollFuse />
      <div
        className={`relative overflow-hidden border-b border-[color:var(--gold)]/35 bg-[color:var(--cream)]/72 shadow-[0_12px_34px_-24px_rgba(72,38,16,0.72)] backdrop-blur-xl backdrop-saturate-150 transition-[background-color,box-shadow] duration-300 supports-[backdrop-filter]:bg-[color:var(--cream)]/55 ${
          compact
            ? "shadow-[0_18px_38px_-22px_rgba(72,38,16,0.78)] supports-[backdrop-filter]:bg-[color:var(--cream)]/76"
            : ""
        }`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_140%_at_8%_-25%,rgba(255,248,213,.9),transparent_64%),radial-gradient(52%_120%_at_92%_120%,rgba(206,150,76,.28),transparent_68%)]"
        />
        <div
          aria-hidden
          className="animate-header-sheen pointer-events-none absolute -inset-y-8 -left-1/3 w-2/3 bg-[linear-gradient(110deg,transparent_28%,rgba(255,255,255,.48)_50%,transparent_72%)] blur-lg motion-reduce:hidden"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/80"
        />

        <div
          className={`relative mx-auto flex max-w-7xl items-center justify-between px-4 transition-[padding] duration-300 ${
            compact ? "py-1.5" : "py-3"
          }`}
        >
          <Link
            to="/"
            className="group flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          >
            <span
              className={`relative flex shrink-0 items-center justify-center transition-[width,height,transform] duration-300 group-hover:-rotate-3 ${
                compact ? "h-10 w-10" : "h-12 w-12 sm:h-14 sm:w-14"
              }`}
            >
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(218,170,91,.52),transparent_68%)] blur-md"
              />
              <BrandMark className="relative h-full w-full drop-shadow-[0_3px_8px_rgba(120,80,40,0.4)]" />
            </span>
            <span className="min-w-0 leading-tight">
              <span
                className={`block truncate font-display tracking-normal text-[color:var(--wood-dark)] transition-[font-size] duration-300 ${
                  compact ? "text-xl" : "text-[1.35rem] sm:text-2xl"
                }`}
              >
                Cutiuța <span className="gold-text italic">Magică</span>
              </span>
              <span
                className={`block overflow-hidden uppercase tracking-[0.18em] text-[color:var(--wood-dark)]/60 transition-[max-height,opacity] duration-300 ${
                  compact ? "max-h-0 opacity-0" : "max-h-4 text-[9px] opacity-100"
                }`}
              >
                lemn · manivelă · melodie
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-[color:var(--wood-dark)]/85 md:flex">
            <Link
              to="/"
              className="transition hover:text-[color:var(--wood-dark)] [&.active]:font-semibold"
              activeOptions={{ exact: true }}
            >
              Acasă
            </Link>
            <Link
              to="/produse"
              className="transition hover:text-[color:var(--wood-dark)] [&.active]:font-semibold"
            >
              Produse
            </Link>
            <Link
              to="/poveste"
              className="transition hover:text-[color:var(--wood-dark)] [&.active]:font-semibold"
            >
              Poveste
            </Link>
          </nav>

          <Link
            to="/comanda"
            aria-label={`Coș de cumpărături, ${totalQty} produse`}
            className={`group relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[color:var(--gold)]/55 bg-white/45 font-semibold text-[color:var(--wood-dark)] shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_8px_22px_-12px_rgba(88,48,20,.75)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[color:var(--gold)] hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] ${
              compact ? "h-10 px-3" : "h-11 px-3.5 sm:h-12 sm:px-4"
            }`}
          >
            <ShoppingBag
              className={`transition-transform group-hover:scale-105 ${compact ? "h-[18px] w-[18px]" : "h-5 w-5"}`}
            />
            <span className="hidden text-sm sm:inline">Coș</span>
            {totalQty > 0 ? (
              <span
                aria-live="polite"
                className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--wood-dark)] px-1.5 text-[10px] font-bold text-[color:var(--cream)] shadow-sm"
              >
                {totalQty}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
