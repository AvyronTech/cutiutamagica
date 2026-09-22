import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/admin-auth";
import { accessRequestSchema, recoveryRequestSchema } from "@/lib/operations-contracts";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_SECONDS,
  changeAdminPassword,
  loginAdminWithPassword,
  revokeAdminSession,
} from "@/lib/admin-password-auth-service";

const loginInput = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

const changePasswordInput = z
  .object({
    password: z.string().min(12).max(128),
    confirmation: z.string().min(12).max(128),
  })
  .refine((value) => value.password === value.confirmation, {
    message: "Parolele nu coincid.",
    path: ["confirmation"],
  });

function requireSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw Object.assign(new Error("Originea cererii nu este permisă."), { statusCode: 403 });
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.APP_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: ADMIN_SESSION_SECONDS,
  };
}

async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function requestFingerprint(request: Request, email: string) {
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  return { emailHash: await digest(email.toLowerCase()), ipHash: await digest(ip) };
}

export const loginAdminAccount = createServerFn({ method: "POST" })
  .validator(loginInput)
  .handler(async ({ data }) => {
    const request = getRequest();
    requireSameOrigin(request);
    const result = await loginAdminWithPassword(env.DB, request, data.email, data.password);
    setCookie(ADMIN_SESSION_COOKIE, result.token, cookieOptions());
    return {
      ok: true,
      email: result.admin.email,
      mustChangePassword: result.admin.mustChangePassword,
    };
  });

export const changeAdminAccountPassword = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(changePasswordInput)
  .handler(async ({ context, data }) => {
    const request = getRequest();
    requireSameOrigin(request);
    const result = await changeAdminPassword(env.DB, request, context.admin, data.password);
    setCookie(ADMIN_SESSION_COOKIE, result.token, cookieOptions());
    return { ok: true };
  });

export const logoutAdminAccount = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    const request = getRequest();
    requireSameOrigin(request);
    await revokeAdminSession(env.DB, request, context.admin);
    deleteCookie(ADMIN_SESSION_COOKIE, {
      path: "/",
      sameSite: "strict",
      secure: env.APP_ENV === "production",
    });
    return { ok: true };
  });

export const requestAdminRecovery = createServerFn({ method: "POST" })
  .validator(recoveryRequestSchema)
  .handler(async ({ data }) => {
    const request = getRequest();
    requireSameOrigin(request);
    const fingerprint = await requestFingerprint(request, data.email);
    const recent = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM admin_recovery_requests
       WHERE (email_hash=?1 OR ip_hash=?2)
         AND datetime(created_at)>datetime('now','-1 hour')`,
    )
      .bind(fingerprint.emailHash, fingerprint.ipHash)
      .first<{ count: number }>();
    if (Number(recent?.count ?? 0) < 3) {
      const admin = await env.DB.prepare(
        "SELECT id FROM admin_users WHERE email=?1 COLLATE NOCASE AND status='active'",
      )
        .bind(data.email)
        .first<{ id: string }>();
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await env.DB.prepare(
        `INSERT INTO admin_recovery_requests(
          id,admin_user_id,email_hash,ip_hash,status,expires_at,created_at
        ) VALUES(?1,?2,?3,?4,'pending',datetime('now','+1 hour'),?5)`,
      )
        .bind(id, admin?.id ?? null, fingerprint.emailHash, fingerprint.ipHash, now)
        .run();
      if (admin) {
        await env.DB.prepare(
          `INSERT INTO admin_notifications(
            id,notification_type,severity,title,message,entity_type,entity_id,
            deduplication_key,action_url,created_at
          ) VALUES(?1,'security','warning','Solicitare recuperare acces',
            'Un cont administrativ a solicitat recuperarea parolei. Verifică identitatea înainte de resetare.',
            'admin_recovery',?2,?3,'/admin/accounts',?4)
          ON CONFLICT(deduplication_key) DO UPDATE SET read_at=NULL,dismissed_at=NULL,created_at=excluded.created_at`,
        )
          .bind(crypto.randomUUID(), id, `admin-recovery:${admin.id}`, now)
          .run();
      }
    }
    return { ok: true, message: "Dacă adresa este autorizată, solicitarea a fost înregistrată." };
  });

export const requestAdminAccess = createServerFn({ method: "POST" })
  .validator(accessRequestSchema)
  .handler(async ({ data }) => {
    const request = getRequest();
    requireSameOrigin(request);
    const fingerprint = await requestFingerprint(request, data.email);
    const recent = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM admin_access_requests
       WHERE (email=?1 COLLATE NOCASE OR ip_hash=?2)
         AND datetime(created_at)>datetime('now','-24 hours')`,
    )
      .bind(data.email, fingerprint.ipHash)
      .first<{ count: number }>();
    if (Number(recent?.count ?? 0) >= 2) {
      return { ok: true, message: "Solicitarea a fost înregistrată pentru verificare." };
    }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO admin_access_requests(
          id,email,display_name,reason,ip_hash,created_at
        ) VALUES(?1,?2,?3,?4,?5,?6)`,
      ).bind(id, data.email.toLowerCase(), data.displayName, data.reason, fingerprint.ipHash, now),
      env.DB.prepare(
        `INSERT INTO admin_notifications(
          id,notification_type,severity,title,message,entity_type,entity_id,
          deduplication_key,action_url,created_at
        ) VALUES(?1,'security','info','Solicitare nouă de acces staff',?2,
          'admin_access_request',?3,?4,'/admin/accounts',?5)`,
      ).bind(
        crypto.randomUUID(),
        `${data.displayName} solicită acces pentru ${data.email}.`,
        id,
        `access-request:${id}`,
        now,
      ),
    ]);
    return { ok: true, message: "Solicitarea a fost înregistrată pentru verificare." };
  });
