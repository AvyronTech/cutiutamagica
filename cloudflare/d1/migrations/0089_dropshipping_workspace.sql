-- Opportunities precede the music-box catalog and may cover any product category.
-- Orders, customers, approvals and AI runs continue to use the existing registries.
CREATE TABLE dropshipping_opportunities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  data_json TEXT NOT NULL CHECK(json_valid(data_json)),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
  archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)),
  created_by TEXT REFERENCES admin_users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX dropshipping_opportunities_updated ON dropshipping_opportunities(archived,updated_at DESC);
CREATE TABLE dropshipping_placements (
  opportunity_id TEXT NOT NULL REFERENCES dropshipping_opportunities(id),
  channel TEXT NOT NULL CHECK(channel IN ('website','emag','trendyol','okazii')),
  revision INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('approved','executing','uncertain','failed','published_manual','cancelled')),
  approval_id TEXT NOT NULL REFERENCES approval_requests(id),
  snapshot_hash TEXT NOT NULL,
  snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
  operation_id TEXT,
  listing_url TEXT,
  evidence TEXT,
  published_revision INTEGER,
  started_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(opportunity_id,channel)
);
CREATE TABLE dropshipping_assets (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL REFERENCES dropshipping_opportunities(id),
  channel TEXT NOT NULL CHECK(channel IN ('source','website','emag','trendyol','okazii')),
  r2_key TEXT NOT NULL UNIQUE,
  checksum_sha256 TEXT NOT NULL,
  width INTEGER NOT NULL CHECK(width BETWEEN 1 AND 8000),
  height INTEGER NOT NULL CHECK(height BETWEEN 1 AND 8000),
  rights_evidence TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO ai_agents(id,code,name,purpose,approval_policy,max_actions_per_run,status)
VALUES('agent_dropshipping','dropshipping','Dropshipping asistat','Cercetare, ciorne, imagini și execuție asistată în profilul Opera Cutiuța Magică','always',5,'active');
UPDATE schema_metadata SET value='89' WHERE key='schema_version';
