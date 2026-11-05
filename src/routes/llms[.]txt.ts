import { renderLlmsTxt } from "@/lib/seo-llms";
import { listPublicCatalog } from "@/server/db/catalog.repository";
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { env } from "cloudflare:workers";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const products = await listPublicCatalog(env.DB);
          return new Response(renderLlmsTxt(products), {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "public, max-age=300, s-maxage=3600",
              "X-Content-Type-Options": "nosniff",
            },
          });
        } catch (error) {
          console.error("llms.catalog_read_failed", error);
          return new Response("Temporarily unavailable", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          });
        }
      },
    },
  },
});
