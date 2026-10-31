/** Notification destinations are local admin routes, never arbitrary URLs. */
export function adminNotificationLink(value: string | null): string | null {
  if (!value || !value.startsWith("/admin/") || value.startsWith("//")) return null;
  try {
    const parsed = new URL(value, "https://cutiutamagica.eu");
    if (parsed.origin !== "https://cutiutamagica.eu" || !parsed.pathname.startsWith("/admin/"))
      return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}
