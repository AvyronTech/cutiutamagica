import { Link, useRouterState } from "@tanstack/react-router";
import { ShoppingBag, UserRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useShop } from "@/store/shop";

import { BrandMark } from "./BrandMark";
import { SoundToggle } from "./SoundToggle";
import { MiniCart } from "./MiniCart";
import { FloatingCartButton } from "./FloatingCartButton";
import type { WidgetSide } from "@/lib/floating-widgets";

export function Header() {
  const { totalQty } = useShop();
  const [cartOpen, setCartOpen] = useState(false);
  const [cartSide, setCartSide] = useState<WidgetSide>("right");
  const cartTrigger = useRef<HTMLButtonElement | null>(null);
  const headerCartTrigger = useRef<HTMLButtonElement | null>(null);
  const closeCart = useCallback(() => setCartOpen(false), []);
  const openCart = (trigger: HTMLButtonElement, side: WidgetSide) => {
    cartTrigger.current = trigger;
    setCartSide(side);
    window.dispatchEvent(new Event("cutiuta:cart-open"));
    setCartOpen(true);
  };
  const restoreCartFocus = () => {
    const trigger = cartTrigger.current?.isConnected
      ? cartTrigger.current
      : headerCartTrigger.current;
    trigger?.focus({ preventScroll: true });
  };
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  // Panoul nu are ce căuta deschis după o navigare.
  useEffect(() => {
    setCartOpen(false);
  }, [pathname]);
  const [compact, setCompact] = useState(false);
  const [hidden, setHidden] = useState(false);
  const compactRef = useRef(false);
  const hiddenRef = useRef(false);

  useEffect(() => {
    let frame = 0;
    let lastY = Math.max(0, window.scrollY);
    let direction: "up" | "down" | null = null;
    let directionalDistance = 0;

    const setHeaderHidden = (next: boolean) => {
      if (next === hiddenRef.current) return;
      hiddenRef.current = next;
      setHidden(next);
    };

    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const next = y > 72;
      if (next !== compactRef.current) {
        compactRef.current = next;
        setCompact(next);
      }

      const delta = y - lastY;
      const nextDirection = delta > 0 ? "down" : delta < 0 ? "up" : direction;
      if (nextDirection !== direction) {
        direction = nextDirection;
        directionalDistance = 0;
      }
      directionalDistance += Math.abs(delta);

      if (y < 104) {
        setHeaderHidden(false);
        directionalDistance = 0;
      } else if (direction === "down" && directionalDistance > 42) {
        setHeaderHidden(true);
        directionalDistance = 0;
      } else if (direction === "up" && directionalDistance > 16) {
        setHeaderHidden(false);
        directionalDistance = 0;
      }

      lastY = y;
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

  useEffect(() => {
    if (!cartOpen || !hiddenRef.current) return;
    hiddenRef.current = false;
    setHidden(false);
  }, [cartOpen]);

  return (
    <header
      className="site-header sticky top-0 z-50 isolate"
      data-compact={compact || undefined}
      data-hidden={hidden || undefined}
    >
      <div className="site-header__glass">
        <div aria-hidden className="site-header__liquid" />
        <div aria-hidden className="site-header__sheen" />
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
            className="site-header__brand group flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
          >
            <span
              className={`site-header__emblem relative flex shrink-0 items-center justify-center transition-[width,height] duration-300 ${
                compact ? "h-10 w-10" : "h-12 w-12 sm:h-14 sm:w-14"
              }`}
            >
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(218,170,91,.52),transparent_68%)] blur-md"
              />
              <BrandMark className="relative h-full w-full drop-shadow-[0_3px_8px_rgba(120,80,40,0.4)]" />
            </span>
            <span className="site-header__wordmark min-w-0 leading-tight">
              <span
                className={`site-header__wordmark-title block truncate font-display tracking-normal text-[color:var(--wood-dark)] transition-[font-size] duration-300 ${
                  compact ? "text-xl" : "text-[1.35rem] sm:text-2xl"
                }`}
              >
                Cutiuța <span className="gold-text italic">Magică</span>
              </span>
              <span className="site-header__spark site-header__spark--one" aria-hidden />
              <span className="site-header__spark site-header__spark--two" aria-hidden />
              <span className="site-header__spark site-header__spark--three" aria-hidden />
              <span
                className={`block whitespace-nowrap uppercase text-[color:var(--wood-dark)]/60 transition-[max-height,opacity] duration-300 ${
                  compact
                    ? "max-h-0 overflow-hidden opacity-0"
                    : "max-h-4 overflow-visible text-[7px] tracking-[0.1em] opacity-100 sm:text-[9px] sm:tracking-[0.18em]"
                }`}
              >
                Lemn · Manivelă · Melodie
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
              Cutiuțe Muzicale
            </Link>
            <Link
              to="/despre-cutiuta"
              className="transition hover:text-[color:var(--wood-dark)] [&.active]:font-semibold"
            >
              Despre Cutiuță
            </Link>
            <Link
              to="/livrare"
              className="transition hover:text-[color:var(--wood-dark)] [&.active]:font-semibold"
            >
              Livrare
            </Link>
          </nav>

          <div className="site-header__actions flex shrink-0 items-center gap-2">
            <SoundToggle compact={compact} />
            <Link
              to="/cont"
              aria-label="Contul meu"
              title="Contul meu"
              className={
                "site-header__account group inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[color:var(--gold)]/45 bg-white/35 font-semibold text-[color:var(--wood-dark)] shadow-[inset_0_1px_0_rgba(255,255,255,.72)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[color:var(--gold)] hover:bg-white/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] " +
                (compact ? "h-10 w-10" : "h-11 w-11 sm:h-12 sm:w-12")
              }
            >
              <UserRound className={compact ? "h-[18px] w-[18px]" : "h-5 w-5"} />
            </Link>

            <button
              type="button"
              aria-label={`Coș de cumpărături, ${totalQty} produse`}
              ref={headerCartTrigger}
              data-cart-target
              aria-expanded={cartOpen}
              aria-haspopup="dialog"
              onClick={(event) => (cartOpen ? closeCart() : openCart(event.currentTarget, "right"))}
              className={`site-header__cart group relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full border bg-white/45 font-semibold text-[color:var(--wood-dark)] shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_8px_22px_-12px_rgba(88,48,20,.75)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-[color:var(--gold)] hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] ${
                cartOpen
                  ? "border-[color:var(--gold)] bg-white/75"
                  : "border-[color:var(--gold)]/55"
              } ${compact ? "h-10 px-3" : "h-11 px-3.5 sm:h-12 sm:px-4"}`}
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
            </button>
          </div>
        </div>
      </div>

      <MiniCart
        open={cartOpen}
        onClose={closeCart}
        side={cartSide}
        onRestoreFocus={restoreCartFocus}
      />
      <FloatingCartButton pathname={pathname} open={cartOpen} onOpen={openCart} />
    </header>
  );
}
