-- Additive hardening. Existing users, passwords, MFA flags and sessions are preserved.
ALTER TABLE admin_sessions ADD COLUMN idle_expires_at TEXT;

CREATE TABLE security_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL CHECK(count>0),
  expires_at INTEGER NOT NULL
);
CREATE INDEX security_rate_expiry ON security_rate_limits(expires_at);
CREATE TABLE security_events (
  id TEXT PRIMARY KEY,
  actor_admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('info','warning','critical')),
  request_id TEXT,
  route TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX security_events_recent ON security_events(created_at,severity);
CREATE TABLE security_service_identities (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  scope TEXT NOT NULL CHECK(scope='ai.runner'),
  access_client_id TEXT,
  key_version INTEGER NOT NULL DEFAULT 1,
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  previous_ciphertext TEXT,
  previous_iv TEXT,
  previous_until TEXT,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT(strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

INSERT OR IGNORE INTO permissions(id,code,description) VALUES
 ('perm_admin_access','admin.access','Acces interactiv explicit la panoul intern'),
 ('perm_security_read','security.read','Vizualizare postură de securitate și jurnal'),
 ('perm_security_manage','security.manage','Gestionare identități automate și acces intern');
INSERT OR IGNORE INTO role_permissions(role_id,permission_id)
 SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
 WHERE r.code='owner' AND p.code IN ('admin.access','security.read','security.manage');
-- No person receives a role automatically. Existing manager/agent grants are not expanded.
INSERT OR IGNORE INTO roles(id,code,name,description) VALUES
 ('role_security_staff','staff','Angajat','Operare catalog, stoc și comenzi; fără secrete, roluri sau plăți'),
 ('role_security_consultant','consultant','Consultant','Catalog și rapoarte; fără date personale sau operațiuni comerciale'),
 ('role_security_service','service','Serviciu automat','Fără login interactiv; scopuri explicite și revocabile');
INSERT OR IGNORE INTO role_permissions(role_id,permission_id)
 SELECT 'role_security_staff',id FROM permissions WHERE code IN
 ('admin.access','dashboard.read','catalog.read','inventory.read','inventory.write','orders.read');
INSERT OR IGNORE INTO role_permissions(role_id,permission_id)
 SELECT 'role_security_consultant',id FROM permissions WHERE code IN
 ('admin.access','catalog.read','reports.read');
UPDATE schema_metadata SET value='92',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE key='schema_version';
