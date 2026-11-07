import type { QueryClient } from "@tanstack/react-query";
import { getStorePricing } from "./store-pricing.functions";
import { PRODUCT_PATH_PREFIX } from "./product-url";

export const storefrontPricingKey = ["storefront-pricing"] as const;

/** Only pages that render a catalog, price or cart need catalog data during SSR. */
export function needsStorefrontPricing(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/produse" ||
    pathname === "/comanda" ||
    pathname.startsWith(PRODUCT_PATH_PREFIX) ||
    pathname.startsWith("/cadouri/")
  );
}

/** The router owns this QueryClient per request; parent and child share one read. */
export function loadStorefrontPricing(client: QueryClient) {
  return client.fetchQuery({
    queryKey: storefrontPricingKey,
    queryFn: () => getStorePricing(),
    staleTime: 30_000,
  });
}
