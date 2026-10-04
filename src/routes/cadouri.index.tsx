import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { giftGuideGroups, giftGuides } from "@/data/gift-guides";
import { safeJsonLd } from "@/lib/product-discovery";
import { trackGrowthEvent } from "@/lib/growth-events";
import { seoHead } from "@/lib/seo-head";
export const Route = createFileRoute("/cadouri/")({
  component: GiftHub,
  head: () => {
    const seo = seoHead({
      title: "Idei de cadouri cu poveste și cutiuțe muzicale | Cutiuța Magică",
      description:
        "Ghiduri de cadouri după ocazie, persoană și pasiune: aniversări, cuplu, părinți, colegi, iubitori de pisici, Harry Potter și fantasy.",
      path: "/cadouri",
      image: "/scenes/catalog-atelier.webp",
      imageAlt: "Selecție de cutiuțe muzicale pentru cadouri cu poveste",
    });
    return {
      ...seo,
      scripts: [
        {
          type: "application/ld+json",
          children: safeJsonLd({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "CollectionPage",
                "@id": "https://cutiutamagica.eu/cadouri#page",
                name: "Idei de cadouri cu poveste",
                url: "https://cutiutamagica.eu/cadouri",
                inLanguage: "ro-RO",
                isPartOf: { "@id": "https://cutiutamagica.eu/#website" },
                mainEntity: {
                  "@type": "ItemList",
                  numberOfItems: giftGuides.length,
                  itemListElement: giftGuides.map((guide, index) => ({
                    "@type": "ListItem",
                    position: index + 1,
                    name: guide.title,
                    url: `https://cutiutamagica.eu/cadouri/${guide.slug}`,
                  })),
                },
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  {
                    "@type": "ListItem",
                    position: 1,
                    name: "Acasă",
                    item: "https://cutiutamagica.eu/",
                  },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Idei de cadouri",
                    item: "https://cutiutamagica.eu/cadouri",
                  },
                ],
              },
            ],
          }),
        },
      ],
    };
  },
});
function GiftHub() {
  useEffect(() => {
    trackGrowthEvent("gift_finder_started", { once: "gift_finder_started" });
  }, []);
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
      {giftGuideGroups.map((group) => {
        const groupId = `gift-${group.label.toLowerCase().replaceAll(" ", "-")}`;
        return (
          <section key={group.label} className="gift-guide-group" aria-labelledby={groupId}>
            <div className="gift-guide-group__heading">
              <span className="catalog-eyebrow">Alege după</span>
              <h2 id={groupId}>{group.label}</h2>
            </div>
            <div className="gift-guide-grid">
              {group.guides.map((guide) => (
                <Link
                  key={guide.slug}
                  to="/cadouri/$ocazie"
                  params={{ ocazie: guide.slug }}
                  onClick={() =>
                    trackGrowthEvent("gift_finder_completed", {
                      properties: { guide: guide.slug },
                      once: `gift_finder_completed:${guide.slug}`,
                    })
                  }
                >
                  <span>{guide.eyebrow}</span>
                  <h3>{guide.label}</h3>
                  <p>{guide.description}</p>
                  <strong>Descoperă ideile ↗</strong>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
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
