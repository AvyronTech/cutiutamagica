import { describe, expect, it } from "vitest";
import type { CatalogProduct } from "@/server/db/catalog.repository";
import { merchantProducts, renderGoogleMerchantFeed } from "@/lib/google-merchant-feed";

const product = (overrides: Partial<CatalogProduct> = {}): CatalogProduct =>
  ({
    id: "product-1",
    slug: "cutiuta-magica",
    sku: "CM-001",
    gtin: null,
    mpn: null,
    name: "Cutiuță & melodie",
    shortName: "Cutiuță",
    tagline: "Un dar cu poveste",
    description: "Cutiuță muzicală din lemn, cu mecanism manual.",
    shortDescription: "Cutiuță muzicală",
    story: "",
    category: "Cadouri Speciale",
    brand: "Cutiuța Magică",
    mechanismType: "manual_crank",
    material: "Lemn",
    melody: "Melodie",
    price: 149,
    originalPrice: null,
    currency: "RON",
    imageUrl: "/produse/cutiuta/card.webp?a=1&b=2",
    updatedAt: "2026-09-28T12:00:00Z",
    availability: "available",
    collection: "story",
    sortOrder: 1,
    featured: true,
    preorderEnabled: false,
    releaseNote: "",
    details: [],
    searchTerms: [],
    gallery: [
      { src: "/produse/cutiuta/card.webp?a=1&b=2", label: "Principală" },
      { src: "/produse/cutiuta/2.webp", label: "Detaliu" },
    ],
    seoTitle: "",
    seoDescription: "",
    discovery: null,
    scene: { scene: "atelier", accent: "amber", occasion: "gift" },
    ...overrides,
  }) as CatalogProduct;

describe("Google Merchant feed", () => {
  it("exports only products that can actually be purchased", () => {
    const products = [
      product(),
      product({ id: "soon", slug: "soon", availability: "coming_soon" }),
      product({ id: "no-price", slug: "no-price", price: null }),
      product({ id: "no-image", slug: "no-image", imageUrl: null }),
    ];
    expect(merchantProducts(products)).toHaveLength(1);
  });

  it("renders escaped, absolute and policy-safe product data", () => {
    const feed = renderGoogleMerchantFeed([product()]);
    expect(feed).toContain('<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">');
    expect(feed).toContain("<g:title>Cutiuță &amp; melodie</g:title>");
    expect(feed).toContain("<g:price>149.00 RON</g:price>");
    expect(feed).toContain("https://cutiutamagica.eu/produse/cutiuta/card.webp?a=1&amp;b=2");
    expect(feed).toContain("<g:identifier_exists>no</g:identifier_exists>");
    expect(feed).toContain("<g:additional_image_link>");
  });

  it("uses verified manufacturer identifiers when they exist", () => {
    const feed = renderGoogleMerchantFeed([product({ gtin: "0123456789012", mpn: "MPN-1" })]);
    expect(feed).toContain("<g:gtin>0123456789012</g:gtin>");
    expect(feed).toContain("<g:mpn>MPN-1</g:mpn>");
    expect(feed).not.toContain("<g:identifier_exists>no</g:identifier_exists>");
  });
});
