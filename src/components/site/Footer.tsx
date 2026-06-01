import { Link } from "@tanstack/react-router";
import avyronLogo from "@/assets/avyron-logo.jpg";

const navItems = [
  { to: "/", label: "Acasă" },
  { to: "/produse", label: "Produse" },
  { to: "/poveste", label: "Poveste" },
  { to: "/comanda", label: "Comandă" },
  { to: "/favorite", label: "Favorite" },
] as const;

// Sugestiv: o cutiuță cu o notă muzicală ce se înalță deasupra ei
function MusicBoxMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* cutiuță */}
      <rect x="3.5" y="11" width="17" height="9" rx="1.8" />
      <path d="M3.5 13.5h17" />
      {/* cheița */}
      <circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none" />
      <path d="M12 17v1.6" />
      {/* nota magică deasupra */}
      <path d="M14 4.2v5.4" />
      <circle cx="12.6" cy="9.6" r="1.3" />
      <path d="M14 4.2c.9.4 1.6 1.1 1.8 2" />
      {/* sclipiri */}
      <path d="M7 7.5l.6.6M7.6 7.5L7 8.1" />
      <path d="M18 8l.5.5M18.5 8l-.5.5" />
    </svg>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 wood-grain text-[color:var(--cream)]">
      <div className="max-w-7xl mx-auto px-4 pt-12 pb-6 flex flex-col items-center gap-7 text-center">
        {/* Navigare — butoane soft, de poveste */}
        <nav
          aria-label="Navigare subsol"
          className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3"
        >
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group relative inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium tracking-wide
                         text-[color:var(--cream)]/90
                         bg-[color:var(--cream)]/[0.04]
                         border border-[color:var(--cream)]/15
                         backdrop-blur-sm
                         transition-all duration-300 ease-out
                         hover:text-[color:var(--gold)]
                         hover:border-[color:var(--gold)]/60
                         hover:bg-[color:var(--gold)]/10
                         hover:shadow-[0_0_24px_-6px_var(--gold)]
                         hover:-translate-y-0.5"
            >
              <span className="w-1 h-1 rounded-full bg-[color:var(--gold)]/60 group-hover:bg-[color:var(--gold)] transition-colors" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Logo Avyron */}
        <a
          href="https://avyron.ro"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Avyron — descoperă-ne"
          className="block opacity-90 hover:opacity-100 transition-opacity"
        >
          <img
            src={avyronLogo}
            alt="Avyron"
            loading="lazy"
            className="h-[74px] md:h-[92px] w-auto block"
          />
        </a>

        {/* Brand */}
        <Link to="/" className="flex flex-col items-center gap-2 group">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-[color:var(--cream)]/15 to-[color:var(--cream)]/[0.03] border border-[color:var(--gold)]/30 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] group-hover:border-[color:var(--gold)]/70 transition-colors">
              <MusicBoxMark className="w-6 h-6 text-[color:var(--gold)]" />
            </span>
            <span className="font-display text-2xl md:text-[1.6rem] leading-none">
              Cutiuța <span className="gold-text italic">Magică</span>
            </span>
          </div>
          <p className="max-w-md text-xs md:text-sm italic text-[color:var(--cream)]/70 font-serif">
            Lemn ales cu grijă, mâini răbdătoare și o melodie șoptită de poveste — fiecare cutiuță, o promisiune făcută cu suflet.
          </p>
        </Link>

        {/* Linia subțire de despărțire */}
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-[color:var(--gold)]/40 to-transparent" />

        <p className="text-xs text-[color:var(--cream)]/60">
          © {year} Cutiuța Magică · Făcut cu drag în România
        </p>
      </div>
    </footer>
  );
}
