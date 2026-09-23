import type { CatalogProduct } from "@/server/db/catalog.repository";
import { DISCOVERY_UPDATED, giftGuides } from "@/data/gift-guides";
const base = "https://cutiutamagica.eu";
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
export function renderSitemap(products: CatalogProduct[]): string {
  const catalogDate = products
    .map((p) => date(p.updatedAt))
    .filter((v): v is string => !!v)
    .sort()
    .at(-1);
  const entries: Array<{ path: string; lastmod?: string; image?: string }> = [
    { path: "/", lastmod: DISCOVERY_UPDATED },
    {
      path: "/produse",
      lastmod: catalogDate && catalogDate > DISCOVERY_UPDATED ? catalogDate : DISCOVERY_UPDATED,
    },
    { path: "/despre-cutiuta", lastmod: DISCOVERY_UPDATED },
    { path: "/cadouri", lastmod: DISCOVERY_UPDATED },
    ...giftGuides.map((g) => ({ path: `/cadouri/${g.slug}`, lastmod: DISCOVERY_UPDATED })),
    { path: "/ghid-cadouri-personalizate", lastmod: "2026-09-05" },
    { path: "/retur", lastmod: "2026-09-15" },
    { path: "/termeni-de-utilizare", lastmod: "2026-09-15" },
    { path: "/politica-de-confidentialitate", lastmod: "2026-09-15" },
    ...products.map((p) => ({
      path: `/produs/${encodeURIComponent(p.slug)}`,
      lastmod: date(p.updatedAt),
      image: p.imageUrl || undefined,
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries
    .map((entry) => {
      let image = "";
      if (entry.image) {
        try {
          const url = new URL(entry.image, base);
          if (["https:", "http:"].includes(url.protocol))
            image = `<image:image><image:loc>${xml(url.href)}</image:loc></image:image>`;
        } catch {
          /* Omit invalid media URLs. */
        }
      }
      return `  <url><loc>${xml(base + entry.path)}</loc>${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ""}${image}</url>`;
    })
    .join("\n")}\n</urlset>`;
}
