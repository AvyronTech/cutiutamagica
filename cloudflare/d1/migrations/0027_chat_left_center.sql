-- Move the launcher's initial side away from the three contact actions.
-- Existing migrations remain immutable. The vertical position is responsive UI.
UPDATE chat_settings
SET position = 'left', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'default' AND position = 'right';

UPDATE schema_metadata SET value = '27', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';
