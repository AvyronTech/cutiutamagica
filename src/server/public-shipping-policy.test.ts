import { describe, expect, it, vi } from "vitest";
import { readPublicShippingPolicy } from "./services/public-shipping-policy";
import { freeShippingLabel, offerShippingDetails, shippingServices } from "@/lib/shipping-seo";

const verified = {
  currency: "RON",
  free_over_bani: 30_000,
  easybox_enabled: 1,
  allowed_countries_json: '["RO"]',
  validation_status: "verified",
};
function database(row: unknown) {
  return { prepare: vi.fn(() => ({ first: vi.fn(async () => row) })) } as unknown as D1Database;
}

describe("public shipping policy", () => {
  it("publishes the verified order threshold without sender data or invented delivery times", async () => {
    const policy = await readPublicShippingPolicy(
      database({ ...verified, sender_address: "Private test address" }),
    );
    expect(policy).toEqual({ country: "RO", currency: "RON", freeOverRon: 300, easybox: true });
    const services = shippingServices(policy);
    expect(services).toHaveLength(2);
    for (const service of services) {
      expect(service.shippingConditions).toEqual({
        "@type": "ShippingConditions",
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "RO" },
        orderValue: { "@type": "MonetaryAmount", minValue: 300, currency: "RON" },
        shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "RON" },
      });
      expect(service).not.toHaveProperty("handlingTime");
      expect(service.shippingConditions).not.toHaveProperty("transitTime");
    }
    expect(offerShippingDetails(policy)?.map((detail) => detail.hasShippingService["@id"])).toEqual(
      services.map((service) => service["@id"]),
    );
    expect(freeShippingLabel(policy)).toBe("Transport gratuit de la 300 RON");
  });

  it.each([
    null,
    { ...verified, validation_status: "disabled" },
    { ...verified, validation_status: "requires_approval" },
    { ...verified, currency: "EUR" },
    { ...verified, allowed_countries_json: '["FR"]' },
    { ...verified, allowed_countries_json: "{invalid" },
  ])("omits unsupported or unverified policy data", async (row) => {
    const policy = await readPublicShippingPolicy(database(row));
    expect(policy).toBeNull();
    expect(shippingServices(policy)).toEqual([]);
    expect(offerShippingDetails(policy)).toBeUndefined();
  });

  it("does not turn a missing threshold into free shipping and follows Easybox availability", async () => {
    const noFree = await readPublicShippingPolicy(database({ ...verified, free_over_bani: null }));
    expect(freeShippingLabel(noFree)).toBeNull();
    expect(offerShippingDetails(noFree)).toBeUndefined();
    const allFree = await readPublicShippingPolicy(
      database({ ...verified, free_over_bani: 0, easybox_enabled: 0 }),
    );
    expect(freeShippingLabel(allFree)).toBe("Transport gratuit în România");
    expect(shippingServices(allFree)).toHaveLength(1);
    expect(shippingServices(allFree)[0].shippingConditions.orderValue.minValue).toBe(0);
  });
});
