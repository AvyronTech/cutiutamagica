import {
  __adminAuthInternals,
  ADMIN_IDLE_SECONDS,
  type PasswordAdminIdentity,
} from "@/lib/admin-password-auth-service";
import { SecurityError } from "./policy";
import { securityEvent } from "./events";

export async function listOwnSessions(db: D1Database, admin: PasswordAdminIdentity) {
  const rows = await db
    .prepare(
      `SELECT id,created_at,last_seen_at,expires_at,idle_expires_at FROM admin_sessions
    WHERE admin_user_id=?1 AND revoked_at IS NULL AND datetime(expires_at)>datetime('now')
    AND (idle_expires_at IS NULL OR datetime(idle_expires_at)>datetime('now')) ORDER BY created_at DESC LIMIT 10`,
    )
    .bind(admin.id)
    .all<{
      id: string;
      created_at: string;
      last_seen_at: string;
      expires_at: string;
      idle_expires_at: string | null;
    }>();
  return rows.results.map((row) => ({ ...row, current: row.id === admin.sessionId }));
}

export async function revokeOwnSessions(
  db: D1Database,
  request: Request,
  admin: PasswordAdminIdentity,
  target: "all" | "others" | string,
) {
  const filter = target === "all" ? "" : target === "others" ? " AND id!=?2" : " AND id=?2";
  const statement =
    db.prepare(`UPDATE admin_sessions SET revoked_at=COALESCE(revoked_at,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    WHERE admin_user_id=?1 AND revoked_at IS NULL${filter}`);
  const result = await (
    target === "all"
      ? statement.bind(admin.id)
      : statement.bind(admin.id, target === "others" ? admin.sessionId : target)
  ).run();
  if (!["all", "others"].includes(target) && result.meta.changes !== 1)
    throw new SecurityError("SESSION_NOT_FOUND", 404);
  await securityEvent(db, request, "session.revoked", "info", admin.id, { target });
  return { signedOut: target === "all" || target === admin.sessionId };
}

export async function rotateOwnSession(
  db: D1Database,
  request: Request,
  admin: PasswordAdminIdentity,
) {
  const id = crypto.randomUUID(),
    token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const hash = await __adminAuthInternals.sha256(token);
  const rows = await db.batch([
    db
      .prepare(
        `INSERT INTO admin_sessions(id,admin_user_id,token_hash,password_version,expires_at,idle_expires_at)
      SELECT ?1,admin_user_id,?2,password_version,expires_at,MIN(expires_at,?3) FROM admin_sessions
      WHERE id=?4 AND admin_user_id=?5 AND revoked_at IS NULL AND datetime(expires_at)>datetime('now')
      AND (idle_expires_at IS NULL OR datetime(idle_expires_at)>datetime('now'))`,
      )
      .bind(
        id,
        hash,
        new Date(Date.now() + ADMIN_IDLE_SECONDS * 1000).toISOString(),
        admin.sessionId,
        admin.id,
      ),
    db
      .prepare(
        `UPDATE admin_sessions SET revoked_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
      WHERE id=?1 AND admin_user_id=?2 AND EXISTS(SELECT 1 FROM admin_sessions WHERE id=?3)`,
      )
      .bind(admin.sessionId, admin.id, id),
  ]);
  if (rows[0].meta.changes !== 1) throw new SecurityError("SESSION_EXPIRED", 401);
  await securityEvent(db, request, "session.rotated", "info", admin.id);
  return { token, id };
}
