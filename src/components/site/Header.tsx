import { Link } from "@tanstack/react-router";
import { Heart, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { useShop } from "@/store/shop";
import { ScrollFuse } from "./ScrollFuse";
import { BrandMark } from "./BrandMark";

export function Header() {
  const { totalQty, favorites } = useShop();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40">
      {/* Fitilul magic deasupra */}
      <ScrollFuse />

      {/* Fundal liquid glass cald, condensare la scroll */}
      <div
        className={`relative transition-[backdrop-filter,background,box-shadow,border-color] duration-500 ease-out border-b ${
          scrolled
            ? "border-[color:var(--gold)]/35 shadow-[0_18px_40px_-28px_oklch(0.45_0.1_45/0.55)]"
            : "border-[color:var(--gold)]/15"
        }`}
        style={{
          backdropFilter: scrolled ? "blur(22px) saturate(170%)" : "blur(10px) saturate(130%)",
        }}
      >
        <div
          aria-hidden
          className={`absolute inset-0 -z-10 transition-opacity duration-500 ${scrolled ? "opacity-100" : "opacity-80"}`}
          style={{
            background:
              "linear-gradient(180deg, oklch(0.96 0.03 75 / 0.55), oklch(0.9 0.045 65 / 0.45))",
          }}
        />
        <div
          aria-hidden
          className={`absolute inset-0 -z-10 pointer-events-none transition-opacity duration-500 ${scrolled ? "opacity-90" : "opacity-60"}`}
          style={{
            background:
              "radial-gradient(60% 120% at 15% -10%, oklch(0.92 0.09 80 / 0.5), transparent 60%), radial-gradient(50% 120% at 85% 110%, oklch(0.78 0.1 50 / 0.32), transparent 60%)",
          }}
        />
        {/* Specular sheen — liquid glass highlight */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px -z-10"
          style={{ background: "linear-gradient(90deg, transparent, oklch(0.99 0.04 95 / 0.85), transparent)" }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px -z-10"
          style={{ background: "linear-gradient(90deg, transparent, oklch(0.6 0.08 50 / 0.4), transparent)" }}
        />

        <div
          className={`max-w-7xl mx-auto flex items-center justify-between px-4 transition-[padding] duration-500 ease-out ${
            scrolled ? "py-1.5 md:py-2" : "py-3"
          }`}
        >
          <Link to="/" className="flex items-center gap-3 group">
            <span
              className={`relative flex items-center justify-center transition-all duration-500 ease-out group-hover:-rotate-3 group-hover:scale-105 ${
                scrolled ? "w-10 h-10 md:w-12 md:h-12" : "w-14 h-14 md:w-16 md:h-16"
              }`}
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
                className={`font-display tracking-tight text-[color:var(--wood-dark)] transition-[font-size] duration-500 ${
                  scrolled ? "text-lg md:text-xl" : "text-xl md:text-2xl"
                }`}
              >
                Cutiuța <span className="gold-text italic">Magică</span>
              </div>
              <div
                className={`uppercase tracking-[0.2em] text-[color:var(--wood-dark)]/65 transition-all duration-500 overflow-hidden ${
                  scrolled ? "max-h-0 opacity-0" : "max-h-4 opacity-100 text-[10px]"
                }`}
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
