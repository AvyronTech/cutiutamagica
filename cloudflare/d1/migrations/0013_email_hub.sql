PRAGMA foreign_keys = ON;

CREATE TABLE email_templates (
  code TEXT PRIMARY KEY
    CHECK (code IN ('order_confirmation', 'return_acknowledgement')),
  name TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('customer', 'partner', 'internal')),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  subject_template TEXT NOT NULL,
  text_template TEXT NOT NULL,
  updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO email_templates (
  code, name, audience, enabled, subject_template, text_template
) VALUES
  (
    'order_confirmation',
    'Confirmare comandă',
    'customer',
    1,
    'Am primit comanda {{order_number}}',
    'Bună, {{customer_name}}.\n\nAm primit comanda {{order_number}}, în valoare de {{total}}.\n\nRevenim cu confirmarea livrării și următorii pași.\n\nCutiuța Magică'
  ),
  (
    'return_acknowledgement',
    'Confirmare cerere de retur',
    'customer',
    1,
    'Cererea de retur {{return_number}} a fost înregistrată',
    'Bună, {{customer_name}}.\n\nCererea {{return_number}} a fost înregistrată. O verificăm și revenim cu pașii de expediere sau remediere.\n\nCutiuța Magică'
  );

CREATE TABLE email_contacts (
  id TEXT PRIMARY KEY,
  audience TEXT NOT NULL CHECK (audience IN ('partner', 'internal')),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL COLLATE NOCASE,
  email_normalized TEXT NOT NULL COLLATE NOCASE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  notes TEXT,
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (audience, email_normalized)
);

CREATE INDEX email_contacts_audience_status_idx
  ON email_contacts(audience, status, name);

INSERT INTO operational_settings (key, value_json, updated_at)
VALUES (
  'email',
  json_object(
    'provider', 'resend',
    'senderName', 'Cutiuța Magică',
    'defaultFromEmail', 'contact@cutiutamagica.eu',
    'ordersFromEmail', 'comenzi@cutiutamagica.eu',
    'returnsFromEmail', 'retururi@cutiutamagica.eu',
    'partnersFromEmail', 'parteneri@cutiutamagica.eu',
    'replyToEmail', 'cutiutamagica@gmail.com',
    'inboundAddress', 'contact@cutiutamagica.eu',
    'forwardingTarget', 'cutiutamagica@gmail.com',
    'customerEmailsEnabled', json('true'),
    'partnerEmailsEnabled', json('false')
  ),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
)
ON CONFLICT(key) DO NOTHING;

UPDATE schema_metadata
SET value = '13', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
