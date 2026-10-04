PRAGMA foreign_keys = ON;

ALTER TABLE review_accounts
ADD COLUMN auth_mode TEXT NOT NULL DEFAULT 'password'
  CHECK (auth_mode IN ('password', 'oauth'));

CREATE TABLE review_oauth_identities (
  provider TEXT NOT NULL CHECK (provider IN ('google')),
  provider_subject TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES review_accounts(id) ON DELETE CASCADE,
  email_at_link TEXT NOT NULL COLLATE NOCASE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (provider, provider_subject),
  UNIQUE (provider, account_id)
);

CREATE INDEX review_oauth_identity_account_idx
ON review_oauth_identities(account_id);

UPDATE schema_metadata
SET value = '47', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
