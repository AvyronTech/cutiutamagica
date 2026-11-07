import type { QueryClient, QueryKey } from "@tanstack/react-query";
const productQueries = new Set([
  "product-inventory",
  "product-technical-sheet",
  "product-studio",
  "product-channels",
]);
export function affectsCatalogWorkflow(key: QueryKey, productId?: string): boolean {
  if (key[0] === "storefront-pricing") return true;
  if (key[0] === "identification")
    return !productId || key[1] === "catalog" || key[1] === productId;
  if (key[0] !== "admin") return false;
  if (key[1] === "products" || key[1] === "dashboard") return true;
  return productQueries.has(String(key[1])) && (!productId || key[2] === productId);
}
/** One invalidation: refresh visible consumers, mark hidden views stale without polling. */
export function refreshCatalogWorkflows(client: QueryClient, productId?: string) {
  return client.invalidateQueries({
    predicate: (query) => affectsCatalogWorkflow(query.queryKey, productId),
  });
}
