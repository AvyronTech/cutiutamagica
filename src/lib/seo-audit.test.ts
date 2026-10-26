import { describe, expect, it } from "vitest";
import type { CatalogProduct } from "@/server/db/catalog.repository";
import { auditSeoCatalog } from "./seo-audit";

describe("SEO catalog audit", () => {
  it("marks an empty public catalog as a technical blocker", () => {
    const audit = auditSeoCatalog([]);
    expect(audit.findings[0]?.title).toBe("Catalogul public este gol");
    expect(audit.criticalCount).toBe(1);
  });

  it("flags concrete missing product fields without inventing live index status", () => {
    const product = {
      slug: "kitten",
      name: "Pisicuță",
      imageUrl: null,
      description: "",
      shortDescription: "",
      seoTitle: "",
      seoDescription: "",
      sku: "",
      price: null,
      availability: "available",
    } as CatalogProduct;
    const audit = auditSeoCatalog([product]);
    expect(audit.criticalCount).toBeGreaterThan(0);
    expect(audit.findings.map((finding) => finding.title)).toContain(
      "Pisicuță: fără fotografie publică",
    );
    expect(audit.findings[0]?.path).toBe("/produs-cutiuta-muzicala-pisicuta-si-luna");
  });
});
