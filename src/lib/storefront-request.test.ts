import { afterEach, describe, expect, it, vi } from "vitest";
import { storefrontRequest } from "./storefront-request";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("bounded storefront requests", () => {
  it("returns the response without retrying a mutation", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    expect(
      (await storefrontRequest("/api/v1/returns", { method: "POST", body: "{}" })).status,
    ).toBe(503);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("ends a stalled request and returns recoverable copy without losing client state", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(
      (_path, init) =>
        new Promise((_resolve, reject) =>
          init.signal.addEventListener("abort", () => reject(new Error("aborted"))),
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    const result = expect(storefrontRequest("/api/v1/returns", { method: "POST" })).rejects.toThrow(
      "Datele completate au fost păstrate",
    );
    await vi.advanceTimersByTimeAsync(20_000);
    await result;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not show raw provider or network details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("private-provider-data")));
    await expect(storefrontRequest("/api/v1/reviewer")).rejects.toThrow("Conexiunea s-a întrerupt");
  });
  it("keeps the timeout active while a stalled response body is read", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_path, init) =>
        Promise.resolve(
          new Response(
            new ReadableStream({
              start(stream) {
                init.signal.addEventListener("abort", () => stream.error(new Error("aborted")));
              },
            }),
          ),
        ),
      ),
    );
    const result = expect(storefrontRequest("/api/v1/reviewer")).rejects.toThrow(
      "Răspunsul întârzie",
    );
    await vi.advanceTimersByTimeAsync(20_000);
    await result;
  });
  it("rejects an oversized JSON response before retaining an unbounded payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("x".repeat(2 * 1024 * 1024 + 1))),
    );
    await expect(storefrontRequest("/api/v1/reviewer")).rejects.toThrow("Răspunsul este prea mare");
  });
  it("preserves caller cancellation without automatically retrying", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn(
      (_path, init) =>
        new Promise((_resolve, reject) =>
          init.signal.addEventListener("abort", () => reject(new Error("cancelled"))),
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    const request = expect(
      storefrontRequest("/api/v1/shipping/quotes", { signal: controller.signal }),
    ).rejects.toThrow("Răspunsul întârzie");
    controller.abort();
    await request;
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
