import { useEffect, useState } from "react";

/**
 * O bară subțire deasupra header-ului — un "fitil" magic care arde
 * pe măsură ce se derulează pagina. Capătul aprins are sclipiri și flacără.
 */
export function ScrollFuse() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
      setProgress(Math.min(1, Math.max(0, p)));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const pct = progress * 100;

  return (
    <div className="relative h-[3px] w-full overflow-visible pointer-events-none">
      {/* fitilul nears */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(120,80,40,0.18),transparent)]" />
      {/* partea arsă — auriu incandescent */}
      <div
        className="absolute left-0 top-0 h-full transition-[width] duration-150 ease-out"
        style={{
          width: `${pct}%`,
          background:
            "linear-gradient(90deg, oklch(0.55 0.12 55) 0%, oklch(0.72 0.16 70) 40%, oklch(0.86 0.18 85) 90%, oklch(0.95 0.16 95) 100%)",
          boxShadow:
            "0 0 8px oklch(0.78 0.16 80 / 0.85), 0 0 18px oklch(0.74 0.16 70 / 0.55)",
        }}
      />
      {/* flacără / sclipire la vârf */}
      {pct > 0.5 && pct < 99.5 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `calc(${pct}% - 6px)` }}
        >
          <span className="block w-3 h-3 rounded-full bg-[oklch(0.95_0.18_90)] opacity-90 blur-[1px] animate-pulse" />
          <span className="absolute inset-0 m-auto w-1.5 h-1.5 rounded-full bg-white" />
        </div>
      )}
    </div>
  );
}
