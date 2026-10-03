import type { CatalogProduct } from "@/server/db/catalog.repository";

const STORE_URL = "https://cutiutamagica.eu";
const STORE_NAME = "Cutiuța Magică";

const xml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const text = (value: string) => value.replace(/\s+/g, " ").trim();

function absoluteUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, STORE_URL);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

const tag = (name: string, value: string | null | undefined) =>
  value ? `<g:${name}>${xml(value)}</g:${name}>` : "";

export function merchantProducts(products: CatalogProduct[]) {
  return products.filter(
    (product) =>
      product.availability === "available" &&
      product.price != null &&
      Number.isFinite(product.price) &&
      product.price > 0 &&
      absoluteUrl(product.imageUrl),
  );
}

export function renderGoogleMerchantFeed(products: CatalogProduct[]): string {
  const items = merchantProducts(products)
    .map((product) => {
      const productUrl = `${STORE_URL}/produs/${encodeURIComponent(product.slug)}`;
      const primaryImage = absoluteUrl(product.imageUrl)!;
      const additionalImages = [
        ...new Set(
          product.gallery
            .map((entry) => absoluteUrl(entry.src))
            .filter((value): value is string => Boolean(value && value !== primaryImage)),
        ),
      ].slice(0, 10);
      const description = text(
        product.seoDescription ||
          product.description ||
          product.shortDescription ||
          product.tagline,
      ).slice(0, 5_000);
      const hasManufacturerIdentifier = Boolean(product.gtin || product.mpn);

      return [
        "<item>",
        `<title>${xml(text(product.name).slice(0, 150))}</title>`,
        `<link>${xml(productUrl)}</link>`,
        tag("id", product.sku || product.slug),
        tag("title", text(product.name).slice(0, 150)),
        tag("description", description),
        tag("link", productUrl),
        tag("canonical_link", productUrl),
        tag("image_link", primaryImage),
        ...additionalImages.map((image) => tag("additional_image_link", image)),
        tag("condition", "new"),
        tag("availability", "in_stock"),
        tag("price", `${product.price!.toFixed(2)} ${product.currency || "RON"}`),
        tag("brand", product.brand || STORE_NAME),
        tag("gtin", product.gtin),
        tag("mpn", product.mpn),
        !hasManufacturerIdentifier ? tag("identifier_exists", "no") : "",
        tag("product_type", `Cadouri > Cutiuțe muzicale > ${product.category}`),
        "</item>",
      ]
        .filter(Boolean)
        .join("");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">\n<channel>\n<title>${STORE_NAME}</title>\n<link>${STORE_URL}</link>\n<description>Produse disponibile în magazinul online Cutiuța Magică</description>\n${items}\n</channel>\n</rss>`;
}
