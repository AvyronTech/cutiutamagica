PRAGMA foreign_keys = ON;

CREATE TABLE customer_login_challenges (
  id TEXT PRIMARY KEY,
  email_normalized TEXT NOT NULL COLLATE NOCASE,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX customer_login_challenges_expiry_idx
ON customer_login_challenges(expires_at);

INSERT OR IGNORE INTO permissions(id, code, description)
VALUES('perm_customers_read', 'customers.read', 'Vizualizează membrii, comenzile și datele de cadouri necesare serviciului clienți.');

INSERT OR IGNORE INTO role_permissions(role_id, permission_id)
SELECT id, 'perm_customers_read' FROM roles WHERE code IN ('owner', 'manager');

CREATE TABLE customer_card_setups (
  id TEXT PRIMARY KEY,
  review_account_id TEXT NOT NULL REFERENCES review_accounts(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  billing_customer_id TEXT NOT NULL REFERENCES billing_customers(id) ON DELETE CASCADE,
  consent_id TEXT NOT NULL REFERENCES payment_consents(id) ON DELETE RESTRICT,
  stripe_session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','expired')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT
);

UPDATE gift_calendar_events
SET reminder_days_json='[7,3]',
    updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE reminder_days_json='[12,3]';

UPDATE schema_metadata
SET value='59', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key='schema_version';

PRAGMA optimize;
