import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { safeJsonLd } from "@/lib/product-discovery";
import {
  BookOpen,
  Heart,
  Gift,
  Search,
  X,
  ArrowDown,
  ArrowRight,
  Music2,
  Sparkles,
} from "lucide-react";
import { isAvailable } from "@/data/products";
import { getStorePricing } from "@/lib/store-pricing.functions";
import {
  catalogCollections,
  filterCatalog,
  validateCatalogSearch,
  type CatalogSearch,
} from "@/lib/catalog-filters";
import { collectionFor } from "@/lib/collections";
import { useShop } from "@/store/shop";
import { ProductCard } from "@/components/site/ProductCard";

const CATALOG_URL = "https://cutiutamagica.eu/produse";
const collectionIcons = { story: BookOpen, emotion: Heart, dedicated: Gift };

export const Route = createFileRoute("/produse")({
  validateSearch: validateCatalogSearch,
  component: ProductsPage,
  loader: () => getStorePricing(),
  head: ({ loaderData }) => ({
    meta: [
      { title: "Cutiuțe muzicale cu manivelă din lemn | Cutiuța Magică" },
      {
        name: "description",
        content:
          "Descoperă cutiuțe muzicale din lemn cu manivelă și mecanism mecanic clasic, potrivite pentru cadou, aniversări și fanii poveștilor îndrăgite.",
      },
      { property: "og:title", content: "Cutiuțe muzicale cu manivelă | Cutiuța Magică" },
      {
        property: "og:description",
        content:
          "Catalog de cutiuțe muzicale cadou, cu fotografii ale produselor și melodii tematice.",
      },
      { property: "og:url", content: CATALOG_URL },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://cutiutamagica.eu/scenes/catalog-atelier.webp" },
      { property: "og:image:width", content: "1672" },
      { property: "og:image:height", content: "941" },
      {
        property: "og:image:alt",
        content: "Cutiuțe muzicale într-un decor de lectură, colecție și daruri",
      },
    ],
    links: [{ rel: "canonical", href: CATALOG_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: safeJsonLd({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Cutiuțe muzicale cu manivelă",
          url: CATALOG_URL,
          inLanguage: "ro-RO",
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: loaderData?.catalog.length ?? 0,
            itemListElement: (loaderData?.catalog ?? []).map((product, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `https://cutiutamagica.eu/produs/${encodeURIComponent(product.slug)}`,
              name: product.name,
            })),
          },
        }).replace(/</g, "\\u003c"),
      },
    ],
  }),
});

