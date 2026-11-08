import "./lib/error-capture";

import { safeErrorMetadata } from "./server/security/logging";
import { consumeLastCapturedError, withRequestErrorCapture } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { API_HOSTNAME, APP_HOSTNAME, resolveHostRoute } from "./server/host-routing";
import type { CommerceQueueMessage } from "./server/queue/commerce-consumer";
import { guardSecurityEdge, addSecurityHeaders } from "./server/security/edge";
import {
  SecurityError,
  securityResponse,
  routeMetric,
  securityPolicy,
} from "./server/security/policy";

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

function withOperationalHeaders(
  request: Request,
  response: Response,
  requestId: string,
  env: Env,
): Response {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("x-frame-options", "SAMEORIGIN");
  headers.set("x-request-id", requestId);

  const url = new URL(request.url);
  if (
    env.APP_ENV !== "production" ||
    url.pathname === "/comanda" ||
    url.pathname === "/cont" ||
    url.pathname === "/personalizeaza" ||
    url.hostname === API_HOSTNAME ||
    url.hostname === (env as Env & { ADMIN_HOSTNAME?: string }).ADMIN_HOSTNAME ||
    url.hostname === APP_HOSTNAME ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname === "/auth"
  ) {
    headers.set("x-robots-tag", "noindex, nofollow");
  }
  if (
    url.pathname.startsWith("/admin") ||
    url.pathname === "/auth" ||
    url.pathname === "/cont" ||
    url.pathname === "/comanda"
  ) {
    headers.set("cache-control", "private, no-store");
  }
  if (url.hostname === API_HOSTNAME) {
    headers.set("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
    headers.set("x-frame-options", "DENY");
  }
  if (url.protocol === "https:") {
    headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  addSecurityHeaders(headers, response, request);

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
      blobs: [env.APP_ENV, request.method, routeMetric(url.pathname), String(response.status)],
      doubles: [Date.now() - startedAt],
    });
  } catch (error) {
    console.warn("analytics.write_failed", safeErrorMetadata(error));
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

  console.error("ssr.failed", safeErrorMetadata(consumeLastCapturedError()));
  return brandedErrorResponse();
}

