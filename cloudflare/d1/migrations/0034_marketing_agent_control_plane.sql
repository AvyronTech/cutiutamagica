PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO permissions (id, code, description) VALUES
  ('perm_marketing_agent_read', 'marketing.agent.read', 'Vizualizează politica, buildul și schimburile agentului de marketing.'),
  ('perm_marketing_agent_manage', 'marketing.agent.manage', 'Controlează agentul de marketing și aprobă schimburile AVYRON.');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_owner', id FROM permissions
WHERE code IN ('marketing.agent.read', 'marketing.agent.manage');

CREATE TABLE agent_exchange_items (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE RESTRICT,
  direction TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  exchange_type TEXT NOT NULL CHECK (
    exchange_type IN ('stats_snapshot', 'skill_package', 'data_proposal', 'skill_proposal')
  ),
  source_system TEXT NOT NULL CHECK (source_system IN ('cutiuta-magica', 'avyron-os')),
  destination_system TEXT NOT NULL CHECK (destination_system IN ('cutiuta-magica', 'avyron-os')),
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  payload_hash TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  external_exchange_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (
    status IN (
      'pending_approval', 'approved', 'queued', 'processing', 'sent',
      'received', 'applied', 'rejected', 'failed', 'uncertain'
    )
  ),
  approval_request_id TEXT REFERENCES approval_requests(id) ON DELETE SET NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error TEXT,
  next_retry_at TEXT,
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  sent_at TEXT,
  received_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (source_system != destination_system),
  CHECK (
    (direction = 'outbound' AND source_system = 'cutiuta-magica' AND destination_system = 'avyron-os')
    OR
    (direction = 'inbound' AND source_system = 'avyron-os' AND destination_system = 'cutiuta-magica')
  )
);

CREATE INDEX agent_exchange_queue_idx
  ON agent_exchange_items(status, direction, created_at);
CREATE INDEX agent_exchange_agent_idx
  ON agent_exchange_items(agent_id, created_at DESC);
CREATE UNIQUE INDEX agent_exchange_external_idx
  ON agent_exchange_items(source_system, external_exchange_id)
  WHERE external_exchange_id IS NOT NULL;

UPDATE operational_settings
SET value_json = '{"schemaVersion":2,"timezone":"Europe/Bucharest","mode":"draft_approval","enabled":true,"controlPlane":"cutiuta_magic_platform","dailyCadence":{"note":1,"story":1,"feedPost":1,"reel":1,"tiktokVideo":1},"testWindows":{"note":"08:15-09:00","story":"09:15-10:30","feedPost":"12:15-14:00","reel":"18:15-20:00","tiktokVideo":"20:00-22:00"},"minimumGapMinutes":90,"engagement":{"batchesPerDay":2,"minPerBatch":5,"maxPerBatch":10,"proposalOnly":true},"instagramUnfollow":{"maxPerDay":10,"proposalOnly":true},"publication":{"requiresApproval":true,"requiresVerifiedConnector":true},"orders":{"paymentMethod":"cash_on_delivery","requiresCustomerConfirmation":true,"requiresConsent":true},"avyron":{"async":true,"enabled":false,"control":"none","shareAggregatedStats":false,"shareSkillPackage":false,"acceptDataProposals":false,"acceptSkillProposals":false,"allowPersonalData":false,"allowOrders":false,"allowPublishing":false}}',
    version = version + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'agent.marketing_orders';

UPDATE schema_metadata
SET value = '34', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
