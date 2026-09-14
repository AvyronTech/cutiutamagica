import { authenticateAdminRequest } from "@/lib/admin-auth";
import type { AvyronQueueMessage } from "@/server/queue/avyron-sync-consumer";

type AssetRow = {
  id: string;
  product_id: string;
  media_type: string;
  title: string | null;
  tags_json: string;
  version: number;
  marketing_approved: number;
  public_access: number;
  rights_status: string;
  status: string;
};

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return Response.json(data, { ...init, headers });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function listSyncState(request: Request, env: Env, productId: string): Promise<Response> {
  await authenticateAdminRequest(request, env, "catalog.read");
  const [target, jobs] = await Promise.all([
    env.DB.prepare(
      `
      SELECT code, endpoint_url, auth_mode, source_label, status, max_attempts,
             last_healthcheck_at, last_error_message
      FROM avyron_sync_targets WHERE code = 'avyron-os'
    `,
    ).first(),
    env.DB.prepare(
      `
      SELECT id, asset_id, status, attempts, last_error, last_attempt_at,
             next_retry_at, completed_at, created_at
      FROM avyron_sync_jobs
      WHERE product_id = ?1
      ORDER BY created_at DESC LIMIT 100
    `,
    )
      .bind(productId)
      .all(),
  ]);
  return json({ data: { target, jobs: jobs.results } });
}

async function enqueueAsset(request: Request, env: Env, assetId: string): Promise<Response> {
  const admin = await authenticateAdminRequest(request, env, "catalog.write");
  if (!sameOrigin(request)) return json({ error: { code: "ORIGIN_NOT_ALLOWED" } }, { status: 403 });
  const asset = await env.DB.prepare(
    `
    SELECT id, product_id, media_type, title, tags_json, version,
           marketing_approved, public_access, rights_status, status
    FROM product_media WHERE id = ?1
  `,
  )
    .bind(assetId)
    .first<AssetRow>();
  if (!asset) return json({ error: { code: "MEDIA_NOT_FOUND" } }, { status: 404 });
  if (
    asset.status !== "active" ||
    asset.public_access !== 1 ||
    asset.marketing_approved !== 1 ||
    asset.rights_status !== "cleared"
  ) {
    return json(
      {
        error: {
          code: "MEDIA_NOT_SYNCABLE",
          message: "Asset-ul trebuie publicat, aprobat și cu drepturile validate.",
        },
      },
      { status: 409 },
    );
  }

  const payload = {
    external_product_id: asset.product_id,
    asset_id: asset.id,
    asset_type: asset.media_type,
    title: asset.title,
    tags: JSON.parse(asset.tags_json) as unknown,
    source: "cutiuta-magica",
    url: `${env.PUBLIC_SITE_URL.replace(/\/$/, "")}/media/${asset.id}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    version: asset.version,
  };
  const payloadJson = JSON.stringify(payload);
  const idempotencyKey = `${asset.id}:${asset.version}:avyron-os`;
  const jobId = `sync_${crypto.randomUUID().replaceAll("-", "")}`;
  await env.DB.batch([
    env.DB.prepare(
      `
      INSERT OR IGNORE INTO avyron_sync_jobs (
        id, product_id, asset_id, destination, idempotency_key,
        payload_json, payload_hash, status
      ) VALUES (?1, ?2, ?3, 'avyron-os', ?4, ?5, ?6, 'pending')
    `,
    ).bind(
      jobId,
      asset.product_id,
      asset.id,
      idempotencyKey,
      payloadJson,
      await sha256(payloadJson),
    ),
    env.DB.prepare(
      `
      UPDATE product_media
      SET sync_to_avyron = 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?1
    `,
    ).bind(asset.id),
    env.DB.prepare(
      `
      INSERT INTO audit_log (
        id, actor_admin_user_id, actor_label, action, entity_type, entity_id,
        after_json, metadata_json
      ) VALUES (?1, ?2, ?3, 'avyron.sync.request', 'product_media', ?4, ?5, ?6)
    `,
    ).bind(
      crypto.randomUUID(),
      admin.id,
      admin.email,
      asset.id,
      JSON.stringify({ idempotencyKey }),
      JSON.stringify({ destination: "avyron-os" }),
    ),
  ]);

  const job = await env.DB.prepare(
    `
    SELECT id, status FROM avyron_sync_jobs WHERE idempotency_key = ?1
  `,
  )
    .bind(idempotencyKey)
    .first<{ id: string; status: string }>();
  const targetStatus = await env.DB.prepare(
    `
    SELECT status FROM avyron_sync_targets WHERE code = 'avyron-os'
  `,
  ).first<string>("status");
  if (job?.status === "pending" && targetStatus === "active") {
    const message: AvyronQueueMessage = { version: 1, kind: "avyron.asset.sync", jobId: job.id };
    await env.COMMERCE_EVENTS.send(message);
  }
  return json(
    {
      data: {
        jobId: job?.id ?? jobId,
        status: job?.status ?? "pending",
        queued: targetStatus === "active",
        targetStatus: targetStatus ?? "disabled",
      },
    },
    { status: 202 },
  );
}

export async function handleAdminAvyronSyncApi(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  const productMatch = path.match(/^\/api\/v1\/admin\/products\/([a-zA-Z0-9_-]+)\/avyron-sync$/);
  const assetMatch = path.match(/^\/api\/v1\/admin\/media\/([a-zA-Z0-9_-]+)\/sync-avyron$/);
  if (!productMatch && !assetMatch) return null;
  try {
    if (productMatch) {
      if (request.method === "GET") return listSyncState(request, env, productMatch[1]);
      return json(
        { error: { code: "METHOD_NOT_ALLOWED" } },
        { status: 405, headers: { allow: "GET" } },
      );
    }
    if (request.method === "POST") return enqueueAsset(request, env, assetMatch![1]);
    return json(
      { error: { code: "METHOD_NOT_ALLOWED" } },
      { status: 405, headers: { allow: "POST" } },
    );
  } catch (error) {
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode: unknown }).statusCode) || 500
        : 500;
    console.error("admin.avyron_sync.failed", error);
    return json(
      {
        error: {
          code:
            status === 401 ? "UNAUTHORIZED" : status === 403 ? "FORBIDDEN" : "SYNC_REQUEST_FAILED",
          message:
            status >= 500 ? "Jobul de sincronizare nu a putut fi creat." : (error as Error).message,
        },
      },
      { status },
    );
  }
}