export default {
  async fetch(originalRequest: Request, env: Env, ctx: ExecutionContext) {
    return withRequestErrorCapture(async () => {
      const startedAt = Date.now();
      const requestId = crypto.randomUUID();
      const requestHeaders = new Headers(originalRequest.headers);
      requestHeaders.set("x-request-id", requestId);
      let request = new Request(originalRequest, { headers: requestHeaders });
      try {
        const requestUrl = new URL(request.url);
        const hostRoute = resolveHostRoute(
          requestUrl,
          request.method,
          securityPolicy(env).adminHost,
        );
        if (hostRoute.type === "redirect") {
          const redirect = withOperationalHeaders(
            request,
            Response.redirect(hostRoute.location, 308),
            requestId,
            env,
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
            env,
          );
          recordRequestMetric(env, request, response, startedAt);
          return response;
        }
        if (hostRoute.type === "api-not-found") {
          const response = withOperationalHeaders(
            request,
            jsonResponse({ error: "not_found", requestId }, 404),
            requestId,
            env,
          );
          recordRequestMetric(env, request, response, startedAt);
          return response;
        }
        if (hostRoute.type === "rewrite") {
          request = new Request(hostRoute.url, request);
        }

        const pathname = new URL(request.url).pathname;
        const securityBlock = await guardSecurityEdge(request, env);
        if (securityBlock) return withOperationalHeaders(request, securityBlock, requestId, env);
        if (pathname === "/admin" || pathname.startsWith("/admin/")) {
          const { guardAdminPage } = await import("./server/admin-page-guard");
          const adminRedirect = await guardAdminPage(request, env.DB, env);
          if (adminRedirect) {
            const response = withOperationalHeaders(request, adminRedirect, requestId, env);
            recordRequestMetric(env, request, response, startedAt);
            return response;
          }
        }
        if (pathname.startsWith("/media/")) {
          const { handlePublicMediaRequest } = await import("./server/media-public");
          const mediaResponse = await handlePublicMediaRequest(request, env);
          if (mediaResponse) {
            const response = withOperationalHeaders(request, mediaResponse, requestId, env);
            recordRequestMetric(env, request, response, startedAt);
            return response;
          }
        }
        if (pathname.startsWith("/api/v1/")) {
          const { handleApiRequest } = await import("./server/api/router");
          const apiResponse = await handleApiRequest(request, env, ctx);
          if (apiResponse) {
            const response = withOperationalHeaders(request, apiResponse, requestId, env);
            recordRequestMetric(env, request, response, startedAt);
            return response;
          }
        }

        const handler = await getServerEntry();
        const rendered = await handler.fetch(request, env, ctx);
        const normalized = await normalizeCatastrophicSsrResponse(rendered);
        const response = withOperationalHeaders(request, normalized, requestId, env);
        recordRequestMetric(env, request, response, startedAt);
        return response;
      } catch (error) {
        if (error instanceof SecurityError) {
          const response = withOperationalHeaders(request, securityResponse(error), requestId, env);
          recordRequestMetric(env, request, response, startedAt);
          return response;
        }
        console.error("request.failed", { requestId, ...safeErrorMetadata(error) });
        const fallback = withOperationalHeaders(
          originalRequest,
          brandedErrorResponse(),
          requestId,
          env,
        );
        recordRequestMetric(env, originalRequest, fallback, startedAt);
        return fallback;
      }
    });
  },

  async queue(batch: MessageBatch<CommerceQueueMessage>, env: Env) {
    const { consumeCommerceEvents } = await import("./server/queue/commerce-consumer");
    await consumeCommerceEvents(batch, env);
  },
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    // Reuse the account's existing hourly trigger. Delayed queue deliveries isolate
    // backup/security D1 and CPU budgets from commercial scheduled work.
    const { enqueueScheduledMaintenance } = await import("./server/queue/scheduled-maintenance");
    ctx.waitUntil(
      enqueueScheduledMaintenance(env).catch((error: unknown) => {
        console.error("maintenance.queue_failed", safeErrorMetadata(error));
      }),
    );
    const [
      { processOwnerReports },
      { purgeExpiredChatConversations },
      { processGiftCalendarReminders, processBirthdayRewards },
      { processRewardEmailDigests },
      { processMarketingAgentMonitoring },
      { processStorageRetention },
      { reconcilePaidInvoiceCollections },
    ] = await Promise.all([
      import("./server/services/owner-reports"),
      import("./server/db/chat.repository"),
      import("./server/services/magic-rewards"),
      import("./server/services/reward-emails"),
      import("./server/services/marketing-agent-monitor"),
      import("./server/services/storage-retention"),
      import("./server/services/oblio-payment-sync"),
    ]);
    ctx.waitUntil(
      Promise.allSettled([
        processOwnerReports(env),
        purgeExpiredChatConversations(env.DB),
        processGiftCalendarReminders(env),
        processBirthdayRewards(env.DB),
        processRewardEmailDigests(env),
        processMarketingAgentMonitoring(env.DB),
        processStorageRetention(env),
        reconcilePaidInvoiceCollections(env),
      ]).then((results) => {
        const tasks = [
          "owner_reports",
          "chat_retention",
          "gift_calendar",
          "birthday_rewards",
          "reward_emails",
          "marketing_monitor",
          "storage_retention",
          "invoice_reconciliation",
        ];
        const failed = results.flatMap((result, index) =>
          result.status === "rejected" ? [tasks[index]] : [],
        );
        if (failed.length) console.error("maintenance.partial_failure", { tasks: failed });
      }),
    );
  },
} satisfies ExportedHandler<Env, CommerceQueueMessage>;
