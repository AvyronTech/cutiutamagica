import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { giftGuide, giftGuides } from "@/data/gift-guides";
import { isAvailable } from "@/data/products";
import { getStorePricing } from "@/lib/store-pricing.functions";
import { safeJsonLd } from "@/lib/product-discovery";
import { useShop } from "@/store/shop";
import { ProductCard } from "@/components/site/ProductCard";

export const Route = createFileRoute("/cadouri/$ocazie")({
  loader: async ({ params }) => {
    const guide = giftGuide(params.ocazie);
    if (!guide) throw notFound();
    const { catalog } = await getStorePricing();
    return { guide, products: catalog.filter((p) => p.discovery?.guides.includes(guide.slug)) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { guide, products } = loaderData;
    const url = `https://cutiutamagica.eu/cadouri/${guide.slug}`;
    const title = `Cadouri ${guide.slug === "secret-santa" ? "pentru" : "de"} ${guide.label}: cutiuțe muzicale | Cutiuța Magică`;
    return {
      meta: [
        { title },
        { name: "description", content: guide.description },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { property: "og:title", content: title },
        { property: "og:description", content: guide.description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        { property: "og:image", content: "https://cutiutamagica.eu/scenes/catalog-atelier.webp" },
      ],
      links: [{ rel: "canonical", href: url }],
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
                mainEntity: {
                  "@type": "ItemList",
                  numberOfItems: products.length,
                  itemListElement: products.map((p, index) => ({
                    "@type": "ListItem",
                    position: index + 1,
                    name: p.name,
                    url: `https://cutiutamagica.eu/produs/${encodeURIComponent(p.slug)}`,
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
  const selection = products.filter((p) => p.discovery?.guides.includes(guide.slug));
  const available = selection.filter(isAvailable);
  const upcoming = selection.filter((p) => !isAvailable(p));
  return (
    <article className="gift-guide-page">
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
      <section id="cutiute-pentru-ocazie" aria-labelledby="gift-models-heading">
        <h2 id="gift-models-heading">Cutiuțe pentru {guide.label}</h2>
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
        <h2>O altă ocazie, aceeași grijă pentru persoană</h2>
        <div className="discovery-links">
          {giftGuides
            .filter((g) => g.slug !== guide.slug)
            .map((g) => (
              <Link key={g.slug} to="/cadouri/$ocazie" params={{ ocazie: g.slug }}>
                {g.label} ↗
              </Link>
            ))}
        </div>
      </section>
    </article>
  );
}
