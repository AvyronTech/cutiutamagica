PRAGMA foreign_keys = ON;

-- Retire seed credentials only if a rotated owner remains active. On the
-- current production database this selects the two unrotated owner accounts.

INSERT INTO business_activity (id, actor_id, action, entity_id, created_at)
SELECT lower(hex(randomblob(16))), NULL, 'security.initial_admin_suspended', id,
       strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM admin_users u
WHERE u.status='active'
  AND EXISTS (SELECT 1 FROM admin_password_credentials c
              WHERE c.admin_user_id=u.id AND c.must_change_password=1
                AND c.password_changed_at IS NULL)
  AND EXISTS (SELECT 1 FROM admin_users owner
              JOIN admin_password_credentials owner_c ON owner_c.admin_user_id=owner.id
              JOIN admin_user_roles owner_role ON owner_role.admin_user_id=owner.id
              JOIN roles r ON r.id=owner_role.role_id
              WHERE owner.status='active' AND owner_c.must_change_password=0
                AND owner_c.password_changed_at IS NOT NULL AND r.code='owner');

UPDATE admin_sessions
SET revoked_at = COALESCE(revoked_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
WHERE admin_user_id IN (
  SELECT u.id FROM admin_users u JOIN admin_password_credentials c ON c.admin_user_id=u.id
  WHERE u.status='active' AND c.must_change_password=1 AND c.password_changed_at IS NULL
    AND EXISTS (SELECT 1 FROM admin_users owner
                JOIN admin_password_credentials owner_c ON owner_c.admin_user_id=owner.id
                JOIN admin_user_roles owner_role ON owner_role.admin_user_id=owner.id
                JOIN roles r ON r.id=owner_role.role_id
                WHERE owner.status='active' AND owner_c.must_change_password=0
                  AND owner_c.password_changed_at IS NOT NULL AND r.code='owner')
) AND revoked_at IS NULL;

UPDATE admin_users
SET status = 'suspended', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id IN (
  SELECT u.id FROM admin_users u JOIN admin_password_credentials c ON c.admin_user_id=u.id
  WHERE u.status='active' AND c.must_change_password=1 AND c.password_changed_at IS NULL
    AND EXISTS (SELECT 1 FROM admin_users owner
                JOIN admin_password_credentials owner_c ON owner_c.admin_user_id=owner.id
                JOIN admin_user_roles owner_role ON owner_role.admin_user_id=owner.id
                JOIN roles r ON r.id=owner_role.role_id
                WHERE owner.status='active' AND owner_c.must_change_password=0
                  AND owner_c.password_changed_at IS NOT NULL AND r.code='owner')
);

UPDATE schema_metadata SET value='85', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';

PRAGMA optimize;
