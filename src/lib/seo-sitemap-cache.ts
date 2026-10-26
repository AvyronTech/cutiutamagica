import { renderSitemap, type SitemapProduct } from "@/lib/seo-sitemap";

const CACHE_KEY = "seo:sitemap:xml:v1";
const FRESH_FOR_MS = 15 * 60 * 1000;
const RETAIN_FOR_SECONDS = 7 * 24 * 60 * 60;

type SitemapCache = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
};
type CachedSitemap = { generatedAt: number; xml: string };

function parseCachedSitemap(value: string | null): CachedSitemap | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const record = parsed as Partial<CachedSitemap>;
    return typeof record.generatedAt === "number" &&
      Number.isFinite(record.generatedAt) &&
      typeof record.xml === "string" &&
      record.xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset ') &&
      record.xml.endsWith("</urlset>")
      ? { generatedAt: record.generatedAt, xml: record.xml }
      : null;
  } catch {
    return null;
  }
}

export async function loadSitemap(
  cache: SitemapCache,
  loadProducts: () => Promise<SitemapProduct[]>,
  now = Date.now(),
): Promise<{ xml: string; stale: boolean }> {
  let cached: CachedSitemap | null = null;
  try {
    cached = parseCachedSitemap(await cache.get(CACHE_KEY));
  } catch (error) {
    console.warn("sitemap.cache_read_failed", error);
  }

  if (cached && now >= cached.generatedAt && now - cached.generatedAt < FRESH_FOR_MS) {
    return { xml: cached.xml, stale: false };
  }

  try {
    const xml = renderSitemap(await loadProducts());
    try {
      await cache.put(CACHE_KEY, JSON.stringify({ generatedAt: now, xml }), {
        expirationTtl: RETAIN_FOR_SECONDS,
      });
    } catch (error) {
      // A KV write failure must not make a valid sitemap unavailable.
      console.warn("sitemap.cache_write_failed", error);
    }
    return { xml, stale: false };
  } catch (error) {
    if (cached) {
      console.warn("sitemap.catalog_read_failed_using_cache", error);
      return { xml: cached.xml, stale: true };
    }
    throw error;
  }
}
