type RetentionSettings = {
  enabled: boolean;
  scanIntervalHours: number;
  approvalBatchSize: number;
  executeAfterApproval: boolean;
  generatedRejectedDays: number;
  generatedAbandonedDays: number;
  generatedApprovedUnusedDays: number;
  publishedSocialMediaDays: number;
  archivedSocialMediaDays: number;
  publishedPostPayloadDays: number;
  preserveMetadata: boolean;
};

type RetentionSourceKind =
  "media_upload_session" | "ai_generation_asset" | "social_media_asset" | "social_post_payload";

type RetentionClass =
  | "temporary_upload"
  | "generated_rejected"
  | "generated_abandoned"
  | "generated_approved_unused"
  | "published_social_derivative"
  | "archived_social_derivative"
  | "published_post_payload";

type RetentionCandidate = {
  itemKey: string;
  sourceKind: RetentionSourceKind;
  sourceId: string;
  r2Key: string | null;
  retentionClass: RetentionClass;
  byteSize: number;
  retainUntil: string;
};

type RetentionItemRow = {
  id: string;
  item_key: string;
  source_kind: RetentionSourceKind;
  source_id: string;
  r2_key: string | null;
  retention_class: RetentionClass;
  byte_size: number;
  retain_until: string;
  status: string;
  approval_request_id: string;
  attempt_count: number;
};

type SocialReferenceRow = {
  media_id: string | null;
  r2_key: string | null;
  post_id: string;
  status: string;
  published_at: string | null;
};

const DAY_MS = 86_400_000;

export const DEFAULT_STORAGE_RETENTION: RetentionSettings = {
  enabled: true,
  scanIntervalHours: 24,
  approvalBatchSize: 25,
  executeAfterApproval: true,
  generatedRejectedDays: 7,
  generatedAbandonedDays: 14,
  generatedApprovedUnusedDays: 90,
  publishedSocialMediaDays: 30,
  archivedSocialMediaDays: 7,
  publishedPostPayloadDays: 90,
  preserveMetadata: true,
};

function boundedInteger(value: unknown, minimum: number, maximum: number, fallback: number) {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum
    ? Number(value)
    : fallback;
}

export function parseStorageRetentionSettings(valueJson: string | null): RetentionSettings {
  if (!valueJson) return DEFAULT_STORAGE_RETENTION;
  try {
    const value = JSON.parse(valueJson) as Record<string, unknown>;
    return {
      enabled: typeof value.enabled === "boolean" ? value.enabled : true,
      scanIntervalHours: boundedInteger(value.scanIntervalHours, 1, 168, 24),
      approvalBatchSize: boundedInteger(value.approvalBatchSize, 1, 100, 25),
      executeAfterApproval:
        typeof value.executeAfterApproval === "boolean" ? value.executeAfterApproval : true,
      generatedRejectedDays: boundedInteger(value.generatedRejectedDays, 1, 90, 7),
      generatedAbandonedDays: boundedInteger(value.generatedAbandonedDays, 1, 180, 14),
      generatedApprovedUnusedDays: boundedInteger(value.generatedApprovedUnusedDays, 30, 365, 90),
      publishedSocialMediaDays: boundedInteger(value.publishedSocialMediaDays, 7, 365, 30),
      archivedSocialMediaDays: boundedInteger(value.archivedSocialMediaDays, 1, 90, 7),
      publishedPostPayloadDays: boundedInteger(value.publishedPostPayloadDays, 30, 730, 90),
      preserveMetadata: typeof value.preserveMetadata === "boolean" ? value.preserveMetadata : true,
    };
  } catch {
    return DEFAULT_STORAGE_RETENTION;
  }
}

function addDays(value: string, days: number): string | null {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp + days * DAY_MS).toISOString() : null;
}

