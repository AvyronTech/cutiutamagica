import { safeErrorMetadata } from "@/server/security/logging";
import { authenticateAdminRequest } from "@/lib/admin-auth";

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return Response.json(data, { ...init, headers });
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
    if (request.method === "POST") {
      await authenticateAdminRequest(request, env, "catalog.write");
      return json(
        {
          error: {
            code: "STATISTICS_ONLY",
            message: "AVYRON primește numai statistici agregate aprobate.",
          },
        },
        { status: 403 },
      );
    }
    return json(
      { error: { code: "METHOD_NOT_ALLOWED" } },
      { status: 405, headers: { allow: "POST" } },
    );
  } catch (error) {
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode: unknown }).statusCode) || 500
        : 500;
    console.error("admin.avyron_sync.failed", safeErrorMetadata(error));
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
