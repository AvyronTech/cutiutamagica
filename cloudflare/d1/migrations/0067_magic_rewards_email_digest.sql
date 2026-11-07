PRAGMA foreign_keys = ON;

ALTER TABLE review_accounts ADD COLUMN reward_email_enabled INTEGER NOT NULL DEFAULT 0
  CHECK (reward_email_enabled IN (0, 1));
ALTER TABLE review_accounts ADD COLUMN reward_email_opted_in_at TEXT;

CREATE TABLE magic_reward_email_dispatches (
  id TEXT PRIMARY KEY,
  review_account_id TEXT NOT NULL REFERENCES review_accounts(id) ON DELETE CASCADE,
  activity_day TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'sent', 'failed')),
  event_count INTEGER NOT NULL CHECK (event_count > 0),
  first_attempt_at TEXT NOT NULL,
  sent_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (review_account_id, activity_day)
);

CREATE INDEX magic_reward_email_dispatches_status_idx
  ON magic_reward_email_dispatches(status, created_at DESC);

UPDATE schema_metadata
SET value = '67', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
