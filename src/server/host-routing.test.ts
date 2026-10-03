import { describe, expect, it } from "vitest";

import { resolveHostRoute } from "./host-routing";

describe("hostname routing", () => {
  it("redirects www to the canonical storefront", () => {
    expect(
      resolveHostRoute(new URL("https://www.cutiutamagica.eu/produse?q=magic"), "GET"),
    ).toEqual({
      type: "redirect",
      location: "https://cutiutamagica.eu/produse?q=magic",
    });
  });

  it("exposes a dedicated API index and clean v1 aliases", () => {
    expect(resolveHostRoute(new URL("https://api.cutiutamagica.eu/"), "GET")).toEqual({
      type: "api-index",
    });
    expect(resolveHostRoute(new URL("https://api.cutiutamagica.eu/health"), "GET")).toEqual({
      type: "rewrite",
      url: "https://api.cutiutamagica.eu/api/v1/health",
    });
    expect(
      resolveHostRoute(new URL("https://api.cutiutamagica.eu/v1/catalog/products?limit=5"), "GET"),
    ).toEqual({
      type: "rewrite",
      url: "https://api.cutiutamagica.eu/api/v1/catalog/products?limit=5",
    });
  });

  it("never renders storefront pages on the API hostname", () => {
    expect(resolveHostRoute(new URL("https://api.cutiutamagica.eu/produse"), "GET")).toEqual({
      type: "api-not-found",
    });
  });

  it("keeps app routes on the staff hostname and canonicalizes public pages", () => {
    expect(resolveHostRoute(new URL("https://app.cutiutamagica.eu/"), "GET")).toEqual({
      type: "redirect",
      location: "https://app.cutiutamagica.eu/admin",
    });
    expect(resolveHostRoute(new URL("https://app.cutiutamagica.eu/admin/products"), "GET")).toEqual(
      {
        type: "pass",
      },
    );
    expect(resolveHostRoute(new URL("https://app.cutiutamagica.eu/produse"), "GET")).toEqual({
      type: "redirect",
      location: "https://cutiutamagica.eu/produse",
    });
  });
});
