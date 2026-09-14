import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { handleApiRequest } from "./server/api/router";
import { handlePublicMediaRequest } from "./server/media-public";
import { consumeCommerceEvents, type CommerceQueueMessage } from "./server/queue/commerce-consumer";

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
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) {
    headers.set("x-robots-tag", "noindex, nofollow");
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
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const startedAt = Date.now();
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
    try {
      const requestUrl = new URL(request.url);
      if (requestUrl.hostname === "www.cutiutamagica.eu") {
        requestUrl.hostname = "cutiutamagica.eu";
        const redirect = withOperationalHeaders(
          request,
          Response.redirect(requestUrl.toString(), 308),
          requestId,
        );
        recordRequestMetric(env, request, redirect, startedAt);
        return redirect;
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
      const fallback = withOperationalHeaders(request, brandedErrorResponse(), requestId);
      recordRequestMetric(env, request, fallback, startedAt);
      return fallback;
    }
  },

  async queue(batch: MessageBatch<CommerceQueueMessage>, env: Env) {
    await consumeCommerceEvents(batch, env);
  },
} satisfies ExportedHandler<Env, CommerceQueueMessage>;