function ProductsPage() {
  const { products } = useShop();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const list = useMemo(() => filterCatalog(products, search), [products, search]);
  const available = list.filter(isAvailable);
  const upcoming = list.filter((product) => !isAvailable(product));
  const filtered = Boolean(search.q || search.collection || search.available);
  const activeCollection = catalogCollections.find((c) => c.id === search.collection);
  const update = (next: CatalogSearch, replace = false) => {
    void navigate({ search: next, replace, resetScroll: false });
  };
  const showAll = () => update({});

  return (
    <div className="catalog-world" data-collection={search.collection ?? "all"}>
      <section className="catalog-intro" aria-labelledby="catalog-title">
        <picture className="catalog-scenery" aria-hidden="true">
          <source media="(max-width: 640px)" srcSet="/scenes/catalog-atelier-mobile.webp" />
          <img
            src="/scenes/catalog-atelier.webp"
            width="1672"
            height="941"
            alt=""
            fetchPriority="high"
          />
        </picture>
        <div className="catalog-intro-copy">
          <span className="catalog-eyebrow">
            <Music2 size={14} aria-hidden="true" /> Lemn · manivelă · melodie
          </span>
          <h1 id="catalog-title">
            O cutiuță mică.
            <br />
            <em>O poveste doar a ta.</em>
          </h1>
          <p>
            Cutiuțe muzicale cu manivelă, pentru poveștile pe care le iubești și oamenii pe care îi
            porți în suflet.
          </p>
          <Link
            to="/produse"
            search={{}}
            hash="catalog-alegere"
            resetScroll={false}
            className="catalog-gold-button"
          >
            Afișează toate cutiuțele <ArrowDown size={16} aria-hidden="true" />
          </Link>
          <span className="catalog-intro-note">Învârți manivela. Amintirile prind glas.</span>
        </div>
      </section>

      <div className="catalog-content" id="catalog-alegere">
        <p className="catalog-guide-entry">
          Alegi pentru cineva drag?{" "}
          <Link to="/cadouri">Explorează ideile de cadouri pentru sărbători ↗</Link>
        </p>
        <section aria-labelledby="catalog-collections-title">
          <div className="catalog-section-heading">
            <div>
              <span className="catalog-eyebrow">Trei feluri de a dărui magie</span>
              <h2 id="catalog-collections-title">Unde începe povestea ta?</h2>
            </div>
            <button
              type="button"
              className="catalog-all-button"
              aria-pressed={!filtered}
              onClick={showAll}
            >
              Toate cutiuțele <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="catalog-collections" role="group" aria-label="Alege o colecție">
            {catalogCollections.map((collection, index) => {
              const Icon = collectionIcons[collection.id];
              const count = products.filter((p) => collectionFor(p) === collection.id).length;
              return (
                <button
                  key={collection.id}
                  type="button"
                  className="catalog-collection"
                  data-collection={collection.id}
                  aria-pressed={search.collection === collection.id}
                  onClick={() =>
                    update({
                      ...search,
                      collection: search.collection === collection.id ? undefined : collection.id,
                    })
                  }
                >
                  <span className="catalog-collection-top">
                    <Icon size={23} aria-hidden="true" />
                    <span>
                      0{index + 1} / {count} {count === 1 ? "model" : "modele"}
                    </span>
                  </span>
                  <strong>{collection.title}</strong>
                  <span className="catalog-collection-subtitle">{collection.subtitle}</span>
                  <span className="catalog-collection-detail">{collection.detail}</span>
                  <span className="catalog-collection-action">
                    {search.collection === collection.id
                      ? "Colecție selectată"
                      : "Explorează colecția"}
                    <ArrowRight size={15} aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="catalog-browser" aria-labelledby="catalog-results-title">
          <div className="catalog-search-bar" role="search" aria-label="Caută în colecții">
            <label className="catalog-search-field">
              <span className="sr-only">Caută după melodie, poveste sau cadou</span>
              <Search size={19} aria-hidden="true" />
              <input
                type="search"
                value={search.q ?? ""}
                maxLength={100}
                autoComplete="off"
                onChange={(event) =>
                  update({ ...search, q: event.target.value || undefined }, true)
                }
                placeholder="Harry Potter, Sunshine, un cadou…"
              />
              {search.q && (
                <button
                  type="button"
                  aria-label="Șterge căutarea"
                  onClick={() => update({ ...search, q: undefined }, true)}
                >
                  <X size={18} />
                </button>
              )}
            </label>
            <label className="catalog-availability">
              <input
                type="checkbox"
                checked={Boolean(search.available)}
                onChange={(event) =>
                  update({ ...search, available: event.target.checked ? true : undefined })
                }
              />
              <span>Disponibile acum</span>
            </label>
          </div>
          <div className="catalog-result-heading">
            <div>
              <h2 id="catalog-results-title">
                {activeCollection?.title ?? "Toate cutiuțele muzicale"}
              </h2>
              <p role="status" aria-live="polite" aria-atomic="true">
                {list.length} {list.length === 1 ? "model găsit" : "modele găsite"}
                {search.q?.trim() ? ` pentru „${search.q.trim()}”` : ""} · {available.length}{" "}
                disponibile acum
              </p>
            </div>
            {filtered && (
              <button type="button" className="catalog-reset" onClick={showAll}>
                <X size={15} aria-hidden="true" /> Resetează filtrele
              </button>
            )}
          </div>
          {available.length > 0 && (
            <div className="catalog-grid">
              {available.map((product, index) => (
                <div
                  className="catalog-product"
                  data-collection={collectionFor(product)}
                  key={product.id}
                >
                  <span className="catalog-product-collection">
                    {catalogCollections.find((c) => c.id === collectionFor(product))?.title}
                  </span>
                  <ProductCard product={product} index={index} variant="solid" />
                </div>
              ))}
            </div>
          )}
          {upcoming.length > 0 && (
            <section className="catalog-upcoming" aria-labelledby="catalog-upcoming-title">
              <div className="catalog-section-heading">
                <div>
                  <span className="catalog-eyebrow">
                    <Sparkles size={14} aria-hidden="true" /> Povești de așteptat
                  </span>
                  <h2 id="catalog-upcoming-title">Magia care urmează</h2>
                  <p>
                    Modele în pregătire sau care revin în colecție. Deschide cutiuța preferată
                    pentru detalii.
                  </p>
                </div>
              </div>
              <div className="catalog-grid">
                {upcoming.map((product, index) => (
                  <div
                    className="catalog-product"
                    data-collection={collectionFor(product)}
                    key={product.id}
                  >
                    <span className="catalog-product-collection">
                      {catalogCollections.find((c) => c.id === collectionFor(product))?.title}
                    </span>
                    <ProductCard product={product} index={index} variant="solid" />
                  </div>
                ))}
              </div>
            </section>
          )}
          {list.length === 0 && (
            <div className="catalog-empty">
              <Search size={30} aria-hidden="true" />
              <h3>Încă nu am găsit această poveste.</h3>
              <p>Încearcă numele melodiei sau explorează toate cutiuțele.</p>
              <button type="button" className="catalog-gold-button" onClick={showAll}>
                Afișează toate cutiuțele <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
        <aside className="catalog-closing">
          <Music2 size={28} aria-hidden="true" />
          <div>
            <h2>Magia începe cu o simplă rotire.</h2>
            <p>Lemn gravat, capac cu poveste și mecanism metalic. Fără baterii, fără aplicație.</p>
          </div>
          <Link to="/despre-cutiuta" className="catalog-all-button">
            Descoperă cutiuța <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
