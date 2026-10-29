import { afterEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { reconcileMetricoolSchedules } from "./services/social-schedule-reconciliation";

const databases: DatabaseSync[] = [];
const migrations = resolve("cloudflare/d1/migrations");

function databaseBeforeReconciliation() {
  const database = new DatabaseSync(":memory:");
  databases.push(database);
  for (const file of readdirSync(migrations).sort()) {
    if (file >= "0082_social_schedule_reconciliation.sql") break;
    database.exec(readFileSync(resolve(migrations, file), "utf8"));
  }
  return database;
}

function databaseWithAllMigrations() {
  const database = new DatabaseSync(":memory:");
  databases.push(database);
  for (const file of readdirSync(migrations).sort()) {
    database.exec(readFileSync(resolve(migrations, file), "utf8"));
  }
  return database;
}

function d1(database: DatabaseSync): D1Database {
  const prepare = (query: string) => {
    let values: Array<string | number | null> = [];
    const statement = {
      bind(...args: Array<string | number | null>) {
        values = args;
        return statement;
      },
      async first<T>() {
        return (database.prepare(query).get(...values) as T | undefined) ?? null;
      },
      async all<T>() {
        return { success: true, results: database.prepare(query).all(...values) as T[] };
      },
      async run() {
        const result = database.prepare(query).run(...values);
        return { success: true, results: [], meta: { changes: Number(result.changes) } };
      },
    };
    return statement;
  };
  return {
    prepare,
    async batch(statements: Array<ReturnType<typeof prepare>>) {
      database.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        database.exec("COMMIT");
        return results;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as D1Database;
}

afterEach(() => {
  for (const database of databases.splice(0)) database.close();
});

describe("social schedule reconciliation", () => {
  it("returns unverified local schedules to approved and preserves provider receipts", () => {
    const database = databaseBeforeReconciliation();
    const insertPost = database.prepare(
      `INSERT INTO social_posts(
        id,post_type,status,caption,scheduled_at,external_post_id,created_at,updated_at
      ) VALUES(?, 'story', 'scheduled', 'Test', ?, ?, ?, ?)`,
    );
    for (let index = 1; index <= 5; index += 1) {
      insertPost.run(
        `unverified-${index}`,
        "2026-10-29T18:00:00.000Z",
        null,
        "2026-10-20T10:00:00.000Z",
        "2026-10-20T10:00:00.000Z",
      );
    }
    insertPost.run(
      "verified-1",
      "2026-10-29T19:00:00.000Z",
      "metricool-external-1",
      "2026-10-20T10:00:00.000Z",
      "2026-10-20T10:00:00.000Z",
    );
    database
      .prepare(
        `INSERT INTO provider_operations(
          id,provider,operation_type,entity_type,entity_id,idempotency_key,environment,
          status,external_id,response_summary_json,completed_at
        ) VALUES('operation-verified-1','metricool','social.schedule','social_post',
          'verified-1','metricool:schedule:verified-1','production','succeeded',
          'metricool-external-1','{}','2026-10-20T10:00:00.000Z')`,
      )
      .run();

    database.exec(
      readFileSync(resolve(migrations, "0082_social_schedule_reconciliation.sql"), "utf8"),
    );
    database.exec(readFileSync(resolve(migrations, "0083_social_schedule_reapproval.sql"), "utf8"));

    const corrected = database
      .prepare(
        `SELECT id,status,scheduled_at,publication_state
         FROM v_social_publication_state WHERE id LIKE 'unverified-%' ORDER BY id`,
      )
      .all() as Array<Record<string, string | null>>;
    expect(corrected).toHaveLength(5);
    expect(corrected.every((post) => post.status === "review")).toBe(true);
    expect(corrected.every((post) => post.scheduled_at === null)).toBe(true);
    expect(corrected.every((post) => post.publication_state === "review")).toBe(true);

    expect(
      database
        .prepare("SELECT status,publication_state FROM v_social_publication_state WHERE id=?")
        .get("verified-1"),
    ).toMatchObject({ status: "scheduled", publication_state: "scheduled_verified" });
    expect(
      database
        .prepare(
          `SELECT quota_used,quota_limit,future_schedule_count,reconciled_count
           FROM social_schedule_snapshots WHERE id='metricool_schedule_7230540_20261028'`,
        )
        .get(),
    ).toMatchObject({
      quota_used: 6,
      quota_limit: 20,
      future_schedule_count: 0,
      reconciled_count: 5,
    });
  });

  it("is idempotent, expires stale approvals and preserves verified provider receipts", async () => {
    const database = databaseWithAllMigrations();
    const insertPost = database.prepare(
      `INSERT INTO social_posts(
        id,post_type,status,caption,scheduled_at,external_post_id,approved_by,created_at,updated_at
      ) VALUES(?, 'post', 'scheduled', 'Test', ?, ?, 'admin_cutiutamagica_gmail', ?, ?)`,
    );
    insertPost.run(
      "runtime-unverified",
      "2026-10-30T18:00:00.000Z",
      null,
      "2026-10-29T10:00:00.000Z",
      "2026-10-29T10:00:00.000Z",
    );
    insertPost.run(
      "runtime-verified",
      "2026-10-30T19:00:00.000Z",
      "metricool-runtime-verified",
      "2026-10-29T10:00:00.000Z",
      "2026-10-29T10:00:00.000Z",
    );
    database
      .prepare(
        `INSERT INTO provider_operations(
          id,provider,operation_type,entity_type,entity_id,idempotency_key,environment,
          status,external_id,response_summary_json,completed_at
        ) VALUES('runtime-operation','metricool','social.schedule','social_post',
          'runtime-verified','metricool:schedule:runtime-verified','production','succeeded',
          'metricool-runtime-verified','{}','2026-10-29T10:00:00.000Z')`,
      )
      .run();
    database
      .prepare(
        `INSERT INTO approval_requests(
          id,request_type,entity_type,entity_id,risk_level,summary,proposed_action_json,status
        ) VALUES('runtime-approval','social_schedule','social_post','runtime-unverified',
          'critical','Programare de test','{"revisionHash":"runtime-r1"}','pending')`,
      )
      .run();

    const input = {
      idempotencyKey: "451d3866-7fa5-4be2-b696-0ddad594713f",
      quotaUsed: 6,
      quotaLimit: 20 as const,
      futureSchedules: [] as never[],
      evidenceNote: "Brandul 7230540 verificat fără programări viitoare.",
    };
    const first = await reconcileMetricoolSchedules(
      d1(database),
      "admin_cutiutamagica_gmail",
      input,
      "2026-10-29T12:00:00.000Z",
    );
    const second = await reconcileMetricoolSchedules(
      d1(database),
      "admin_cutiutamagica_gmail",
      input,
      "2026-10-29T12:05:00.000Z",
    );

    expect(first).toMatchObject({
      duplicate: false,
      reconciledCount: 1,
      verifiedScheduledCount: 1,
    });
    expect(second).toMatchObject({
      duplicate: true,
      reconciledCount: 1,
      verifiedScheduledCount: 1,
      observedAt: "2026-10-29T12:00:00.000Z",
    });
    expect(
      database
        .prepare("SELECT status,scheduled_at,approved_by FROM social_posts WHERE id=?")
        .get("runtime-unverified"),
    ).toMatchObject({ status: "review", scheduled_at: null, approved_by: null });
    expect(
      database.prepare("SELECT status FROM approval_requests WHERE id='runtime-approval'").get(),
    ).toMatchObject({ status: "expired" });
    expect(
      database.prepare("SELECT status FROM social_posts WHERE id='runtime-verified'").get(),
    ).toMatchObject({ status: "scheduled" });
    expect(
      database
        .prepare(
          `SELECT COUNT(*) AS total FROM social_schedule_snapshots
           WHERE observed_at='2026-10-29T12:00:00.000Z'`,
        )
        .get(),
    ).toMatchObject({ total: 1 });
    expect(
      database
        .prepare(
          `SELECT COUNT(*) AS total FROM business_activity
           WHERE action='social.schedule_reconciled'
             AND entity_id NOT LIKE 'metricool_schedule_7230540_20261028'`,
        )
        .get(),
    ).toMatchObject({ total: 1 });
  });
});
