PRAGMA foreign_keys = ON;

-- SQLite cannot extend the original CHECK in place. Preserve all saved edits.
CREATE TABLE email_templates_next (
  code TEXT PRIMARY KEY CHECK (code IN (
    'order_confirmation', 'order_owner_notification', 'order_shipped',
    'return_acknowledgement', 'return_owner_notification'
  )),
  name TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('customer', 'partner', 'internal')),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  subject_template TEXT NOT NULL,
  text_template TEXT NOT NULL,
  updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO email_templates_next
  (code,name,audience,enabled,subject_template,text_template,updated_by,updated_at)
SELECT code,name,audience,enabled,subject_template,text_template,updated_by,updated_at
FROM email_templates;

DROP TABLE email_templates;
ALTER TABLE email_templates_next RENAME TO email_templates;

INSERT INTO email_templates (code,name,audience,enabled,subject_template,text_template) VALUES
  ('order_owner_notification','Comandă nouă · echipă','internal',1,
   'Comandă nouă {{order_number}} · {{total}}','{{details}}'),
  ('order_shipped','Comandă expediată','customer',1,
   'Comanda {{order_number}} este pe drum',
   'Bună, {{customer_name}}!' || char(10) || char(10) ||
   'Comanda {{order_number}} a fost predată pentru livrare. Îți mulțumim că ne-ai ales.' || char(10) || char(10) ||
   'Poți vedea comenzile tale în contul Cutiuța Magică. Dacă ai nevoie de ajutor, răspunde la acest e-mail.' || char(10) || char(10) ||
   'Echipa Cutiuța Magică'),
  ('return_owner_notification','Cerere de retur · echipă','internal',1,
   'Cerere de retur {{return_number}} · comanda {{order_number}}',
   'Cererea {{return_number}} pentru comanda {{order_number}} necesită verificare.' || char(10) ||
   'Client: {{customer_name}}' || char(10) ||
   'Tip: {{request_type}}' || char(10) || char(10) ||
   'Deschide secțiunea Retururi din panoul intern.');

-- Prefer the verified transactional credential when Cloudflare has refused
-- customer recipients. This is the requested transport change for this release.
UPDATE operational_settings
SET value_json=json_set(value_json,'$.provider','resend'),
    version=version+1,
    updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='email' AND json_extract(value_json,'$.provider')='cloudflare_email'
  AND EXISTS (SELECT 1 FROM integration_credentials
              WHERE provider='resend' AND check_status='verified')
  AND EXISTS (SELECT 1 FROM provider_operations
              WHERE provider='cloudflare_email' AND operation_type='email.send'
                AND error_code='E_RECIPIENT_NOT_ALLOWED');

UPDATE schema_metadata SET value='84',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';

PRAGMA optimize;
