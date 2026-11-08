/** The server and navigation use the same explicit entry permissions. APIs still check each operation. */
const entries: Record<string, string | readonly string[]> = {
  "/admin": "dashboard.read",
  "/admin/orders": "orders.read",
  "/admin/products": "catalog.read",
  "/admin/inventory": "inventory.read",
  "/admin/billing": ["orders.read", "operations.read"],
  "/admin/shipping": ["orders.read", "operations.read"],
  "/admin/financiar": "reports.read",
  "/admin/returns": ["orders.read", "operations.read"],
  "/admin/dropshipping": "catalog.read",
  "/admin/chat": "chat.read",
  "/admin/personalizations": "orders.read",
  "/admin/ai": "marketing.agent.read",
  "/admin/marketing": "marketing.read",
  "/admin/social": "marketing.read",
  "/admin/reviews": "catalog.read",
  "/admin/platforms": "integrations.read",
  "/admin/promotions": "promotions.read",
  "/admin/newsletter": "marketing.read",
  "/admin/email": "integrations.read",
  "/admin/customers": "customers.read",
  "/admin/rewards": "promotions.read",
  "/admin/referrals": "promotions.read",
  "/admin/statistics": "reports.read",
  "/admin/traffic": "reports.read",
  "/admin/seo": "reports.read",
  "/admin/notifications": "dashboard.read",
  "/admin/integrations": ["integrations.read", "operations.read"],
  "/admin/accounts": "accounts.read",
  "/admin/backups": "backup.read",
  "/admin/settings": "team.write",
  "/admin/security": "admin.access",
};
export function adminPathPermission(path: string) {
  const key = Object.keys(entries)
    .sort((a, b) => b.length - a.length)
    .find((key) => path === key || (key !== "/admin" && path.startsWith(key + "/")));
  return key ? entries[key] : undefined;
}
export function canOpenAdminPath(path: string, permissions: readonly string[]) {
  const required = adminPathPermission(path);
  return Boolean(
    required &&
    (typeof required === "string" ? [required] : required).every((permission) =>
      permissions.includes(permission),
    ),
  );
}
export function adminLandingPath(permissions: readonly string[]) {
  return (
    ["/admin", "/admin/products", "/admin/orders", "/admin/statistics", "/admin/security"].find(
      (path) => canOpenAdminPath(path, permissions),
    ) || "/auth"
  );
}
