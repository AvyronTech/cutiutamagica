import { Link } from "@tanstack/react-router";
import { Heart, ShoppingBag } from "lucide-react";
import { useShop } from "@/store/shop";
import { ScrollFuse } from "./ScrollFuse";
import { BrandMark } from "./BrandMark";

export function Header() {
  const { totalQty, favorites } = useShop();
  return (
    <header className="sticky top-0 z-40 border-b border-[color:var(--gold)]/20">
      {/* Fitilul magic deasupra */}
      <ScrollFuse />

      {/* Fundal liquid glass cald, de poveste */}
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 backdrop-blur-xl"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.94 0.035 75 / 0.78), oklch(0.9 0.045 65 / 0.72))",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 pointer-events-none opacity-80"
          style={{
            background:
              "radial-gradient(60% 120% at 15% -10%, oklch(0.92 0.09 80 / 0.55), transparent 60%), radial-gradient(50% 120% at 85% 110%, oklch(0.78 0.1 50 / 0.35), transparent 60%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px -z-10"
          style={{ background: "linear-gradient(90deg, transparent, oklch(0.85 0.1 80 / 0.6), transparent)" }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px -z-10"
          style={{ background: "linear-gradient(90deg, transparent, oklch(0.6 0.08 50 / 0.35), transparent)" }}
        />

        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3 group">
            <span className="relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 transition-transform group-hover:-rotate-3 group-hover:scale-105 duration-300">
              <span
                aria-hidden
                className="absolute inset-0 rounded-full blur-md opacity-70 group-hover:opacity-100 transition-opacity"
                style={{ background: "radial-gradient(circle, oklch(0.86 0.16 85 / 0.55), transparent 65%)" }}
              />
              <BrandMark className="relative w-full h-full drop-shadow-[0_3px_8px_rgba(120,80,40,0.45)]" />
            </span>
            <div className="leading-tight">
              <div className="font-display text-xl md:text-2xl tracking-tight text-[color:var(--wood-dark)]">
                Cutiuța <span className="gold-text italic">Magică</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--wood-dark)]/65">
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
              className="group relative inline-flex items-center justify-center w-11 h-11 rounded-full border border-[color:var(--gold)]/40 bg-[color:var(--cream)]/60 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_6px_18px_-8px_rgba(120,80,40,0.35)] hover:border-[color:var(--gold)] hover:bg-[color:var(--cream)]/85 hover:-translate-y-0.5 transition-all"
            >
              <Heart className="w-[22px] h-[22px] text-[color:var(--wood-dark)] group-hover:text-[oklch(0.55_0.18_25)] group-hover:fill-[oklch(0.7_0.2_25)]/30 transition-colors" />
              {favorites.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-br from-[color:var(--gold)] to-[oklch(0.62_0.13_55)] text-[color:var(--wood-dark)] text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center shadow-[0_2px_6px_-1px_rgba(120,80,40,0.5)] ring-2 ring-[color:var(--cream)]">
                  {favorites.length}
                </span>
              )}
            </Link>
            <Link
              to="/comanda"
              aria-label="Coș de cumpărături"
              className="group relative inline-flex items-center justify-center w-11 h-11 rounded-full border border-[color:var(--gold)]/40 bg-[color:var(--cream)]/60 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_6px_18px_-8px_rgba(120,80,40,0.35)] hover:border-[color:var(--gold)] hover:bg-[color:var(--cream)]/85 hover:-translate-y-0.5 transition-all"
            >
              <ShoppingBag className="w-[22px] h-[22px] text-[color:var(--wood-dark)] transition-colors" />
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
