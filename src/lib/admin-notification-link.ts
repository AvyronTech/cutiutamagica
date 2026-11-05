import { readWorkspaceSearch, workspaceHref } from "./admin-workspaces";

/** Notification destinations are local admin routes, never arbitrary URLs. */
export function adminNotificationLink(value: string | null): string | null {
  if (!value || !value.startsWith("/admin/") || value.startsWith("//")) return null;
  try {
    const parsed = new URL(value, "https://cutiutamagica.eu");
    if (parsed.origin !== "https://cutiutamagica.eu" || !parsed.pathname.startsWith("/admin/"))
      return null;
    const search = Object.fromEntries(parsed.searchParams);
    if (parsed.pathname === "/admin/posts")
      return workspaceHref("social", { ...readWorkspaceSearch("social", search), tab: "posts" });
    if (parsed.pathname === "/admin/qr-generator")
      return workspaceHref("identification", {
        ...readWorkspaceSearch("identification", search),
        tab: "orders",
      });
    if (parsed.pathname === "/admin/suppliers")
      return workspaceHref("inventory", {
        ...readWorkspaceSearch("inventory", search),
        tab: "supply",
      });
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}
