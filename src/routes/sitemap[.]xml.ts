import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { listPublicCatalog } from "@/server/db/catalog.repository";

const BASE_URL = "https://cutiutamagica.eu";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const products = await listPublicCatalog(env.DB);
        const paths = [
          { path: "/", lastmod: "2026-09-05" },
          { path: "/produse", lastmod: "2026-09-05" },
          { path: "/poveste", lastmod: "2026-06-09" },
          { path: "/ghid-cadouri-personalizate", lastmod: "2026-09-05" },
          { path: "/retur", lastmod: "2026-09-15" },
          { path: "/termeni-de-utilizare", lastmod: "2026-09-15" },
          { path: "/politica-de-confidentialitate", lastmod: "2026-09-15" },
          ...products.map((product) => ({
            path: `/produs/${encodeURIComponent(product.slug)}`,
            lastmod: product.updatedAt.slice(0, 10),
          })),
        ];
        const urls = paths
          .map(
            (e) =>
              `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <lastmod>${e.lastmod}</lastmod>\n  </url>`,
          )
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=86400",
          },
        });
      },
    },
  },
});
