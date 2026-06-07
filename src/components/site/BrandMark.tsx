/**
 * Logo particularizat: o cutiuță muzicală din lemn cu capacul ridicat,
 * o cheiță aurie pe lateral și o notă magică ce se înalță cu sclipiri.
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
    >
      <defs>
        <linearGradient id="bm-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.55 0.07 50)" />
          <stop offset="100%" stopColor="oklch(0.32 0.05 40)" />
        </linearGradient>
        <linearGradient id="bm-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.92 0.16 90)" />
          <stop offset="100%" stopColor="oklch(0.7 0.14 70)" />
        </linearGradient>
      </defs>

      {/* capac ridicat */}
      <path
        d="M5 14 L16 9 L27 14 L27 15.5 L16 11 L5 15.5 Z"
        fill="url(#bm-wood)"
        stroke="oklch(0.22 0.04 40)"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
      {/* cutia */}
      <rect
        x="6"
        y="16"
        width="20"
        height="11"
        rx="1.6"
        fill="url(#bm-wood)"
        stroke="oklch(0.22 0.04 40)"
        strokeWidth="0.6"
      />
      {/* dunga aurie */}
      <rect x="6" y="20.5" width="20" height="0.8" fill="url(#bm-gold)" opacity="0.85" />
      {/* cheița */}
      <circle cx="25.5" cy="23.5" r="1.4" fill="url(#bm-gold)" />
      <path d="M25.5 23.5 L27.6 23.5" stroke="url(#bm-gold)" strokeWidth="0.9" strokeLinecap="round" />

      {/* nota magică */}
      <path
        d="M18 5.5 L18 11"
        stroke="url(#bm-gold)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <ellipse cx="17" cy="11" rx="1.6" ry="1.2" fill="url(#bm-gold)" />
      <path
        d="M18 5.5 Q20 6.2 20.2 8"
        stroke="url(#bm-gold)"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
      />

      {/* sclipiri */}
      <path d="M11 6.5 l0.6 0.6 M11.6 6.5 l-0.6 0.6" stroke="url(#bm-gold)" strokeWidth="0.7" strokeLinecap="round" />
      <path d="M23 8 l0.5 0.5 M23.5 8 l-0.5 0.5" stroke="url(#bm-gold)" strokeWidth="0.7" strokeLinecap="round" />
      <circle cx="14" cy="9" r="0.4" fill="url(#bm-gold)" />
    </svg>
  );
}
