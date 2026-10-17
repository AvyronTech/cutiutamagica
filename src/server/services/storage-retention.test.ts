import { afterEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { recordApprovalDecision } from "./approval-orchestrator";
import {
  DEFAULT_STORAGE_RETENTION,
  isRetentionDue,
  parseStorageRetentionSettings,
  processStorageRetention,
} from "./storage-retention";

const databases: DatabaseSync[] = [];

function testDatabase() {
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

describe("storage retention policy", () => {
  it("keeps safe bounded defaults when settings are malformed", () => {
    expect(parseStorageRetentionSettings("not-json")).toEqual(DEFAULT_STORAGE_RETENTION);
    expect(
      parseStorageRetentionSettings(
        JSON.stringify({ publishedSocialMediaDays: 0, approvalBatchSize: 10_000 }),
      ),
    ).toMatchObject({ publishedSocialMediaDays: 30, approvalBatchSize: 25 });
    expect(isRetentionDue("2026-01-01T00:00:00.000Z", new Date("2026-01-02"))).toBe(true);
    expect(isRetentionDue("invalid", new Date("2026-01-02"))).toBe(false);
  });

  it("discovers expired large data but deletes and compacts only after the 2-source quorum", async () => {
    const { db, sql } = testDatabase();
    const deletedKeys: string[] = [];
    const media = {
      async delete(key: string) {
        deletedKeys.push(key);
      },
    } as unknown as R2Bucket;
    const now = new Date("2027-02-01T08:00:00.000Z");

    sql
      .prepare(
        `INSERT INTO products (id, slug, status, name, category)
         VALUES ('product_retention_test', 'retention-test', 'active', 'Test retenție', 'test')`,
      )
      .run();
    sql
      .prepare(
        `INSERT INTO media_upload_sessions (
           id, product_id, requested_by, media_type, usage_type, r2_key,
           expected_mime_type, expected_size_bytes, status, expires_at
         ) VALUES (?, ?, ?, 'video', 'social', ?, 'video/mp4', 12000000, 'uploaded', ?)`,
      )
      .run(
        "upload_expired_test",
        "product_retention_test",
        "admin_cutiutamagica_gmail",
        "temporary/social/expired-test.mp4",
        "2027-01-20T08:00:00.000Z",
      );
    sql
      .prepare(
        `INSERT INTO social_posts (
           id, account_id, post_type, status, caption, media_json, campaign_json,
           published_at, external_post_id, created_at, updated_at
         ) VALUES (?, NULL, 'post', 'published', ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "social_published_retention_test",
        "Textul complet care nu trebuie păstrat permanent în D1.",
        '[{"mediaId":"remote-only","publicUrl":"https://example.test/post.jpg"}]',
        '{"campaignId":"retention-test","revisionHash":"rev-retention","platform":"instagram","placement":"feed","utm":"utm_source=instagram"}',
        "2026-10-01T08:00:00.000Z",
        "ig-post-123",
        "2026-10-01T08:00:00.000Z",
        "2026-10-01T08:00:00.000Z",
      );

    const discovered = await processStorageRetention({ DB: db, MEDIA: media }, now);
    expect(discovered.skipped).toBe(false);
    expect(deletedKeys).toEqual([]);

    const uploadItem = sql
      .prepare(
        `SELECT status, approval_request_id FROM storage_retention_items
         WHERE source_id = 'upload_expired_test'`,
      )
      .get() as { status: string; approval_request_id: string };
    expect(uploadItem.status).toBe("approval_pending");
    const requirement = sql
      .prepare(
        `SELECT approval_code, revision_ref, min_approvals
         FROM approval_requirements WHERE approval_request_id = ?`,
      )
      .get(uploadItem.approval_request_id) as {
      approval_code: string;
      revision_ref: string;
      min_approvals: number;
    };
    expect(requirement.min_approvals).toBe(2);

    await recordApprovalDecision(db, {
      approvalId: uploadItem.approval_request_id,
      source: "admin_dashboard",
      decision: "approved",
      approvalCode: requirement.approval_code,
      revisionRef: requirement.revision_ref,
      evidenceReference: "/admin/ai",
      idempotencyKey: "storage-test-dashboard",
      actorAdminUserId: "admin_cutiutamagica_gmail",
      actorLabel: "owner@example.test",
    });
    expect(deletedKeys).toEqual([]);
    await recordApprovalDecision(db, {
      approvalId: uploadItem.approval_request_id,
      source: "codex_conversation",
      decision: "approved",
      approvalCode: requirement.approval_code,
      revisionRef: requirement.revision_ref,
      evidenceReference: "codex-thread:storage-retention:test",
      idempotencyKey: "storage-test-codex",
      actorAdminUserId: "admin_cutiutamagica_gmail",
      actorLabel: "owner@example.test",
    });

    const executed = await processStorageRetention(
      { DB: db, MEDIA: media },
      new Date("2027-02-01T09:00:00.000Z"),
    );
    expect(executed.skipped).toBe(false);
    expect(deletedKeys).toContain("temporary/social/expired-test.mp4");
    expect(
      sql
        .prepare("SELECT status FROM media_upload_sessions WHERE id = 'upload_expired_test'")
        .get(),
    ).toMatchObject({ status: "expired" });
    const compacted = sql
      .prepare(
        `SELECT caption, media_json, campaign_json, content_sha256, compacted_at,
                external_post_id
         FROM social_posts WHERE id = 'social_published_retention_test'`,
      )
      .get() as Record<string, string>;
    expect(compacted.caption).toBe("");
    expect(JSON.parse(compacted.media_json)).toEqual([{ mediaId: "remote-only" }]);
    expect(compacted.content_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(compacted.compacted_at).toBeTruthy();
    expect(compacted.external_post_id).toBe("ig-post-123");
    expect(JSON.parse(compacted.campaign_json)).toMatchObject({
      campaignId: "retention-test",
      revisionHash: "rev-retention",
      platform: "instagram",
      placement: "feed",
      retention: { compacted: true },
    });
  });

  it("never classifies original catalog media as disposable social output", async () => {
    const { db, sql } = testDatabase();
    sql
      .prepare(
        `INSERT INTO products (id, slug, status, name, category)
         VALUES ('product_original_test', 'original-test', 'active', 'Original test', 'test')`,
      )
      .run();
    sql
      .prepare(
        `INSERT INTO product_media (
           id, product_id, media_type, r2_key, usage_type, status,
           file_size_bytes, rights_status, marketing_approved, public_access
         ) VALUES (
           'media_original_test', 'product_original_test', 'image',
           'products/product_original_test/images/original.webp', 'product', 'active',
           5000000, 'cleared', 1, 1
         )`,
      )
      .run();
    const original = sql
      .prepare(
        `SELECT id, r2_key FROM product_media
         WHERE usage_type = 'product' AND r2_key IS NOT NULL LIMIT 1`,
      )
      .get() as { id: string; r2_key: string } | undefined;
    expect(original).toBeTruthy();
    await processStorageRetention(
      { DB: db, MEDIA: { delete: async () => undefined } as unknown as R2Bucket },
      new Date("2035-02-01T08:00:00.000Z"),
    );
    expect(
      sql
        .prepare("SELECT COUNT(*) AS total FROM storage_retention_items WHERE source_id = ?")
        .get(original!.id),
    ).toMatchObject({ total: 0 });
  });
});
