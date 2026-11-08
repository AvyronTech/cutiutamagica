/** Error metadata only. Never stringify upstream messages, stacks, URLs, bodies or headers. */
export function safeErrorMetadata(error: unknown) {
  const safeNames = new Set([
    "Error",
    "TypeError",
    "RangeError",
    "SyntaxError",
    "AbortError",
    "TimeoutError",
    "SecurityError",
    "AdminAuthError",
  ]);
  const name = error instanceof Error && safeNames.has(error.name) ? error.name : "Error";
  const raw =
    error && typeof error === "object" && "statusCode" in error
      ? Number(error.statusCode)
      : undefined;
  return {
    name,
    ...(raw && Number.isInteger(raw) && raw >= 400 && raw <= 599 ? { statusCode: raw } : {}),
  };
}
