import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Gift, Search, Settings2, X } from "lucide-react";
import { isAvailable } from "@/data/products";
import { getStorePricing } from "@/lib/store-pricing.functions";
import { useShop } from "@/store/shop";
import { ProductCard } from "@/components/site/ProductCard";

const CATALOG_URL = "https://cutiutamagica.eu/produse";
const catalogGroups = [
  {
    id: "legendary-worlds",
    label: "Lumi legendare",
    productIds: ["hp-keeper", "got-winter", "lotr-rings", "hp-always", "pirates", "starwars-dad"],
  },
  {
    id: "magic-mystery",
    label: "Magie & mister",
    productIds: ["halloween", "got-winter", "hp-keeper", "fairy", "hp-always", "lotr-rings"],
  },
  {
    id: "heartfelt-gifts",
    label: "Cadouri cu suflet",
    productIds: ["kitten", "sunshine", "hp-keeper", "fairy", "starwars-dad", "lotr-rings"],
  },
] as const;

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("ro-RO")
    .trim();
}

export const Route = createFileRoute("/produse")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => {
    const q = typeof search.q === "string" ? search.q.trim().slice(0, 100) : "";
    return q ? { q } : {};
  },
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
    ],
    links: [{ rel: "canonical", href: CATALOG_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
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
        }),
      },
    ],
  }),
});

function ProductsPage() {
  const { products } = useShop();
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [groupId, setGroupId] = useState<(typeof catalogGroups)[number]["id"]>(catalogGroups[0].id);
  const [productId, setProductId] = useState<string | null>(null);
  const activeGroup = catalogGroups.find((group) => group.id === groupId) ?? catalogGroups[0];
  const groupProducts = useMemo(
    () =>
      activeGroup.productIds
        .map((id) => products.find((product) => product.id === id))
        .filter((product): product is (typeof products)[number] =>
          Boolean(product && isAvailable(product)),
        ),
    [activeGroup, products],
  );
  const normalizedQuery = normalizeSearch(q ?? "");
  const list = useMemo(
    () =>
      products.filter((product) => {
        const searchable = normalizeSearch(
          [
            product.name,
            product.tagline,
            product.melody,
            product.category,
            product.description,
            ...product.searchTerms,
          ]
            .filter(Boolean)
            .join(" "),
        );
        if (normalizedQuery) return searchable.includes(normalizedQuery);
        if (productId) return product.id === productId;
        return activeGroup.productIds.some((id) => id === product.id);
      }),
    [activeGroup, normalizedQuery, productId, products],
  );

  const updateQuery = (value: string) => {
    navigate({ search: value ? { q: value } : {}, replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 text-center">
      <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--wood)]">Catalog</div>
      <h1 className="mt-1 font-display text-4xl md:text-6xl">Cutiuțe muzicale cu manivelă</h1>
      <p className="mx-auto mt-3 max-w-3xl text-muted-foreground">
        Alege o cutiuță muzicală din lemn după melodie, temă sau persoana căreia vrei să o
        dăruiești. Fiecare model folosește un mecanism mecanic manual, acționat prin manivelă.
      </p>

      <div className="mx-auto mt-7 max-w-xl">
        <label className="relative block text-left">
          <span className="sr-only">Caută o cutiuță muzicală</span>
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q ?? ""}
            onChange={(event) => updateQuery(event.target.value)}
            placeholder="Caută melodie, poveste sau cadou..."
            className="w-full rounded-full border border-border bg-card py-3 pl-11 pr-11 text-sm outline-none focus:border-primary"
          />
          {q && (
            <button
              type="button"
              onClick={() => updateQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 hover:bg-muted"
              aria-label="Șterge căutarea"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
      </div>

      <section className="mx-auto mt-6 max-w-4xl" aria-labelledby="catalog-filter-title">
        <h2 id="catalog-filter-title" className="sr-only">
          Filtrează catalogul
        </h2>
        <div className="flex flex-wrap justify-center gap-2" aria-label="Alege categoria">
          {catalogGroups.map((group) => (
            <button
              type="button"
              key={group.id}
              aria-pressed={groupId === group.id}
              onClick={() => {
                setGroupId(group.id);
                setProductId(null);
                if (q) updateQuery("");
              }}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${groupId === group.id && !normalizedQuery ? "wood-grain border-transparent text-[color:var(--cream)] shadow-warm" : "border-border bg-card/70 hover:bg-muted"}`}
            >
              {group.label}
            </button>
          ))}
        </div>

        {!normalizedQuery && (
          <div
            className="mt-3 flex flex-wrap justify-center gap-1.5 rounded-xl border border-border/70 bg-card/50 p-2.5"
            aria-label={`Modele din categoria ${activeGroup.label}`}
          >
            <button
              type="button"
              aria-pressed={productId === null}
              onClick={() => setProductId(null)}
              className={`rounded-full px-3 py-1.5 text-xs transition ${productId === null ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              Toate modelele
            </button>
            {groupProducts.map((product) => (
              <button
                type="button"
                key={product.id}
                aria-pressed={productId === product.id}
                onClick={() => setProductId(product.id)}
                className={`max-w-full truncate rounded-full px-3 py-1.5 text-xs transition ${productId === product.id ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                {product.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {[
        { key: "now", title: "Disponibile acum", items: list.filter(isAvailable) },
        {
          key: "soon",
          title: "În curând",
          note: "Modele pe care le pregătim pentru magazin.",
          items: list.filter((product) => !isAvailable(product)),
        },
      ]
        .filter((group) => group.items.length > 0)
        .map((group, groupIndex) => (
          <section key={group.key} className={groupIndex === 0 ? "mt-10" : "mt-16"}>
            <div className="flex flex-col items-center gap-1">
              <h2 className="font-display text-2xl md:text-3xl">
                {group.title}{" "}
                <span className="text-base text-muted-foreground">({group.items.length})</span>
              </h2>
              {group.note && <p className="text-sm text-muted-foreground">{group.note}</p>}
            </div>
            <div className="mt-6 grid gap-5 text-left sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.items.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} variant="solid" />
              ))}
            </div>
          </section>
        ))}

      {list.length === 0 && (
        <div className="mx-auto mt-12 max-w-md rounded-lg border border-border bg-card p-8">
          <Search className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">Nu am găsit un model pentru această căutare.</p>
          <button
            type="button"
            onClick={() => {
              updateQuery("");
              setGroupId(catalogGroups[0].id);
              setProductId(null);
            }}
            className="mt-4 rounded-full border border-primary/40 px-4 py-2 text-sm hover:bg-primary/5"
          >
            Vezi toate cutiuțele
          </button>
        </div>
      )}

      <section className="mx-auto mt-20 grid max-w-5xl gap-4 text-left md:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <Settings2 className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-display text-2xl">Mecanism clasic, fără baterii</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Manivela pune în mișcare mecanismul muzical. Ritmul melodiei este controlat chiar de
            gestul celui care rotește manivela, ceea ce transformă cutiuța într-un obiect interactiv
            și ușor de dăruit.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <Gift className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-display text-2xl">Cutiuță cadou pentru o poveste anume</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Poți căuta o cutiuță muzicală Harry Potter, o cutiuță cu piesă inspirată de LOTR, un
            model romantic sau o temă pentru Halloween. Verifică fotografia, melodia și detaliile
            fiecărui produs înainte de comandă.
          </p>
          <Link
            to="/ghid-cadouri-personalizate"
            className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Citește ghidul de alegere
          </Link>
        </div>
      </section>
    </div>
  );
}
