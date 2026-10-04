import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { giftGuide, giftGuideIncludesProduct, giftGuides } from "@/data/gift-guides";
import { isAvailable } from "@/data/products";
import { getStorePricing } from "@/lib/store-pricing.functions";
import { safeJsonLd } from "@/lib/product-discovery";
import { useShop } from "@/store/shop";
import { ProductCard } from "@/components/site/ProductCard";
import { useEffect } from "react";
import { trackGrowthEvent } from "@/lib/growth-events";
import { seoHead } from "@/lib/seo-head";

export const Route = createFileRoute("/cadouri/$ocazie")({
  loader: async ({ params }) => {
    const guide = giftGuide(params.ocazie);
    if (!guide) throw notFound();
    const { catalog } = await getStorePricing();
    return { guide, products: catalog.filter((p) => giftGuideIncludesProduct(guide, p.slug)) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { guide, products } = loaderData;
    const url = `https://cutiutamagica.eu/cadouri/${guide.slug}`;
    const title = `${guide.seoTitle ?? guide.title} | Cutiuța Magică`;
    const image = products.find((product) => product.imageUrl)?.imageUrl;
    const primaryImage = image
      ? image.startsWith("http")
        ? image
        : `https://cutiutamagica.eu${image}`
      : "https://cutiutamagica.eu/scenes/catalog-atelier.webp";
    const seo = seoHead({
      title,
      description: guide.description,
      path: `/cadouri/${guide.slug}`,
      image: primaryImage,
      imageAlt: `Selecție de cutiuțe muzicale — ${guide.label}`,
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
                name: guide.title,
                description: guide.description,
                url,
                inLanguage: "ro-RO",
                isPartOf: { "@id": "https://cutiutamagica.eu/#website" },
                primaryImageOfPage: primaryImage,
                mainEntity: {
                  "@type": "ItemList",
                  numberOfItems: products.length,
                  itemListElement: products.map((p, index) => ({
                    "@type": "ListItem",
                    position: index + 1,
                    name: p.name,
                    url: `https://cutiutamagica.eu/produs/${encodeURIComponent(p.slug)}`,
                    image: p.imageUrl
                      ? p.imageUrl.startsWith("http")
                        ? p.imageUrl
                        : `https://cutiutamagica.eu${p.imageUrl}`
                      : undefined,
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
                    item: "https://cutiutamagica.eu",
                  },
                  {
                    "@type": "ListItem",
                    position: 2,
                    name: "Idei de cadouri",
                    item: "https://cutiutamagica.eu/cadouri",
                  },
                  { "@type": "ListItem", position: 3, name: guide.label, item: url },
                ],
              },
              {
                "@type": "FAQPage",
                mainEntity: [
                  {
                    "@type": "Question",
                    name: guide.question,
                    acceptedAnswer: { "@type": "Answer", text: guide.answer },
                  },
                ],
              },
            ],
          }),
        },
      ],
    };
  },
  component: GiftGuidePage,
});

function GiftGuidePage() {
  const { guide } = Route.useLoaderData();
  const { products } = useShop();
  const selection = products.filter((p) => giftGuideIncludesProduct(guide, p.id));
  const available = selection.filter(isAvailable);
  const upcoming = selection.filter((p) => !isAvailable(p));
  useEffect(() => {
    trackGrowthEvent("gift_finder_completed", {
      properties: { guide: guide.slug },
      once: `gift_finder_completed:${guide.slug}`,
    });
  }, [guide.slug]);
  return (
    <article className="gift-guide-page" data-guide-slug={guide.slug}>
      <nav aria-label="Navigare ierarhică">
        <Link to="/">Acasă</Link> / <Link to="/cadouri">Idei de cadouri</Link> /{" "}
        <span aria-current="page">{guide.label}</span>
      </nav>
      <header>
        <span className="catalog-eyebrow">{guide.eyebrow}</span>
        <h1>{guide.title}</h1>
        <p>{guide.intro}</p>
        <a href="#cutiute-pentru-ocazie" className="catalog-gold-button">
          Descoperă cutiuțele →
        </a>
      </header>
      <div className="gift-guide-editorial">
        {guide.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.text}</p>
          </section>
        ))}
      </div>
      {guide.decisionGuide && (
        <section className="gift-guide-decision" aria-labelledby="gift-decision-heading">
          <div className="gift-guide-decision__heading">
            <span className="catalog-eyebrow">Filtru practic, nu listă generică</span>
            <h2 id="gift-decision-heading">{guide.decisionGuide.title}</h2>
            <p>
              Parcurge cele trei întrebări înainte să alegi modelul. Dacă răspunsurile nu indică
              aceeași direcție, mai caută un detaliu real despre persoană.
            </p>
          </div>
          <ol className="gift-guide-checkpoints">
            {guide.decisionGuide.checkpoints.map((checkpoint, index) => (
              <li key={checkpoint.label}>
                <span aria-hidden>{index + 1}</span>
                <div>
                  <h3>{checkpoint.label}</h3>
                  <p>{checkpoint.guidance}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="gift-guide-decision__notes">
            <aside>
              <strong>Ce să eviți</strong>
              <p>{guide.decisionGuide.avoid}</p>
            </aside>
            <div>
              <strong>Trei începuturi pentru bilețel</strong>
              <ul>
                {guide.decisionGuide.messagePrompts.map((prompt) => (
                  <li key={prompt}>„{prompt}”</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
      <section id="cutiute-pentru-ocazie" aria-labelledby="gift-models-heading">
        <h2 id="gift-models-heading">Cutiuțe potrivite — {guide.label}</h2>
        {available.length ? (
          <>
            <p>
              Modele disponibile acum. Deschide pagina cutiuței pentru fotografii, melodie și
              detalii.
            </p>
            <div className="gift-product-grid">
              {available.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} variant="solid" />
              ))}
            </div>
          </>
        ) : (
          <p>
            Momentan, aceste modele nu sunt disponibile pentru comandă.{" "}
            <Link to="/produse">Explorează toate cutiuțele.</Link>
          </p>
        )}
        {upcoming.length > 0 && (
          <div className="gift-upcoming">
            <h3>De urmărit pentru colecția ta</h3>
            <p>
              Aceste modele nu sunt disponibile acum. În pagina fiecăruia poți vedea opțiunile de
              anunțare sau precomandă, atunci când sunt activate.
            </p>
            <ul>
              {upcoming.map((p) => (
                <li key={p.id}>
                  <Link to="/produs/$id" params={{ id: p.id }}>
                    {p.name}
                  </Link>{" "}
                  · {p.availability === "coming_soon" ? "În curând" : "Stoc epuizat"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <section>
        <h2>{guide.question}</h2>
        <p>{guide.answer}</p>
      </section>
      <section>
        <h2>Vrei o cutiuță făcută în jurul amintirii tale?</h2>
        <p>
          În configurator poți alege culoarea, fotografia de pe capac, gravura și ambalarea. Vezi
          opțiunile și termenul estimat în pagina de{" "}
          <Link to="/personalizeaza">personalizare a cutiuței muzicale</Link>.
        </p>
      </section>
      <section>
        <h2>O altă ocazie, aceeași grijă pentru persoană</h2>
        <div className="discovery-links">
          {giftGuides
            .filter((g) => g.slug !== guide.slug && g.group === guide.group)
            .slice(0, 6)
            .map((g) => (
              <Link key={g.slug} to="/cadouri/$ocazie" params={{ ocazie: g.slug }}>
                {g.label} ↗
              </Link>
            ))}
          <Link to="/cadouri">Vezi toate ghidurile de cadouri ↗</Link>
        </div>
      </section>
    </article>
  );
}
