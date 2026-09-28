import { Link } from "@tanstack/react-router";
import { BrandMark } from "./BrandMark";
import { FooterScene } from "./FooterScene";
import avyronLogo from "@/assets/avyron-logo.jpg";

const navGroups = [
  {
    title: "Descoperă",
    items: [
      { to: "/produse", label: "Cutiuțe muzicale" },
      { to: "/personalizeaza", label: "Personalizează" },
      { to: "/cadouri", label: "Idei de cadouri" },
      { to: "/despre-cutiuta", label: "Despre cutiuță" },
    ],
  },
  {
    title: "Ajutor",
    items: [
      { to: "/livrare", label: "Livrare" },
      { to: "/comanda", label: "Comandă" },
      { to: "/retur", label: "Retur și garanție" },
      { to: "/cont", label: "Contul meu" },
    ],
  },
  {
    title: "Informații",
    items: [
      { to: "/termeni-de-utilizare", label: "Termeni de utilizare" },
      { to: "/politica-de-confidentialitate", label: "Confidențialitate" },
    ],
  },
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
      <div className="magic-footer-details">
        <div className="magic-footer-grid">
          <div className="magic-footer-brand">
            <Link to="/" aria-label="Cutiuța Magică — Acasă">
              <BrandMark className="magic-footer-brandmark" />
              <span>
                Cutiuța <em>Magică</em>
              </span>
            </Link>
            <p>O cutiuță din lemn, o manivelă și o melodie aleasă pentru cineva drag.</p>
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
        </div>

        <div className="magic-footer-trust">
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
              aria-label="Comisia Europeană: soluționarea alternativă a litigiilor pentru consumatori"
              className="magic-adr-badge"
            >
              <span aria-hidden>EU</span>
              <span>
                <strong>Soluționarea litigiilor</strong>
                <small>ADR și ECC-Net</small>
              </span>
            </a>
          </section>

          <a
            href="https://avyron.ro"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Avyron — descoperă-ne"
            className="magic-footer-avyron"
          >
            <span>Creat cu grijă de</span>
            <img src={avyronLogo} alt="Avyron" loading="lazy" decoding="async" />
          </a>
        </div>

        <div className="magic-footer-bottom">
          <p>© {year} Cutiuța Magică</p>
          <p>Lemn · manivelă · melodie</p>
        </div>
      </div>
    </footer>
  );
}
