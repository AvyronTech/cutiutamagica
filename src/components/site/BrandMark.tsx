import { memo, useEffect, useId, useRef } from "react";

/**
 * Logo brand: cutiuță muzicală din lemn cu capac deschis, notă magică,
 * sclipiri și halou auriu — construit în adâncime reală.
 *
 * Desenul e împărțit în cinci straturi SVG suprapuse exact (același viewBox),
 * fiecare împins pe axa Z. Rigul care le ține se înclină după cursor, deci
 * straturile se deplasează diferit unele față de altele: parallax adevărat,
 * nu o umbră falsă. Totul e transform CSS pe compozitor — fără WebGL în header,
 * fără re-randare React pe cadru. La hover capacul se ridică și nota urcă.
 *
 * Aceeași semnătură ca înainte: <BrandMark className="..." />.
 */
function BrandMarkImpl({ className = "" }: { className?: string }) {
  const uid = useId().replace(/[:]/g, "");
  const id = (name: string) => `bm-${uid}-${name}`;
  const rigRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;

    // Logo-ul „privește" spre cursor oriunde în pagină, damped, cu înclinare maximă mică.
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let raf = 0;

    const tick = () => {
      current.x += (target.x - current.x) * 0.09;
      current.y += (target.y - current.y) * 0.09;
      rig.style.setProperty("--bm-ry", `${(current.x * 16).toFixed(2)}deg`);
      rig.style.setProperty("--bm-rx", `${(current.y * -12).toFixed(2)}deg`);
      if (Math.abs(target.x - current.x) + Math.abs(target.y - current.y) > 0.001) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    };

    const onMove = (e: PointerEvent) => {
      const r = rig.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      // Normalizat la ~jumătate de viewport, apoi limitat — nu se răsucește niciodată brusc.
      target.x = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth * 0.5)));
      target.y = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight * 0.5)));
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const layer = "absolute inset-0 h-full w-full overflow-visible";

  return (
    <span className={`bm3d ${className}`} aria-hidden="true">
      <span ref={rigRef} className="bm3d-rig">
        {/* ── strat 0: halou + definițiile comune ── */}
        <svg viewBox="0 0 64 64" className={`${layer} bm3d-halo`} fill="none">
          <defs>
            <linearGradient id={id("wood")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.58 0.08 50)" />
              <stop offset="55%" stopColor="oklch(0.42 0.06 45)" />
              <stop offset="100%" stopColor="oklch(0.28 0.05 40)" />
            </linearGradient>
            <linearGradient id={id("lid")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.64 0.09 55)" />
              <stop offset="100%" stopColor="oklch(0.4 0.07 45)" />
            </linearGradient>
            {/* userSpaceOnUse, nu objectBoundingBox: o linie perfect verticală sau orizontală
                are cutia de încadrare de lățime zero, iar gradientul relativ nu se mai
                aplică — tija notei și brațul manivelei dispăreau cu totul. */}
            <linearGradient
              id={id("gold")}
              x1="10"
              y1="6"
              x2="54"
              y2="58"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="oklch(0.96 0.15 92)" />
              <stop offset="38%" stopColor="oklch(0.84 0.16 82)" />
              <stop offset="47%" stopColor="oklch(0.97 0.08 92)" />
              <stop offset="58%" stopColor="oklch(0.8 0.15 78)" />
              <stop offset="100%" stopColor="oklch(0.58 0.13 58)" />
            </linearGradient>
            <radialGradient id={id("halo")} cx="50%" cy="42%" r="50%">
              <stop offset="0%" stopColor="oklch(0.92 0.16 85)" stopOpacity="0.6" />
              <stop offset="60%" stopColor="oklch(0.82 0.14 75)" stopOpacity="0.18" />
              <stop offset="100%" stopColor="oklch(0.7 0.12 65)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="32" cy="30" r="30" fill={`url(#${id("halo")})`} />
        </svg>

        {/* ── strat 1: corpul cutiei ── */}
        <svg viewBox="0 0 64 64" className={`${layer} bm3d-body`} fill="none">
          <rect
            x="12"
            y="34"
            width="40"
            height="20"
            rx="3"
            fill={`url(#${id("wood")})`}
            stroke="oklch(0.2 0.04 40)"
            strokeWidth="0.9"
          />
          <rect x="12" y="42" width="40" height="1.4" fill={`url(#${id("gold")})`} opacity="0.95" />
          <rect
            x="14"
            y="35.5"
            width="36"
            height="1"
            rx="0.5"
            fill="oklch(0.8 0.08 70)"
            opacity="0.38"
          />
          {/* manivela */}
          <circle
            cx="50"
            cy="48"
            r="2.6"
            fill={`url(#${id("gold")})`}
            stroke="oklch(0.35 0.06 45)"
            strokeWidth="0.5"
          />
          <path
            d="M50 48 L55 48"
            stroke={`url(#${id("gold")})`}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="50" cy="48" r="0.8" fill="oklch(0.3 0.05 40)" />
        </svg>

        {/* ── strat 2: capacul, se ridică pe balama ── */}
        <svg viewBox="0 0 64 64" className={`${layer} bm3d-lid`} fill="none">
          <path
            d="M10 30 L32 20 L54 30 L54 33 L32 23.5 L10 33 Z"
            fill={`url(#${id("lid")})`}
            stroke="oklch(0.2 0.04 40)"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <path
            d="M12 31.2 L32 22 L52 31.2"
            stroke={`url(#${id("gold")})`}
            strokeWidth="0.7"
            opacity="0.8"
          />
        </svg>

        {/* ── strat 3: nota magică ── */}
        <svg viewBox="0 0 64 64" className={`${layer} bm3d-note`} fill="none">
          <path
            d="M36 8 L36 22"
            stroke={`url(#${id("gold")})`}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <ellipse
            cx="33.5"
            cy="22"
            rx="3.2"
            ry="2.4"
            fill={`url(#${id("gold")})`}
            stroke="oklch(0.35 0.06 45)"
            strokeWidth="0.4"
          />
          <path
            d="M36 8 Q42 10 42.5 15"
            stroke={`url(#${id("gold")})`}
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>

        {/* ── strat 4: sclipiri, cel mai aproape de privitor ── */}
        <svg viewBox="0 0 64 64" className={`${layer} bm3d-sparks`} fill="none">
          <g stroke={`url(#${id("gold")})`} strokeLinecap="round">
            <path className="bm3d-spark" d="M22 10 l1.4 1.4 M23.4 10 l-1.4 1.4" strokeWidth="1.1" />
            <path className="bm3d-spark" d="M46 6 l1 1 M47 6 l-1 1" strokeWidth="1" />
            <path className="bm3d-spark" d="M50 18 l1.2 1.2 M51.2 18 l-1.2 1.2" strokeWidth="1" />
          </g>
          <g fill={`url(#${id("gold")})`}>
            <circle className="bm3d-spark" cx="28" cy="16" r="0.9" />
            <circle className="bm3d-spark" cx="44" cy="22" r="0.7" />
            <circle className="bm3d-spark" cx="18" cy="22" r="0.55" />
          </g>
        </svg>
      </span>
    </span>
  );
}

/** Memoizat: header-ul se re-randează la scroll, logo-ul nu are de ce. */
export const BrandMark = memo(BrandMarkImpl);
