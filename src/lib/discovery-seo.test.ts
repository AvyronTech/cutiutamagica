import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readProductDiscovery, safeJsonLd } from "./product-discovery";
import { giftGuide } from "@/data/gift-guides";
import { renderSitemap } from "./seo-sitemap";
import type { CatalogProduct } from "@/server/db/catalog.repository";

describe("product discovery and search metadata", () => {
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
    ] as CatalogProduct[];
    const xml = renderSitemap(products);
    expect(xml).toContain("/produs/music%20%26%20joy</loc>");
    expect(xml).toContain("photo.webp?a=1&amp;b=2");
    expect(xml).not.toContain("javascript:");
    expect(xml).not.toContain("invalid");
    expect(xml).toContain("<url><loc>https://cutiutamagica.eu/produs/future</loc></url>");
  });
});
