/** Server-only development policy. Never accepts a query parameter or a browser flag. */
export function localMediaPreview(env: { APP_ENV?: string; PUBLIC_SITE_URL?: string }): boolean {
  if (env.APP_ENV !== "local") return false;
  try {
    const url = new URL(env.PUBLIC_SITE_URL ?? "");
    return ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function mediaApprovalSql(
  alias: "pm" | "video" | "poster" | "cover" | "primary_asset" = "pm",
  preview = false,
): string {
  return preview ? "1=1" : `${alias}.marketing_approved=1 AND ${alias}.rights_status='cleared'`;
}
