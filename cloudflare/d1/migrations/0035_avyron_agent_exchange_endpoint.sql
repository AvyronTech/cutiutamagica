PRAGMA foreign_keys = ON;

ALTER TABLE avyron_sync_targets
ADD COLUMN agent_exchange_endpoint_url TEXT;

UPDATE schema_metadata
SET value = '35', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
