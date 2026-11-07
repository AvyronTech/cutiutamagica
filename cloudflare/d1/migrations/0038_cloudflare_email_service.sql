PRAGMA foreign_keys = ON;

UPDATE operational_settings
SET value_json = json_set(
      value_json,
      '$.provider', 'cloudflare_email',
      '$.defaultFromEmail', 'contact@cutiutamagica.eu',
      '$.ordersFromEmail', 'comenzi@cutiutamagica.eu',
      '$.returnsFromEmail', 'contact@cutiutamagica.eu',
      '$.partnersFromEmail', 'contact@cutiutamagica.eu',
      '$.replyToEmail', 'contact@cutiutamagica.eu',
      '$.inboundAddress', 'contact@cutiutamagica.eu',
      '$.forwardingTarget', 'cutiutamagicaofficial@gmail.com',
      '$.orderNotificationEmail', 'cutiutamagicaofficial@gmail.com',
      '$.customerEmailsEnabled', json('true')
    ),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'email';

UPDATE legal_entities
SET public_email = 'contact@cutiutamagica.eu',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'legal_entity_main';

UPDATE schema_metadata
SET value = '38', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
