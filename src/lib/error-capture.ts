// Captures the original Error out-of-band so server.ts can recover the stack
// when h3 has already swallowed the throw into a generic 500 Response.

import { AsyncLocalStorage } from "node:async_hooks";

const requestErrors = new AsyncLocalStorage<{
  lastCapturedError?: { error: unknown; at: number };
}>();
const TTL_MS = 5_000;

export function withRequestErrorCapture<T>(work: () => T): T {
  return requestErrors.run({}, work);
}

export function recordCapturedServerError(error: unknown) {
  const store = requestErrors.getStore();
  if (store) store.lastCapturedError = { error, at: Date.now() };
}

if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) =>
    recordCapturedServerError((event as ErrorEvent).error ?? event),
  );
  globalThis.addEventListener("unhandledrejection", (event: Event) =>
    recordCapturedServerError((event as PromiseRejectionEvent).reason),
  );
}

export function consumeLastCapturedError(): unknown {
  const store = requestErrors.getStore();
  const lastCapturedError = store?.lastCapturedError;
  if (store) store.lastCapturedError = undefined;
  if (!lastCapturedError) return undefined;
  if (Date.now() - lastCapturedError.at > TTL_MS) {
    return undefined;
  }
  const { error } = lastCapturedError;
  return error;
}
