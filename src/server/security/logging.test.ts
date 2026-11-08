import { describe, expect, it } from "vitest";
import { safeErrorMetadata } from "./logging";
import {
  withRequestErrorCapture,
  recordCapturedServerError,
  consumeLastCapturedError,
} from "@/lib/error-capture";
describe("private operational logging", () => {
  it("never includes error messages, stack traces, credentials or arbitrary names", () => {
    const error = Object.assign(
      new Error("Authorization Bearer test-private-token, customer@example.test"),
      { statusCode: 503 },
    );
    error.name = "test-private-token";
    expect(safeErrorMetadata(error)).toEqual({ name: "Error", statusCode: 503 });
    expect(JSON.stringify(safeErrorMetadata(error))).not.toContain("test-private");
  });
  it("isolates swallowed SSR failures between simultaneous requests and consumes them once", async () => {
    const a = new Error("request-a"),
      b = new Error("request-b");
    let release: () => void = () => {};
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    const first = withRequestErrorCapture(async () => {
      recordCapturedServerError(a);
      await barrier;
      expect(consumeLastCapturedError()).toBe(a);
      expect(consumeLastCapturedError()).toBeUndefined();
    });
    await withRequestErrorCapture(async () => {
      recordCapturedServerError(b);
      await Promise.resolve();
      expect(consumeLastCapturedError()).toBe(b);
      release();
    });
    await first;
    expect(consumeLastCapturedError()).toBeUndefined();
  });
});
