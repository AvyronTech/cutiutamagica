export const SITE_HOSTNAME = "cutiutamagica.eu";
export const WWW_HOSTNAME = "www.cutiutamagica.eu";
export const API_HOSTNAME = "api.cutiutamagica.eu";
export const APP_HOSTNAME = "app.cutiutamagica.eu";

type HostRoute =
  | { type: "pass" }
  | { type: "redirect"; location: string }
  | { type: "rewrite"; url: string }
  | { type: "api-index" }
  | { type: "api-not-found" };

function isSafeNavigationMethod(method: string): boolean {
  return method === "GET" || method === "HEAD";
}

function isAppPath(pathname: string): boolean {
  return (
    pathname === "/auth" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/media/") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/_") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/icons/")
  );
}

export function resolveHostRoute(url: URL, method: string): HostRoute {
  if (url.hostname === WWW_HOSTNAME) {
    const target = new URL(url);
    target.hostname = SITE_HOSTNAME;
    return { type: "redirect", location: target.toString() };
  }

  if (url.hostname === API_HOSTNAME) {
    if (!isSafeNavigationMethod(method) && url.pathname === "/") {
      return { type: "api-not-found" };
    }
    if (url.pathname === "/" && isSafeNavigationMethod(method)) {
      return { type: "api-index" };
    }
    if (url.pathname === "/health") {
      const target = new URL(url);
      target.pathname = "/api/v1/health";
      return { type: "rewrite", url: target.toString() };
    }
    if (url.pathname === "/v1" || url.pathname.startsWith("/v1/")) {
      const target = new URL(url);
      target.pathname = `/api${url.pathname}`;
      return { type: "rewrite", url: target.toString() };
    }
    if (url.pathname.startsWith("/api/")) {
      return { type: "pass" };
    }
    return { type: "api-not-found" };
  }

  if (url.hostname === APP_HOSTNAME && isSafeNavigationMethod(method)) {
    if (url.pathname === "/") {
      const target = new URL(url);
      target.pathname = "/admin";
      return { type: "redirect", location: target.toString() };
    }
    if (!isAppPath(url.pathname)) {
      const target = new URL(url);
      target.hostname = SITE_HOSTNAME;
      return { type: "redirect", location: target.toString() };
    }
  }

  return { type: "pass" };
}
