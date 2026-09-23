export type CommerceEnv = Env & {
  GOOGLE_MERCHANT_ACCESS_TOKEN?: string;
  NETOPIA_API_KEY?: string;
  NETOPIA_PUBLIC_KEY?: string;
  REVOLUT_MERCHANT_SECRET_KEY?: string;
  REVOLUT_MERCHANT_WEBHOOK_SECRET?: string;
  OBLIO_CLIENT_SECRET?: string;
  EMAG_API_CREDENTIALS?: string;
  TRENDYOL_API_CREDENTIALS?: string;
  OLX_ACCESS_TOKEN?: string;
  OKAZII_API_KEY?: string;
  INTEGRATION_ENCRYPTION_KEY?: string;
  BRAVE_SEARCH_API_KEY?: string;
  GOOGLE_ACCESS_TOKEN?: string;
  META_ACCESS_TOKEN?: string;
  FGO_PRIVATE_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  SMARTSHIP_API_KEY?: string;
  RESEND_API_KEY?: string;
  RESEND_WEBHOOK_SECRET?: string;
  REVOLUT_API_KEY?: string;
  REVOLUT_CLIENT_SECRET?: string;
  REVOLUT_SECRET_KEY?: string;
  REVOLUT_WEBHOOK_SECRET?: string;
  SPV_API_KEY?: string;
  SPV_WEBHOOK_SECRET?: string;
  SPV_CLIENT_SECRET?: string;
  EFACTURA_API_KEY?: string;
  EFACTURA_WEBHOOK_SECRET?: string;
};

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 502,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = 15_000,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ProviderError("Furnizorul nu a răspuns la timp.", "PROVIDER_TIMEOUT", 504, true);
    }
    throw new ProviderError(
      error instanceof Error ? error.message : "Conexiunea cu furnizorul a eșuat.",
      "PROVIDER_NETWORK_ERROR",
      502,
      true,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function readProviderJson(response: Response, maxBytes = 1_000_000): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new ProviderError("Răspuns gol.", "PROVIDER_INVALID_RESPONSE");
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel().catch(() => undefined);
  }, 15_000);
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (timedOut) throw new ProviderError("Răspuns incomplet.", "PROVIDER_TIMEOUT", 504, true);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ProviderError("Răspuns prea mare.", "PROVIDER_INVALID_RESPONSE");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

export async function digestHex(
  algorithm: "SHA-1" | "SHA-256",
  value: string | ArrayBuffer,
): Promise<string> {
  const input = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest(algorithm, input);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export function requiredSecret(value: string | undefined, name: string): string {
  if (!value) {
    throw new ProviderError(
      `Integrarea nu este activă. Configurează secretul ${name} în Cloudflare.`,
      "PROVIDER_NOT_CONFIGURED",
      503,
    );
  }
  return value;
}

export async function logProviderOperation(
  db: D1Database,
  input: {
    provider: string;
    operationType: string;
    entityType: string;
    entityId?: string | null;
    idempotencyKey: string;
    environment: "sandbox" | "production";
    status: "pending" | "processing" | "succeeded" | "failed" | "cancelled";
    externalId?: string | null;
    requestHash?: string | null;
    responseCode?: number | null;
    responseSummary?: Record<string, unknown>;
    errorCode?: string | null;
    errorMessage?: string | null;
  },
): Promise<void> {
  await db
    .prepare(
      `
      INSERT INTO provider_operations (
        id, provider, operation_type, entity_type, entity_id, idempotency_key,
        environment, status, external_id, request_hash, response_code,
        response_summary_json, error_code, error_message, attempt_count,
        completed_at, created_at, updated_at
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, 1,
        CASE WHEN ?8 IN ('succeeded', 'failed', 'cancelled') THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now') END,
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      )
      ON CONFLICT(provider, idempotency_key) DO UPDATE SET
        status = excluded.status,
        external_id = COALESCE(excluded.external_id, provider_operations.external_id),
        request_hash = COALESCE(excluded.request_hash, provider_operations.request_hash),
        response_code = excluded.response_code,
        response_summary_json = excluded.response_summary_json,
        error_code = excluded.error_code,
        error_message = excluded.error_message,
        attempt_count = provider_operations.attempt_count + 1,
        completed_at = excluded.completed_at,
        updated_at = excluded.updated_at
    `,
    )
    .bind(
      crypto.randomUUID(),
      input.provider,
      input.operationType,
      input.entityType,
      input.entityId ?? null,
      input.idempotencyKey,
      input.environment,
      input.status,
      input.externalId ?? null,
      input.requestHash ?? null,
      input.responseCode ?? null,
      JSON.stringify(input.responseSummary ?? {}),
      input.errorCode ?? null,
      input.errorMessage?.slice(0, 1_000) ?? null,
    )
    .run();
}
