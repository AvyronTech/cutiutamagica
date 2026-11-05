import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { clearCustomerSession } from "./customer-session";

describe("customer logout", () => {
  it("removes all private account pages while preserving public catalog and reviews", async () => {
    const client = new QueryClient();
    for (const key of [
      ["reviewer"],
      ["customer", "a", "magic-center"],
      ["customer", "b", "magic-center"],
      ["customer-billing", "a", 0],
      ["customer-billing", "a", 1],
      ["personalization-requests", "a"],
    ]) {
      client.setQueryData(key, { private: true });
    }
    client.setQueryData(["reviews", "product", 0], { public: true });
    client.setQueryData(["catalog"], { public: true });
    await clearCustomerSession(client);
    expect(client.getQueryData(["reviewer"])).toBeNull();
    expect(
      client
        .getQueryCache()
        .getAll()
        .filter((q) => q.state.data && (q.state.data as { private?: boolean }).private),
    ).toHaveLength(0);
    expect(client.getQueryData(["catalog"])).toEqual({ public: true });
    expect(client.getQueryData(["reviews", "product", 0])).toEqual({ public: true });
    client.clear();
  });

  it("updates an already-mounted account menu immediately after sign-out", async () => {
    const client = new QueryClient();
    client.setQueryData(["reviewer"], { id: "previous-customer" });
    const observer = new QueryObserver(client, { queryKey: ["reviewer"], enabled: false });
    const unsubscribe = observer.subscribe(() => {});
    await clearCustomerSession(client);
    expect(observer.getCurrentResult().data).toBeNull();
    unsubscribe();
    client.clear();
  });

  it("prevents an in-flight response from repopulating the signed-out account", async () => {
    const client = new QueryClient();
    let finish!: (value: string) => void;
    const request = client
      .fetchQuery({
        queryKey: ["customer", "a", "magic-center"],
        queryFn: () =>
          new Promise<string>((resolve) => {
            finish = resolve;
          }),
      })
      .catch(() => undefined);
    await clearCustomerSession(client);
    finish("private old account");
    await request;
    expect(client.getQueryData(["customer", "a", "magic-center"])).toBeUndefined();
    expect(client.getQueryData(["reviewer"])).toBeNull();
    client.clear();
  });
});
