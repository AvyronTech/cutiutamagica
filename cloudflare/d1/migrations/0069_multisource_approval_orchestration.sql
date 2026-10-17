PRAGMA foreign_keys = ON;

CREATE TABLE approval_requirements (
  approval_request_id TEXT PRIMARY KEY REFERENCES approval_requests(id) ON DELETE CASCADE,
  approval_code TEXT NOT NULL UNIQUE,
  revision_ref TEXT NOT NULL,
  action_snapshot_json TEXT NOT NULL CHECK (json_valid(action_snapshot_json)),
  min_approvals INTEGER NOT NULL DEFAULT 1 CHECK (min_approvals BETWEEN 1 AND 3),
  allowed_sources_json TEXT NOT NULL DEFAULT '["admin_dashboard","codex_conversation"]'
    CHECK (json_valid(allowed_sources_json)),
  required_sources_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(required_sources_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE approval_receipts (
  id TEXT PRIMARY KEY,
  approval_request_id TEXT NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('admin_dashboard', 'codex_conversation')),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  actor_admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  actor_label TEXT NOT NULL,
  evidence_reference TEXT,
  revision_ref TEXT NOT NULL,
  action_snapshot_json TEXT NOT NULL CHECK (json_valid(action_snapshot_json)),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (approval_request_id, source)
);

CREATE INDEX approval_receipts_request_idx
  ON approval_receipts(approval_request_id, created_at);

INSERT OR IGNORE INTO approval_requirements (
  approval_request_id, approval_code, revision_ref, action_snapshot_json,
  min_approvals, allowed_sources_json, required_sources_json, created_at, updated_at
)
SELECT
  id,
  upper(substr(hex(randomblob(8)), 1, 16)),
  COALESCE(
    NULLIF(json_extract(proposed_action_json, '$.revisionHash'), ''),
    NULLIF(CAST(json_extract(proposed_action_json, '$.revision') AS TEXT), ''),
    entity_id
  ),
  proposed_action_json,
  CASE
    WHEN status = 'pending' AND (
      risk_level = 'critical'
      OR request_type IN ('social_publish', 'social_schedule', 'social_engagement',
                          'customer_message', 'order_create_cod', 'skill_apply')
      OR request_type LIKE 'marketplace.%'
    ) THEN 2
    ELSE 1
  END,
  '["admin_dashboard","codex_conversation"]',
  CASE
    WHEN status = 'pending' AND (
      risk_level = 'critical'
      OR request_type IN ('social_publish', 'social_schedule', 'social_engagement',
                          'customer_message', 'order_create_cod', 'skill_apply')
      OR request_type LIKE 'marketplace.%'
    ) THEN '["admin_dashboard","codex_conversation"]'
    ELSE '[]'
  END,
  created_at,
  created_at
FROM approval_requests;

CREATE TRIGGER approval_requests_multisource_requirement
AFTER INSERT ON approval_requests
BEGIN
  INSERT OR IGNORE INTO approval_requirements (
    approval_request_id, approval_code, revision_ref, action_snapshot_json,
    min_approvals, allowed_sources_json, required_sources_json, created_at, updated_at
  ) VALUES (
    NEW.id,
    upper(substr(hex(randomblob(8)), 1, 16)),
    COALESCE(
      NULLIF(json_extract(NEW.proposed_action_json, '$.revisionHash'), ''),
      NULLIF(CAST(json_extract(NEW.proposed_action_json, '$.revision') AS TEXT), ''),
      NEW.entity_id
    ),
    NEW.proposed_action_json,
    CASE
      WHEN NEW.risk_level = 'critical'
        OR NEW.request_type IN ('social_publish', 'social_schedule', 'social_engagement',
                                'customer_message', 'order_create_cod', 'skill_apply')
        OR NEW.request_type LIKE 'marketplace.%'
      THEN 2 ELSE 1
    END,
    '["admin_dashboard","codex_conversation"]',
    CASE
      WHEN NEW.risk_level = 'critical'
        OR NEW.request_type IN ('social_publish', 'social_schedule', 'social_engagement',
                                'customer_message', 'order_create_cod', 'skill_apply')
        OR NEW.request_type LIKE 'marketplace.%'
      THEN '["admin_dashboard","codex_conversation"]'
      ELSE '[]'
    END,
    NEW.created_at,
    NEW.created_at
  );
END;

CREATE TRIGGER approval_requirements_scope_immutable
BEFORE UPDATE OF revision_ref, action_snapshot_json ON approval_requirements
BEGIN
  SELECT RAISE(ABORT, 'APPROVAL_SCOPE_IMMUTABLE');
END;

CREATE TRIGGER approval_receipts_immutable_update
BEFORE UPDATE ON approval_receipts
BEGIN
  SELECT RAISE(ABORT, 'APPROVAL_RECEIPT_IMMUTABLE');
END;

CREATE TRIGGER approval_receipts_immutable_delete
BEFORE DELETE ON approval_receipts
BEGIN
  SELECT RAISE(ABORT, 'APPROVAL_RECEIPT_IMMUTABLE');
END;

CREATE TRIGGER approval_requests_critical_quorum_guard
BEFORE UPDATE OF status ON approval_requests
WHEN OLD.status = 'pending'
  AND NEW.status = 'approved'
  AND EXISTS (
    SELECT 1
    FROM approval_requirements AS requirement
    WHERE requirement.approval_request_id = NEW.id
      AND requirement.min_approvals > 1
      AND (
        (SELECT COUNT(DISTINCT receipt.source)
         FROM approval_receipts AS receipt
         WHERE receipt.approval_request_id = NEW.id
           AND receipt.decision = 'approved') < requirement.min_approvals
        OR EXISTS (
          SELECT 1
          FROM json_each(requirement.required_sources_json) AS required_source
          WHERE NOT EXISTS (
            SELECT 1
            FROM approval_receipts AS receipt
            WHERE receipt.approval_request_id = NEW.id
              AND receipt.source = required_source.value
              AND receipt.decision = 'approved'
          )
        )
      )
  )
BEGIN
  SELECT RAISE(ABORT, 'APPROVAL_QUORUM_NOT_REACHED');
END;

-- Existing approval endpoints remain auditable while they are migrated to the
-- orchestrator. New orchestrated decisions insert their receipt first, so this
-- compatibility trigger does not create a second source.
CREATE TRIGGER approval_requests_legacy_decision_receipt
AFTER UPDATE OF status ON approval_requests
WHEN OLD.status = 'pending'
  AND NEW.status IN ('approved', 'rejected')
  AND NOT EXISTS (
    SELECT 1 FROM approval_receipts WHERE approval_request_id = NEW.id
  )
BEGIN
  INSERT INTO approval_receipts (
    id, approval_request_id, source, decision, actor_admin_user_id, actor_label,
    evidence_reference, revision_ref, action_snapshot_json, idempotency_key
  )
  SELECT
    'receipt_' || lower(hex(randomblob(16))),
    NEW.id,
    'admin_dashboard',
    NEW.status,
    NEW.reviewed_by,
    COALESCE(NEW.reviewed_by, 'admin-dashboard'),
    'compatibility:legacy-dashboard-decision',
    requirement.revision_ref,
    requirement.action_snapshot_json,
    'legacy:' || NEW.id || ':' || NEW.status
  FROM approval_requirements AS requirement
  WHERE requirement.approval_request_id = NEW.id;
END;

UPDATE operational_settings
SET value_json = json_set(
      value_json,
      '$.schemaVersion', 6,
      '$.approvals', json(
        '{"sources":["admin_dashboard","codex_conversation"],"defaultMinApprovals":1,"criticalMinApprovals":2,"criticalRequiredSources":["admin_dashboard","codex_conversation"],"codexEvidenceRequired":true,"exactRevisionRequired":true,"autoExpire":true,"autoExecute":false}'
      )
    ),
    version = version + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'agent.marketing_orders';

UPDATE schema_metadata
SET value = '69', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
