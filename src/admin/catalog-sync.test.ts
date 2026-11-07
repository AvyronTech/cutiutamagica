import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { affectsCatalogWorkflow, refreshCatalogWorkflows } from "./catalog-sync";
describe("catalog workflow synchronization", () => {
  it("refreshes active data once and marks hidden views stale without extra reads", async () => {
    const client = new QueryClient();
    const key = ["admin", "product-inventory", "p1"];
    client.setQueryData(key, { onHand: 1 });
    client.setQueryData(["identification", "catalog"], { stock: 1 });
    client.setQueryData(["admin", "products"], { stock: 1 });
    client.setQueryData(["admin", "product-studio", "p2"], { name: "Other" });
    const fetch = vi.fn(async () => ({ onHand: 2 }));
    const observer = new QueryObserver(client, { queryKey: key, queryFn: fetch, staleTime: 60000 });
    const stop = observer.subscribe(() => undefined);
    await refreshCatalogWorkflows(client, "p1");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(client.getQueryData(key)).toEqual({ onHand: 2 });
    expect(client.getQueryState(["identification", "catalog"])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["admin", "products"])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["admin", "product-studio", "p2"])?.isInvalidated).toBe(false);
    expect(client.isFetching()).toBe(0);
    expect(affectsCatalogWorkflow(["admin", "analytics", 30], "p1")).toBe(false);
    stop();
    client.clear();
  });
});
