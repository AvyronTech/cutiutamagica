import { Link } from "@tanstack/react-router";
import { BrandMark } from "./BrandMark";
import avyronLogo from "@/assets/avyron-logo.jpg";
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/whatsapp";

const navGroups = [
  {
    title: "Alege cutiuța",
    items: [
      { to: "/produse", label: "Cutiuțe" },
      { to: "/cadouri", label: "Idei de cadouri" },
      { to: "/ghid-cadouri-personalizate", label: "Ghid de alegere" },
      { to: "/personalizeaza", label: "Personalizare" },
    ],
  },
  {
    title: "Comanda ta",
    items: [
      { to: "/comanda", label: "Comandă" },
      { to: "/livrare", label: "Livrare" },
      { to: "/retur", label: "Retur și garanție" },
      { to: "/cont", label: "Contul meu" },
      { to: "/magic-rewards", label: "Magic Rewards" },
    ],
  },
  {
    title: "Informații",
    items: [
      { to: "/despre-cutiuta", label: "Despre cutiuță" },
      { to: "/termeni-de-utilizare", label: "Termeni" },
      { to: "/politica-de-confidentialitate", label: "Confidențialitate" },
      { to: "/despre-noi", label: "Despre noi" },
    ],
  },
] as const;

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="magic-footer text-[color:var(--cream)]">
      <div className="magic-footer-details">
        <div className="magic-footer-top">
          <div className="magic-footer-brand">
            <Link to="/" aria-label="Cutiuța Magică — Acasă">
              <BrandMark className="magic-footer-brandmark" />
              <span>
                Cutiuța <em>Magică</em>
              </span>
            </Link>
            <p>O cutiuță din lemn, o manivelă și o melodie pentru cineva drag.</p>
          </div>
          <address className="magic-footer-contact">
            <div>
              <span>Întrebări</span>
              <a href="mailto:contact@cutiutamagica.eu">contact@cutiutamagica.eu</a>
            </div>
            <div>
              <span>Comenzi</span>
              <a href="mailto:comenzi@cutiutamagica.eu">comenzi@cutiutamagica.eu</a>
            </div>
            <div>
              <span>Telefon</span>
              <a href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>
            </div>
          </address>
        </div>

        <nav className="magic-footer-nav" aria-label="Navigare subsol">
          {navGroups.map((group) => (
            <div key={group.title}>
              <strong>{group.title}</strong>
              {group.items.map((item) => (
                <Link key={item.to} to={item.to}>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="magic-footer-invitation">
          <div className="magic-footer-invitation-copy">
            <span>O melodie poate spune atât de mult.</span>
            <h2>
              Alege amintirea pe care <em>o vei dărui.</em>
            </h2>
          </div>
          <Link to="/produse" className="magic-footer-cta">
            Găsește cutiuța potrivită <span aria-hidden>↗</span>
          </Link>
        </div>

        <div className="magic-footer-bottom">
          <FooterTrustBadges />
          <p>© {year} Cutiuța Magică</p>
          <a
            href="https://avyron.ro"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Avyron — descoperă-ne"
            className="magic-footer-avyron"
          >
            <img
              src={avyronLogo}
              alt="Avyron"
              width={1774}
              height={485}
              loading="lazy"
              decoding="async"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterTrustBadges() {
  return (
    <section aria-label="Protecția consumatorului" className="magic-footer-consumer">
      <a
        href="https://reclamatiisal.anpc.ro"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="ANPC: Soluționarea alternativă a litigiilor"
        className="magic-anpc-badge"
      >
        <img
          src="/anpc-sal.webp"
          alt="ANPC: Soluționarea alternativă a litigiilor"
          width={234}
          height={58}
          loading="lazy"
          decoding="async"
        />
      </a>
      <a
        href="https://commission.europa.eu/topics/consumers/consumer-rights-and-complaints/resolve-your-consumer-complaint/alternative-dispute-resolution-consumers_ro"
        target="_blank"
        rel="noopener noreferrer"
        className="magic-adr-badge"
      >
        <span aria-hidden>EU</span>
        <span>
          <strong>Soluționarea litigiilor</strong>
          <small>ADR și ECC-Net</small>
        </span>
      </a>
    </section>
  );
}
