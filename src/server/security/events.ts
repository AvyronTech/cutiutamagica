import { routeMetric, SecurityError } from "./policy";

export async function securityEvent(
  db: D1Database,
  request: Request,
  action: string,
  severity: "info" | "warning" | "critical" = "info",
  actor?: string,
  details: { target?: string; version?: number } = {},
) {
  // Closed metadata schema. Never accept arbitrary headers, tokens, URLs or request bodies.
  const metadata = {
    ...(details.target ? { target: details.target.slice(0, 100) } : {}),
    ...(details.version !== undefined ? { version: details.version } : {}),
  };
  await db
    .prepare(
      `INSERT INTO security_events(id,actor_admin_user_id,action,severity,route,metadata_json)
    VALUES(?1,?2,?3,?4,?5,?6)`,
    )
    .bind(
      crypto.randomUUID(),
      actor || null,
      action,
      severity,
      routeMetric(new URL(request.url).pathname),
      JSON.stringify(metadata),
    )
    .run();
}

async function hash(value: string) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))),
    (x) => x.toString(16).padStart(2, "0"),
  ).join("");
}

export async function rateLimit(
  db: D1Database,
  namespace: string,
  subject: string,
  limit: number,
  seconds = 900,
) {
  const now = Math.floor(Date.now() / 1000),
    bucket = Math.floor(now / seconds);
  const key = `${namespace}:${bucket}:${await hash(subject)}`;
  const row = await db
    .prepare(
      `INSERT INTO security_rate_limits(key,count,expires_at) VALUES(?1,1,?2)
    ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<?3 RETURNING count`,
    )
    .bind(key, (bucket + 2) * seconds, limit)
    .first<{ count: number }>();
  if (!row || row.count > limit) throw new SecurityError("RATE_LIMITED", 429);
}

export async function maintainSecurityLog(db: D1Database) {
  await db.batch([
    db.prepare("DELETE FROM security_rate_limits WHERE expires_at<unixepoch()"),
    db.prepare("DELETE FROM security_events WHERE datetime(created_at)<datetime('now','-90 days')"),
    db.prepare(`INSERT OR IGNORE INTO admin_notifications(id,notification_type,severity,title,message,deduplication_key,action_url)
      SELECT 'security-'||strftime('%Y%m%d%H','now'),'security','warning','Activitate de securitate de verificat',
      'Au fost observate cel puțin 10 încercări de autentificare respinse în ultimele 15 minute.',
      'security-auth-'||strftime('%Y%m%d%H','now'),'/admin/security'
      WHERE (SELECT count(*) FROM admin_login_events WHERE outcome IN ('invalid','locked')
        AND datetime(created_at)>datetime('now','-15 minutes'))>=10`),
  ]);
}
