import { canOpenAdminPath, adminLandingPath } from "@/lib/admin-access-policy";
import { authenticateAdminSession } from "@/lib/admin-password-auth-service";
import { assertAdminEdgeIdentity } from "./security/access";
import { SecurityError, securityResponse, type SecurityBindings } from "./security/policy";

function isAdminPage(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export async function guardAdminPage(
  request: Request,
  db: D1Database,
  security: SecurityBindings = {},
): Promise<Response | null> {
  const url = new URL(request.url);
  if ((request.method !== "GET" && request.method !== "HEAD") || !isAdminPage(url.pathname)) {
    return null;
  }

  try {
    await assertAdminEdgeIdentity(request, security);
    const admin = await authenticateAdminSession(db, request);
    await assertAdminEdgeIdentity(request, security, admin.email);
    if (!admin.mustChangePassword && !canOpenAdminPath(url.pathname, admin.permissions)) {
      if (url.pathname === "/admin")
        return Response.redirect(
          new URL(adminLandingPath(admin.permissions), url.origin).toString(),
          302,
        );
      return securityResponse(new SecurityError("ADMIN_PERMISSION_REQUIRED"));
    }
    return null;
  } catch (error) {
    if (error instanceof SecurityError) return securityResponse(error);
    const loginUrl = new URL("/auth", url.origin);
    loginUrl.searchParams.set("redirect", `${url.pathname}${url.search}`);
    return Response.redirect(loginUrl.toString(), 302);
  }
}
