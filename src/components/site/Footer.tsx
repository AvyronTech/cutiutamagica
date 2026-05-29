import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import avyronLogo from "@/assets/avyron-logo.jpg";

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

      <div className="max-w-7xl mx-auto px-4 pb-6 flex flex-col items-center gap-2">
      <div className="max-w-7xl mx-auto px-4 pb-6 flex justify-center">
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
            className="h-16 md:h-20 w-auto block"
          />
        </a>
      </div>
        © {year} Cutiuța Magică · Făcut cu drag în România
      </div>
    </footer>
  );
}
