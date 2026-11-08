import { afterEach, describe, expect, it } from "vitest";
import { securityDatabase } from "./testing/database";
import {
  __adminAuthInternals,
  ADMIN_HOST_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
  readAdminSessionToken,
  authenticateAdminSession,
  type PasswordAdminIdentity,
} from "@/lib/admin-password-auth-service";
import { listOwnSessions, revokeOwnSessions, rotateOwnSession } from "./sessions";
import { canOpenAdminPath, adminLandingPath } from "@/lib/admin-access-policy";
import { rateLimit, maintainSecurityLog } from "./events";

const open: ReturnType<typeof securityDatabase>[] = [];
afterEach(() => {
  for (const d of open.splice(0)) d.sql.close();
});
const request = (token?: string) =>
  new Request("https://app.cutiutamagica.eu/api/v1/admin/security", {
    headers: token ? { cookie: `${ADMIN_HOST_SESSION_COOKIE}=${encodeURIComponent(token)}` } : {},
  });
async function fixture() {
  const d = securityDatabase();
  open.push(d);
  const rows = d.sql
    .prepare(
      "SELECT u.id,u.email FROM admin_users u JOIN admin_password_credentials c ON c.admin_user_id=u.id ORDER BY u.email LIMIT 2",
    )
    .all() as { id: string; email: string }[];
  d.sql
    .prepare("UPDATE admin_users SET status='active' WHERE id IN (?,?)")
    .run(rows[0].id, rows[1].id);
  const admin: PasswordAdminIdentity = {
    ...rows[0],
    displayName: "Test",
    roles: ["owner"],
    permissions: ["admin.access", "dashboard.read"],
    onboardingStatus: "complete",
    mustChangePassword: false,
    sessionId: crypto.randomUUID(),
  };
  const token = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const hash = await __adminAuthInternals.sha256(token);
  const expires = new Date(Date.now() + 3600_000).toISOString();
  d.sql
    .prepare(
      `INSERT INTO admin_sessions(id,admin_user_id,token_hash,password_version,expires_at,idle_expires_at)
    SELECT ?,?, ?,password_version,?,? FROM admin_password_credentials WHERE admin_user_id=?`,
    )
    .run(admin.sessionId, admin.id, hash, expires, expires, admin.id);
  return { ...d, admin, token, other: rows[1], expires };
}

