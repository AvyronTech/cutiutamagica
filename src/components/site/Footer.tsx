import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import avyronLogo from "@/assets/avyron-logo.png";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 wood-grain text-[color:var(--cream)]">
      <div className="max-w-7xl mx-auto px-4 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-center md:text-left">
        <Link to="/" className="flex items-center gap-2 justify-center md:justify-start">
          <span className="w-8 h-8 rounded-md bg-[color:var(--cream)]/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[color:var(--gold)]" />
          </span>
          <span className="font-display text-xl">Cutiuța <span className="gold-text">Magică</span></span>
        </Link>

        <nav aria-label="Navigare subsol" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <Link to="/" className="hover:text-[color:var(--gold)]">Acasă</Link>
          <Link to="/produse" className="hover:text-[color:var(--gold)]">Produse</Link>
          <Link to="/poveste" className="hover:text-[color:var(--gold)]">Poveste</Link>
          <Link to="/comanda" className="hover:text-[color:var(--gold)]">Comandă</Link>
          <Link to="/favorite" className="hover:text-[color:var(--gold)]">Favorite</Link>
        </nav>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[color:var(--cream)]/60">
          <span>© {year} Cutiuța Magică · Făcut cu drag în România</span>
          <a
            href="https://avyron.ro"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Powered by Avyron"
            className="group inline-flex items-center gap-2 hover:text-[color:var(--cream)] transition-colors"
          >
            <span className="tracking-[0.18em] uppercase text-[10px]">Powered by</span>
            <img
              src={avyronLogo}
              alt="Avyron"
              loading="lazy"
              className="h-5 w-auto opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-[0_0_8px_rgba(168,85,247,0.35)]"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
