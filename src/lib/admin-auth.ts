import { env } from "cloudflare:workers";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
  AdminAuthError,
  authenticateAdminSession,
  type PasswordAdminIdentity,
} from "@/lib/admin-password-auth-service";

export type AdminIdentity = PasswordAdminIdentity;

export async function authenticateAdminRequest(
  request: Request,
  bindings: Pick<Env, "DB">,
  permission?: string,
): Promise<AdminIdentity> {
  const admin = await authenticateAdminSession(bindings.DB, request);
  if (permission) assertPermission(admin, permission);
  return admin;
}

export const requireAdminAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const admin = await authenticateAdminRequest(request, env);
  return next({ context: { admin } });
});

export function assertPermission(admin: AdminIdentity, permission: string): void {
  if (admin.mustChangePassword) {
    throw new AdminAuthError("Schimbă parola inițială înainte de a continua.", 403);
  }
  if (!admin.permissions.includes(permission)) {
    throw new AdminAuthError(`Lipsește permisiunea ${permission}.`, 403);
  }
}
