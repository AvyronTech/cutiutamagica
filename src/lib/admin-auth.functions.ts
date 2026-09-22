import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getRequest, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireAdminAuth } from "@/lib/admin-auth";
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
