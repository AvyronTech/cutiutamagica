import { Link } from "@tanstack/react-router";
import { Heart, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useShop } from "@/store/shop";
import { ScrollFuse } from "./ScrollFuse";
import { BrandMark } from "./BrandMark";

export function Header() {
  const { totalQty, favorites } = useShop();
  // 0 → 1 progres condensare, smoothed cu rAF pentru fluiditate maximă
  const [p, setP] = useState(0);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef(0);
  const currentRef = useRef(0);

  useEffect(() => {
    const MAX = 160; // px de scroll până la condensare completă
    const tick = () => {
      const diff = targetRef.current - currentRef.current;
      // easing exponențial — animație fluidă, fără jank
      currentRef.current += diff * 0.18;
      if (Math.abs(diff) < 0.001) {
        currentRef.current = targetRef.current;
        setP(currentRef.current);
        rafRef.current = null;
        return;
      }
      setP(currentRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      targetRef.current = Math.min(1, Math.max(0, window.scrollY / MAX));
      if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const scrolled = p > 0.35;
  // valori interpolate fluid
  const blur = 10 + p * 16; // 10 → 26
  const sat = 130 + p * 50; // 130 → 180
  const bgA = 0.45 + p * 0.3; // opacitate fundal cald
  const bgB = 0.32 + p * 0.28;
  const shadow = 0.12 + p * 0.45;
  const borderA = 0.15 + p * 0.35;
  const padY = 12 - p * 6; // 12 → 6 px
  const logoSize = 56 - p * 16; // 56 → 40 px (mobile baseline)
  const titleSize = 20 + (1 - p) * 4; // 20 → 24 (md va prelua)

  return (
    <header className="sticky top-0 z-40 will-change-transform">
      {/* Fitilul magic deasupra */}
      <ScrollFuse />

      {/* Fundal liquid glass cald — interpolare fluidă pe scroll */}
      <div
        className="relative border-b"
        style={{
          backdropFilter: `blur(${blur}px) saturate(${sat}%)`,
          borderColor: `oklch(0.78 0.13 70 / ${borderA})`,
          boxShadow: `0 ${10 + p * 18}px ${24 + p * 24}px -${22 - p * 4}px oklch(0.45 0.1 45 / ${shadow})`,
          transition: "border-color 200ms ease-out",
        }}
      >
        {/* Strat 1 — cremă caldă, opacitate care creste cu scrollul */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background: `linear-gradient(180deg, oklch(0.96 0.03 75 / ${bgA}), oklch(0.9 0.045 65 / ${bgB}))`,
          }}
        />
        {/* Strat 2 — aurore aurii laterale */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            opacity: 0.55 + p * 0.4,
            background:
              "radial-gradient(60% 120% at 15% -10%, oklch(0.92 0.09 80 / 0.5), transparent 60%), radial-gradient(50% 120% at 85% 110%, oklch(0.78 0.1 50 / 0.32), transparent 60%)",
          }}
        />
        {/* Strat 3 — specular sheen animat, liquid glass premium */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none overflow-hidden"
          style={{ opacity: 0.35 + p * 0.5 }}
        >
          <div
            className="absolute -inset-y-4 -left-1/3 w-2/3 animate-header-sheen"
            style={{
              background:
                "linear-gradient(110deg, transparent 30%, oklch(0.99 0.04 95 / 0.55) 50%, transparent 70%)",
              filter: "blur(8px)",
            }}
          />
        </div>
        {/* Highlight + lowlight 1px — buza de cristal */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px -z-10"
          style={{ background: "linear-gradient(90deg, transparent, oklch(0.99 0.04 95 / 0.85), transparent)" }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px -z-10"
          style={{ background: `linear-gradient(90deg, transparent, oklch(0.6 0.08 50 / ${0.3 + p * 0.4}), transparent)` }}
        />

        <div
          className="max-w-7xl mx-auto flex items-center justify-between px-4"
          style={{ paddingTop: `${padY}px`, paddingBottom: `${padY}px` }}
        >
          <Link to="/" className="flex items-center gap-3 group">
            <span
              className="relative flex items-center justify-center transition-transform duration-500 ease-out group-hover:-rotate-3 group-hover:scale-105"
              style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
            >
              <span
                aria-hidden
                className="absolute inset-0 rounded-full blur-md opacity-70 group-hover:opacity-100 transition-opacity"
                style={{ background: "radial-gradient(circle, oklch(0.86 0.16 85 / 0.55), transparent 65%)" }}
              />
              <BrandMark className="relative w-full h-full drop-shadow-[0_3px_8px_rgba(120,80,40,0.45)]" />
            </span>
            <div className="leading-tight">
              <div
                className="font-display tracking-tight text-[color:var(--wood-dark)]"
                style={{ fontSize: `${titleSize}px` }}
              >
                Cutiuța <span className="gold-text italic">Magică</span>
              </div>
              <div
                className="uppercase tracking-[0.2em] text-[color:var(--wood-dark)]/65 overflow-hidden transition-all duration-500"
                style={{
                  maxHeight: scrolled ? 0 : 16,
                  opacity: scrolled ? 0 : 1,
                  fontSize: 10,
                }}
              >
                piesă originală · mecanism durabil
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm text-[color:var(--wood-dark)]/90">
            <Link to="/" className="hover:text-[color:var(--wood-dark)] [&.active]:font-medium" activeOptions={{ exact: true }}>Acasă</Link>
            <Link to="/produse" className="hover:text-[color:var(--wood-dark)] [&.active]:font-medium">Produse</Link>
            <Link to="/poveste" className="hover:text-[color:var(--wood-dark)] [&.active]:font-medium">Poveste</Link>
            <Link to="/comanda" className="hover:text-[color:var(--wood-dark)] [&.active]:font-medium">Comandă</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/favorite"
              aria-label="Favorite"
              className={`group relative inline-flex items-center justify-center rounded-full border border-[color:var(--gold)]/40 bg-[color:var(--cream)]/55 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_6px_18px_-8px_rgba(120,80,40,0.35)] hover:border-[color:var(--gold)] hover:bg-[color:var(--cream)]/85 hover:-translate-y-0.5 transition-all duration-500 ${
                scrolled ? "w-9 h-9" : "w-11 h-11"
              }`}
            >
              <Heart className={`text-[color:var(--wood-dark)] group-hover:text-[oklch(0.55_0.18_25)] group-hover:fill-[oklch(0.7_0.2_25)]/30 transition-colors ${scrolled ? "w-[18px] h-[18px]" : "w-[22px] h-[22px]"}`} />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-br from-[color:var(--gold)] to-[oklch(0.62_0.13_55)] text-[color:var(--wood-dark)] text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow-[0_2px_6px_-1px_rgba(120,80,40,0.5)] ring-2 ring-[color:var(--cream)]">
                  {favorites.length}
                </span>
              )}
            </Link>
            <Link
              to="/comanda"
              aria-label="Coș de cumpărături"
              className={`group relative inline-flex items-center justify-center rounded-full border border-[color:var(--gold)]/40 bg-[color:var(--cream)]/55 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_6px_18px_-8px_rgba(120,80,40,0.35)] hover:border-[color:var(--gold)] hover:bg-[color:var(--cream)]/85 hover:-translate-y-0.5 transition-all duration-500 ${
                scrolled ? "w-9 h-9" : "w-11 h-11"
              }`}
            >
              <ShoppingBag className={`text-[color:var(--wood-dark)] transition-colors ${scrolled ? "w-[18px] h-[18px]" : "w-[22px] h-[22px]"}`} />
              {totalQty > 0 && (
                <span className="absolute -top-1 -right-1 bg-[color:var(--wood-dark)] text-[color:var(--cream)] text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow-[0_2px_6px_-1px_rgba(120,80,40,0.5)] ring-2 ring-[color:var(--cream)]">
                  {totalQty}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
