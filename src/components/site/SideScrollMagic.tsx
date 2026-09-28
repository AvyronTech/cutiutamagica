import { useEffect, useState } from "react";
import { useReducedMotion, useScroll, motion } from "framer-motion";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Info, Music2, PackageOpen, Truck } from "lucide-react";
import { BrandMark } from "./BrandMark";

const chapters = [
  { id: "inceput", label: "Început" },
  { id: "povesti", label: "Povești", number: "01" },
  { id: "emotii", label: "Emoții", number: "02" },
  { id: "dedicate", label: "Cutiuțe dedicate", number: "03" },
  { id: "personalizeaza", label: "Personalizează", number: "04" },
  { id: "in-curand", label: "În curând", number: "05" },
  { id: "ajutor", label: "Ajutor" },
];

const primaryLinks = [
  { to: "/", label: "Acasă", icon: Home },
  { to: "/produse", label: "Cutiuțe muzicale", icon: PackageOpen },
  { to: "/despre-cutiuta", label: "Despre cutiuță", icon: Info },
  { to: "/livrare", label: "Livrare", icon: Truck },
] as const;

export function SideScrollMagic() {
  const { scrollYProgress } = useScroll();
  const reduced = useReducedMotion();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [active, setActive] = useState("inceput");

  useEffect(() => {
    if (path !== "/") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: "-15% 0px -50% 0px" },
    );
    for (const chapter of chapters) {
      const element = document.getElementById(chapter.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [path]);

  function jump(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
  }

  return (
    <nav className="magic-scroll-rail" aria-label="Navigare rapidă">
      <Link to="/" className="magic-rail-emblem" aria-label="Cutiuța Magică — Acasă">
        <span className="magic-rail-aura" aria-hidden />
        <BrandMark className="magic-rail-box" />
        <Music2 className="magic-rail-note magic-rail-note--one" aria-hidden />
        <span className="magic-rail-note magic-rail-note--two" aria-hidden>
          ♪
        </span>
        <span className="magic-rail-spark magic-rail-spark--one" aria-hidden>
          ✦
        </span>
        <span className="magic-rail-spark magic-rail-spark--two" aria-hidden>
          ·
        </span>
      </Link>

      <div className="magic-rail-links" aria-label="Pagini principale">
        {primaryLinks.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={to === "/" ? { exact: true } : undefined}
            aria-label={label}
            title={label}
            className="magic-rail-link"
          >
            <span className="rail-tooltip">{label}</span>
            <Icon aria-hidden />
          </Link>
        ))}
      </div>

      <div className="magic-rail-progress" aria-label="Progres în pagină">
        <div className="magic-scroll-line" aria-hidden>
          <motion.div style={{ scaleY: scrollYProgress }} />
        </div>
        {path === "/" ? (
          chapters.map((chapter) => (
            <button
              type="button"
              key={chapter.id}
              onClick={() => jump(chapter.id)}
              aria-label={`Mergi la ${chapter.label}`}
              aria-current={active === chapter.id ? "location" : undefined}
              data-category={chapter.number ? true : undefined}
            >
              <span className="rail-tooltip">{chapter.label}</span>
              {chapter.number && <span className="rail-number">{chapter.number}</span>}
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
      </div>
    </nav>
  );
}
