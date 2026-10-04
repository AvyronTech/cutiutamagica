import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Box,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Home,
  MapPinned,
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
          "Livrare în 1–2 zile lucrătoare pentru cutiuțele standard și 4–7 zile pentru modelele speciale sau personalizate. Curier 25 lei, SAMEDAY easybox 15 lei ori livrare programată.",
      },
      { property: "og:title", content: "Livrare — Cutiuța Magică" },
      {
        property: "og:description",
        content:
          "De la atelier la tine: 1–2 zile lucrătoare pentru cutiuțele standard și 4–7 zile pentru modelele speciale sau personalizate.",
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
            "Informații despre livrarea cutiuțelor standard în 1–2 zile lucrătoare și a modelelor speciale sau personalizate în 4–7 zile.",
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
    title: "Confirmăm și verificăm",
    text: "După comandă verificăm produsele, datele de contact și metoda aleasă. Primești confirmarea pe e-mail, fără să fie necesar un cont.",
  },
  {
    icon: Box,
    number: "02",
    title: "Protejăm cutiuța",
    text: "Testăm mecanismul, fixăm cutiuța în ambalaj și pregătim coletul pentru traseul ales. Ambalarea specială rămâne separată de protecția de transport.",
  },
  {
    icon: Truck,
    number: "03",
    title: "Expediem și te anunțăm",
    text: "După predare primești detaliile de urmărire disponibile. Pentru cutiuțele standard, termenul estimat în România este de 1–2 zile lucrătoare.",
  },
] as const;

const deliveryOptions = [
  {
    icon: Home,
    eyebrow: "La ușa ta",
    title: "Curier la adresă",
    badge: "25 lei · 1–2 zile",
    text: "Alegi livrarea la adresa completată în comandă. Curierul folosește numărul de telefon pentru notificare și predare.",
    details: ["adresă din România", "urmărire după expediere", "cost vizibil în checkout"],
  },
  {
    icon: MapPinned,
    eyebrow: "Ridici când îți este comod",
    title: "SAMEDAY easybox",
    badge: "15 lei · hartă",
    text: "Alegi easybox-ul pe hartă înainte de finalizare, iar tariful fix este afișat în sumarul comenzii.",
    details: ["punct ales de tine", "disponibilitate verificată", "tarif fix în checkout"],
  },
  {
    icon: CalendarClock,
    eyebrow: "Pentru un moment anume",
    title: "Livrare programată",
    badge: "la cerere",
    text: "Ne scrii înainte de expediere, iar noi confirmăm ziua sau fereastra disponibilă împreună cu partenerul de curierat.",
    details: [
      "confirmare în scris",
      "în funcție de localitate",
      "fără promisiunea unei ore exacte",
    ],
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
          Cutiuțele standard ajung, de regulă, în 1–2 zile lucrătoare. Modelele speciale și
          personalizate au un termen estimat de 4–7 zile lucrătoare. Alegi traseul potrivit, iar
          costul și disponibilitatea se confirmă transparent înainte de comandă.
        </p>
        <div className="delivery-promise" aria-label="Termen estimat de livrare">
          <Clock3 aria-hidden />
          <span>
            <small>Cutiuțe standard în România</small>
            <strong>1–2 zile lucrătoare</strong>
          </span>
          <i>speciale și personalizate: 4–7 zile</i>
        </div>
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

      <section className="delivery-options" aria-labelledby="delivery-options-heading">
        <div className="delivery-section-heading delivery-section-heading--split">
          <div>
            <p className="scene-eyebrow">Alege traseul potrivit</p>
            <h2 id="delivery-options-heading">Trei moduri de a primi povestea</h2>
          </div>
          <p>
            În checkout vezi numai opțiunile disponibile pentru comanda și adresa ta. Livrarea
            programată se stabilește cu noi înainte ca pachetul să plece.
          </p>
        </div>
        <div className="delivery-options__grid">
          {deliveryOptions.map(({ icon: Icon, eyebrow, title, badge, text, details }, index) => (
            <article key={title} className={`delivery-option delivery-option--${index + 1}`}>
              <div className="delivery-option__topline">
                <span className="delivery-option__icon">
                  <Icon aria-hidden />
                </span>
                <span className="delivery-option__badge">{badge}</span>
              </div>
              <p>{eyebrow}</p>
              <h3>{title}</h3>
              <div className="delivery-option__route" aria-hidden>
                <i />
                <Sparkles />
                <i />
              </div>
              <p>{text}</p>
              <ul aria-label={`Detalii ${title}`}>
                {details.map((detail) => (
                  <li key={detail}>
                    <CheckCircle2 aria-hidden /> {detail}
                  </li>
                ))}
              </ul>
              {index === 2 && (
                <a
                  href={waLink(
                    "Bună! Aș vrea să verific o livrare programată pentru o cutiuță muzicală.",
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="scene-link"
                >
                  Verifică o dată <ArrowUpRight size={14} />
                </a>
              )}
            </article>
          ))}
        </div>
      </section>

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
                Cutiuțele standard ajung, de regulă, în 1–2 zile lucrătoare. Pentru modelele
                speciale și personalizate, termenul estimat este de 4–7 zile lucrătoare.
              </span>
            </li>
            <li>
              <ShieldCheck aria-hidden />
              <span>
                <strong>Cost transparent</strong>
                Tariful este afișat înainte de trimiterea comenzii, după adresă și metoda aleasă.
                Dacă se aplică pragul de livrare gratuită, acesta apare direct în coș.
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
