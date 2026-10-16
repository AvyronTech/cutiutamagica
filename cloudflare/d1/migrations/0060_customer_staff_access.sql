PRAGMA foreign_keys = ON;

-- Staff who can already inspect order customer details may inspect the linked
-- membership and gift-calendar summary in the same internal workspace.
INSERT OR IGNORE INTO role_permissions(role_id, permission_id)
SELECT rp.role_id, 'perm_customers_read'
FROM role_permissions rp
JOIN permissions p ON p.id=rp.permission_id
WHERE p.code='orders.read';

UPDATE schema_metadata
SET value='60', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';

PRAGMA optimize;
