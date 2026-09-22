import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { guardAdminPage } from "./server/admin-page-guard";
import { handleApiRequest } from "./server/api/router";
import { API_HOSTNAME, APP_HOSTNAME, resolveHostRoute } from "./server/host-routing";
import { handlePublicMediaRequest } from "./server/media-public";
import { consumeCommerceEvents, type CommerceQueueMessage } from "./server/queue/commerce-consumer";
import { purgeExpiredChatConversations } from "./server/db/chat.repository";
import { processScheduledBackup } from "./server/services/backup-center";

type ServerEntry = {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function withOperationalHeaders(request: Request, response: Response, requestId: string): Response {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("x-frame-options", "SAMEORIGIN");
  headers.set("x-request-id", requestId);

  const url = new URL(request.url);
  if (
    url.hostname === API_HOSTNAME ||
    url.hostname === APP_HOSTNAME ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname === "/auth"
  ) {
    headers.set("x-robots-tag", "noindex, nofollow");
  }
  if (url.pathname.startsWith("/admin") || url.pathname === "/auth") {
    headers.set("cache-control", "private, no-store");
  }
  if (url.hostname === API_HOSTNAME) {
    headers.set("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
    headers.set("x-frame-options", "DENY");
  }
  if (url.protocol === "https:") {
    headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function recordRequestMetric(
  env: Env,
  request: Request,
  response: Response,
  startedAt: number,
): void {
  try {
    const url = new URL(request.url);
    env.ANALYTICS.writeDataPoint({
      indexes: [url.pathname.startsWith("/api/") ? "api" : "web"],
      blobs: [env.APP_ENV, request.method, url.pathname, String(response.status)],
      doubles: [Date.now() - startedAt],
    });
  } catch (error) {
    console.warn("analytics.write_failed", error);
  }
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

function jsonResponse(payload: unknown, status = 200): Response {
  return Response.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(originalRequest: Request, env: Env, ctx: ExecutionContext) {
    const startedAt = Date.now();
    const requestId = originalRequest.headers.get("x-request-id") ?? crypto.randomUUID();
    let request = originalRequest;
    try {
      const requestUrl = new URL(request.url);
      const hostRoute = resolveHostRoute(requestUrl, request.method);
      if (hostRoute.type === "redirect") {
        const redirect = withOperationalHeaders(
          request,
          Response.redirect(hostRoute.location, 308),
          requestId,
        );
        recordRequestMetric(env, request, redirect, startedAt);
        return redirect;
      }
      if (hostRoute.type === "api-index") {
        const response = withOperationalHeaders(
          request,
          jsonResponse({
            service: "cutiuta-magica-api",
            version: "v1",
            environment: env.APP_ENV,
            health: "https://api.cutiutamagica.eu/v1/health",
          }),
          requestId,
        );
        recordRequestMetric(env, request, response, startedAt);
        return response;
      }
      if (hostRoute.type === "api-not-found") {
        const response = withOperationalHeaders(
          request,
          jsonResponse({ error: "not_found", requestId }, 404),
          requestId,
        );
        recordRequestMetric(env, request, response, startedAt);
        return response;
      }
      if (hostRoute.type === "rewrite") {
        request = new Request(hostRoute.url, request);
      }

      const adminRedirect = await guardAdminPage(request, env.DB);
      if (adminRedirect) {
        const response = withOperationalHeaders(request, adminRedirect, requestId);
        recordRequestMetric(env, request, response, startedAt);
        return response;
      }

      const mediaResponse = await handlePublicMediaRequest(request, env);
      if (mediaResponse) {
        const response = withOperationalHeaders(request, mediaResponse, requestId);
        recordRequestMetric(env, request, response, startedAt);
        return response;
      }

      const apiResponse = await handleApiRequest(request, env, ctx);
      if (apiResponse) {
        const response = withOperationalHeaders(request, apiResponse, requestId);
        recordRequestMetric(env, request, response, startedAt);
        return response;
      }

      const handler = await getServerEntry();
      const rendered = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(rendered);
      const response = withOperationalHeaders(request, normalized, requestId);
      recordRequestMetric(env, request, response, startedAt);
      return response;
    } catch (error) {
      console.error("request.failed", { requestId, error });
      const fallback = withOperationalHeaders(originalRequest, brandedErrorResponse(), requestId);
      recordRequestMetric(env, originalRequest, fallback, startedAt);
      return fallback;
    }
  },

  async queue(batch: MessageBatch<CommerceQueueMessage>, env: Env) {
    await consumeCommerceEvents(batch, env);
  },
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    const { processOwnerReports } = await import("@/server/services/owner-reports");
    ctx.waitUntil(
      Promise.all([
        processOwnerReports(env),
        purgeExpiredChatConversations(env.DB),
        processScheduledBackup(env),
      ]).then(() => undefined),
    );
  },
} satisfies ExportedHandler<Env, CommerceQueueMessage>;
