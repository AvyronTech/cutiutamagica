import { describe, expect, it } from "vitest";
import { loadSitemap } from "./seo-sitemap-cache";
import type { SitemapProduct } from "./seo-sitemap";

const products: SitemapProduct[] = [
  {
    slug: "got-winter",
    updatedAt: "2026-10-20",
    imageUrl: "/produse/got-winter/card.webp",
    gallery: [],
  },
];

function memoryCache() {
  const values = new Map<string, string>();
  return {
    values,
    async get(key: string) {
      return values.get(key) ?? null;
    },
    async put(key: string, value: string, _options: { expirationTtl: number }) {
      values.set(key, value);
    },
  };
}

describe("sitemap availability", () => {
  it("serves a fresh catalog snapshot without another database read", async () => {
    const cache = memoryCache();
    const first = await loadSitemap(cache, async () => products, 1_000_000);
    const second = await loadSitemap(
      cache,
      async () => {
        throw new Error("database should not be queried");
      },
      1_000_001,
    );
    expect(second).toEqual(first);
    expect(second.productsXml).toContain("/produs-cutiuta-muzicala-winter-is-coming</loc>");
    expect(second.text).toContain(
      "https://cutiutamagica.eu/produs-cutiuta-muzicala-winter-is-coming\n",
    );
  });

  it("retains the last valid sitemap when the database is temporarily unavailable", async () => {
    const cache = memoryCache();
    const first = await loadSitemap(cache, async () => products, 1_000_000);
    const fallback = await loadSitemap(
      cache,
      async () => {
        throw new Error("temporary D1 outage");
      },
      2_000_000,
    );
    expect(fallback).toEqual({ productsXml: first.productsXml, text: first.text, stale: true });
    const recovered = await loadSitemap(cache, async () => [], 2_000_001);
    expect(recovered.stale).toBe(false);
    expect(recovered.productsXml).not.toContain("/produs-cutiuta-muzicala-winter-is-coming</loc>");
  });

  it("does not treat a corrupt cache value as a valid sitemap", async () => {
    const cache = memoryCache();
    cache.values.set("seo:sitemap:documents:v3", '{"generatedAt":1000000,"productsXml":"broken"}');
    const result = await loadSitemap(cache, async () => products, 1_000_001);
    expect(result.stale).toBe(false);
    expect(result.productsXml).toContain("<urlset ");
  });

  it("returns a valid sitemap when the cache cannot be written", async () => {
    const cache = memoryCache();
    cache.put = async () => {
      throw new Error("temporary KV outage");
    };
    const result = await loadSitemap(cache, async () => products, 1_000_000);
    expect(result.stale).toBe(false);
    expect(result.productsXml).toContain("/produs-cutiuta-muzicala-winter-is-coming</loc>");
  });
});
