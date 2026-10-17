import { afterEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  approvalPolicyForRisk,
  evaluateApprovalQuorum,
  recordApprovalDecision,
} from "./approval-orchestrator";

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
      async all<T>() {
        return { success: true, results: sql.prepare(query).all(...values) as T[] };
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

afterEach(() => {
  while (databases.length) databases.pop()?.close();
});

describe("multi-source approval policy", () => {
  it("allows one verified source for non-critical operations", () => {
    const policy = approvalPolicyForRisk("high");
    expect(policy).toEqual({ minApprovals: 1, requiredSources: [] });
    expect(
      evaluateApprovalQuorum(
        [{ source: "admin_dashboard", decision: "approved" }],
        policy.minApprovals,
        policy.requiredSources,
      ).approved,
    ).toBe(true);
  });

  it("requires both dashboard and Codex for critical operations", () => {
    const policy = approvalPolicyForRisk("critical");
    const oneSource = evaluateApprovalQuorum(
      [{ source: "admin_dashboard", decision: "approved" }],
      policy.minApprovals,
      policy.requiredSources,
    );
    expect(oneSource.approved).toBe(false);
    expect(oneSource.missingSources).toEqual(["codex_conversation"]);

    const bothSources = evaluateApprovalQuorum(
      [
        { source: "admin_dashboard", decision: "approved" },
        { source: "codex_conversation", decision: "approved" },
      ],
      policy.minApprovals,
      policy.requiredSources,
    );
    expect(bothSources.approved).toBe(true);
  });

  it("makes any rejection terminal", () => {
    const result = evaluateApprovalQuorum(
      [
        { source: "admin_dashboard", decision: "approved" },
        { source: "codex_conversation", decision: "rejected" },
      ],
      2,
      ["admin_dashboard", "codex_conversation"],
    );
    expect(result.rejected).toBe(true);
    expect(result.approved).toBe(false);
  });

  it("persists independent receipts and completes a critical request only at 2-of-2", async () => {
    const { db, sql } = database();
    sql
      .prepare(
        `INSERT INTO approval_requests (
         id, request_type, entity_type, entity_id, risk_level, summary,
         proposed_action_json, status
       ) VALUES (?, 'social_publish', 'social_post', 'post_test', 'critical',
         'Publică revizia de test.', ?, 'pending')`,
      )
      .run("approval_test", JSON.stringify({ revisionHash: "rev_test", destination: "instagram" }));
    const requirement = sql
      .prepare(
        `SELECT approval_code, revision_ref FROM approval_requirements
         WHERE approval_request_id = 'approval_test'`,
      )
      .get() as { approval_code: string; revision_ref: string };

    const dashboard = await recordApprovalDecision(db, {
      approvalId: "approval_test",
      source: "admin_dashboard",
      decision: "approved",
      approvalCode: requirement.approval_code,
      revisionRef: requirement.revision_ref,
      evidenceReference: "/admin/ai",
      idempotencyKey: "test-dashboard",
      actorAdminUserId: "admin_cutiutamagica_gmail",
      actorLabel: "owner@example.test",
    });
    expect(dashboard.status).toBe("pending");
    expect(dashboard.quorum.missingSources).toEqual(["codex_conversation"]);

    const codex = await recordApprovalDecision(db, {
      approvalId: "approval_test",
      source: "codex_conversation",
      decision: "approved",
      approvalCode: requirement.approval_code,
      revisionRef: requirement.revision_ref,
      evidenceReference: "codex-thread:test:turn-1",
      idempotencyKey: "test-codex",
      actorAdminUserId: "admin_cutiutamagica_gmail",
      actorLabel: "owner@example.test",
    });
    expect(codex.status).toBe("approved");
    expect(sql.prepare("SELECT COUNT(*) AS total FROM approval_receipts").get()).toMatchObject({
      total: 2,
    });
  });

  it("rejects a direct critical approval that bypasses the receipt quorum", () => {
    const { sql } = database();
    sql
      .prepare(
        `INSERT INTO approval_requests (
         id, request_type, entity_type, entity_id, risk_level, summary,
         proposed_action_json, status
       ) VALUES ('approval_guard', 'social_publish', 'social_post', 'post_guard',
         'critical', 'Guard test', '{"revisionHash":"guard"}', 'pending')`,
      )
      .run();
    expect(() =>
      sql
        .prepare("UPDATE approval_requests SET status = 'approved' WHERE id = 'approval_guard'")
        .run(),
    ).toThrow(/APPROVAL_QUORUM_NOT_REACHED/);
  });
});
