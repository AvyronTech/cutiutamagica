import type { CatalogProduct } from "@/server/db/catalog.repository";
import { DISCOVERY_UPDATED, giftGuides } from "@/data/gift-guides";
import { productPath } from "@/lib/product-url";
const base = "https://cutiutamagica.eu";
const PRODUCT_EXPERIENCE_UPDATED = "2026-10-09";
export type SitemapProduct = Pick<CatalogProduct, "slug" | "updatedAt" | "imageUrl" | "gallery">;
const xml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
function date(value: string): string | undefined {
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day)) ? day : undefined;
}
export function renderSitemap(products: SitemapProduct[]): string {
  const productImages = new Map(products.map((product) => [product.slug, product.imageUrl]));
  const catalogDate = products
    .map((p) => date(p.updatedAt))
    .filter((v): v is string => !!v)
    .sort()
    .at(-1);
  const entries: Array<{ path: string; lastmod?: string; images?: string[] }> = [
    { path: "/", lastmod: "2026-10-09", images: ["/produse/hp-keeper/1.webp"] },
    {
      path: "/produse",
      lastmod:
        catalogDate && catalogDate > PRODUCT_EXPERIENCE_UPDATED
          ? catalogDate
          : PRODUCT_EXPERIENCE_UPDATED,
    },
    {
      path: "/despre-cutiuta",
      lastmod: "2026-10-03",
      images: ["/scenes/catalog-atelier.webp"],
    },
    { path: "/despre-noi", lastmod: "2026-10-04", images: ["/scenes/catalog-atelier.webp"] },
    { path: "/magic-rewards", lastmod: "2026-10-04", images: ["/icon-512.png"] },
    { path: "/livrare", lastmod: "2026-09-28" },
    { path: "/cadouri", lastmod: DISCOVERY_UPDATED, images: ["/scenes/catalog-atelier.webp"] },
    ...giftGuides.map((g) => ({
      path: `/cadouri/${g.slug}`,
      lastmod: DISCOVERY_UPDATED,
      images: g.productIds
        .map((productId) => productImages.get(productId))
        .filter((image): image is string => Boolean(image)),
    })),
    { path: "/ghid-cadouri-personalizate", lastmod: "2026-10-04" },
    { path: "/retur", lastmod: "2026-10-04" },
    ...products.map((p) => {
      const productDate = date(p.updatedAt);
      return {
        path: productPath(p.slug),
        lastmod:
          productDate && productDate > PRODUCT_EXPERIENCE_UPDATED
            ? productDate
            : productDate
              ? PRODUCT_EXPERIENCE_UPDATED
              : undefined,
        images: [
          ...new Set([p.imageUrl, ...(p.gallery ?? []).map((entry) => entry.src)].filter(Boolean)),
        ] as string[],
      };
    }),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries
    .map((entry) => {
      const images = (entry.images ?? [])
        .map((source) => {
          try {
            const url = new URL(source, base);
            return ["https:", "http:"].includes(url.protocol)
              ? `<image:image><image:loc>${xml(url.href)}</image:loc></image:image>`
              : "";
          } catch {
            return "";
          }
        })
        .join("");
      return `  <url><loc>${xml(base + entry.path)}</loc>${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ""}${images}</url>`;
    })
    .join("\n")}\n</urlset>`;
}