export function isRetentionDue(retainUntil: string, now: Date): boolean {
  const timestamp = Date.parse(retainUntil);
  return Number.isFinite(timestamp) && timestamp <= now.getTime();
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function discoverCandidates(
  db: D1Database,
  settings: RetentionSettings,
  now: Date,
): Promise<RetentionCandidate[]> {
  const nowIso = now.toISOString();
  const [uploads, generated, socialMedia, references, posts] = await Promise.all([
    db
      .prepare(
        `SELECT id, r2_key, expected_size_bytes, expires_at
         FROM media_upload_sessions
         WHERE status IN ('created','uploading','uploaded','failed') AND expires_at <= ?1`,
      )
      .bind(nowIso)
      .all<{ id: string; r2_key: string; expected_size_bytes: number; expires_at: string }>(),
    db
      .prepare(
        `SELECT asset.id, asset.r2_key, asset.byte_size, asset.review_status,
                asset.created_at, job.status AS job_status, job.purpose
         FROM ai_generation_assets AS asset
         JOIN ai_generation_jobs AS job ON job.id = asset.job_id
         WHERE asset.review_status = 'rejected'
            OR job.status IN ('failed','cancelled')
            OR (asset.review_status = 'approved' AND job.status = 'completed')`,
      )
      .all<{
        id: string;
        r2_key: string;
        byte_size: number;
        review_status: string;
        created_at: string;
        job_status: string;
        purpose: string;
      }>(),
    db
      .prepare(
        `SELECT id, r2_key, file_size_bytes, status, archived_at
         FROM product_media
         WHERE usage_type IN ('social','story','advertising')
           AND r2_key IS NOT NULL AND status IN ('active','archived')`,
      )
      .all<{
        id: string;
        r2_key: string;
        file_size_bytes: number | null;
        status: string;
        archived_at: string | null;
      }>(),
    db
      .prepare(
        `SELECT json_extract(entry.value, '$.mediaId') AS media_id,
                json_extract(entry.value, '$.r2Key') AS r2_key,
                post.id AS post_id, post.status, post.published_at
         FROM social_posts AS post, json_each(post.media_json) AS entry`,
      )
      .all<SocialReferenceRow>(),
    db
      .prepare(
        `SELECT id, caption, media_json, campaign_json, published_at
         FROM social_posts
         WHERE status = 'published' AND published_at IS NOT NULL AND compacted_at IS NULL`,
      )
      .all<{
        id: string;
        caption: string;
        media_json: string;
        campaign_json: string;
        published_at: string;
      }>(),
  ]);

  const candidates: RetentionCandidate[] = uploads.results.map((upload) => ({
    itemKey: `r2:${upload.r2_key}`,
    sourceKind: "media_upload_session",
    sourceId: upload.id,
    r2Key: upload.r2_key,
    retentionClass: "temporary_upload",
    byteSize: Number(upload.expected_size_bytes),
    retainUntil: upload.expires_at,
  }));

  for (const asset of generated.results) {
    const referencesAsset = references.results.some(
      (reference) => reference.r2_key === asset.r2_key || reference.media_id === asset.id,
    );
    if (referencesAsset) continue;
    if (
      asset.review_status === "approved" &&
      asset.job_status === "completed" &&
      asset.purpose === "product_visual"
    ) {
      continue;
    }
    const retentionClass: RetentionClass =
      asset.review_status === "rejected"
        ? "generated_rejected"
        : asset.job_status === "failed" || asset.job_status === "cancelled"
          ? "generated_abandoned"
          : "generated_approved_unused";
    const days =
      retentionClass === "generated_rejected"
        ? settings.generatedRejectedDays
        : retentionClass === "generated_abandoned"
          ? settings.generatedAbandonedDays
          : settings.generatedApprovedUnusedDays;
    const retainUntil = addDays(asset.created_at, days);
    if (!retainUntil || !isRetentionDue(retainUntil, now)) continue;
    candidates.push({
      itemKey: `r2:${asset.r2_key}`,
      sourceKind: "ai_generation_asset",
      sourceId: asset.id,
      r2Key: asset.r2_key,
      retentionClass,
      byteSize: Number(asset.byte_size),
      retainUntil,
    });
  }

  for (const asset of socialMedia.results) {
    const assetReferences = references.results.filter(
      (reference) => reference.media_id === asset.id || reference.r2_key === asset.r2_key,
    );
    let retentionClass: RetentionClass;
    let retainUntil: string | null;
    if (asset.status === "archived" && asset.archived_at) {
      retentionClass = "archived_social_derivative";
      retainUntil = addDays(asset.archived_at, settings.archivedSocialMediaDays);
    } else {
      if (
        assetReferences.length === 0 ||
        assetReferences.some(
          (reference) => reference.status !== "published" || !reference.published_at,
        )
      ) {
        continue;
      }
      const latestPublication = assetReferences
        .map((reference) => reference.published_at!)
        .sort()
        .at(-1)!;
      retentionClass = "published_social_derivative";
      retainUntil = addDays(latestPublication, settings.publishedSocialMediaDays);
    }
    if (!retainUntil || !isRetentionDue(retainUntil, now)) continue;
    candidates.push({
      itemKey: `r2:${asset.r2_key}`,
      sourceKind: "social_media_asset",
      sourceId: asset.id,
      r2Key: asset.r2_key,
      retentionClass,
      byteSize: Number(asset.file_size_bytes ?? 0),
      retainUntil,
    });
  }

  for (const post of posts.results) {
    const retainUntil = addDays(post.published_at, settings.publishedPostPayloadDays);
    if (!retainUntil || !isRetentionDue(retainUntil, now)) continue;
    candidates.push({
      itemKey: `post:${post.id}`,
      sourceKind: "social_post_payload",
      sourceId: post.id,
      r2Key: null,
      retentionClass: "published_post_payload",
      byteSize: new TextEncoder().encode(
        `${post.caption}\n${post.media_json}\n${post.campaign_json}`,
      ).byteLength,
      retainUntil,
    });
  }

  return candidates;
}

async function registerCandidates(db: D1Database, candidates: RetentionCandidate[]) {
  if (!candidates.length) return 0;
  const results = await db.batch(
    candidates.map((candidate) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO storage_retention_items (
             id, item_key, source_kind, source_id, r2_key, retention_class,
             byte_size, retain_until, status
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'eligible')`,
        )
        .bind(
          `retention_${crypto.randomUUID().replaceAll("-", "")}`,
          candidate.itemKey,
          candidate.sourceKind,
          candidate.sourceId,
          candidate.r2Key,
          candidate.retentionClass,
          candidate.byteSize,
          candidate.retainUntil,
        ),
    ),
  );
  return results.reduce((total, result) => total + Number(result.meta.changes ?? 0), 0);
}

async function createApprovalBatch(
  db: D1Database,
  settings: RetentionSettings,
  now: Date,
): Promise<number> {
  const eligible = await db
    .prepare(
      `SELECT id, item_key, source_kind, source_id, r2_key, retention_class,
              byte_size, retain_until
       FROM storage_retention_items
       WHERE status = 'eligible' AND approval_request_id IS NULL AND retain_until <= ?1
       ORDER BY CASE source_kind WHEN 'social_post_payload' THEN 1 ELSE 0 END,
                byte_size DESC, discovered_at
       LIMIT ?2`,
    )
    .bind(now.toISOString(), settings.approvalBatchSize)
    .all<Omit<RetentionItemRow, "status" | "approval_request_id" | "attempt_count">>();
  if (!eligible.results.length) return 0;

  const targets = eligible.results.map((item) => ({
    itemId: item.id,
    itemKey: item.item_key,
    sourceKind: item.source_kind,
    sourceId: item.source_id,
    r2Key: item.r2_key,
    retentionClass: item.retention_class,
    byteSize: Number(item.byte_size),
    retainUntil: item.retain_until,
  }));
  const canonicalTargets = JSON.stringify(targets);
  const revisionHash = await sha256(canonicalTargets);
  const approvalId = `approval_storage_${crypto.randomUUID().replaceAll("-", "")}`;
  const totalBytes = targets.reduce((total, target) => total + target.byteSize, 0);
  const action = JSON.stringify({
    operation: "delete_or_compact_retained_storage",
    revisionHash,
    targets,
    totalBytes,
    preserveMetadata: settings.preserveMetadata,
    externalEffects: "r2_delete_and_d1_payload_compaction",
  });
  const expiresAt = new Date(now.getTime() + 7 * DAY_MS).toISOString();
  await db.batch([
    db
      .prepare(
        `INSERT INTO approval_requests (
           id, request_type, entity_type, entity_id, risk_level, summary,
           proposed_action_json, status, requested_by_agent_id, expires_at, created_at
         ) VALUES (?1, 'storage_delete', 'storage_retention_batch', ?2, 'critical', ?3,
           ?4, 'pending', 'agent_marketing_orders', ?5, ?6)`,
      )
      .bind(
        approvalId,
        `storage:${revisionHash}`,
        `Revizuiește ${targets.length} element(e) eligibile; maxim ${totalBytes} bytes pot fi eliberați.`,
        action,
        expiresAt,
        now.toISOString(),
      ),
    ...eligible.results.map((item) =>
      db
        .prepare(
          `UPDATE storage_retention_items
           SET status = 'approval_pending', approval_request_id = ?1, last_checked_at = ?2
           WHERE id = ?3 AND status = 'eligible' AND approval_request_id IS NULL`,
        )
        .bind(approvalId, now.toISOString(), item.id),
    ),
  ]);
  return targets.length;
}

async function socialReferencesForAsset(db: D1Database, sourceId: string, r2Key: string) {
  return db
    .prepare(
      `SELECT post.status, post.published_at
       FROM social_posts AS post, json_each(post.media_json) AS entry
       WHERE json_extract(entry.value, '$.mediaId') = ?1
          OR json_extract(entry.value, '$.r2Key') = ?2`,
    )
    .bind(sourceId, r2Key)
    .all<{ status: string; published_at: string | null }>();
}

async function revalidateItem(
  db: D1Database,
  item: RetentionItemRow,
  settings: RetentionSettings,
  now: Date,
): Promise<boolean> {
  if (!isRetentionDue(item.retain_until, now)) return false;
  if (item.source_kind === "media_upload_session") {
    const row = await db
      .prepare(
        `SELECT id FROM media_upload_sessions
         WHERE id = ?1 AND r2_key = ?2
           AND status IN ('created','uploading','uploaded','failed') AND expires_at <= ?3`,
      )
      .bind(item.source_id, item.r2_key, now.toISOString())
      .first();
    return Boolean(row);
  }
  if (item.source_kind === "ai_generation_asset") {
    const row = await db
      .prepare(
        `SELECT asset.review_status, asset.created_at, job.status AS job_status, job.purpose
         FROM ai_generation_assets AS asset
         JOIN ai_generation_jobs AS job ON job.id = asset.job_id
         WHERE asset.id = ?1 AND asset.r2_key = ?2`,
      )
      .bind(item.source_id, item.r2_key)
      .first<{ review_status: string; created_at: string; job_status: string; purpose: string }>();
    if (!row) return false;
    const referenced = await db
      .prepare(
        `SELECT 1 AS found FROM social_posts AS post, json_each(post.media_json) AS entry
         WHERE json_extract(entry.value, '$.r2Key') = ?1
            OR json_extract(entry.value, '$.mediaId') = ?2
         LIMIT 1`,
      )
      .bind(item.r2_key, item.source_id)
      .first();
    if (referenced) return false;
    if (item.retention_class === "generated_rejected") return row.review_status === "rejected";
    if (item.retention_class === "generated_abandoned") {
      return row.job_status === "failed" || row.job_status === "cancelled";
    }
    return (
      row.review_status === "approved" &&
      row.job_status === "completed" &&
      row.purpose !== "product_visual"
    );
  }
  if (item.source_kind === "social_media_asset") {
    const asset = await db
      .prepare(
        `SELECT status, archived_at, usage_type FROM product_media
         WHERE id = ?1 AND r2_key = ?2`,
      )
      .bind(item.source_id, item.r2_key)
      .first<{ status: string; archived_at: string | null; usage_type: string }>();
    if (!asset || !["social", "story", "advertising"].includes(asset.usage_type)) return false;
    if (item.retention_class === "archived_social_derivative") {
      const retainUntil = asset.archived_at
        ? addDays(asset.archived_at, settings.archivedSocialMediaDays)
        : null;
      return (
        asset.status === "archived" && Boolean(retainUntil && isRetentionDue(retainUntil, now))
      );
    }
    if (asset.status !== "active" || !item.r2_key) return false;
    const references = await socialReferencesForAsset(db, item.source_id, item.r2_key);
    if (
      references.results.length === 0 ||
      references.results.some(
        (reference) => reference.status !== "published" || !reference.published_at,
      )
    ) {
      return false;
    }
    const latest = references.results
      .map((reference) => reference.published_at!)
      .sort()
      .at(-1)!;
    const retainUntil = addDays(latest, settings.publishedSocialMediaDays);
    return Boolean(retainUntil && isRetentionDue(retainUntil, now));
  }
  const post = await db
    .prepare(
      `SELECT published_at, compacted_at FROM social_posts
       WHERE id = ?1 AND status = 'published' AND published_at IS NOT NULL`,
    )
    .bind(item.source_id)
    .first<{ published_at: string; compacted_at: string | null }>();
  if (!post || post.compacted_at) return false;
  const retainUntil = addDays(post.published_at, settings.publishedPostPayloadDays);
  return Boolean(retainUntil && isRetentionDue(retainUntil, now));
}

function minimalCampaign(value: string, contentSha256: string) {
  let source: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && !Array.isArray(parsed) && typeof parsed === "object") {
      source = parsed as Record<string, unknown>;
    }
  } catch {
    source = {};
  }
  const keep = [
    "schemaVersion",
    "campaignId",
    "revision",
    "revisionHash",
    "productId",
    "platform",
    "placement",
    "objective",
    "canonicalUrl",
    "utm",
  ];
  return JSON.stringify({
    ...Object.fromEntries(
      keep.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]),
    ),
    retention: { compacted: true, contentSha256 },
  });
}

function minimalMedia(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return "[]";
    return JSON.stringify(
      parsed
        .filter(
          (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object",
        )
        .map((item) =>
          Object.fromEntries(
            ["mediaId", "r2Key", "sha256"]
              .filter((key) => typeof item[key] === "string" && item[key] !== "")
              .map((key) => [key, item[key]]),
          ),
        )
        .filter((item) => Object.keys(item).length > 0),
    );
  } catch {
    return "[]";
  }
}

async function executeItem(
  env: Pick<Env, "DB" | "MEDIA">,
  item: RetentionItemRow,
  settings: RetentionSettings,
  now: Date,
) {
  if (!(await revalidateItem(env.DB, item, settings, now))) {
    await env.DB.prepare(
      `UPDATE storage_retention_items
         SET status = 'skipped', last_error = 'SOURCE_NO_LONGER_ELIGIBLE', last_checked_at = ?2
         WHERE id = ?1`,
    )
      .bind(item.id, now.toISOString())
      .run();
    return { deleted: 0, compacted: 0, skipped: 1, bytes: 0 };
  }

  await env.DB.prepare(
    `UPDATE storage_retention_items
       SET status = 'deleting', attempt_count = attempt_count + 1,
           last_error = NULL, last_checked_at = ?2
       WHERE id = ?1 AND status IN ('approval_pending','failed')`,
  )
    .bind(item.id, now.toISOString())
    .run();
  try {
    let contentSha256: string | null = null;
    if (item.source_kind === "social_post_payload") {
      const post = await env.DB.prepare(
        "SELECT caption, media_json, campaign_json FROM social_posts WHERE id = ?1",
      )
        .bind(item.source_id)
        .first<{ caption: string; media_json: string; campaign_json: string }>();
      if (!post) throw new Error("SOCIAL_POST_NOT_FOUND");
      contentSha256 = await sha256(`${post.caption}\n${post.media_json}\n${post.campaign_json}`);
      await env.DB.prepare(
        `UPDATE social_posts
           SET caption = '', media_json = ?2, campaign_json = ?3,
               content_sha256 = ?4, compacted_at = ?5, updated_at = ?5
           WHERE id = ?1 AND compacted_at IS NULL`,
      )
        .bind(
          item.source_id,
          minimalMedia(post.media_json),
          minimalCampaign(post.campaign_json, contentSha256),
          contentSha256,
          now.toISOString(),
        )
        .run();
    } else {
      await env.MEDIA.delete(item.r2_key!);
      if (item.source_kind === "media_upload_session") {
        await env.DB.prepare(
          `UPDATE media_upload_sessions SET status = 'expired'
             WHERE id = ?1 AND status IN ('created','uploading','uploaded','failed')`,
        )
          .bind(item.source_id)
          .run();
      } else if (item.source_kind === "social_media_asset") {
        await env.DB.prepare(
          `UPDATE product_media
             SET status = 'archived', public_access = 0, sync_to_avyron = 0,
                 archived_at = COALESCE(archived_at, ?2), version = version + 1,
                 updated_at = ?2
             WHERE id = ?1`,
        )
          .bind(item.source_id, now.toISOString())
          .run();
      }
    }
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE storage_retention_items
           SET status = 'deleted', content_sha256 = ?2, deleted_at = ?3,
               last_checked_at = ?3, last_error = NULL
           WHERE id = ?1`,
      ).bind(item.id, contentSha256, now.toISOString()),
      env.DB.prepare(
        `INSERT INTO audit_log (
             id, actor_label, action, entity_type, entity_id, after_json, metadata_json
           ) VALUES (?1, 'Storage Retention Worker', 'storage.retention.executed',
             ?2, ?3, ?4, ?5)`,
      ).bind(
        crypto.randomUUID(),
        item.source_kind,
        item.source_id,
        JSON.stringify({ status: "deleted", approvalId: item.approval_request_id }),
        JSON.stringify({
          retentionClass: item.retention_class,
          r2Key: item.r2_key,
          byteSize: item.byte_size,
          metadataPreserved: settings.preserveMetadata,
        }),
      ),
    ]);
    return {
      deleted: item.source_kind === "social_post_payload" ? 0 : 1,
      compacted: item.source_kind === "social_post_payload" ? 1 : 0,
      skipped: 0,
      // D1 row compaction reduces future logical payload but does not prove that
      // SQLite pages were physically reclaimed, so count only deleted R2 bytes.
      bytes: item.source_kind === "social_post_payload" ? 0 : Number(item.byte_size),
    };
  } catch (error) {
    await env.DB.prepare(
      `UPDATE storage_retention_items
         SET status = 'failed', last_error = ?2, last_checked_at = ?3
         WHERE id = ?1`,
    )
      .bind(
        item.id,
        error instanceof Error ? error.message.slice(0, 1_000) : "STORAGE_RETENTION_FAILED",
        now.toISOString(),
      )
      .run();
    return { deleted: 0, compacted: 0, skipped: 0, bytes: 0, failed: 1 };
  }
}

