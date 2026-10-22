PRAGMA foreign_keys = ON;

CREATE TABLE admin_password_credentials (
  admin_user_id TEXT PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'pbkdf2-sha256' CHECK (algorithm = 'pbkdf2-sha256'),
  iterations INTEGER NOT NULL CHECK (iterations >= 100000),
  password_version INTEGER NOT NULL DEFAULT 1 CHECK (password_version > 0),
  must_change_password INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0, 1)),
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until TEXT,
  password_changed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE admin_sessions (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  password_version INTEGER NOT NULL CHECK (password_version > 0),
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX admin_sessions_active_idx
  ON admin_sessions(admin_user_id, expires_at, revoked_at);

CREATE TABLE admin_login_events (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  email_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'invalid', 'locked', 'logout', 'password_changed')),
  user_agent_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX admin_login_events_throttle_idx
  ON admin_login_events(email_hash, ip_hash, outcome, created_at);

-- Initial credentials use unique PBKDF2 salts and hashes; no plaintext is persisted.
INSERT INTO admin_password_credentials (
  admin_user_id, password_hash, password_salt, iterations, must_change_password
) VALUES
  ('admin_cutiutamagica_gmail', 'ob1Lgx3WT/yrEeDmBR1/2hYEVAGPYB+pt/MO6uGo3a8=', 'DHRWJFSVswI1BCinzxeEYw==', 600000, 1),
  ('admin_prometheus_avyron', 'GMyO0aV+1gnpoUTH6iRVT2TD929gGciTdMZxa+Bb5RU=', 'VO1LF4Ue5uhR6qnhNviFqA==', 600000, 1),
  ('admin_ana_cutiutamagica', 'gpI6MiV1XGvi1Pe6HpFb7o3QcusupT2Weqlhf0+Io04=', 'AElA/2qk0l5qtu+mSj72kQ==', 600000, 1),
  ('admin_avyrontech_gmail', 'LDg46a1Je/F3uoUU+n0Qf6HLalkngVewrb0U0VH3hqw=', 'j0gf2jJ1Vm/7yM9kzBgK6w==', 600000, 1);

UPDATE admin_users
SET external_subject = 'password:' || lower(email),
    mfa_required = 0,
    onboarding_status = 'profile_required',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id IN (
  'admin_cutiutamagica_gmail',
  'admin_prometheus_avyron',
  'admin_ana_cutiutamagica',
  'admin_avyrontech_gmail'
);

UPDATE schema_metadata
SET value = '12', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';
