export interface AvyronQueueMessage {
  version: 1;
  kind: "avyron.asset.sync";
  jobId: string;
}

type SyncEnv = Env & { AVYRON_SYNC_HMAC_SECRET?: string };
type SyncJob = {
  id: string;
  payload_json: string;
  status: string;
  attempts: number;
};
type SyncTarget = {
  endpoint_url: string | null;
  auth_mode: string;
  status: string;
  timeout_ms: number;
  max_attempts: number;
};

export function isAvyronQueueMessage(value: unknown): value is AvyronQueueMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.version === 1 &&
    candidate.kind === "avyron.asset.sync" &&
    typeof candidate.jobId === "string"
  );
}

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signature(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

async function markFailure(
  env: Env,
  jobId: string,
  attempts: number,
  message: string,
): Promise<void> {
  const delaySeconds = Math.min(3600, 30 * 2 ** Math.min(attempts, 7));
  await env.DB.prepare(
    `
    UPDATE avyron_sync_jobs
    SET status = 'failed', attempts = ?1, last_error = ?2,
        last_attempt_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        next_retry_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?3),
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?4
  `,
  )
    .bind(attempts, message.slice(0, 500), `+${delaySeconds} seconds`, jobId)
    .run();
}

export async function processAvyronSync(
  env: SyncEnv,
  jobId: string,
): Promise<{ action: "ack" | "retry"; delaySeconds?: number }> {
  const [job, target] = await Promise.all([
    env.DB.prepare(
      `
      SELECT id, payload_json, status, attempts FROM avyron_sync_jobs WHERE id = ?1
    `,
    )
      .bind(jobId)
      .first<SyncJob>(),
    env.DB.prepare(
      `
      SELECT endpoint_url, auth_mode, status, timeout_ms, max_attempts
      FROM avyron_sync_targets WHERE code = 'avyron-os'
    `,
    ).first<SyncTarget>(),
  ]);
  if (!job || job.status === "success") return { action: "ack" };
  if (!target || target.status !== "active" || !target.endpoint_url) {
    await markFailure(
      env,
      jobId,
      job.attempts,
      "Destinația AVYRON este dezactivată sau neconfigurată.",
    );
    return { action: "ack" };
  }
  if (target.auth_mode !== "hmac" || !env.AVYRON_SYNC_HMAC_SECRET) {
    await markFailure(
      env,
      jobId,
      job.attempts,
      "Secretul HMAC server-to-server nu este configurat.",
    );
    return { action: "ack" };
  }
  let endpoint: URL;
  try {
    endpoint = new URL(target.endpoint_url);
    if (endpoint.protocol !== "https:") throw new Error("HTTPS required");
  } catch {
    await markFailure(env, jobId, job.attempts, "Endpoint AVYRON invalid; este obligatoriu HTTPS.");
    return { action: "ack" };
  }

  const attempts = job.attempts + 1;
  await env.DB.prepare(
    `
    UPDATE avyron_sync_jobs
    SET status = 'processing', attempts = ?1,
        last_attempt_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?2
  `,
  )
    .bind(attempts, jobId)
    .run();
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID();
  const signedValue = `${timestamp}.${nonce}.${job.payload_json}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), target.timeout_ms);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cutiuta-source": "cutiuta-magica",
        "x-cutiuta-timestamp": timestamp,
        "x-cutiuta-nonce": nonce,
        "x-cutiuta-signature": `sha256=${await signature(env.AVYRON_SYNC_HMAC_SECRET, signedValue)}`,
        "idempotency-key": jobId,
      },
      body: job.payload_json,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AVYRON HTTP ${response.status}`);
    await env.DB.prepare(
      `
      UPDATE avyron_sync_jobs
      SET status = 'success', last_error = NULL, next_retry_at = NULL,
          completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?1
    `,
    )
      .bind(jobId)
      .run();
    return { action: "ack" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Eroare necunoscută AVYRON";
    await markFailure(env, jobId, attempts, message);
    if (attempts >= target.max_attempts) return { action: "ack" };
    return { action: "retry", delaySeconds: Math.min(3600, 30 * 2 ** Math.min(attempts, 7)) };
  } finally {
    clearTimeout(timeout);
  }
}
