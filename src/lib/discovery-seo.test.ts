import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readProductDiscovery, safeJsonLd } from "./product-discovery";
import { DISCOVERY_UPDATED, giftGuide, giftGuides } from "@/data/gift-guides";
import { renderSitemap, renderTextSitemap } from "./seo-sitemap";
import type { SitemapProduct } from "./seo-sitemap";

describe("product discovery and search metadata", () => {
  it("keeps the static guide sitemap aligned with canonical guide routes", () => {
    const xml = readFileSync(resolve("public/sitemap-guides.xml"), "utf8");
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    const expected = [
      "https://cutiutamagica.eu/cadouri",
      ...giftGuides.map((guide) => `https://cutiutamagica.eu/cadouri/${guide.slug}`),
    ];
    expect(urls).toEqual(expected);
    expect(new Set(urls).size).toBe(expected.length);
    expect((xml.match(/<lastmod>/g) ?? []).length).toBe(expected.length);
    expect(xml).toContain(`<lastmod>${DISCOVERY_UPDATED}</lastmod>`);
    expect(readFileSync(resolve("public/robots.txt"), "utf8")).toContain(
      "Sitemap: https://cutiutamagica.eu/sitemap-guides.xml",
    );
    expect(readFileSync(resolve("public/robots.txt"), "utf8")).toContain(
      "Sitemap: https://cutiutamagica.eu/sitemap.txt",
    );
  });
  it("has distinct valid editorial profiles for all ten models", () => {
    const entries = Object.values(
      JSON.parse(readFileSync(resolve("content/product-discovery.json"), "utf8")),
    ) as Array<
      Record<string, unknown> & {
        title: string;
        description: string;
        keywords: string[];
        guides: string[];
      }
    >;
    expect(entries).toHaveLength(10);
    expect(new Set(entries.map((p) => p.title)).size).toBe(10);
    expect(new Set(entries.map((p) => p.intro)).size).toBe(10);
    for (const entry of entries) {
      expect(readProductDiscovery(entry)).not.toBeNull();
      expect(entry.title.length).toBeLessThanOrEqual(70);
      expect(entry.description.length).toBeLessThanOrEqual(180);
      expect(entry.keywords.join(", ").length).toBeLessThanOrEqual(1200);
      expect(entry.guides.every((slug) => giftGuide(slug))).toBe(true);
    }
  });
  it("rejects invalid editorial data and unknown occasion routes", () => {
    expect(readProductDiscovery("invalid json")).toBeNull();
    expect(
      readProductDiscovery({
        intro: "x",
        audience: "x",
        moments: [],
        occasions: [],
        guides: ["not-a-guide"],
      }),
    ).toBeNull();
    expect(giftGuide("invented-page")).toBeUndefined();
  });
  it("publishes distinct, substantial search guides backed by real catalog products", () => {
    const productIds = new Set([
      "hp-keeper",
      "got-winter",
      "sunshine",
      "kitten",
      "halloween",
      "lotr-rings",
      "hp-always",
      "fairy",
      "pirates",
      "starwars-dad",
    ]);
    expect(giftGuides.length).toBeGreaterThanOrEqual(16);
    expect(new Set(giftGuides.map((guide) => guide.slug)).size).toBe(giftGuides.length);
    expect(new Set(giftGuides.map((guide) => guide.title)).size).toBe(giftGuides.length);
    for (const guide of giftGuides) {
      expect(guide.description.length).toBeGreaterThan(90);
      expect(guide.description.length).toBeLessThanOrEqual(180);
      expect(guide.intro.length).toBeGreaterThan(140);
      expect(guide.sections).toHaveLength(3);
      expect(guide.productIds.length).toBeGreaterThan(0);
      expect(guide.productIds.every((id) => productIds.has(id))).toBe(true);
    }
  });
  it("keeps every requested recipient page distinct and practically useful", () => {
    const recipientSlugs = [
      "pentru-iubita",
      "pentru-iubit",
      "pentru-sora",
      "pentru-mama",
      "pentru-colega",
      "secret-santa",
    ];
    const recipientGuides = recipientSlugs.map((slug) => giftGuide(slug));
    expect(recipientGuides.every(Boolean)).toBe(true);
    expect(new Set(recipientGuides.map((guide) => guide?.intro)).size).toBe(recipientSlugs.length);
    expect(new Set(recipientGuides.map((guide) => guide?.description)).size).toBe(
      recipientSlugs.length,
    );
    for (const guide of recipientGuides) {
      expect(guide?.decisionGuide?.checkpoints).toHaveLength(3);
      expect(guide?.decisionGuide?.messagePrompts).toHaveLength(3);
      expect(guide?.decisionGuide?.avoid.length).toBeGreaterThan(80);
    }
  });
  it("keeps administrator content from closing JSON-LD script elements", () => {
    const value = { name: '</script><script>alert("x")</script>' };
    const serialized = safeJsonLd(value);
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(value);
  });
  it("escapes image URLs and omits invalid media protocols and dates", () => {
    const products = [
      { slug: "music & joy", imageUrl: "/photo.webp?a=1&b=2", updatedAt: "2026-09-23T12:00:00Z" },
      { slug: "future", imageUrl: "javascript:alert(1)", updatedAt: "invalid" },
    ] as SitemapProduct[];
    const xml = renderSitemap(products);
    expect(xml).toContain("/produs-cutiuta-muzicala-music-joy</loc>");
    expect(xml).toContain("photo.webp?a=1&amp;b=2");
    expect(xml).not.toContain("javascript:");
    expect(xml).not.toContain("invalid");
    expect(xml).toContain(
      "<url><loc>https://cutiutamagica.eu/produs-cutiuta-muzicala-future</loc></url>",
    );
  });
  it("does not invent product URLs when the published catalog is empty", () => {
    const xml = renderSitemap([]);
    expect(xml).not.toContain("/produs-cutiuta-muzicala-");
    expect(xml).toContain("https://cutiutamagica.eu/cadouri");
  });
  it("keeps the text sitemap aligned with the XML sitemap", () => {
    const products = [
      { slug: "got-winter", imageUrl: "/produse/got-winter/card.webp", updatedAt: "2026-10-20" },
    ] as SitemapProduct[];
    const xml = renderSitemap(products);
    const urls = [...xml.matchAll(/<url><loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(renderTextSitemap(products).trimEnd().split("\n")).toEqual(urls);
  });
});
