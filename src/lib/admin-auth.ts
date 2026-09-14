import { env } from "cloudflare:workers";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createRemoteJWKSet, jwtVerify } from "jose";

export interface AdminIdentity {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
  onboardingStatus: "pending" | "profile_required" | "complete";
}

interface AdminRow {
  id: string;
  email: string;
  display_name: string | null;
  status: string;
  onboarding_status: AdminIdentity["onboardingStatus"];
  external_subject: string;
  roles: string | null;
  permissions: string | null;
}

function authError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

function csv(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function normalizeTeamDomain(value: string): string {
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

const jwksByDomain = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

async function verifyAccessIdentity(
  request: Request,
  bindings: Pick<Env, "CF_ACCESS_TEAM_DOMAIN" | "CF_ACCESS_AUD">,
): Promise<{ email: string; subject: string }> {
  const assertion = request.headers.get("cf-access-jwt-assertion");
  const configuredDomain = bindings.CF_ACCESS_TEAM_DOMAIN;
  const audience = bindings.CF_ACCESS_AUD;

  if (!assertion) throw authError("Autentificarea Cloudflare Access este necesară.", 401);
  if (!configuredDomain || !audience) {
    throw authError("Cloudflare Access nu este configurat complet.", 503);
  }

  const teamDomain = normalizeTeamDomain(configuredDomain);
  let jwks = jwksByDomain.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    jwksByDomain.set(teamDomain, jwks);
  }
  const { payload } = await jwtVerify(assertion, jwks, {
    audience,
    issuer: `https://${teamDomain}`,
  });
  const email =
    typeof payload.email === "string"
      ? payload.email.trim().toLowerCase()
      : request.headers.get("cf-access-authenticated-user-email")?.trim().toLowerCase();
  if (!email || !payload.sub)
    throw authError("Identitatea Cloudflare Access este incompletă.", 401);
  return { email, subject: payload.sub };
}

async function resolveIdentity(
  request: Request,
  bindings: Pick<
    Env,
    "ADMIN_AUTH_MODE" | "DEV_ADMIN_EMAIL" | "CF_ACCESS_TEAM_DOMAIN" | "CF_ACCESS_AUD"
  >,
): Promise<{ email: string; subject: string }> {
  const url = new URL(request.url);
  const authMode: string = bindings.ADMIN_AUTH_MODE;
  if (authMode === "development") {
    if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
      throw authError("Modul de dezvoltare este permis numai local.", 403);
    }
    const email = (bindings.DEV_ADMIN_EMAIL || "cutiutamagica@gmail.com").trim().toLowerCase();
    return { email, subject: `development:${email}` };
  }
  return verifyAccessIdentity(request, bindings);
}

async function loadAdminIdentity(
  db: D1Database,
  email: string,
  subject: string,
): Promise<AdminIdentity> {
  const row = await db
    .prepare(
      `
    SELECT
      au.id,
      au.email,
      au.display_name,
      au.status,
      au.onboarding_status,
      au.external_subject,
      group_concat(DISTINCT r.code) AS roles,
      group_concat(DISTINCT p.code) AS permissions
    FROM admin_users au
    LEFT JOIN admin_user_roles aur ON aur.admin_user_id = au.id
    LEFT JOIN roles r ON r.id = aur.role_id
    LEFT JOIN role_permissions rp ON rp.role_id = r.id
    LEFT JOIN permissions p ON p.id = rp.permission_id
    WHERE au.email = ?1 COLLATE NOCASE
    GROUP BY au.id
  `,
    )
    .bind(email)
    .first<AdminRow>();

  if (!row || row.status === "suspended")
    throw authError("Contul nu are acces administrativ.", 403);
  if (row.external_subject !== subject) {
    if (
      !row.external_subject.startsWith("pending:") &&
      !row.external_subject.startsWith("development:")
    ) {
      throw authError("Identitatea Access nu corespunde contului administrativ.", 403);
    }
    await db
      .prepare(
        `
      UPDATE admin_users
      SET external_subject = ?1,
          status = 'active',
          onboarding_status = CASE WHEN onboarding_status = 'pending' THEN 'profile_required' ELSE onboarding_status END,
          access_email_verified_at = COALESCE(access_email_verified_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          last_login_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?2
    `,
      )
      .bind(subject, row.id)
      .run();
    row.onboarding_status =
      row.onboarding_status === "pending" ? "profile_required" : row.onboarding_status;
  } else {
    await db
      .prepare(
        `
      UPDATE admin_users
      SET last_login_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?1
    `,
      )
      .bind(row.id)
      .run();
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name || row.email,
    roles: csv(row.roles),
    permissions: csv(row.permissions),
    onboardingStatus: row.onboarding_status,
  };
}

export async function authenticateAdminRequest(
  request: Request,
  bindings: Pick<
    Env,
    "DB" | "ADMIN_AUTH_MODE" | "DEV_ADMIN_EMAIL" | "CF_ACCESS_TEAM_DOMAIN" | "CF_ACCESS_AUD"
  >,
  permission?: string,
): Promise<AdminIdentity> {
  const asserted = await resolveIdentity(request, bindings);
  const admin = await loadAdminIdentity(bindings.DB, asserted.email, asserted.subject);
  if (permission) assertPermission(admin, permission);
  return admin;
}

export const requireAdminAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const admin = await authenticateAdminRequest(request, env);
  return next({ context: { admin } });
});

export function assertPermission(admin: AdminIdentity, permission: string): void {
  if (!admin.permissions.includes(permission)) {
    throw authError(`Lipsește permisiunea ${permission}.`, 403);
  }
}
