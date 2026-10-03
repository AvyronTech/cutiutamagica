import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Box,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { safeJsonLd } from "@/lib/product-discovery";
import { waLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/livrare")({
  component: DeliveryPage,
  head: () => ({
    meta: [
      { title: "Livrare cutiuțe muzicale | Cutiuța Magică" },
      {
        name: "description",
        content:
          "Află cum pregătim și livrăm cutiuțele muzicale, cum se calculează transportul și ce faci după expedierea coletului.",
      },
      { property: "og:title", content: "Livrare — Cutiuța Magică" },
      {
        property: "og:description",
        content:
          "De la atelier la ușa ta: ambalare atentă, cost confirmat în checkout și informații clare despre expediere.",
      },
      { property: "og:url", content: "https://cutiutamagica.eu/livrare" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
    ],
    links: [{ rel: "canonical", href: "https://cutiutamagica.eu/livrare" }],
    scripts: [
      {
        type: "application/ld+json",
        children: safeJsonLd({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": "https://cutiutamagica.eu/livrare#page",
          url: "https://cutiutamagica.eu/livrare",
          name: "Livrare — Cutiuța Magică",
          description:
            "Informații despre pregătirea, costul, expedierea și recepția comenzilor Cutiuța Magică.",
          inLanguage: "ro-RO",
          isPartOf: { "@id": "https://cutiutamagica.eu/#website" },
        }),
      },
    ],
  }),
});

const journey = [
  {
    icon: PackageCheck,
    number: "01",
    title: "Confirmăm comanda",
    text: "După trimiterea comenzii verificăm produsele, datele de contact și adresa. Mesajul automat confirmă primirea solicitării; acceptarea și detaliile expedierii sunt comunicate separat.",
  },
  {
    icon: Box,
    number: "02",
    title: "Pregătim coletul",
    text: "Cutiuța este verificată și protejată pentru transport. Pentru o cutiuță personalizată, pregătirea și livrarea sunt estimate la 4–7 zile lucrătoare.",
  },
  {
    icon: Truck,
    number: "03",
    title: "Predăm curierului",
    text: "După predare primești detaliile disponibile pentru expediere. Intervalul final depinde de adresă, volum și serviciul curierului.",
  },
] as const;

function DeliveryPage() {
  return (
    <main className="delivery-page">
      <header className="delivery-hero">
        <div className="delivery-hero__glow" aria-hidden />
        <div className="delivery-route" aria-hidden>
          <span />
          <i>✦</i>
          <span />
        </div>
        <p className="scene-eyebrow">
          <Sparkles size={15} aria-hidden /> Din atelier, spre tine
        </p>
        <h1>
          Livrare atentă.
          <br />
          <em>Magia rămâne întreagă.</em>
        </h1>
        <p>
          Fiecare cutiuță pornește la drum numai după ce este verificată și protejată. Costul și
          opțiunea disponibilă pentru adresa ta se confirmă transparent în fluxul de comandă.
        </p>
        <div className="delivery-hero__actions">
          <Link to="/produse" className="magic-button">
            Alege o cutiuță <ArrowUpRight size={17} />
          </Link>
          <a
            href={waLink(
              "Bună! Aș vrea să verific detaliile de livrare pentru o cutiuță muzicală.",
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="magic-button magic-button--outline"
          >
            Întreabă-ne pe WhatsApp <MessageCircle size={17} />
          </a>
        </div>
      </header>

      <section className="delivery-journey" aria-labelledby="delivery-journey-heading">
        <div className="delivery-section-heading">
          <p className="scene-eyebrow">Drumul coletului</p>
          <h2 id="delivery-journey-heading">Trei pași simpli</h2>
        </div>
        <div className="delivery-journey__grid">
          {journey.map(({ icon: Icon, number, title, text }) => (
            <article key={number}>
              <span className="delivery-card-number">{number}</span>
              <Icon aria-hidden />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="delivery-facts" aria-labelledby="delivery-facts-heading">
        <div className="delivery-facts__visual" aria-hidden>
          <div className="delivery-parcel">
            <span className="delivery-parcel__lid" />
            <span className="delivery-parcel__body">
              <i>CM</i>
            </span>
            <span className="delivery-parcel__trail">✦ · ♪ · ✧</span>
          </div>
        </div>
        <div>
          <p className="scene-eyebrow">Clar, înainte de confirmare</p>
          <h2 id="delivery-facts-heading">Ce este bine să știi</h2>
          <ul>
            <li>
              <MapPin aria-hidden />
              <span>
                <strong>Destinație</strong>
                Comenzile online sunt pregătite pentru livrare la adresă în România. Completează
                corect localitatea, codul poștal și telefonul.
              </span>
            </li>
            <li>
              <Clock3 aria-hidden />
              <span>
                <strong>Termen</strong>
                Pentru produsele disponibile, livrarea în România este estimată la 1–3 zile
                lucrătoare. Produsele personalizate au termenul comunicat de 4–7 zile lucrătoare.
              </span>
            </li>
            <li>
              <ShieldCheck aria-hidden />
              <span>
                <strong>Cost transparent</strong>
                Livrarea la adresă în România costă 25 lei pentru comenzile sub 300 lei și este
                gratuită pentru comenzile de minimum 300 lei.
              </span>
            </li>
            <li>
              <Sparkles aria-hidden />
              <span>
                <strong>Ambalare specială</strong>
                Pentru cutiuța personalizată poți selecta ambalarea specială la 35 lei în formularul
                dedicat.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="delivery-help" aria-labelledby="delivery-help-heading">
        <div>
          <p className="scene-eyebrow">După ce ajunge</p>
          <h2 id="delivery-help-heading">Verifică pachetul cu liniște</h2>
          <p>
            Dacă ambalajul este deteriorat, lipsește ceva sau produsul nu corespunde comenzii,
            fotografiază coletul și contactează-ne cât mai curând. Te ajutăm să documentezi situația
            fără să îți limităm drepturile legale.
          </p>
        </div>
        <div className="delivery-help__actions">
          <Link to="/retur" className="scene-link">
            Retur și garanție <ArrowUpRight size={15} />
          </Link>
          <Link to="/termeni-de-utilizare" className="scene-link">
            Condițiile complete <ArrowUpRight size={15} />
          </Link>
          <a href="mailto:comenzi@cutiutamagica.eu" className="scene-link">
            Întrebări despre comandă <ArrowUpRight size={15} />
          </a>
        </div>
        <span className="delivery-help__seal">
          <CheckCircle2 aria-hidden /> informații clare
        </span>
      </section>
    </main>
  );
}
