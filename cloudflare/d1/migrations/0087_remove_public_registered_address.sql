PRAGMA foreign_keys = ON;

-- Keep the registered address in the internal legal entity for invoicing.
-- Remove only its copy from the site setting marked public.
UPDATE site_settings
SET value_json = json_remove(value_json, '$.registered_address'),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'business.legal_entity'
  AND json_type(value_json, '$.registered_address') IS NOT NULL;

UPDATE schema_metadata
SET value = '87', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
