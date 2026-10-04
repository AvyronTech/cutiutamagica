PRAGMA foreign_keys = ON;

-- A dedicated, least-privilege identity for the Codex marketing + orders skill.
-- The credential is temporary, unique and persisted only as a scrypt hash.
INSERT OR IGNORE INTO permissions (id, code, description) VALUES
  (
    'perm_marketing_draft',
    'marketing.draft',
    'Creează campanii, ciorne sociale și propuneri care necesită aprobare umană.'
  );

INSERT OR IGNORE INTO roles (id, code, name, description, system_role) VALUES
  (
    'role_social_manager_agent',
    'social_manager_agent',
    'Manager Codex Social',
    'Acces minim pentru analiză, ciorne sociale, conversații și comenzi asistate; fără aprobări sau efecte externe.',
    1
  );

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_social_manager_agent', id
FROM permissions
WHERE code IN (
  'dashboard.read',
  'catalog.read',
  'inventory.read',
  'orders.read',
  'reports.read',
  'marketing.read',
  'marketing.draft',
  'chat.read',
  'integrations.read',
  'marketing.agent.read'
);

-- Owners retain draft creation after the write/approval permission is split.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_owner', id FROM permissions WHERE code = 'marketing.draft';

INSERT OR IGNORE INTO admin_users (
  id,
  external_subject,
  email,
  display_name,
  status,
  onboarding_status,
  mfa_required
) VALUES (
  'admin_manager_codex_social',
  'password:manager.codex.social@cutiutamagica.eu',
  'manager.codex.social@cutiutamagica.eu',
  'Manager Codex Social',
  'invited',
  'profile_required',
  0
);

INSERT OR IGNORE INTO admin_password_credentials (
  admin_user_id,
  password_hash,
  password_salt,
  algorithm,
  iterations,
  password_version,
  must_change_password,
  failed_attempts
) VALUES (
  'admin_manager_codex_social',
  'n6wOVGS0otRbAYBzkQoZDer4A4+WVh4em9nrIyN27jw=',
  'NI4foJ51vPXYv7PrxLCxGg==',
  'scrypt-v1',
  32768,
  1,
  1,
  0
);

INSERT OR IGNORE INTO admin_user_roles (admin_user_id, role_id, assigned_by)
VALUES ('admin_manager_codex_social', 'role_social_manager_agent', NULL);

UPDATE ai_agents
SET name = 'Manager Codex Social',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'agent_marketing_orders';

INSERT OR IGNORE INTO audit_log (
  id,
  actor_label,
  action,
  entity_type,
  entity_id,
  after_json,
  metadata_json
) VALUES (
  'audit_manager_codex_social_account_20261004',
  'Codex operator - user authorized',
  'admin.account.create_scoped',
  'admin_user',
  'admin_manager_codex_social',
  '{"displayName":"Manager Codex Social","role":"social_manager_agent","mustChangePassword":true}',
  '{"source":"0052_manager_codex_social_account","externalEffects":"approval_required"}'
);

UPDATE schema_metadata
SET value = '52', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
