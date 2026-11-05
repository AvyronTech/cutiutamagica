import { describe, it, expect } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { affectsReports, subscribeReportSync } from "./report-sync";
describe("reports follow operational changes", () => {
  it("invalidates cached reports after a successful operation without polling", async () => {
    const client = new QueryClient();
    client.setQueryData(["admin", "analytics", 30], { orders: 0 });
    client.setQueryData(["admin", "statistics"], { orders: 0 });
    const stop = subscribeReportSync(client);
    await client
      .getMutationCache()
      .build(client, { mutationFn: async () => ({ ok: true }) })
      .execute(undefined);
    expect(client.getQueryState(["admin", "analytics", 30])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["admin", "statistics"])?.isInvalidated).toBe(true);
    expect(client.isFetching()).toBe(0);
    stop();
    client.clear();
  });
  it("follows inventory and order invalidations without looping on reports themselves", async () => {
    const client = new QueryClient();
    client.setQueryData(["admin", "analytics", 7], {});
    client.setQueryData(["admin", "product-inventory", "p"], {});
    const stop = subscribeReportSync(client);
    await client.invalidateQueries({ queryKey: ["admin", "product-inventory"] });
    expect(client.getQueryState(["admin", "analytics", 7])?.isInvalidated).toBe(true);
    expect(affectsReports(["admin", "analytics", 7])).toBe(false);
    expect(affectsReports(["admin", "statistics"])).toBe(false);
    stop();
    client.clear();
  });
});
