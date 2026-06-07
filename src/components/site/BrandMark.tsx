/**
 * Logo brand: cutiuță muzicală din lemn cu capac deschis,
 * notă magică ce se înalță, sclipiri și un halou auriu cald.
 * Optimizat să arate bine la 48–80px fără fundal.
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <defs>
        <linearGradient id="bm2-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.58 0.08 50)" />
          <stop offset="55%" stopColor="oklch(0.42 0.06 45)" />
          <stop offset="100%" stopColor="oklch(0.28 0.05 40)" />
        </linearGradient>
        <linearGradient id="bm2-wood-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.62 0.09 55)" />
          <stop offset="100%" stopColor="oklch(0.4 0.07 45)" />
        </linearGradient>
        <linearGradient id="bm2-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.96 0.16 92)" />
          <stop offset="50%" stopColor="oklch(0.82 0.16 82)" />
          <stop offset="100%" stopColor="oklch(0.6 0.13 60)" />
        </linearGradient>
        <radialGradient id="bm2-halo" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="oklch(0.92 0.16 85)" stopOpacity="0.55" />
          <stop offset="60%" stopColor="oklch(0.82 0.14 75)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="oklch(0.7 0.12 65)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* halou cald */}
      <circle cx="32" cy="28" r="28" fill="url(#bm2-halo)" />

      {/* capac ridicat */}
      <path
        d="M10 30 L32 20 L54 30 L54 33 L32 23.5 L10 33 Z"
        fill="url(#bm2-wood-lid)"
        stroke="oklch(0.2 0.04 40)"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* corpul cutiei */}
      <rect
        x="12"
        y="34"
        width="40"
        height="20"
        rx="3"
        fill="url(#bm2-wood)"
        stroke="oklch(0.2 0.04 40)"
        strokeWidth="0.9"
      />
      {/* dunga aurie */}
      <rect x="12" y="42" width="40" height="1.4" fill="url(#bm2-gold)" opacity="0.9" />
      {/* miez de lumină pe lemn */}
      <rect x="14" y="35.5" width="36" height="1" rx="0.5" fill="oklch(0.78 0.08 70)" opacity="0.35" />

      {/* cheița */}
      <circle cx="50" cy="48" r="2.6" fill="url(#bm2-gold)" stroke="oklch(0.35 0.06 45)" strokeWidth="0.5" />
      <path d="M50 48 L55 48" stroke="url(#bm2-gold)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="50" cy="48" r="0.8" fill="oklch(0.3 0.05 40)" />

      {/* tija notei + nota magică */}
      <path d="M36 8 L36 22" stroke="url(#bm2-gold)" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="33.5" cy="22" rx="3.2" ry="2.4" fill="url(#bm2-gold)" stroke="oklch(0.35 0.06 45)" strokeWidth="0.4" />
      <path d="M36 8 Q42 10 42.5 15" stroke="url(#bm2-gold)" strokeWidth="1.7" strokeLinecap="round" fill="none" />

      {/* sclipiri magice */}
      <g fill="url(#bm2-gold)">
        <path d="M22 10 l1.4 1.4 M23.4 10 l-1.4 1.4" stroke="url(#bm2-gold)" strokeWidth="1.1" strokeLinecap="round" />
        <path d="M46 6 l1 1 M47 6 l-1 1" stroke="url(#bm2-gold)" strokeWidth="1" strokeLinecap="round" />
        <path d="M50 18 l1.2 1.2 M51.2 18 l-1.2 1.2" stroke="url(#bm2-gold)" strokeWidth="1" strokeLinecap="round" />
        <circle cx="28" cy="16" r="0.9" />
        <circle cx="44" cy="22" r="0.7" />
        <circle cx="18" cy="22" r="0.55" />
      </g>
    </svg>
  );
}
