import { describe, expect, it } from "vitest";
import {
  isKnownProductId,
  productIdFromPathname,
  productPath,
  productPublicSlugEntries,
} from "@/lib/product-url";

describe("product public URLs", () => {
  it("uses unique representative names of no more than three words", () => {
    const publicSlugs = productPublicSlugEntries.map(([, slug]) => slug);
    expect(new Set(publicSlugs).size).toBe(publicSlugs.length);
    for (const slug of publicSlugs) {
      expect(slug.split("-").length).toBeLessThanOrEqual(3);
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+){0,2}$/);
    }
  });

  it("builds Romanian product paths and resolves them to stable catalog ids", () => {
    expect(productPath("hp-keeper")).toBe("/produs-cutiuta-muzicala-harry-potter-hedwig");
    expect(productIdFromPathname(productPath("hp-keeper"))).toBe("hp-keeper");
  });

  it("recognizes legacy product paths during the redirect transition", () => {
    expect(productIdFromPathname("/produs/hp-keeper")).toBe("hp-keeper");
    expect(isKnownProductId("got-winter")).toBe(true);
    expect(isKnownProductId("unknown-product")).toBe(false);
  });
});
