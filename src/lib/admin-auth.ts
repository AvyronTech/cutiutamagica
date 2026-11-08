import { assertAdminEdgeIdentity } from "@/server/security/access";
import { assertSameOrigin, type SecurityBindings } from "@/server/security/policy";
import { env } from "cloudflare:workers";
import { createMiddleware, createServerOnlyFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
  AdminAuthError,
  authenticateAdminSession,
  type PasswordAdminIdentity,
} from "@/lib/admin-password-auth-service";

export type AdminIdentity = PasswordAdminIdentity;

export const authenticateAdminRequest = createServerOnlyFn(
  async (
    request: Request,
    bindings: Pick<Env, "DB"> & SecurityBindings,
    permission?: string,
  ): Promise<AdminIdentity> => {
    await assertAdminEdgeIdentity(request, bindings);
    if (!["GET", "HEAD"].includes(request.method)) assertSameOrigin(request);
    const admin = await authenticateAdminSession(bindings.DB, request);
    await assertAdminEdgeIdentity(request, bindings, admin.email);
    if (permission) assertPermission(admin, permission);
    return admin;
  },
);

export const requireAdminAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  const admin = await authenticateAdminRequest(request, env);
  return next({ context: { admin } });
});

export const assertPermission = createServerOnlyFn(
  (admin: AdminIdentity, permission: string): void => {
    if (admin.mustChangePassword) {
      throw new AdminAuthError("Schimbă parola inițială înainte de a continua.", 403);
    }
    if (!admin.permissions.includes(permission)) {
      throw new AdminAuthError(`Lipsește permisiunea ${permission}.`, 403);
    }
  },
);
