import {
  privatePath,
  machinePath,
  securityPolicy,
  SecurityError,
  assertSameOrigin,
  type SecurityBindings,
} from "./policy";

export async function guardSecurityEdge(
  request: Request,
  env: SecurityBindings,
): Promise<Response | null> {
  const url = new URL(request.url);
  const policy = securityPolicy(env);
  // Reject ambiguous encodings before a downstream router can interpret a private prefix differently.
  let candidate = url.pathname;
  for (let depth = 0; depth < 2; depth++) {
    try {
      candidate = decodeURIComponent(candidate);
    } catch {
      throw new SecurityError("INVALID_PATH_ENCODING", 400);
    }
    const normalized = candidate.replaceAll("\\", "/").replace(/\/{2,}/g, "/");
    if (
      privatePath(normalized) &&
      (!privatePath(url.pathname) ||
        /%(?:2f|5c|25)/i.test(url.pathname) ||
        url.pathname.startsWith("//"))
    )
      throw new SecurityError("AMBIGUOUS_PRIVATE_PATH", 400);
  }
  // Keep only signed payment callbacks on the exact historical origin until provider
  // destinations can be independently confirmed. No pages, auth, admin or other APIs pass.
  const legacyPaymentCallback =
    url.hostname === "cutiuta-magica-store.avyrontech.workers.dev" &&
    url.protocol === "https:" &&
    !url.port &&
    request.method === "POST" &&
    ["/api/v1/webhooks/stripe", "/api/v1/webhooks/revolut"].includes(url.pathname);
  if (
    env.APP_ENV === "production" &&
    !legacyPaymentCallback &&
    ![
      "cutiutamagica.eu",
      "www.cutiutamagica.eu",
      "api.cutiutamagica.eu",
      policy.adminHost,
    ].includes(url.hostname)
  )
    throw new SecurityError("HOST_NOT_ALLOWED", 421);
  if (
    policy.hostMode === "dedicated" &&
    (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) &&
    url.hostname !== policy.adminHost
  ) {
    if (request.method !== "GET" && request.method !== "HEAD")
      throw new SecurityError("ADMIN_HOST_REQUIRED");
    url.hostname = policy.adminHost;
    url.protocol = "https:";
    url.port = "";
    return Response.redirect(url.toString(), 302);
  }
  if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
    assertSameOrigin(request);
    return new Response(null, {
      status: 204,
      headers: {
        "cache-control": "no-store",
        allow: "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
      },
    });
  }
  if (!privatePath(url.pathname)) return null;
  if (!["GET", "HEAD"].includes(request.method) && !machinePath(url.pathname))
    assertSameOrigin(request);
  const { verifyAccessIdentity } = await import("./access");
  await verifyAccessIdentity(request, env, machinePath(url.pathname));
  return null;
}

export function addSecurityHeaders(headers: Headers, response: Response, request: Request) {
  if (headers.has("set-cookie")) {
    headers.set("cache-control", "private, no-store");
    headers.append("vary", "Cookie");
  }
  if (
    (headers.get("content-type") || "").includes("text/html") &&
    !headers.has("content-security-policy")
  ) {
    // Safe baseline now. Strict script/style restrictions require a validated nonce rollout.
    headers.set(
      "content-security-policy",
      "object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
    );
    // Strict policy stays in the staged rollout plan until nonce support is validated.
  }
  if (response.status >= 400) headers.set("cache-control", "private, no-store");
  if (request.method === "OPTIONS") headers.append("vary", "Origin");
}
