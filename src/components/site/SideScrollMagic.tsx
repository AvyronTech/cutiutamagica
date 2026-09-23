import { useEffect, useState } from "react";
import { useReducedMotion, useScroll, motion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";

const chapters = [
  { id: "inceput", label: "Început" },
  { id: "povesti", label: "Povești" },
  { id: "emotii", label: "Emoții" },
  { id: "dedicate", label: "Cutiuțe dedicate" },
  { id: "in-curand", label: "Magia care urmează" },
  { id: "ajutor", label: "Ajutor" },
];
export function SideScrollMagic() {
  const { scrollYProgress } = useScroll();
  const reduced = useReducedMotion();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [active, setActive] = useState("inceput");
  useEffect(() => {
    if (path !== "/") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-15% 0px -50% 0px" },
    );
    for (const chapter of chapters) {
      const el = document.getElementById(chapter.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [path]);
  function jump(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
  }
  return (
    <nav className="magic-scroll-rail" aria-label="Navigare în pagină">
      <div className="magic-scroll-line" aria-hidden>
        <motion.div style={{ scaleY: scrollYProgress }} />
      </div>
      {path === "/" ? (
        chapters.map((c) => (
          <button
            type="button"
            key={c.id}
            onClick={() => jump(c.id)}
            aria-label={`Mergi la ${c.label}`}
            aria-current={active === c.id ? "location" : undefined}
          >
            <span className="rail-tooltip">{c.label}</span>
            <span className="rail-dot" />
          </button>
        ))
      ) : (
        <button
          type="button"
          aria-label="Înapoi sus"
          onClick={() => window.scrollTo({ top: 0, behavior: reduced ? "instant" : "smooth" })}
        >
          <span className="rail-tooltip">Înapoi sus</span>
          <span className="rail-dot" />
        </button>
      )}
    </nav>
  );
}
