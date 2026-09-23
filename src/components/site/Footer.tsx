import { Link } from "@tanstack/react-router";
import { BrandMark } from "./BrandMark";
import { FooterScene } from "./FooterScene";
import avyronLogo from "@/assets/avyron-logo.jpg";

const navItems = [
  { to: "/", label: "Acasă" },
  { to: "/produse", label: "Produse" },
  { to: "/cadouri", label: "Idei de cadouri" },
  { to: "/despre-cutiuta", label: "Despre cutiuță" },
  { to: "/comanda", label: "Comandă" },
  { to: "/retur", label: "Retur și garanție" },
  { to: "/termeni-de-utilizare", label: "Termeni de utilizare" },
  { to: "/politica-de-confidentialitate", label: "Politica de confidențialitate" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="magic-footer text-[color:var(--cream)]">
      <FooterScene />
      <div className="magic-footer-invitation">
        <BrandMark className="magic-footer-box" />
        <span>O melodie poate spune atât de mult.</span>
        <h2>
          Alege amintirea pe care
          <br />
          <em>o vei dărui.</em>
        </h2>
        <Link to="/produse" className="magic-footer-cta">
          Găsește cutiuța potrivită <span aria-hidden>↗</span>
        </Link>
      </div>
      <div className="magic-footer-details relative max-w-6xl mx-auto px-4 pt-6 pb-4 flex flex-col items-center gap-4 text-center">
        {/* Brand — deschide subsolul */}
        <Link to="/" className="flex flex-col items-center gap-1.5 group">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-[color:var(--cream)]/15 to-[color:var(--cream)]/[0.03] border border-[color:var(--gold)]/30 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] group-hover:border-[color:var(--gold)]/70 transition-colors">
              <BrandMark className="w-5 h-5 text-[color:var(--gold)]" />
            </span>
            <span className="font-display text-2xl md:text-[1.6rem] leading-none">
              Cutiuța <span className="gold-text italic">Magică</span>
            </span>
          </div>
          <p className="max-w-md text-xs md:text-sm italic text-[color:var(--cream)]/70 font-serif">
            O cutiuță din lemn, o manivelă și o melodie. Un dar ales cu gândul la cineva drag.
          </p>
        </Link>

        {/* Navigare — butoane soft, de poveste */}
        <nav
          aria-label="Navigare subsol"
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium tracking-wide
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
        <section aria-label="Protecția consumatorului și plăți" className="w-full">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://reclamatiisal.anpc.ro"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="ANPC: Soluționarea alternativă a litigiilor"
              className="inline-flex h-[50px] w-[250px] items-center justify-center overflow-hidden rounded-sm bg-white shadow-sm ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <img
                src="/anpc-sal.png"
                alt="ANPC: Soluționarea alternativă a litigiilor"
                width={250}
                height={50}
                loading="lazy"
                className="h-[50px] w-[250px] object-contain"
              />
            </a>
            <a
              href="https://commission.europa.eu/topics/consumers/consumer-rights-and-complaints/resolve-your-consumer-complaint/alternative-dispute-resolution-consumers_ro"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Comisia Europeană: soluționarea alternativă a litigiilor pentru consumatori"
              className="inline-flex h-[50px] w-[250px] items-center gap-3 rounded-sm bg-[#0646a5] px-4 text-left text-white shadow-sm ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span aria-hidden className="text-xl font-semibold tracking-tight">
                EU
              </span>
              <span className="border-l border-white/30 pl-3 text-[10px] font-semibold uppercase leading-tight tracking-[0.1em]">
                Soluționarea litigiilor
                <span className="mt-0.5 block font-normal normal-case tracking-normal text-white/80">
                  ADR și ECC-Net
                </span>
              </span>
            </a>
          </div>
          <p className="mx-auto mt-2 max-w-3xl text-xs leading-5 text-[color:var(--cream)]/75">
            Platforma europeană SOL a fost închisă. Pentru soluționarea litigiilor sunt disponibile
            SAL ANPC și mecanismele europene ADR actuale.
          </p>
        </section>

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
            className="h-[58px] md:h-[72px] w-auto block"
          />
        </a>

        <div className="w-24 h-px bg-gradient-to-r from-transparent via-[color:var(--gold)]/40 to-transparent" />

        <div className="text-xs leading-5 text-[color:var(--cream)]/75">
          <p>© {year} Cutiuța Magică</p>
        </div>
      </div>
    </footer>
  );
}
