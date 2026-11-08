// Existing Metricool account and public pixel contract used by its be.js tracker.
const METRICOOL_HASH = "dd3885823b08fbd97f71cd91273fc504";
export function metricoolPageviewUrl(
  href: string,
  referrer: string,
  width: number,
  height: number,
): string | null {
  const page = new URL(href);
  if (
    page.protocol !== "https:" ||
    !["cutiutamagica.eu", "www.cutiutamagica.eu"].includes(page.hostname)
  )
    return null;
  if (page.pathname.startsWith("/admin") || ["/auth", "/cont", "/comanda"].includes(page.pathname))
    return null;
  // Never forward checkout tokens, search parameters, fragments or full referrer URLs.
  const query = new URLSearchParams({
    hash: METRICOOL_HASH,
    u: page.origin + page.pathname,
    bw: String(Math.round(width)),
    bh: String(Math.round(height)),
  });
  try {
    if (referrer) query.set("ref", new URL(referrer).origin);
  } catch {
    /* No malformed referrers. */
  }
  return `https://tracker.metricool.com/c3po.jpg?${query}`;
}
