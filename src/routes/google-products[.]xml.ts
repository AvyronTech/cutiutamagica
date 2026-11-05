import { renderGoogleMerchantFeed } from "@/lib/google-merchant-feed";
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { listPublicCatalog } from "@/server/db/catalog.repository";

export const Route = createFileRoute("/google-products.xml")({
  server: {
    handlers: {
      GET: async () => {
        const products = await listPublicCatalog(env.DB);
        return new Response(renderGoogleMerchantFeed(products), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=900",
            "X-Content-Type-Options": "nosniff",
            "X-Robots-Tag": "noindex, follow",
          },
        });
      },
    },
  },
});
