import { afterEach, describe, expect, it } from "vitest";
import { securityDatabase } from "./testing/database";
import { encryptSecretValue, decryptSecretValue } from "../services/growth-settings";
import type { CommerceEnv } from "../integrations/provider-runtime";
import {
  issueServiceIdentity,
  revokeServiceIdentity,
  runnerCredentials,
} from "./service-identities";
import { listBackupTables } from "../services/backup-center";

const open: ReturnType<typeof securityDatabase>[] = [];
afterEach(() => {
  for (const d of open.splice(0)) d.sql.close();
});
function fixture() {
  const d = securityDatabase();
  open.push(d);
  const actor = (d.sql.prepare("SELECT id FROM admin_users LIMIT 1").get() as { id: string }).id;
  const env = { DB: d.db, INTEGRATION_ENCRYPTION_KEY: btoa("N".repeat(32)) } as CommerceEnv;
  return { ...d, actor, env };
}
const request = new Request("https://app.cutiutamagica.eu/api/v1/admin/security/services");

describe("scoped automation identities and secret rotation", () => {
  it("encrypts context-bound secrets and supports bounded master-key migration", async () => {
    const { env } = fixture();
    const old = { ...env, INTEGRATION_ENCRYPTION_KEY: btoa("P".repeat(32)) };
    const sealed = await encryptSecretValue(old, "test-private-secret", "provider-a");
    await expect(decryptSecretValue(env, sealed, "provider-a")).rejects.toBeDefined();
    const transitional = {
      ...env,
      INTEGRATION_ENCRYPTION_PREVIOUS_KEY: old.INTEGRATION_ENCRYPTION_KEY,
    };
    expect(await decryptSecretValue(transitional, sealed, "provider-a")).toBe(
      "test-private-secret",
    );
    await expect(decryptSecretValue(transitional, sealed, "provider-b")).rejects.toBeDefined();
    const renewed = await encryptSecretValue(transitional, "test-private-secret", "provider-a");
    expect(await decryptSecretValue(env, renewed, "provider-a")).toBe("test-private-secret");
    expect(sealed.ciphertext).not.toContain("test-private-secret");
  });
  it("issues independent keys, rotates with grace, rejects stale rotations and revocation never falls back to legacy", async () => {
    const f = fixture();
    const first = await issueServiceIdentity(f.env, request, f.actor, {
      id: "runner-a",
      label: "Runner A",
    });
    const other = await issueServiceIdentity(f.env, request, f.actor, {
      id: "runner-b",
      label: "Runner B",
    });
    expect(first.secret).not.toBe(other.secret);
    expect((await runnerCredentials(f.env, "runner-a")).secrets).toEqual([first.secret]);
    const next = await issueServiceIdentity(f.env, request, f.actor, {
      id: "runner-a",
      label: "Runner A",
      version: 1,
      graceMinutes: 60,
      accessClientId: "runner-a.access",
    });
    expect((await runnerCredentials(f.env, "runner-a")).secrets).toEqual([
      next.secret,
      first.secret,
    ]);
    expect((await runnerCredentials(f.env, "runner-a")).accessClientId).toBe("runner-a.access");
    await expect(
      issueServiceIdentity(f.env, request, f.actor, {
        id: "runner-a",
        label: "Runner A",
        version: 1,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
    f.sql
      .prepare(
        "UPDATE security_service_identities SET previous_until=datetime('now','-1 minute') WHERE id='runner-a'",
      )
      .run();
    expect((await runnerCredentials(f.env, "runner-a")).secrets).toEqual([next.secret]);
    await revokeServiceIdentity(f.env, request, f.actor, "runner-a");
    await expect(
      runnerCredentials(
        { ...f.env, AI_STUDIO_RUNNER_HMAC_SECRET: "test-legacy-value" },
        "runner-a",
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
    const stored = JSON.stringify(f.sql.prepare("SELECT * FROM security_service_identities").all());
    const log = JSON.stringify(f.sql.prepare("SELECT * FROM security_events").all());
    for (const secret of [first.secret, next.secret, other.secret]) {
      expect(stored).not.toContain(secret);
      expect(log).not.toContain(secret);
    }
  });
  it("allows the existing runner only during explicit migration and rejects expired identities", async () => {
    const f = fixture();
    const env = { ...f.env, AI_STUDIO_RUNNER_HMAC_SECRET: "test-legacy-value" };
    expect(await runnerCredentials(env, "unmigrated")).toMatchObject({ legacy: true });
    await expect(
      runnerCredentials({ ...env, ALLOW_LEGACY_AI_RUNNER: "false" }, "unmigrated"),
    ).rejects.toMatchObject({ statusCode: 401 });
    await issueServiceIdentity(env, request, f.actor, { id: "expired", label: "Expired runner" });
    f.sql
      .prepare(
        "UPDATE security_service_identities SET expires_at=datetime('now','-1 second') WHERE id='expired'",
      )
      .run();
    await expect(runnerCredentials(env, "expired")).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe("application backup privacy", () => {
  it("excludes authentication material even when customer exports are enabled", async () => {
    const f = fixture();
    const tables = await listBackupTables(f.db, true);
    for (const name of [
      "admin_sessions",
      "admin_password_credentials",
      "review_accounts",
      "review_sessions",
      "customer_login_challenges",
      "integration_credentials",
      "security_service_identities",
      "ai_runner_nonces",
    ])
      expect(tables).not.toContain(name);
    expect(tables).toContain("products");
    expect(tables).toContain("orders");
  });
  it("follows future customer foreign keys transitively when personal data are excluded", async () => {
    const f = fixture();
    f.sql.exec(
      'CREATE TABLE z_future_customer_child(id TEXT PRIMARY KEY, account_id TEXT REFERENCES "review_accounts"(id)); CREATE TABLE a_future_grandchild(id TEXT PRIMARY KEY, child_id TEXT REFERENCES z_future_customer_child(id));',
    );
    const tables = await listBackupTables(f.db, false);
    for (const name of [
      "orders",
      "customers",
      "review_accounts",
      "z_future_customer_child",
      "a_future_grandchild",
      "audit_log",
      "security_events",
    ])
      expect(tables).not.toContain(name);
    expect(tables).toContain("products");
  });
});
