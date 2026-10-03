import { describe, expect, it, vi } from "vitest";
import { handleGrowthEvents } from "./api/growth-events";

function setup() {
  const run = vi.fn(async () => ({ success: true }));
  const bind = vi.fn(() => ({ run }));
  const prepare = vi.fn(() => ({ bind }));
  const writeDataPoint = vi.fn();
  const pending: Promise<unknown>[] = [];
  const env = {
    APP_ENV: "test",
    DB: { prepare },
    ANALYTICS: { writeDataPoint },
  } as unknown as Env;
  const ctx = {
    waitUntil(value: Promise<unknown>) {
      pending.push(value);
    },
  } as ExecutionContext;
  return { env, ctx, pending, prepare, bind, run, writeDataPoint };
}

function request(body: unknown, origin = "https://cutiutamagica.eu") {
  return new Request("https://cutiutamagica.eu/api/v1/growth/events", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("growth event ingestion", () => {
  it("accepts an allowlisted event and writes anonymized detail plus daily aggregation", async () => {
    const harness = setup();
    const response = await handleGrowthEvents(
      request({
        name: "add_to_cart",
        sessionId: "dd5c7018-cbc4-456e-b459-1b696104f863",
        productSlug: "hp-keeper",
        path: "/produs/hp-keeper",
        value: 119,
        quantity: 1,
        properties: { source: "product" },
      }),
      harness.env,
      harness.ctx,
    );

    expect(response?.status).toBe(204);
    await Promise.all(harness.pending);
    expect(harness.writeDataPoint).toHaveBeenCalledWith(
      expect.objectContaining({
        indexes: ["add_to_cart"],
        doubles: [119, 1],
      }),
    );
    const blobs = harness.writeDataPoint.mock.calls[0][0].blobs as string[];
    expect(blobs).toEqual([
      "test",
      expect.stringMatching(/^[a-f0-9]{24}$/),
      "hp-keeper",
      "/produs/hp-keeper",
      '{"source":"product"}',
    ]);
    expect(blobs).not.toContain("dd5c7018-cbc4-456e-b459-1b696104f863");
    expect(harness.prepare).toHaveBeenCalledOnce();
    expect(harness.bind).toHaveBeenCalledWith(
      "add_to_cart",
      "hp-keeper",
      "/produs/hp-keeper",
      119,
      1,
    );
    expect(harness.run).toHaveBeenCalledOnce();
  });

  it("rejects forged origins and events outside the allowlist", async () => {
    const harness = setup();
    const forged = await handleGrowthEvents(
      request(
        {
          name: "purchase",
          sessionId: crypto.randomUUID(),
          path: "/comanda",
        },
        "https://example.test",
      ),
      harness.env,
      harness.ctx,
    );
    const unknown = await handleGrowthEvents(
      request({ name: "anything", sessionId: crypto.randomUUID(), path: "/" }),
      harness.env,
      harness.ctx,
    );

    expect(forged?.status).toBe(403);
    expect(unknown?.status).toBe(400);
    expect(harness.pending).toHaveLength(0);
    expect(harness.writeDataPoint).not.toHaveBeenCalled();
  });
});
