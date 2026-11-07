import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { getStorePricing } from "./store-pricing.functions";
import {
  loadStorefrontPricing,
  needsStorefrontPricing,
  storefrontPricingKey,
} from "./storefront-pricing";
vi.mock("./store-pricing.functions", () => ({ getStorePricing: vi.fn() }));
afterEach(() => vi.resetAllMocks());
describe("request-owned catalog reads", () => {
  it("does not load catalog data for informational, private or unknown general pages", () => {
    for (const path of [
      "/livrare",
      "/retur",
      "/despre-noi",
      "/cadouri",
      "/personalizeaza",
      "/termeni-de-utilizare",
      "/cont",
      "/auth",
      "/admin/products",
      "/unknown",
    ])
      expect(needsStorefrontPricing(path)).toBe(false);
    for (const path of [
      "/",
      "/produse",
      "/comanda",
      "/produs-cutiuta-muzicala-pisicuta-si-luna",
      "/cadouri/pentru-sora",
    ])
      expect(needsStorefrontPricing(path)).toBe(true);
  });
  it("shares parent/child reads, refreshes invalidated prices, and isolates requests", async () => {
    const first = new QueryClient(),
      second = new QueryClient();
    const pricing = { catalog: [], promotion: null };
    vi.mocked(getStorePricing).mockResolvedValue(pricing);
    await Promise.all([loadStorefrontPricing(first), loadStorefrontPricing(first)]);
    expect(getStorePricing).toHaveBeenCalledTimes(1);
    await first.invalidateQueries({ queryKey: storefrontPricingKey });
    await loadStorefrontPricing(first);
    expect(getStorePricing).toHaveBeenCalledTimes(2);
    await loadStorefrontPricing(second);
    expect(getStorePricing).toHaveBeenCalledTimes(3);
    first.clear();
    second.clear();
  });
});
