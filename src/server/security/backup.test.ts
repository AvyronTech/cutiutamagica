import { afterEach, describe, expect, it } from "vitest";
import { gunzipSync } from "node:zlib";
import { securityDatabase } from "./testing/database";
import { backupColumns, backupTableQuery } from "../services/backup-projection";
import { createApplicationBackup } from "../services/backup-center";
const open: ReturnType<typeof securityDatabase>[] = [];
afterEach(() => {
  for (const d of open.splice(0)) d.sql.close();
});
describe("Free-compatible private backup projection", () => {
  it("matches every current schema column, including checks, inline commas and quoted identifiers", () => {
    const d = securityDatabase();
    open.push(d);
    const schemas = d.sql
      .prepare("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string; sql: string }[];
    for (const row of schemas) {
      const columns = d.sql
        .prepare(`PRAGMA table_xinfo("${row.name}")`)
        .all()
        .map((c) => c.name);
      expect(backupColumns(row.sql), row.name).toEqual(columns);
    }
  });
  it("preserves nulls and SQL types with more than 15 columns and rejects SQL identifiers from inputs", () => {
    const d = securityDatabase();
    open.push(d);
    const columns = Array.from({ length: 40 }, (_, i) => `col_${i}`);
    d.sql.exec(
      `CREATE TABLE test_wide(${columns.map((c) => c + " TEXT").join(",")});INSERT INTO test_wide(col_0,col_39) VALUES('quoted '' content','last');`,
    );
    const row = d.sql.prepare(backupTableQuery("test_wide", columns, 5001)).get() as {
      row_json: string;
    };
    expect(JSON.parse(row.row_json)).toMatchObject({
      col_0: "quoted ' content",
      col_20: null,
      col_39: "last",
    });
    expect(() => backupTableQuery("products;DROP TABLE orders", ["id"], 5)).toThrow();
    expect(() => backupTableQuery("products", ['id" FROM orders --'], 5)).toThrow();
  });
  it("exports the migrated schema below the Free query limit without passwords, tokens or vault ciphertext", async () => {
    const d = securityDatabase();
    open.push(d);
    d.sql.exec(
      "UPDATE backup_policies SET include_customer_data=1 WHERE id='default';CREATE TABLE test_sensitive(id TEXT PRIMARY KEY,public_token_hash TEXT,confirmation_token_hash TEXT,nullable_value TEXT);INSERT INTO test_sensitive VALUES('safe-id','test-token-hash','test-confirmation-hash',NULL)",
    );
    let queries = 0;
    const db = {
      ...d.db,
      prepare(query: string) {
        queries++;
        return d.db.prepare(query);
      },
    } as D1Database;
    let payload: ArrayBuffer | undefined;
    const env = {
      DB: db,
      MEDIA: {
        async put(_key: string, value: ArrayBuffer) {
          payload = value;
        },
        async delete() {},
      },
    } as unknown as Pick<Env, "DB" | "MEDIA">;
    const result = await createApplicationBackup(env, "manual", null);
    expect(result.status).toBe("completed");
    expect(queries).toBeLessThan(48);
    const exported = JSON.parse(gunzipSync(new Uint8Array(payload!)).toString());
    expect(exported.tables.test_sensitive).toEqual([{ id: "safe-id", nullable_value: null }]);
    expect(exported.manifest.redactedColumns.test_sensitive).toEqual([
      "public_token_hash",
      "confirmation_token_hash",
    ]);
    for (const name of [
      "review_accounts",
      "admin_password_credentials",
      "security_service_identities",
      "integration_credentials",
      "admin_sessions",
    ])
      expect(exported.tables).not.toHaveProperty(name);
    expect(JSON.stringify(exported.tables)).not.toContain("test-token-hash");
    expect(exported.manifest.skipped).toEqual([]);
  });
});
