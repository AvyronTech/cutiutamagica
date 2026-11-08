import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import ts from "typescript";
import {
  enqueueScheduledMaintenance,
  isScheduledMaintenanceMessage,
  processScheduledMaintenance,
} from "./scheduled-maintenance";
import { consumeCommerceEvents } from "./commerce-consumer";
const mocks = vi.hoisted(() => ({ backup: vi.fn(), security: vi.fn() }));
vi.mock("../services/backup-center", () => ({ processScheduledBackup: mocks.backup }));
vi.mock("../security/events", () => ({ maintainSecurityLog: mocks.security }));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.backup.mockResolvedValue(undefined);
  mocks.security.mockResolvedValue(undefined);
});
describe("Free-plan scheduled maintenance", () => {
  it("accepts only the closed internal task envelope", () => {
    expect(isScheduledMaintenanceMessage({ version: 4, type: "maintenance.backup" })).toBe(true);
    expect(isScheduledMaintenanceMessage({ version: 4, type: "maintenance.security" })).toBe(true);
    for (const body of [
      null,
      {},
      { version: 3, type: "maintenance.backup" },
      { version: 4, type: "payment.refund" },
      { version: 4, type: "maintenance.backup", orderId: "x" },
    ])
      expect(isScheduledMaintenanceMessage(body)).toBe(false);
  });
  it("uses the existing queue with staggered tasks and no customer data", async () => {
    const sendBatch = vi.fn().mockResolvedValue(undefined);
    await enqueueScheduledMaintenance({ COMMERCE_EVENTS: { sendBatch } } as unknown as Env);
    expect(sendBatch).toHaveBeenCalledWith([
      { body: { version: 4, type: "maintenance.backup" }, contentType: "json", delaySeconds: 900 },
      {
        body: { version: 4, type: "maintenance.security" },
        contentType: "json",
        delaySeconds: 1800,
      },
    ]);
  });
  it("dispatches tasks independently", async () => {
    const env = { DB: {} } as Env;
    await processScheduledMaintenance(env, { version: 4, type: "maintenance.backup" });
    expect(mocks.backup).toHaveBeenCalledWith(env);
    expect(mocks.security).not.toHaveBeenCalled();
    await processScheduledMaintenance(env, { version: 4, type: "maintenance.security" });
    expect(mocks.security).toHaveBeenCalledWith(env.DB);
  });
  it("acknowledges success and retries failed maintenance without processing commerce", async () => {
    const ack = vi.fn(),
      retry = vi.fn();
    const message = { body: { version: 4, type: "maintenance.backup" }, ack, retry };
    const batch = { messages: [message] } as unknown as MessageBatch<unknown>;
    await consumeCommerceEvents(batch, {} as Env);
    expect(ack).toHaveBeenCalledOnce();
    expect(retry).not.toHaveBeenCalled();
    ack.mockClear();
    mocks.backup.mockRejectedValueOnce(new Error("test failure"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await consumeCommerceEvents(batch, {} as Env);
      expect(ack).not.toHaveBeenCalled();
      expect(retry).toHaveBeenCalledWith({ delaySeconds: 60 });
    } finally {
      error.mockRestore();
    }
  });
  it("keeps one production cron and isolates queue request budgets", () => {
    const parsed = ts.parseConfigFileTextToJson(
      "wrangler.jsonc",
      readFileSync(new URL("../../../wrangler.jsonc", import.meta.url), "utf8"),
    );
    expect(parsed.error).toBeUndefined();
    const config = parsed.config;
    expect(config.env.production.triggers.crons).toEqual(["0 * * * *"]);
    expect(config.env.production.queues.consumers[0].max_batch_size).toBe(1);
  });
});
