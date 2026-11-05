import { afterEach, describe, expect, it, vi } from "vitest";
import { reviewApi } from "./reviews";

afterEach(() => vi.unstubAllGlobals());

describe("customer API infrastructure recovery", () => {
  it("shows a useful retry message for a Cloudflare HTML/text failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("<!DOCTYPE html><title>1102</title>", { status: 503 })),
    );
    await expect(reviewApi("/api/v1/reviewer/login", { method: "POST" })).rejects.toThrow(
      "Serviciul este temporar ocupat. Reîncearcă în câteva momente.",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("preserves structured authentication feedback", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { message: "Datele de conectare nu sunt corecte." } },
            { status: 401 },
          ),
        ),
    );
    await expect(reviewApi("/api/v1/reviewer/login")).rejects.toThrow(
      "Datele de conectare nu sunt corecte.",
    );
  });
  it("returns successful data including a signed-out account", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ data: null })));
    expect(await reviewApi("/api/v1/reviewer")).toBeNull();
  });
});
