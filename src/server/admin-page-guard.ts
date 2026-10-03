import { authenticateAdminSession } from "@/lib/admin-password-auth-service";

function isAdminPage(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export async function guardAdminPage(request: Request, db: D1Database): Promise<Response | null> {
  const url = new URL(request.url);
  if ((request.method !== "GET" && request.method !== "HEAD") || !isAdminPage(url.pathname)) {
    return null;
  }

  try {
    await authenticateAdminSession(db, request);
    return null;
  } catch {
    const loginUrl = new URL("/auth", url.origin);
    loginUrl.searchParams.set("redirect", `${url.pathname}${url.search}`);
    return Response.redirect(loginUrl.toString(), 302);
  }
}