async function executeApprovedItems(
  env: Pick<Env, "DB" | "MEDIA">,
  settings: RetentionSettings,
  now: Date,
) {
  if (!settings.executeAfterApproval) {
    return { deleted: 0, compacted: 0, skipped: 0, bytes: 0, failed: 0 };
  }
  const items = await env.DB.prepare(
    `SELECT item.id, item.item_key, item.source_kind, item.source_id, item.r2_key,
              item.retention_class, item.byte_size, item.retain_until, item.status,
              item.approval_request_id, item.attempt_count
       FROM storage_retention_items AS item
       JOIN approval_requests AS approval ON approval.id = item.approval_request_id
       WHERE approval.status = 'approved'
         AND item.status IN ('approval_pending','failed') AND item.attempt_count < 3
       ORDER BY CASE item.source_kind WHEN 'social_post_payload' THEN 1 ELSE 0 END,
                item.byte_size DESC, item.discovered_at
       LIMIT ?1`,
  )
    .bind(settings.approvalBatchSize)
    .all<RetentionItemRow>();
  const totals = { deleted: 0, compacted: 0, skipped: 0, bytes: 0, failed: 0 };
  const approvalIds = new Set<string>();
  for (const item of items.results) {
    approvalIds.add(item.approval_request_id);
    const result = await executeItem(env, item, settings, now);
    totals.deleted += result.deleted;
    totals.compacted += result.compacted;
    totals.skipped += result.skipped;
    totals.bytes += result.bytes;
    totals.failed += result.failed ?? 0;
  }
  for (const approvalId of approvalIds) {
    await env.DB.prepare(
      `UPDATE approval_requests SET status = 'executed'
         WHERE id = ?1 AND status = 'approved'
           AND NOT EXISTS (
             SELECT 1 FROM storage_retention_items
             WHERE approval_request_id = ?1 AND status NOT IN ('deleted','skipped')
           )`,
    )
      .bind(approvalId)
      .run();
  }
  return totals;
}

