import type { QueryClient, QueryKey } from "@tanstack/react-query";
const sources = new Set([
  "orders",
  "products",
  "product-inventory",
  "shipping-insights",
  "commerce-operations",
  "business-hub",
  "growth",
  "marketing",
  "social-dashboard",
  "returns",
  "newsletter",
  "dashboard",
]);
export function affectsReports(key: QueryKey) {
  return key[0] === "identification" || (key[0] === "admin" && sources.has(String(key[1])));
}
/** Invalidations mark inactive reports stale; they do not poll hidden screens. */
export function subscribeReportSync(client: QueryClient) {
  const invalidate = () => {
    void Promise.all(
      ["analytics", "statistics", "traffic"].map((name) =>
        client.invalidateQueries({ queryKey: ["admin", name] }, { cancelRefetch: false }),
      ),
    );
  };
  const mutation = client.getMutationCache().subscribe((event) => {
    if (event.type === "updated" && event.action.type === "success") invalidate();
  });
  const query = client.getQueryCache().subscribe((event) => {
    if (
      event.type === "updated" &&
      event.action.type === "invalidate" &&
      affectsReports(event.query.queryKey)
    )
      invalidate();
  });
  return () => {
    mutation();
    query();
  };
}
