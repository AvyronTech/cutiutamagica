import { renderSitemap } from "@/lib/seo-sitemap";
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { listPublicCatalog } from "@/server/db/catalog.repository";
import { products as editorialProducts } from "@/data/products";

const editorialSitemapProducts = editorialProducts.map((product) => ({
  slug: product.id,
  updatedAt: product.updatedAt,
  imageUrl: product.image,
  gallery: product.gallery,
}));

async function sitemapProducts() {
  try {
    const catalog = await listPublicCatalog(env.DB);
    if (catalog.length > 0) return catalog;
    console.warn("sitemap.catalog_empty_fallback");
  } catch (error) {
    console.error("sitemap.catalog_read_failed", error);
  }
  return editorialSitemapProducts;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const products = await sitemapProducts();
        const xml = renderSitemap(products);
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
