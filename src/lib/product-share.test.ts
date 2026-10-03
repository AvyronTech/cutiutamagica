import { describe, expect, it } from "vitest";
import { productCanonicalUrl, productShareMessage, productShareTargets } from "@/lib/product-share";

describe("product share links", () => {
  const input = {
    id: "cutiuta-luna & stele",
    name: "Cutiuța Luna",
    tagline: "O poveste de seară",
    image: "/images/luna.webp",
  };

  it("uses the canonical, encoded product URL", () => {
    expect(productCanonicalUrl(input.id)).toBe(
      "https://cutiutamagica.eu/produs/cutiuta-luna%20%26%20stele",
    );
  });

  it("builds distinct destinations without tracking parameters", () => {
    const targets = productShareTargets(input);

    expect(targets).toHaveLength(9);
    expect(new Set(targets.map((target) => target.id)).size).toBe(9);
    expect(targets.every((target) => !target.href.includes("utm_"))).toBe(true);
    expect(targets.find((target) => target.id === "pinterest")?.href).toContain(
      encodeURIComponent("https://cutiutamagica.eu/images/luna.webp"),
    );
    expect(targets.find((target) => target.id === "telegram")?.href).toContain(
      encodeURIComponent(productCanonicalUrl(input.id)),
    );
  });

  it("keeps the shared copy specific to the product", () => {
    expect(productShareMessage(input.name, input.tagline)).toContain(input.name);
    expect(productShareMessage(input.name, input.tagline)).toContain(input.tagline);
  });
});
