PRAGMA foreign_keys = ON;

-- Metricool Free has no backend API available to this project. Keep each reviewed
-- schedule observation as auditable evidence instead of treating a local timestamp
-- as proof that a provider accepted the publication.
CREATE TABLE social_schedule_snapshots (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider = 'metricool_reviewed'),
  brand_id TEXT NOT NULL CHECK (brand_id = '7230540'),
  owner_email TEXT NOT NULL CHECK (owner_email = 'cutiutamagicaofficial@gmail.com'),
  observed_at TEXT NOT NULL,
  quota_used INTEGER NOT NULL CHECK (quota_used >= 0),
  quota_limit INTEGER NOT NULL CHECK (quota_limit > 0 AND quota_used <= quota_limit),
  future_schedule_count INTEGER NOT NULL CHECK (future_schedule_count >= 0),
  future_schedules_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(future_schedules_json)),
  content_hash TEXT NOT NULL UNIQUE,
  reconciled_count INTEGER NOT NULL DEFAULT 0 CHECK (reconciled_count >= 0),
  imported_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  evidence_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX social_schedule_snapshots_observed_idx
  ON social_schedule_snapshots(provider, brand_id, observed_at DESC);

DROP VIEW IF EXISTS v_social_publication_state;
CREATE VIEW v_social_publication_state AS
SELECT
  post.*,
  CASE
    WHEN post.status = 'scheduled' AND EXISTS (
      SELECT 1
      FROM provider_operations operation
      WHERE operation.entity_type = 'social_post'
        AND operation.entity_id = post.id
        AND operation.operation_type = 'social.schedule'
        AND operation.status = 'succeeded'
        AND operation.external_id IS NOT NULL
    ) THEN 'scheduled_verified'
    WHEN post.status = 'scheduled' THEN 'schedule_unverified'
    WHEN post.status = 'approved' THEN 'approved_awaiting_connector'
    ELSE post.status
  END AS publication_state
FROM social_posts post;

-- Evidence reported by the administrator on 2026-10-28: the exact Metricool
-- brand had 6/20 Free publications consumed and no future schedule. The five
-- local rows had no external receipt, so they return to the last truthful state:
-- approved, waiting for a verified connector.
INSERT OR IGNORE INTO social_schedule_snapshots (
  id, provider, brand_id, owner_email, observed_at, quota_used, quota_limit,
  future_schedule_count, future_schedules_json, content_hash, evidence_note
) VALUES (
  'metricool_schedule_7230540_20261028', 'metricool_reviewed', '7230540',
  'cutiutamagicaofficial@gmail.com', '2026-10-28', 6, 20,
  0, '[]',
  '55a4932f7fa679d5be9153ed10f87071e29f504e2588f80fd17fa4037acfe559',
  'Verificare administrator: Metricool nu afișa nicio programare viitoare; conectorul backend al magazinului era neconfirmat.'
);

UPDATE social_posts
SET status = 'approved',
    scheduled_at = NULL,
    last_error_message = 'Reconciliat la 2026-10-28: programarea locală nu avea confirmare externă în Metricool; postarea a revenit în așteptarea conectorului.',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE status = 'scheduled'
  AND date(created_at) <= '2026-10-28'
  AND external_post_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM provider_operations operation
    WHERE operation.entity_type = 'social_post'
      AND operation.entity_id = social_posts.id
      AND operation.operation_type = 'social.schedule'
      AND operation.status = 'succeeded'
      AND operation.external_id IS NOT NULL
  );

UPDATE social_schedule_snapshots
SET reconciled_count = changes()
WHERE id = 'metricool_schedule_7230540_20261028';

UPDATE schema_metadata SET value='82',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';

PRAGMA optimize;
