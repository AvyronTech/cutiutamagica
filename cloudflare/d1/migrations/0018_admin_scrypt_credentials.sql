PRAGMA foreign_keys = ON;

CREATE TABLE admin_password_credentials_next (
  admin_user_id TEXT PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  algorithm TEXT NOT NULL CHECK (algorithm IN ('pbkdf2-sha256', 'scrypt-v1')),
  iterations INTEGER NOT NULL CHECK (
    (algorithm = 'pbkdf2-sha256' AND iterations = 100000)
    OR (algorithm = 'scrypt-v1' AND iterations = 32768)
  ),
  password_version INTEGER NOT NULL DEFAULT 1 CHECK (password_version > 0),
  must_change_password INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0, 1)),
  failed_attempts INTEGER NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until TEXT,
  password_changed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO admin_password_credentials_next (
  admin_user_id, password_hash, password_salt, algorithm, iterations,
  password_version, must_change_password, failed_attempts, locked_until,
  password_changed_at, created_at, updated_at
)
SELECT
  admin_user_id,
  CASE admin_user_id
    WHEN 'admin_cutiutamagica_gmail' THEN 'GszBPpW4M0P12tonLK1ASlCP+YvHHkPzGPwmdjn5lRw='
    WHEN 'admin_prometheus_avyron' THEN 'DK4d+hj6fDGslUtb4BlRYzb13o5tExAvWj3XJ7DY+k8='
    WHEN 'admin_ana_cutiutamagica' THEN 'nZI/Iro+ZOjxDXzr87ZaKp+VV4v5zbaj4bIa1TsFLok='
    WHEN 'admin_avyrontech_gmail' THEN '/v4ThvnYKa4GZ7q+J96b1ky5+acmiierTkGSr9tlHDk='
    ELSE password_hash
  END,
  password_salt,
  CASE
    WHEN admin_user_id IN (
      'admin_cutiutamagica_gmail',
      'admin_prometheus_avyron',
      'admin_ana_cutiutamagica',
      'admin_avyrontech_gmail'
    ) THEN 'scrypt-v1'
    ELSE algorithm
  END,
  CASE
    WHEN admin_user_id IN (
      'admin_cutiutamagica_gmail',
      'admin_prometheus_avyron',
      'admin_ana_cutiutamagica',
      'admin_avyrontech_gmail'
    ) THEN 32768
    ELSE MIN(iterations, 100000)
  END,
  password_version,
  must_change_password,
  failed_attempts,
  locked_until,
  password_changed_at,
  created_at,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM admin_password_credentials;

DROP TABLE admin_password_credentials;
ALTER TABLE admin_password_credentials_next RENAME TO admin_password_credentials;

UPDATE schema_metadata
SET value = '18', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';
