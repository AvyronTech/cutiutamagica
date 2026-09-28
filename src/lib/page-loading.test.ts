import { describe, expect, it } from "vitest";
import { isPublicStoryPath, pageStoryProfile } from "./page-loading";

describe("page story loading profiles", () => {
  it.each([
    ["/", "home"],
    ["/produse", "catalog"],
    ["/produs/hp-keeper", "product"],
    ["/comanda", "checkout"],
    ["/personalizeaza", "personalize"],
    ["/livrare", "delivery"],
    ["/despre-cutiuta", "workshop"],
    ["/cadouri/craciun", "gifts"],
    ["/cont", "account"],
    ["/retur", "care"],
    ["/politica-de-confidentialitate", "legal"],
    ["/despre-noi", "workshop"],
  ])("maps %s to the %s scene", (pathname, scene) => {
    expect(pageStoryProfile(pathname).scene).toBe(scene);
  });

  it("keeps internal and machine routes free of cinematic overlays", () => {
    expect(isPublicStoryPath("/admin/orders")).toBe(false);
    expect(isPublicStoryPath("/auth")).toBe(false);
    expect(isPublicStoryPath("/api/v1/orders")).toBe(false);
    expect(isPublicStoryPath("/sitemap.xml")).toBe(false);
    expect(isPublicStoryPath("/produse")).toBe(true);
  });
});
