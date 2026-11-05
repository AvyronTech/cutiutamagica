PRAGMA foreign_keys = ON;

-- Large-object retention is deliberately separate from product/catalog truth.
-- The Worker may discover eligible objects automatically, but destructive work
-- remains blocked behind the existing multi-source approval quorum.
CREATE TABLE storage_retention_items (
  id TEXT PRIMARY KEY,
  item_key TEXT NOT NULL UNIQUE,
  source_kind TEXT NOT NULL CHECK (
    source_kind IN (
      'media_upload_session', 'ai_generation_asset', 'social_media_asset',
      'social_post_payload'
    )
  ),
  source_id TEXT NOT NULL,
  r2_key TEXT,
  retention_class TEXT NOT NULL CHECK (
    retention_class IN (
      'temporary_upload', 'generated_rejected', 'generated_abandoned',
      'generated_approved_unused', 'published_social_derivative',
      'archived_social_derivative', 'published_post_payload'
    )
  ),
  byte_size INTEGER NOT NULL DEFAULT 0 CHECK (byte_size >= 0),
  retain_until TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'eligible' CHECK (
    status IN ('eligible', 'approval_pending', 'deleting', 'deleted', 'skipped', 'failed')
  ),
  approval_request_id TEXT REFERENCES approval_requests(id) ON DELETE SET NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  content_sha256 TEXT,
  discovered_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_checked_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT,
  CHECK (
    (source_kind = 'social_post_payload' AND r2_key IS NULL)
    OR (source_kind != 'social_post_payload' AND r2_key IS NOT NULL)
  )
);

CREATE INDEX storage_retention_queue_idx
  ON storage_retention_items(status, retain_until, byte_size DESC);
CREATE INDEX storage_retention_approval_idx
  ON storage_retention_items(approval_request_id, status);

CREATE TABLE storage_retention_runs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'partial', 'failed')),
  discovered_count INTEGER NOT NULL DEFAULT 0 CHECK (discovered_count >= 0),
  approval_count INTEGER NOT NULL DEFAULT 0 CHECK (approval_count >= 0),
  deleted_count INTEGER NOT NULL DEFAULT 0 CHECK (deleted_count >= 0),
  compacted_count INTEGER NOT NULL DEFAULT 0 CHECK (compacted_count >= 0),
  skipped_count INTEGER NOT NULL DEFAULT 0 CHECK (skipped_count >= 0),
  reclaimed_bytes INTEGER NOT NULL DEFAULT 0 CHECK (reclaimed_bytes >= 0),
  error_message TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX storage_retention_runs_date_idx
  ON storage_retention_runs(started_at DESC);

ALTER TABLE social_posts ADD COLUMN content_sha256 TEXT
  CHECK (content_sha256 IS NULL OR length(content_sha256) = 64);
ALTER TABLE social_posts ADD COLUMN compacted_at TEXT;

INSERT OR IGNORE INTO operational_settings (
  key, value_json, version, updated_at
) VALUES (
  'storage.retention',
  '{"schemaVersion":1,"enabled":true,"scanIntervalHours":24,"approvalBatchSize":25,"executeAfterApproval":true,"generatedRejectedDays":7,"generatedAbandonedDays":14,"generatedApprovedUnusedDays":90,"publishedSocialMediaDays":30,"archivedSocialMediaDays":7,"publishedPostPayloadDays":90,"preserveMetadata":true,"protectedPrefixes":["archive/","invoices/","private/personalizations/","backups/"]}',
  1,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

UPDATE ai_agents
SET allowed_tools_json = json_insert(
      allowed_tools_json,
      '$[#]', 'storage.retention.inspect',
      '$[#]', 'storage.retention.propose'
    ),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'agent_marketing_orders'
  AND NOT EXISTS (
    SELECT 1 FROM json_each(ai_agents.allowed_tools_json)
    WHERE value = 'storage.retention.inspect'
  );

UPDATE schema_metadata
SET value = '70', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
