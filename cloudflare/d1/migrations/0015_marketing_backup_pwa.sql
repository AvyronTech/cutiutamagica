PRAGMA foreign_keys = ON;

CREATE TABLE marketing_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  objective TEXT NOT NULL CHECK (objective IN ('awareness', 'traffic', 'conversion', 'retention')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (currency IN ('RON', 'EUR')),
  budget_minor INTEGER NOT NULL DEFAULT 0 CHECK (budget_minor >= 0),
  start_date TEXT,
  end_date TEXT,
  channels_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(channels_json)),
  strategy TEXT NOT NULL DEFAULT '',
  target_audience TEXT NOT NULL DEFAULT '',
  kpi_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(kpi_json)),
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX marketing_campaigns_status_idx ON marketing_campaigns(status, start_date, end_date);

CREATE TABLE marketing_cost_entries (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ads', 'content', 'creator', 'software', 'shipping', 'other')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL CHECK (currency IN ('RON', 'EUR')),
  occurred_on TEXT NOT NULL,
  note TEXT,
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX marketing_costs_campaign_idx ON marketing_cost_entries(campaign_id, occurred_on DESC);

CREATE TABLE social_analysis_runs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('instagram', 'facebook', 'tiktok', 'manual')),
  source TEXT NOT NULL CHECK (source IN ('api', 'authorized_export', 'manual_import')),
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  imported_count INTEGER NOT NULL DEFAULT 0,
  proposed_count INTEGER NOT NULL DEFAULT 0,
  requested_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE social_unfollow_proposals (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES social_analysis_runs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_account_id TEXT,
  username TEXT NOT NULL,
  profile_url TEXT,
  follows_back INTEGER NOT NULL CHECK (follows_back IN (0, 1)),
  engagement_rate REAL,
  last_interaction_at TEXT,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  reasons_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(reasons_json)),
  decision TEXT NOT NULL DEFAULT 'proposed' CHECK (decision IN ('proposed', 'keep', 'approved_unfollow', 'dismissed')),
  protected INTEGER NOT NULL DEFAULT 0 CHECK (protected IN (0, 1)),
  decided_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  decided_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (run_id, provider, username)
);

CREATE INDEX social_unfollow_queue_idx ON social_unfollow_proposals(decision, score DESC);

CREATE TABLE backup_policies (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('manual', 'daily', 'weekly')),
  weekday INTEGER NOT NULL DEFAULT 1 CHECK (weekday BETWEEN 1 AND 7),
  hour INTEGER NOT NULL DEFAULT 3 CHECK (hour BETWEEN 0 AND 23),
  retention_count INTEGER NOT NULL DEFAULT 8 CHECK (retention_count BETWEEN 2 AND 30),
  max_age_days INTEGER NOT NULL DEFAULT 90 CHECK (max_age_days BETWEEN 7 AND 365),
  include_customer_data INTEGER NOT NULL DEFAULT 1 CHECK (include_customer_data IN (0, 1)),
  last_scheduled_at TEXT,
  updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO backup_policies (
  id, enabled, frequency, weekday, hour, retention_count, max_age_days,
  include_customer_data, updated_at
) VALUES ('default', 1, 'weekly', 1, 3, 8, 90, 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

CREATE TABLE backup_runs (
  id TEXT PRIMARY KEY,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled')),
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'partial', 'failed')),
  r2_key TEXT,
  manifest_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(manifest_json)),
  size_bytes INTEGER NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  table_count INTEGER NOT NULL DEFAULT 0 CHECK (table_count >= 0),
  is_baseline INTEGER NOT NULL DEFAULT 0 CHECK (is_baseline IN (0, 1)),
  requested_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX backup_runs_retention_idx ON backup_runs(is_baseline, status, created_at DESC);

CREATE TABLE account_connections (
  id TEXT PRIMARY KEY,
  owner TEXT NOT NULL CHECK (owner IN ('cutiuta_magica', 'avyron')),
  provider TEXT NOT NULL,
  label TEXT NOT NULL,
  auth_method TEXT NOT NULL CHECK (auth_method IN ('oauth', 'api_key', 'service_token', 'device_session', 'manual')),
  secret_reference TEXT,
  status TEXT NOT NULL DEFAULT 'setup_required' CHECK (status IN ('active', 'expired', 'revoked', 'degraded', 'setup_required')),
  scopes_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(scopes_json)),
  last_verified_at TEXT,
  expires_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (owner, provider, label)
);

CREATE TABLE admin_access_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  display_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  ip_hash TEXT NOT NULL,
  reviewed_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX admin_access_requests_queue_idx ON admin_access_requests(status, created_at DESC);

CREATE TABLE admin_recovery_requests (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT REFERENCES admin_users(id) ON DELETE CASCADE,
  email_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'expired', 'rejected')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX admin_recovery_requests_throttle_idx
  ON admin_recovery_requests(email_hash, ip_hash, created_at DESC);

INSERT OR IGNORE INTO permissions (id, code, description) VALUES
  ('perm_marketing_read', 'marketing.read', 'Vizualizează strategiile, conținutul și costurile de marketing.'),
  ('perm_marketing_write', 'marketing.write', 'Creează campanii, drafturi și propuneri sociale.'),
  ('perm_backup_read', 'backup.read', 'Vizualizează politicile și rulările de backup.'),
  ('perm_backup_write', 'backup.write', 'Creează backupuri și modifică retenția.'),
  ('perm_accounts_read', 'accounts.read', 'Vizualizează starea conturilor și dispozitivelor.'),
  ('perm_accounts_write', 'accounts.write', 'Configurează referințe de conectare și revocă dispozitive.');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_owner', id FROM permissions
WHERE code IN (
  'marketing.read', 'marketing.write', 'backup.read', 'backup.write',
  'accounts.read', 'accounts.write'
);

INSERT OR IGNORE INTO ai_agents (
  id, code, name, purpose, allowed_tools_json, approval_policy,
  max_actions_per_run, status
) VALUES
  ('agent_social_hygiene', 'social-hygiene', 'Social Hygiene Agent',
   'Analizează relații autorizate și propune maximum 50 conturi pentru revizuire.',
   '["social.read","proposal.create"]', 'always', 50, 'setup_required'),
  ('agent_marketing_content', 'marketing-content', 'Marketing Content Agent',
   'Propune texte și formate pentru postări pe baza catalogului și obiectivelor aprobate.',
   '["catalog.read","analytics.read","draft.create"]', 'always', 20, 'setup_required');

UPDATE schema_metadata
SET value = '15', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
