import { memo, useId } from "react";

function BrandMarkImpl({ className = "" }: { className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const wood = `${uid}-wood`,
    metal = `${uid}-metal`,
    glow = `${uid}-glow`;
  return (
    <span className={`music-box-mark ${className}`} aria-hidden="true">
      <svg viewBox="0 0 100 100" fill="none" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id={wood} x1="10" y1="25" x2="80" y2="85" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a27747" />
            <stop offset=".45" stopColor="#553722" />
            <stop offset="1" stopColor="#241b15" />
          </linearGradient>
          <linearGradient id={metal} x1="25" y1="45" x2="70" y2="66" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ebebd6" />
            <stop offset=".45" stopColor="#838981" />
            <stop offset=".65" stopColor="#e1ce98" />
            <stop offset="1" stopColor="#666e6b" />
          </linearGradient>
          <radialGradient id={glow}>
            <stop stopColor="#e5b460" stopOpacity=".2" />
            <stop offset="1" stopColor="#e5b460" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="49" cy="57" rx="49" ry="41" fill={`url(#${glow})`} />
        <ellipse cx="49" cy="87" rx="33" ry="5" fill="#160e09" opacity=".22" />
        <g className="music-box-lid">
          <path
            d="M20 43 20 12 67 8 79 18 79 46 67 54Z"
            fill={`url(#${wood})`}
            stroke="#c89e62"
            strokeWidth="1.2"
          />
          <path d="m24 40 0-23 40-4 0 27z" fill="#35291e" stroke="#b08b55" strokeWidth=".8" />
          <path
            d="m29 34 13-12 7 5 10-9M28 20l31-3M28 36l31-3"
            stroke="#d0ad72"
            strokeWidth=".8"
            opacity=".8"
          />
          <path d="m69 13 6 6v23l-6-4z" fill="#271b13" />
          <path
            d="M42 19v12m-4 0c-3 2-1 5 2 3s2-5-2-3m4-12 7 3"
            stroke="#e2c386"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>
        <path d="m17 49 49-8 16 12-49 11z" fill="#30221b" stroke="#ab824e" />
        <path d="m17 49 16 15v22L17 71z" fill="#493020" stroke="#c1995b" strokeWidth=".9" />
        <path
          d="m33 64 49-11v23L33 87z"
          fill={`url(#${wood})`}
          stroke="#c1995b"
          strokeWidth="1.1"
        />
        <g className="music-box-mechanism">
          <path d="m26 50 25-4 10 7-25 5z" fill={`url(#${metal})`} />
          {Array.from({ length: 10 }, (_, i) => (
            <path
              key={i}
              d={`m${28 + i * 2.1} ${50 - i * 0.34} 8 6`}
              stroke="#3f4540"
              strokeWidth=".6"
            />
          ))}
          <path
            d="m55 45 8-1 10 9-8 2z"
            fill={`url(#${metal})`}
            stroke="#dfdab5"
            strokeWidth=".7"
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx={60 + i * 1.6} cy={47 + i * 1.4} r=".65" fill="#f8e2a8" />
          ))}
          <circle cx="29" cy="51" r="1.3" fill="#e1dbba" />
          <circle cx="58" cy="56" r="1" fill="#e1dbba" />
        </g>
        <path
          d="m39 71 18-4 18-4M39 81l35-8M39 75l5 2 6-5 6 3 6-5 6 2"
          stroke="#d2ac6f"
          strokeWidth=".7"
          opacity=".85"
        />
        <path
          d="m35 67 3-.6v4l-3 .6m0 5 3-.6v4l-3 .6m40-20 3-.6v4l-3 .6m0 5 3-.6v4l-3 .6"
          stroke="#d0a66b"
          strokeWidth="1"
        />
        <g className="music-box-crank">
          <circle cx="80" cy="65" r="2" fill={`url(#${metal})`} />
          <path d="M80 65h8v-9h6" stroke="#d9d9bd" strokeWidth="1.9" strokeLinejoin="round" />
          <rect x="92" y="53" width="5" height="6" rx="1.5" fill={`url(#${metal})`} />
        </g>
        <g className="music-box-notes" stroke="#dfbc7d" strokeLinecap="round">
          <path d="M83 20v9m-3 0c-3 2-1 4 1 3s2-4-1-3m3-9 5 2" strokeWidth="1.3" />
          <path d="M13 23v5m-2.5-2.5h5M89 40v4m-2-2h4" strokeWidth="1" />
        </g>
      </svg>
    </span>
  );
}
export const BrandMark = memo(BrandMarkImpl);
