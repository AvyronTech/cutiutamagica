import { describe, expect, it } from "vitest";
import {
  escapeCsv,
  formatSku,
  gtinType,
  safePublicDestination,
  skuPrefix,
} from "./product-identification";

describe("product identification rules", () => {
  it("derives readable prefixes without diacritics and preserves numeric order", () => {
    expect(skuPrefix("Cadouri speciale", "Pisicuță muzicală")).toBe("PM");
    expect(skuPrefix("Crăciun", "Cutiuță roșie")).toBe("CRAC");
    expect(formatSku("PM", 12)).toBe("CM-PM-012");
  });

  it("recognizes mathematically valid GTIN lengths without claiming ownership", () => {
    expect(gtinType("96385074")).toBe("GTIN-8");
    expect(gtinType("4006381333931")).toBe("GTIN-13");
    expect(gtinType("4006381333932")).toBeNull();
  });

  it("allows only real public destinations and protects spreadsheet exports", () => {
    expect(safePublicDestination("https://cutiutamagica.eu", "/produse")).toBe(
      "https://cutiutamagica.eu/produse",
    );
    expect(safePublicDestination("http://localhost:3000", "/produse")).toBe(
      "http://localhost:3000/produse",
    );
    expect(safePublicDestination("https://cutiutamagica.eu", "/admin/products")).toBeNull();
    expect(safePublicDestination("https://cutiutamagica.eu", "https://evil.example/")).toBeNull();
    expect(escapeCsv("=SUM(1,2)")).toBe('"\'=SUM(1,2)"');
  });
});
