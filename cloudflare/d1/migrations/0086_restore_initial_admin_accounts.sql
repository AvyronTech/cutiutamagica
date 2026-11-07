PRAGMA foreign_keys = ON;

-- Reverse only the two owner suspensions recorded by migration 0085.
-- Password credentials, roles, MFA settings, and existing sessions are untouched.
INSERT INTO business_activity (id, actor_id, action, entity_id, created_at)
SELECT lower(hex(randomblob(16))), NULL, 'security.initial_admin_restored', u.id,
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM admin_users u
JOIN admin_password_credentials c ON c.admin_user_id = u.id
JOIN admin_user_roles ur ON ur.admin_user_id = u.id
JOIN roles r ON r.id = ur.role_id
WHERE u.status = 'suspended'
  AND r.code = 'owner'
  AND c.must_change_password = 1
  AND c.password_changed_at IS NULL
  AND EXISTS (
    SELECT 1 FROM business_activity suspended
    WHERE suspended.entity_id = u.id
      AND suspended.action = 'security.initial_admin_suspended'
  );

UPDATE admin_users
SET status = 'active', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE status = 'suspended'
  AND id IN (
    SELECT u.id
    FROM admin_users u
    JOIN admin_password_credentials c ON c.admin_user_id = u.id
    JOIN admin_user_roles ur ON ur.admin_user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    WHERE r.code = 'owner'
      AND c.must_change_password = 1
      AND c.password_changed_at IS NULL
      AND EXISTS (
        SELECT 1 FROM business_activity suspended
        WHERE suspended.entity_id = u.id
          AND suspended.action = 'security.initial_admin_suspended'
      )
  );

UPDATE schema_metadata
SET value = '86', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
