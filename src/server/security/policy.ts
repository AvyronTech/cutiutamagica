/** Deployment settings only. No policy is taken from request headers or query parameters. */
export type SecurityBindings = {
  APP_ENV?: string;
  ADMIN_HOSTNAME?: string;
  ADMIN_HOST_MODE?: string;
  ADMIN_ACCESS_MODE?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_APPLICATION_AUD?: string;
  ACCESS_SERVICE_APPLICATION_AUD?: string;
  ACCESS_PILOT_HOSTS?: string;
  ACCESS_SERVICE_CLIENT_IDS?: string;
  ALLOW_LEGACY_AI_RUNNER?: string;
};

export class SecurityError extends Error {
  constructor(
    public code: string,
    public statusCode = 403,
  ) {
    super(code);
    this.name = "SecurityError";
  }
}

export function securityPolicy(env: SecurityBindings) {
  const adminHost = env.ADMIN_HOSTNAME || "app.cutiutamagica.eu";
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(adminHost))
    throw new SecurityError("SECURITY_CONFIGURATION_INVALID", 503);
  const accessMode = env.ADMIN_ACCESS_MODE || "off";
  const hostMode = env.ADMIN_HOST_MODE || "compatible";
  if (
    !["off", "pilot", "enforce"].includes(accessMode) ||
    !["compatible", "dedicated"].includes(hostMode)
  )
    throw new SecurityError("SECURITY_CONFIGURATION_INVALID", 503);
  const pilotHosts = (env.ACCESS_PILOT_HOSTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (pilotHosts.some((host) => host !== adminHost))
    throw new SecurityError("SECURITY_CONFIGURATION_INVALID", 503);
  return {
    adminHost,
    hostMode,
    accessMode,
    pilotHosts,
    serviceClientIds: (env.ACCESS_SERVICE_CLIENT_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    // MFA/passkeys are design-only in this release, deliberately not an activation setting.
    mfa: "preparation_only" as const,
  };
}

export function machinePath(path: string) {
  return path.startsWith("/api/v1/integrations/ai-studio/runner/");
}

export function privatePath(path: string) {
  return (
    path === "/admin" ||
    path.startsWith("/admin/") ||
    path.startsWith("/api/v1/admin/") ||
    machinePath(path)
  );
}

export function accessRequired(request: Request, env: SecurityBindings) {
  const policy = securityPolicy(env);
  return (
    policy.accessMode === "enforce" ||
    (policy.accessMode === "pilot" && policy.pilotHosts.includes(new URL(request.url).hostname))
  );
}

export function assertSameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new SecurityError("ORIGIN_NOT_ALLOWED");
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none")
    throw new SecurityError("CROSS_SITE_REQUEST_DENIED");
}

export function securityResponse(error: SecurityError) {
  return Response.json(
    {
      error: {
        code: error.code,
        message:
          error.statusCode === 503
            ? "Accesul intern nu este configurat complet. Contactează administratorul."
            : "Acces nepermis.",
      },
    },
    {
      status: error.statusCode,
      headers: {
        "cache-control": "private, no-store",
        "x-robots-tag": "noindex, nofollow",
      },
    },
  );
}

export function routeMetric(path: string) {
  if (path.startsWith("/api/")) return path.split("/").slice(0, 4).join("/") + "/*";
  if (path.startsWith("/admin/")) return path.split("/").slice(0, 3).join("/") + "/*";
  if (path.length > 160 || /[0-9a-f]{32,}|[0-9a-f]{8}-[0-9a-f-]{27}|[0-9]{7,}|@|%40/i.test(path))
    return "/other";
  return path;
}
