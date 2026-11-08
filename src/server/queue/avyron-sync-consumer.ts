import { digestHex, hmacHex } from "../integrations/provider-runtime";

export interface AvyronAssetQueueMessage {
  version: 1;
  kind: "avyron.asset.sync";
  jobId: string;
}
export interface AvyronAgentExchangeQueueMessage {
  version: 1;
  kind: "avyron.agent.exchange";
  exchangeId: string;
}
export type AvyronQueueMessage = AvyronAssetQueueMessage | AvyronAgentExchangeQueueMessage;
type SyncEnv = Env & { AVYRON_SYNC_HMAC_SECRET?: string };
type Outcome = { action: "ack" | "retry"; delaySeconds?: number };

export function isAvyronQueueMessage(value: unknown): value is AvyronQueueMessage {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    item.version === 1 &&
    ((item.kind === "avyron.asset.sync" && typeof item.jobId === "string") ||
      (item.kind === "avyron.agent.exchange" && typeof item.exchangeId === "string"))
  );
}

/** Exact aggregate schema: a numeric counter cannot carry contact details or arbitrary text. */
export function isAggregateStatistics(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  if (
    payload.schemaVersion !== 1 ||
    payload.source !== "cutiuta-magica" ||
    payload.scope !== "aggregated_statistics" ||
    payload.personalDataIncluded !== false ||
    typeof payload.generatedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(payload.generatedAt) ||
    !Number.isFinite(Date.parse(payload.generatedAt)) ||
    Object.keys(payload).sort().join() !==
      "data,generatedAt,personalDataIncluded,schemaVersion,scope,source"
  )
    return false;
  const groups: Record<string, string[]> = {
    social: ["total", "published", "planned", "failed"],
    approvals: ["total", "pending"],
    agentRuns: ["total", "completed", "failed"],
    catalog: ["total", "active"],
    orders: ["total", "open"],
    storage: ["total", "awaiting_approval", "processed", "failed", "reclaimed_bytes"],
  };
  const data = payload.data;
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    Object.keys(data).sort().join() !== Object.keys(groups).sort().join()
  )
    return false;
  return Object.entries(data).every(
    ([group, values]) =>
      values &&
      typeof values === "object" &&
      !Array.isArray(values) &&
      Object.keys(values).every((key) => groups[group].includes(key)) &&
      Object.values(values).every(
        (counter) =>
          counter === null ||
          (typeof counter === "number" && Number.isSafeInteger(counter) && counter >= 0),
      ),
  );
}

