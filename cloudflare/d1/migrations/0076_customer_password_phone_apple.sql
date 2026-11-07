PRAGMA foreign_keys = ON;

ALTER TABLE review_accounts ADD COLUMN phone_e164 TEXT;
CREATE UNIQUE INDEX review_accounts_phone_e164_unique
ON review_accounts(phone_e164) WHERE phone_e164 IS NOT NULL;

CREATE TABLE review_apple_identities (
  provider_subject TEXT PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE REFERENCES review_accounts(id) ON DELETE CASCADE,
  email_at_link TEXT NOT NULL COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX review_apple_identities_account_idx ON review_apple_identities(account_id);

UPDATE schema_metadata SET value='76',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';
PRAGMA optimize;
