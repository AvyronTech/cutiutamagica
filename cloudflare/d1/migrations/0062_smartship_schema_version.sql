-- Migration 0061 created the AWB request table but did not advance this
-- operational schema marker. Keep applied migrations immutable.
UPDATE schema_metadata
SET value='62', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';
