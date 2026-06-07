import { useEffect, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

/**
 * Vertical magic-rail on the right edge that fills with a glowing,
 * ember-like gradient as the page scrolls. Floating sparkles drift
 * along the active section for a fluid, mysterious feel.
 */
export function SideScrollMagic() {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.4 });
  const fillY = useTransform(progress, (v) => `${v * 100}%`);
  const headTop = useTransform(progress, (v) => `calc(${v * 100}% - 6px)`);

  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed right-1.5 md:right-2 top-[64px] bottom-3 z-[60] w-[3px] md:w-[4px]"
    >
      {/* Rail (faint wood-gold thread) */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.74 0.14 78 / 0.10), oklch(0.74 0.14 78 / 0.22) 50%, oklch(0.74 0.14 78 / 0.10))",
          boxShadow: "inset 0 0 0 1px oklch(0.74 0.14 78 / 0.15)",
        }}
      />

      {/* Burning fill */}
      <motion.div
        className="absolute left-0 right-0 top-0 rounded-full origin-top"
        style={{
          height: fillY,
          background:
            "linear-gradient(180deg, oklch(0.96 0.05 90) 0%, oklch(0.85 0.16 75) 35%, oklch(0.72 0.18 55) 70%, oklch(0.55 0.18 35) 100%)",
          boxShadow:
            "0 0 8px oklch(0.85 0.18 70 / 0.85), 0 0 18px oklch(0.78 0.2 55 / 0.55), 0 0 36px oklch(0.7 0.2 45 / 0.35)",
        }}
      />

      {/* Glowing ember head */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 w-3 h-3 md:w-3.5 md:h-3.5 rounded-full"
        style={{
          top: headTop,
          background:
            "radial-gradient(circle at 50% 40%, oklch(0.99 0.05 95) 0%, oklch(0.9 0.18 80) 35%, oklch(0.7 0.2 50) 70%, transparent 80%)",
          boxShadow:
            "0 0 10px oklch(0.92 0.18 75 / 0.95), 0 0 22px oklch(0.82 0.2 60 / 0.75), 0 0 44px oklch(0.7 0.2 45 / 0.45)",
        }}
        animate={reduced ? undefined : { scale: [1, 1.25, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Drifting sparkles tethered to the ember */}
      {!reduced && (
        <motion.div
          className="absolute left-1/2 -translate-x-1/2"
          style={{ top: headTop }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute block w-1 h-1 rounded-full bg-[oklch(0.95_0.1_90)]"
              style={{
                left: i % 2 === 0 ? -6 : 6,
                boxShadow: "0 0 8px oklch(0.9 0.18 75 / 0.9)",
              }}
              animate={{
                y: [0, -18 - i * 6, -32 - i * 4],
                x: [0, i % 2 === 0 ? -4 : 4, 0],
                opacity: [0, 1, 0],
                scale: [0.6, 1, 0.4],
              }}
              transition={{
                duration: 2 + i * 0.4,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "easeOut",
              }}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