export async function processAvyronSync(
  env: SyncEnv,
  message: AvyronQueueMessage,
): Promise<Outcome> {
  // Retained legacy messages never send assets, skills or operational data.
  if (message.kind === "avyron.asset.sync") {
    await env.DB.prepare(
      "UPDATE avyron_sync_jobs SET status='failed',last_error='Politica permite numai statistici agregate aprobate.' WHERE id=?1 AND status!='success'",
    )
      .bind(message.jobId)
      .run();
    return { action: "ack" };
  }
  const exchange = await env.DB.prepare(
    `SELECT e.id,e.payload_json,e.payload_hash,e.status,e.attempts,e.updated_at,
      e.exchange_type,a.status AS approval_status,a.proposed_action_json AS approval_payload,a.expires_at AS approval_expires_at
    FROM agent_exchange_items e LEFT JOIN approval_requests a ON a.id=e.approval_request_id
    WHERE e.id=?1 AND e.direction='outbound'`,
  )
    .bind(message.exchangeId)
    .first<{
      id: string;
      payload_json: string;
      payload_hash: string;
      status: string;
      attempts: number;
      updated_at: string;
      exchange_type: string;
      approval_status: string;
      approval_payload: string;
      approval_expires_at: string | null;
    }>();
  if (!exchange || exchange.status === "sent") return { action: "ack" };
  if (!["queued", "approved", "failed", "processing"].includes(exchange.status))
    return { action: "ack" };
  const blocked = async (): Promise<Outcome> => {
    await env.DB.prepare(
      `UPDATE agent_exchange_items SET status='failed',
      last_error='Execuție blocată: verifică politica, aprobarea, conținutul și destinația.',
      updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id=?1 AND status=?2 AND attempts=?3`,
    )
      .bind(exchange.id, exchange.status, exchange.attempts)
      .run();
    return { action: "ack" };
  };
  if (
    exchange.exchange_type !== "stats_snapshot" ||
    exchange.approval_status !== "approved" ||
    (exchange.approval_expires_at != null &&
      (!Number.isFinite(Date.parse(exchange.approval_expires_at)) ||
        Date.parse(exchange.approval_expires_at) <= Date.now()))
  )
    return blocked();
  const [target, settingsRow] = await Promise.all([
    env.DB.prepare(
      `SELECT agent_exchange_endpoint_url AS endpoint_url,auth_mode,status,timeout_ms,max_attempts
      FROM avyron_sync_targets WHERE code='avyron-os'`,
    ).first<{
      endpoint_url: string;
      auth_mode: string;
      status: string;
      timeout_ms: number;
      max_attempts: number;
    }>(),
    env.DB.prepare(
      "SELECT value_json FROM operational_settings WHERE key='agent.marketing_orders'",
    ).first<{ value_json: string }>(),
  ]);
  let payload: unknown,
    approval: Record<string, unknown>,
    settings: { avyron?: { enabled?: boolean; shareAggregatedStats?: boolean } };
  try {
    payload = JSON.parse(exchange.payload_json);
    approval = JSON.parse(exchange.approval_payload) as Record<string, unknown>;
    settings = JSON.parse(settingsRow?.value_json ?? "{}");
  } catch {
    return blocked();
  }
  if (
    !isAggregateStatistics(payload) ||
    (await digestHex("SHA-256", exchange.payload_json)) !== exchange.payload_hash ||
    approval.payloadHash !== exchange.payload_hash ||
    approval.exchangeId !== exchange.id ||
    settings.avyron?.enabled !== true ||
    settings.avyron.shareAggregatedStats !== true ||
    target?.status !== "active" ||
    target.auth_mode !== "hmac" ||
    !env.AVYRON_SYNC_HMAC_SECRET ||
    exchange.attempts >= Math.min(10, target.max_attempts)
  )
    return blocked();
  let endpoint: URL;
  try {
    endpoint = new URL(target.endpoint_url);
    // Fixed destination ownership; redirects must never forward the signed envelope elsewhere.
    if (
      endpoint.protocol !== "https:" ||
      endpoint.username ||
      endpoint.password ||
      endpoint.port ||
      !["avyron.eu", "app.avyron.eu", "api.avyron.eu"].includes(endpoint.hostname)
    )
      return blocked();
  } catch {
    return blocked();
  }
  if (exchange.status === "processing" && Date.now() - Date.parse(exchange.updated_at) < 120_000)
    return { action: "retry", delaySeconds: 120 };
  const attempt = exchange.attempts + 1;
  const claim = await env.DB.prepare(
    `UPDATE agent_exchange_items SET status='processing',attempts=?1,
      last_error=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
    WHERE id=?2 AND status=?3 AND attempts=?4 AND updated_at=?5
      AND EXISTS(SELECT 1 FROM approval_requests WHERE id=agent_exchange_items.approval_request_id AND status='approved' AND (expires_at IS NULL OR expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')))`,
  )
    .bind(attempt, exchange.id, exchange.status, exchange.attempts, exchange.updated_at)
    .run();
  if (!claim.meta.changes) return { action: "ack" };
  const envelope = JSON.stringify({
    exchangeId: exchange.id,
    type: "stats_snapshot",
    payloadHash: exchange.payload_hash,
    payload,
  });
  const timestamp = String(Date.now()),
    nonce = crypto.randomUUID();
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      redirect: "error",
      headers: {
        "content-type": "application/json",
        "x-cutiuta-source": "cutiuta-magica",
        "x-cutiuta-timestamp": timestamp,
        "x-cutiuta-nonce": nonce,
        "x-cutiuta-signature": `sha256=${await hmacHex(env.AVYRON_SYNC_HMAC_SECRET, `${timestamp}.${nonce}.${envelope}`)}`,
        "idempotency-key": exchange.id,
      },
      body: envelope,
      signal: AbortSignal.timeout(Math.min(30_000, Math.max(1000, target.timeout_ms))),
    });
    void response.body?.cancel();
    if (!response.ok) throw new Error("DELIVERY_FAILED");
    await env.DB.prepare(
      `UPDATE agent_exchange_items SET status='sent',last_error=NULL,next_retry_at=NULL,
      sent_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id=?1 AND status='processing' AND attempts=?2`,
    )
      .bind(exchange.id, attempt)
      .run();
    return { action: "ack" };
  } catch {
    await env.DB.prepare(
      `UPDATE agent_exchange_items SET status='failed',last_error='Livrarea statisticilor necesită reluare.',
      updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?1 AND status='processing' AND attempts=?2`,
    )
      .bind(exchange.id, attempt)
      .run();
    return attempt >= target.max_attempts
      ? { action: "ack" }
      : { action: "retry", delaySeconds: Math.min(3600, 30 * 2 ** attempt) };
  }
}
