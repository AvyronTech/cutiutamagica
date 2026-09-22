PRAGMA foreign_keys = ON;

-- Admin access is limited to the four pre-provisioned password accounts.
-- Public access and recovery request flows were intentionally removed.
DROP TABLE IF EXISTS admin_access_requests;
DROP TABLE IF EXISTS admin_recovery_requests;

UPDATE schema_metadata
SET value = '17', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';
