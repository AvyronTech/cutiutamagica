import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

/** Disposable SQLite implementation of the D1 statements used by security regressions. */
export function securityDatabase() {
  const sql = new DatabaseSync(":memory:");
  sql.exec("PRAGMA foreign_keys=ON");
  for (const name of readdirSync(resolve("cloudflare/d1/migrations")).sort())
    sql.exec(readFileSync(resolve("cloudflare/d1/migrations", name), "utf8"));
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
        return {
          success: true,
          results: [],
          meta: { changes: Number(sql.prepare(query).run(...values).changes) },
        };
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
  return { sql, db };
}
