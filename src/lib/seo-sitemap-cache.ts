import { renderProductSitemap, renderTextSitemap, type SitemapProduct } from "@/lib/seo-sitemap";

const CACHE_KEY = "seo:sitemap:documents:v3";
const FRESH_FOR_MS = 15 * 60 * 1000;
const RETAIN_FOR_SECONDS = 7 * 24 * 60 * 60;

type SitemapCache = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
};
type CachedSitemap = { generatedAt: number; productsXml: string; text: string };

function parseCachedSitemap(value: string | null): CachedSitemap | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Partial<CachedSitemap>;
    return typeof record.generatedAt === "number" &&
      Number.isFinite(record.generatedAt) &&
      typeof record.productsXml === "string" &&
      record.productsXml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset ') &&
      record.productsXml.endsWith("</urlset>") &&
      typeof record.text === "string" &&
      record.text.startsWith("https://cutiutamagica.eu/") &&
      record.text.endsWith("\n")
      ? { generatedAt: record.generatedAt, productsXml: record.productsXml, text: record.text }
      : null;
  } catch {
    return null;
  }
}

export async function loadSitemap(
  cache: SitemapCache,
  loadProducts: () => Promise<SitemapProduct[]>,
  now = Date.now(),
): Promise<{ productsXml: string; text: string; stale: boolean }> {
  let cached: CachedSitemap | null = null;
  try {
    cached = parseCachedSitemap(await cache.get(CACHE_KEY));
  } catch (error) {
    console.warn("sitemap.cache_read_failed", error);
  }

  if (cached && now >= cached.generatedAt && now - cached.generatedAt < FRESH_FOR_MS) {
    return { productsXml: cached.productsXml, text: cached.text, stale: false };
  }

  try {
    const products = await loadProducts();
    const productsXml = renderProductSitemap(products);
    const text = renderTextSitemap(products);
    try {
      await cache.put(CACHE_KEY, JSON.stringify({ generatedAt: now, productsXml, text }), {
        expirationTtl: RETAIN_FOR_SECONDS,
      });
    } catch (error) {
      // A KV write failure must not make a valid sitemap unavailable.
      console.warn("sitemap.cache_write_failed", error);
    }
    return { productsXml, text, stale: false };
  } catch (error) {
    if (cached) {
      console.warn("sitemap.catalog_read_failed_using_cache", error);
      return { productsXml: cached.productsXml, text: cached.text, stale: true };
    }
    throw error;
  }
}