describe("sessions and least privilege", () => {
  it("accepts old cookies during migration, prefers __Host and rejects ambiguous or malformed cookies", () => {
    const token = "a".repeat(43);
    expect(
      readAdminSessionToken(
        new Request("https://x.test", { headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` } }),
      ),
    ).toBe(token);
    expect(
      readAdminSessionToken(
        new Request("https://x.test", {
          headers: {
            cookie: `${ADMIN_SESSION_COOKIE}=${token}; ${ADMIN_HOST_SESSION_COOKIE}=${"b".repeat(43)}`,
          },
        }),
      ),
    ).toBe("b".repeat(43));
    for (const cookie of [
      `${ADMIN_HOST_SESSION_COOKIE}=%ZZ`,
      `${ADMIN_SESSION_COOKIE}=${token}; ${ADMIN_SESSION_COOKIE}=${token}`,
      `${ADMIN_HOST_SESSION_COOKIE}=bad; ${ADMIN_SESSION_COOKIE}=${token}`,
    ])
      expect(
        readAdminSessionToken(new Request("https://x.test", { headers: { cookie } })),
      ).toBeNull();
  });
  it("rotates atomically, invalidates the old token and preserves the absolute expiry", async () => {
    const f = await fixture();
    expect(await authenticateAdminSession(f.db, request(f.token))).toMatchObject({
      id: f.admin.id,
    });
    const rotated = await rotateOwnSession(f.db, request(), f.admin);
    await expect(authenticateAdminSession(f.db, request(f.token))).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(await authenticateAdminSession(f.db, request(rotated.token))).toMatchObject({
      sessionId: rotated.id,
    });
    expect(
      f.sql.prepare("SELECT expires_at FROM admin_sessions WHERE id=?").get(rotated.id),
    ).toMatchObject({ expires_at: f.expires });
    await expect(rotateOwnSession(f.db, request(), f.admin)).rejects.toMatchObject({
      statusCode: 401,
    });
  });
  it("revokes only owned sessions and makes all-device logout effective immediately", async () => {
    const f = await fixture();
    const foreign = crypto.randomUUID();
    f.sql
      .prepare(
        `INSERT INTO admin_sessions(id,admin_user_id,token_hash,password_version,expires_at) VALUES(?,?,?,1,?)`,
      )
      .run(foreign, f.other.id, "foreign-hash", f.expires);
    await expect(revokeOwnSessions(f.db, request(), f.admin, foreign)).rejects.toMatchObject({
      statusCode: 404,
    });
    expect((await listOwnSessions(f.db, f.admin)).map((r) => r.id)).toEqual([f.admin.sessionId]);
    expect(await revokeOwnSessions(f.db, request(), f.admin, "all")).toMatchObject({
      signedOut: true,
    });
    expect(
      f.sql.prepare("SELECT revoked_at FROM admin_sessions WHERE id=?").get(foreign),
    ).toMatchObject({ revoked_at: null });
    await expect(authenticateAdminSession(f.db, request(f.token))).rejects.toMatchObject({
      statusCode: 401,
    });
  });
  it("expires idle sessions while preserving sessions created before the additive migration", async () => {
    const f = await fixture();
    f.sql
      .prepare("UPDATE admin_sessions SET idle_expires_at=datetime('now','-1 minute') WHERE id=?")
      .run(f.admin.sessionId);
    await expect(authenticateAdminSession(f.db, request(f.token))).rejects.toMatchObject({
      statusCode: 401,
    });
    f.sql
      .prepare("UPDATE admin_sessions SET idle_expires_at=NULL WHERE id=?")
      .run(f.admin.sessionId);
    await expect(authenticateAdminSession(f.db, request(f.token))).resolves.toMatchObject({
      id: f.admin.id,
    });
  });
  it("does not grant roles to existing people or interactive access to automatic services", async () => {
    const f = await fixture();
    expect(
      f.sql
        .prepare(
          "SELECT count(*) AS n FROM admin_user_roles ur JOIN roles r ON r.id=ur.role_id WHERE r.code IN ('staff','consultant','service')",
        )
        .get(),
    ).toMatchObject({ n: 0 });
    expect(
      f.sql
        .prepare(
          "SELECT count(*) AS n FROM role_permissions rp JOIN roles r ON r.id=rp.role_id WHERE r.code='service'",
        )
        .get(),
    ).toMatchObject({ n: 0 });
    expect(canOpenAdminPath("/admin/accounts", ["catalog.read", "admin.access"])).toBe(false);
    expect(
      canOpenAdminPath("/admin/shipping", ["orders.read", "dashboard.read", "admin.access"]),
    ).toBe(false);
    expect(canOpenAdminPath("/admin/shipping", ["orders.read", "operations.read"])).toBe(true);
    expect(
      f.sql
        .prepare(
          "SELECT count(*) AS n FROM role_permissions rp JOIN roles r ON r.id=rp.role_id JOIN permissions p ON p.id=rp.permission_id WHERE r.code IN ('staff','consultant','service') AND p.code='operations.read'",
        )
        .get(),
    ).toMatchObject({ n: 0 });
    expect(canOpenAdminPath("/admin/unknown", ["admin.access", "dashboard.read"])).toBe(false);
    expect(adminLandingPath(["catalog.read", "admin.access"])).toBe("/admin/products");
    expect(canOpenAdminPath("/admin/settings", ["dashboard.read", "admin.access"])).toBe(false);
    f.sql.prepare("DELETE FROM admin_user_roles WHERE admin_user_id=?").run(f.admin.id);
    await expect(authenticateAdminSession(f.db, request(f.token))).rejects.toMatchObject({
      statusCode: 403,
    });
  });
  it("enforces atomic hashed rate limits without retaining raw account identifiers", async () => {
    const f = await fixture();
    await rateLimit(f.db, "test", "private@example.test", 2);
    await rateLimit(f.db, "test", "private@example.test", 2);
    await expect(rateLimit(f.db, "test", "private@example.test", 2)).rejects.toMatchObject({
      statusCode: 429,
    });
    await expect(rateLimit(f.db, "test", "private@example.test", 2)).rejects.toMatchObject({
      statusCode: 429,
    });
    expect(
      f.sql.prepare("SELECT count FROM security_rate_limits WHERE key LIKE 'test:%'").get(),
    ).toMatchObject({ count: 2 });
    expect(JSON.stringify(f.sql.prepare("SELECT * FROM security_rate_limits").all())).not.toContain(
      "private@example.test",
    );
    await maintainSecurityLog(f.db);
  });
});
