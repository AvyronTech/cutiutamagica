import { createFileRoute, Link } from "@tanstack/react-router";
import { giftGuides } from "@/data/gift-guides";
import { safeJsonLd } from "@/lib/product-discovery";
export const Route = createFileRoute("/cadouri/")({
  component: GiftHub,
  head: () => ({
    meta: [
      { title: "Idei de cadouri cu poveste și cutiuțe muzicale | Cutiuța Magică" },
      {
        name: "description",
        content:
          "Ghiduri de cadouri pentru Crăciun, Secret Santa, Moș Nicolae și Halloween. Alege o cutiuță muzicală după persoană, melodie și ocazie.",
      },
      { property: "og:title", content: "Idei de cadouri cu poveste | Cutiuța Magică" },
      {
        property: "og:description",
        content:
          "Alege o cutiuță muzicală pentru Crăciun, Secret Santa, Moș Nicolae sau Halloween, după persoană și melodie.",
      },
      { property: "og:url", content: "https://cutiutamagica.eu/cadouri" },
      { property: "og:image", content: "https://cutiutamagica.eu/scenes/catalog-atelier.webp" },
    ],
    links: [{ rel: "canonical", href: "https://cutiutamagica.eu/cadouri" }],
    scripts: [
      {
        type: "application/ld+json",
        children: safeJsonLd({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Idei de cadouri cu poveste",
          url: "https://cutiutamagica.eu/cadouri",
          mainEntity: {
            "@type": "ItemList",
            itemListElement: giftGuides.map((guide, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: guide.title,
              url: `https://cutiutamagica.eu/cadouri/${guide.slug}`,
            })),
          },
        }),
      },
    ],
  }),
});
function GiftHub() {
  return (
    <article className="gift-guide-page">
      <header>
        <span className="catalog-eyebrow">Pasiuni · persoane · ocazii</span>
        <h1>Idei de cadouri care au ceva de spus.</h1>
        <p>
          Începe cu persoana: ce citește, ce ascultă, ce colecționează? O cutiuță muzicală din lemn
          devine un dar personal atunci când melodia și ilustrația au o legătură cu ea.
        </p>
      </header>
      <div className="gift-guide-grid">
        {giftGuides.map((guide) => (
          <Link key={guide.slug} to="/cadouri/$ocazie" params={{ ocazie: guide.slug }}>
            <span>{guide.eyebrow}</span>
            <h2>{guide.label}</h2>
            <p>{guide.description}</p>
            <strong>Descoperă ideile ↗</strong>
          </Link>
        ))}
      </div>
      <section>
        <h2>Și pentru momentele care nu au o dată în calendar</h2>
        <p>
          O aniversare, o mulțumire sau o surpriză pentru cineva drag pot porni de la aceeași
          întrebare: de ce i s-ar potrivi acest model? Pentru un cititor, caută o poveste familiară;
          pentru un iubitor de pisici, o ilustrație tematică; pentru un cuplu, o melodie care
          amintește de ceva trăit împreună.
        </p>
        <p>
          Compară fotografiile, dimensiunile și disponibilitatea din catalog. Fiecare model are
          propria melodie și propriul capac; cererile speciale de personalizare trebuie confirmate
          înainte de comandă.
        </p>
        <Link to="/produse" className="catalog-gold-button">
          Alege cutiuța potrivită →
        </Link>
      </section>
      <Link to="/ghid-cadouri-personalizate">Cum alegi după persoană și melodie ↗</Link>
    </article>
  );
}