async function reconcileApprovalStates(db: D1Database, now: Date) {
  await db.batch([
    db
      .prepare(
        `UPDATE storage_retention_items
         SET status = 'eligible', approval_request_id = NULL,
             last_error = 'APPROVAL_EXPIRED', last_checked_at = ?1
         WHERE status = 'approval_pending'
           AND approval_request_id IN (
             SELECT id FROM approval_requests
             WHERE status = 'expired' OR (status = 'pending' AND expires_at <= ?1)
           )`,
      )
      .bind(now.toISOString()),
    db
      .prepare(
        `UPDATE storage_retention_items
         SET status = 'skipped', last_error = 'APPROVAL_REJECTED', last_checked_at = ?1
         WHERE status = 'approval_pending'
           AND approval_request_id IN (
             SELECT id FROM approval_requests WHERE status = 'rejected'
           )`,
      )
      .bind(now.toISOString()),
  ]);
}

export async function processStorageRetention(env: Pick<Env, "DB" | "MEDIA">, now = new Date()) {
  const settingRow = await env.DB.prepare(
    "SELECT value_json FROM operational_settings WHERE key = 'storage.retention'",
  ).first<{ value_json: string }>();
  const settings = parseStorageRetentionSettings(settingRow?.value_json ?? null);
  if (!settings.enabled) return { skipped: true, reason: "disabled" as const };
  await reconcileApprovalStates(env.DB, now);

  const approvedPending = await env.DB.prepare(
    `SELECT COUNT(*) AS total
       FROM storage_retention_items AS item
       JOIN approval_requests AS approval ON approval.id = item.approval_request_id
       WHERE approval.status = 'approved'
         AND item.status IN ('approval_pending','failed') AND item.attempt_count < 3`,
  ).first<{ total: number }>();
  const lastRun = await env.DB.prepare(
    `SELECT started_at FROM storage_retention_runs
       WHERE status IN ('completed','partial') ORDER BY started_at DESC LIMIT 1`,
  ).first<{ started_at: string }>();
  const lastRunAt = lastRun ? Date.parse(lastRun.started_at) : Number.NaN;
  const scanDue =
    !Number.isFinite(lastRunAt) ||
    now.getTime() - lastRunAt >= settings.scanIntervalHours * 60 * 60 * 1_000;
  if (!scanDue && Number(approvedPending?.total ?? 0) === 0) {
    return { skipped: true, reason: "interval" as const };
  }

  const runId = `storage_run_${crypto.randomUUID().replaceAll("-", "")}`;
  const startedAt = now.toISOString();
  await env.DB.prepare(
    "INSERT INTO storage_retention_runs (id, status, started_at) VALUES (?1, 'running', ?2)",
  )
    .bind(runId, startedAt)
    .run();
  try {
    const candidates = scanDue ? await discoverCandidates(env.DB, settings, now) : [];
    const discovered = scanDue ? await registerCandidates(env.DB, candidates) : 0;
    const approvalCount = scanDue ? await createApprovalBatch(env.DB, settings, now) : 0;
    const executed = await executeApprovedItems(env, settings, now);
    const status = executed.failed > 0 ? "partial" : "completed";
    await env.DB.prepare(
      `UPDATE storage_retention_runs
         SET status = ?2, discovered_count = ?3, approval_count = ?4,
             deleted_count = ?5, compacted_count = ?6, skipped_count = ?7,
             reclaimed_bytes = ?8, completed_at = ?9
         WHERE id = ?1`,
    )
      .bind(
        runId,
        status,
        discovered,
        approvalCount,
        executed.deleted,
        executed.compacted,
        executed.skipped,
        executed.bytes,
        new Date().toISOString(),
      )
      .run();
    return {
      skipped: false,
      runId,
      status,
      discovered,
      approvalCount,
      deleted: executed.deleted,
      compacted: executed.compacted,
      skippedItems: executed.skipped,
      bytes: executed.bytes,
      failed: executed.failed,
    };
  } catch (error) {
    await env.DB.prepare(
      `UPDATE storage_retention_runs
         SET status = 'failed', error_message = ?2, completed_at = ?3 WHERE id = ?1`,
    )
      .bind(
        runId,
        error instanceof Error ? error.message.slice(0, 1_000) : "STORAGE_RETENTION_FAILED",
        new Date().toISOString(),
      )
      .run();
    throw error;
  }
}
