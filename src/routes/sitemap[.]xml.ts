import { renderSitemap } from "@/lib/seo-sitemap";
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { listPublicCatalog } from "@/server/db/catalog.repository";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const products = await listPublicCatalog(env.DB);
          return new Response(renderSitemap(products), {
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": "public, max-age=3600, s-maxage=86400",
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
