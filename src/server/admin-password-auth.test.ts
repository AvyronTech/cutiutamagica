import { afterEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  ADMIN_SESSION_COOKIE,
  authenticateAdminSession,
  changeAdminPassword,
  loginAdminWithPassword,
} from "../lib/admin-password-auth-service";
import { guardAdminPage } from "./admin-page-guard";

const databases: DatabaseSync[] = [];

function database() {
  const sql = new DatabaseSync(":memory:");
  databases.push(sql);
  for (const name of readdirSync(resolve("cloudflare/d1/migrations")).sort()) {
    sql.exec(readFileSync(resolve("cloudflare/d1/migrations", name), "utf8"));
  }
  const prepare = (query: string) => {
    let values: Array<string | number | null> = [];
    const statement = {
      bind(...args: Array<string | number | null>) {
        values = args;
        return statement;
      },
      async first<T>() {
        return (sql.prepare(query).get(...values) as T | undefined) ?? null;
      },
      async all() {
        return { success: true, results: sql.prepare(query).all(...values) };
      },
      async run() {
        const result = sql.prepare(query).run(...values);
        return { success: true, results: [], meta: { changes: Number(result.changes) } };
      },
    };
    return statement;
  };
  const db = {
    prepare,
    async batch(statements: Array<ReturnType<typeof prepare>>) {
      sql.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sql.exec("COMMIT");
        return results;
      } catch (error) {
        sql.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as D1Database;
  return { db, sql };
}

function request(token?: string, ip = "203.0.113.10") {
  return new Request("https://cutiutamagica.eu/auth", {
    headers: {
      "cf-connecting-ip": ip,
      "user-agent": "admin-auth-test",
      ...(token ? { cookie: `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}` } : {}),
    },
  });
}

afterEach(() => {
  for (const db of databases.splice(0)) db.close();
});

describe("admin password authentication", () => {
  it("allows exactly the four seeded owners with the temporary password", async () => {
    const { db, sql } = database();
    const emails = [
      "cutiutamagica@gmail.com",
      "prometheus@avyron.eu",
      "ana@cutiutamagica.ro",
      "avyrontech@gmail.com",
    ];
    for (const [index, email] of emails.entries()) {
      const result = await loginAdminWithPassword(
        db,
        request(undefined, `203.0.113.${index + 1}`),
        email,
        "Magic123",
      );
      expect(result.admin).toMatchObject({ email, roles: ["owner"], mustChangePassword: true });
    }
    await expect(
      loginAdminWithPassword(
        db,
        request(undefined, "203.0.113.20"),
        "other@example.com",
        "Magic123",
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(
      sql.prepare("SELECT COUNT(*) AS count FROM admin_password_credentials").get(),
    ).toMatchObject({ count: 4 });
    expect(
      new Set(
        sql
          .prepare("SELECT password_salt FROM admin_password_credentials")
          .all()
          .map((row) => row.password_salt),
      ).size,
    ).toBe(4);
    expect(
      sql
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('admin_access_requests','admin_recovery_requests')",
        )
        .all(),
    ).toEqual([]);
  }, 20_000);

  it("stores only a session digest and rotates sessions after password change", async () => {
    const { db, sql } = database();
    const login = await loginAdminWithPassword(
      db,
      request(),
      "cutiutamagica@gmail.com",
      "Magic123",
    );
    const storedSession = sql
      .prepare("SELECT token_hash FROM admin_sessions WHERE id = ?")
      .get(login.admin.sessionId) as { token_hash: string };
    expect(storedSession.token_hash).not.toBe(login.token);

    const current = await authenticateAdminSession(db, request(login.token));
    expect(current.mustChangePassword).toBe(true);

    const changed = await changeAdminPassword(db, request(login.token), current, "NouaParola123");
    await expect(authenticateAdminSession(db, request(login.token))).rejects.toMatchObject({
      statusCode: 401,
    });
    const refreshed = await authenticateAdminSession(db, request(changed.token));
    expect(refreshed.mustChangePassword).toBe(false);
    expect(refreshed.permissions).toContain("dashboard.read");
    await expect(
      loginAdminWithPassword(db, request(undefined, "203.0.113.21"), refreshed.email, "Magic123"),
    ).rejects.toMatchObject({ statusCode: 401 });
    await expect(
      loginAdminWithPassword(
        db,
        request(undefined, "203.0.113.22"),
        refreshed.email,
        "NouaParola123",
      ),
    ).resolves.toMatchObject({ admin: { mustChangePassword: false } });
  }, 20_000);

  it("locks an account after repeated invalid attempts", async () => {
    const { db, sql } = database();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        loginAdminWithPassword(
          db,
          request(undefined, `203.0.113.${30 + attempt}`),
          "ana@cutiutamagica.ro",
          "wrong-password",
        ),
      ).rejects.toMatchObject({ statusCode: 401 });
    }
    const credential = sql
      .prepare(
        "SELECT failed_attempts, locked_until FROM admin_password_credentials WHERE admin_user_id = 'admin_ana_cutiutamagica'",
      )
      .get();
    expect(credential).toMatchObject({ failed_attempts: 5 });
    expect(credential?.locked_until).toBeTruthy();
    await expect(
      loginAdminWithPassword(
        db,
        request(undefined, "203.0.113.40"),
        "ana@cutiutamagica.ro",
        "Magic123",
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  }, 20_000);

  it("redirects unauthenticated admin pages before rendering the dashboard", async () => {
    const { db } = database();
    const anonymous = await guardAdminPage(
      new Request("https://cutiutamagica.eu/admin/products?status=active"),
      db,
    );
    expect(anonymous).toMatchObject({ status: 302 });
    expect(anonymous?.headers.get("location")).toBe(
      "https://cutiutamagica.eu/auth?redirect=%2Fadmin%2Fproducts%3Fstatus%3Dactive",
    );

    const login = await loginAdminWithPassword(
      db,
      request(undefined, "203.0.113.50"),
      "prometheus@avyron.eu",
      "Magic123",
    );
    await expect(
      guardAdminPage(
        new Request("https://cutiutamagica.eu/admin", {
          headers: { cookie: `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(login.token)}` },
        }),
        db,
      ),
    ).resolves.toBeNull();
    await expect(
      guardAdminPage(new Request("https://cutiutamagica.eu/produse"), db),
    ).resolves.toBeNull();
  }, 20_000);
});
