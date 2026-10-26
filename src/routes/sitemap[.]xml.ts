import { loadSitemap } from "@/lib/seo-sitemap-cache";
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { listPublicCatalog } from "@/server/db/catalog.repository";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const sitemap = await loadSitemap(env.CACHE, () => listPublicCatalog(env.DB));
          return new Response(sitemap.xml, {
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": sitemap.stale
                ? "public, max-age=60, s-maxage=60"
                : "public, max-age=300, s-maxage=900",
              "X-Sitemap-Source": sitemap.stale ? "stale-cache" : "catalog-cache",
            },
          });
        } catch (error) {
          console.error("sitemap.catalog_read_failed", error);
          return new Response("Sitemap temporarily unavailable", {
            status: 503,
            headers: { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      },
    },
  },
});
