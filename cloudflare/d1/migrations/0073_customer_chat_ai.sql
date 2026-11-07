PRAGMA foreign_keys = ON;

ALTER TABLE chat_conversations ADD COLUMN ai_paused INTEGER NOT NULL DEFAULT 0 CHECK (ai_paused IN (0,1));
ALTER TABLE chat_conversations ADD COLUMN last_visitor_message_id TEXT;

CREATE TABLE chat_knowledge (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 2 AND 120),
  answer TEXT NOT NULL CHECK (length(answer) BETWEEN 10 AND 1200),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE chat_ai_runs (
  message_id TEXT PRIMARY KEY REFERENCES chat_messages(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('running','draft','handoff','skipped')),
  model TEXT NOT NULL,
  reason TEXT,
  draft_body TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
CREATE INDEX chat_ai_runs_conversation_idx ON chat_ai_runs(conversation_id,created_at DESC);

CREATE TABLE chat_ai_daily_usage (
  usage_date TEXT PRIMARY KEY,
  requests INTEGER NOT NULL DEFAULT 0 CHECK (requests >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

UPDATE schema_metadata SET value='73',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';

PRAGMA optimize;
