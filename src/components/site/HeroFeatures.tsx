import { Link } from "@tanstack/react-router";
import { Gift, Music2, BookOpen, ArrowUpRight } from "lucide-react";
const features = [
  {
    label: "Mecanism clasic",
    lines: ["Învârți manivela,", "începe melodia"],
    detail: "Fără baterii, fără aplicație",
    Icon: Music2,
    to: "/despre-cutiuta",
  },
  {
    label: "Fiecare model, o poveste",
    lines: ["Teme din filme,", "cărți și amintiri"],
    detail: "Alegi melodia și ilustrația de pe capac",
    Icon: BookOpen,
    to: "/produse",
  },
  {
    label: "Cadou gata de dăruit",
    lines: ["Mică în palmă,", "mare la emoție"],
    detail: "Lemn gravat, mecanism metalic vizibil",
    Icon: Gift,
    to: "/produse",
  },
] as const;
export function HeroFeatures() {
  return (
    <div className="hero-features" aria-label="Trei lucruri de descoperit despre cutiuțe">
      <svg
        className="hero-story-thread hero-story-thread--desktop"
        viewBox="0 0 1000 100"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <path className="hero-thread-guide" d="M0 3 C0 72 24 98 155 98 S760 98 1000 98" />
        <path
          className="hero-thread-light"
          pathLength="1"
          d="M0 3 C0 72 24 98 155 98 S760 98 1000 98"
        />
      </svg>
      <svg
        className="hero-story-thread hero-story-thread--mobile"
        viewBox="0 0 100 1000"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <path className="hero-thread-guide" d="M3 0 C3 300 3 690 3 935 Q3 1000 97 1000" />
        <path
          className="hero-thread-light"
          pathLength="1"
          d="M3 0 C3 300 3 690 3 935 Q3 1000 97 1000"
        />
      </svg>
      {features.map(({ label, lines, detail, Icon, to }, i) => (
        <Link
          to={to}
          key={label}
          className="hero-feature"
          data-magic-card
          data-reveal
          style={{ "--reveal-order": i } as React.CSSProperties}
        >
          <span className="hero-feature-icon" aria-hidden="true">
            <Icon size={21} />
          </span>
          <span className="hero-feature-label">{label}</span>
          <h2>
            {lines[0]}
            <br />
            <em>{lines[1]}</em>
          </h2>
          <p>{detail}</p>
          <ArrowUpRight className="hero-feature-arrow" size={16} aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
}
