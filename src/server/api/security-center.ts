import { z } from "zod";
import { authenticateAdminRequest, assertPermission } from "@/lib/admin-auth";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_HOST_SESSION_COOKIE,
  ADMIN_SESSION_SECONDS,
} from "@/lib/admin-password-auth-service";
import {
  securityPolicy,
  assertSameOrigin,
  SecurityError,
  type SecurityBindings,
} from "../security/policy";
import { listOwnSessions, revokeOwnSessions, rotateOwnSession } from "../security/sessions";
import { issueServiceIdentity, revokeServiceIdentity } from "../security/service-identities";
import type { CommerceEnv } from "../integrations/provider-runtime";
import { boundedJson } from "./bounded-json";
import { assertAdminEdgeIdentity } from "../security/access";

const json = (value: unknown, status = 200, headers: HeadersInit = {}) => {
  const safeHeaders = new Headers(headers);
  safeHeaders.set("cache-control", "private, no-store");
  return Response.json(value, { status, headers: safeHeaders });
};
const serviceSchema = z
  .object({
    action: z.enum(["create", "rotate", "revoke"]),
    id: z.string().regex(/^[a-zA-Z0-9._-]{3,100}$/),
    label: z.string().trim().min(2).max(80).default("Runner AI"),
    accessClientId: z.string().trim().max(160).optional(),
    version: z.number().int().min(1).optional(),
    graceMinutes: z.number().int().min(0).max(1440).default(60),
  })
  .strict();
const sessionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("rotate") }).strict(),
  z
    .object({
      action: z.literal("revoke"),
      target: z.union([z.literal("all"), z.literal("others"), z.string().uuid()]),
    })
    .strict(),
]);
function sessionCookies(request: Request, value: string, maxAge: number) {
  const secure = new URL(request.url).protocol === "https:";
  const headers = new Headers();
  headers.append(
    "set-cookie",
    `${secure ? ADMIN_HOST_SESSION_COOKIE : ADMIN_SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`,
  );
  if (secure)
    headers.append(
      "set-cookie",
      `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,
    );
  return headers;
}

export async function handleSecurityCenter(request: Request, env: Env): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (
    ![
      "/api/v1/admin/security",
      "/api/v1/admin/security/sessions",
      "/api/v1/admin/security/services",
      "/api/v1/admin/security/access-check",
    ].includes(path)
  )
    return null;
  try {
    const admin = await authenticateAdminRequest(request, env);
    if (request.method === "GET" && path.endsWith("/access-check")) {
      assertPermission(admin, "security.read");
      // A pilot can test the real signed identity without enabling Access on existing login flows.
      const identity = await assertAdminEdgeIdentity(
        request,
        { ...env, ADMIN_ACCESS_MODE: "enforce" },
        admin.email,
      );
      return json({ data: { verified: identity?.kind === "human", accountMatched: true } });
    }
    if (request.method === "GET" && path === "/api/v1/admin/security") {
      const canRead = admin.permissions.includes("security.read") && !admin.mustChangePassword;
      const policy = securityPolicy(env);
      const services = canRead
        ? (
            await env.DB.prepare(
              `SELECT id,label,scope,access_client_id,key_version,expires_at,revoked_at,updated_at FROM security_service_identities ORDER BY id`,
            ).all()
          ).results
        : [];
      const events = canRead
        ? (
            await env.DB.prepare(
              `SELECT id,action,severity,route,created_at FROM security_events ORDER BY created_at DESC LIMIT 50`,
            ).all()
          ).results
        : [];
      const logins = canRead
        ? (
            await env.DB.prepare(
              `SELECT id,outcome,created_at FROM admin_login_events ORDER BY created_at DESC LIMIT 25`,
            ).all()
          ).results
        : [];
      return json({
        data: {
          sessions: await listOwnSessions(env.DB, admin),
          services,
          events,
          logins,
          canRead,
          canManage:
            canRead &&
            admin.permissions.includes("security.manage") &&
            admin.permissions.includes("team.write"),
          policy: {
            adminHost: policy.adminHost,
            hostMode: policy.hostMode,
            accessMode: policy.accessMode,
            mfa: policy.mfa,
            accessConfigured: Boolean(
              (env as SecurityBindings).ACCESS_TEAM_DOMAIN &&
              (env as SecurityBindings).ACCESS_APPLICATION_AUD,
            ),
            legacyRunnerAllowed:
              (env as SecurityBindings).ALLOW_LEGACY_AI_RUNNER !== "false" &&
              Boolean(
                (env as Env & { AI_STUDIO_RUNNER_HMAC_SECRET?: string })
                  .AI_STUDIO_RUNNER_HMAC_SECRET,
              ),
            vaultReady: Boolean((env as CommerceEnv).INTEGRATION_ENCRYPTION_KEY),
          },
        },
      });
    }
    if (request.method !== "POST")
      return json({ error: { message: "Metodă nepermisă." } }, 405, { allow: "GET, POST" });
    assertSameOrigin(request);
    if (path === "/api/v1/admin/security/sessions") {
      const data = sessionSchema.parse(await boundedJson(request, 2000));
      if (data.action === "rotate") {
        const session = await rotateOwnSession(env.DB, request, admin);
        return json(
          { data: { rotated: true } },
          200,
          sessionCookies(request, session.token, ADMIN_SESSION_SECONDS),
        );
      }
      const result = await revokeOwnSessions(env.DB, request, admin, data.target);
      return json({ data: result }, 200, result.signedOut ? sessionCookies(request, "", 0) : {});
    }
    if (path === "/api/v1/admin/security/services") {
      assertPermission(admin, "security.manage");
      assertPermission(admin, "team.write");
      const data = serviceSchema.parse(await boundedJson(request, 4000));
      if (data.action === "revoke") {
        await revokeServiceIdentity(env, request, admin.id, data.id);
        return json({ data: { revoked: true } });
      }
      if (data.action === "rotate" && !data.version)
        throw new SecurityError("EXPECTED_KEY_VERSION_REQUIRED", 400);
      if (data.action === "create" && data.version)
        throw new SecurityError("INVALID_KEY_VERSION", 400);
      return json({
        data: await issueServiceIdentity(env, request, admin.id, {
          ...data,
          version: data.action === "rotate" ? data.version : undefined,
        }),
      });
    }
    return json({ error: { message: "Pagina nu există." } }, 404);
  } catch (error) {
    const rawStatus =
      error instanceof z.ZodError
        ? 400
        : error && typeof error === "object" && "statusCode" in error
          ? Number(error.statusCode)
          : 500;
    const status =
      Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;
    return json(
      {
        error: {
          message:
            status === 500
              ? "Operația de securitate nu a putut fi finalizată."
              : error instanceof Error
                ? error.message
                : "Acces nepermis.",
        },
      },
      status,
    );
  }
}
