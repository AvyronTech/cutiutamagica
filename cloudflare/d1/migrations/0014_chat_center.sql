PRAGMA foreign_keys = ON;

CREATE TABLE chat_settings (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  availability TEXT NOT NULL DEFAULT 'online' CHECK (availability IN ('online', 'offline', 'auto')),
  position TEXT NOT NULL DEFAULT 'right' CHECK (position IN ('left', 'right')),
  accent_color TEXT NOT NULL DEFAULT '#8b5a2b',
  welcome_title TEXT NOT NULL,
  welcome_message TEXT NOT NULL,
  offline_message TEXT NOT NULL,
  response_time_label TEXT NOT NULL,
  require_consent INTEGER NOT NULL DEFAULT 1 CHECK (require_consent IN (0, 1)),
  collect_name INTEGER NOT NULL DEFAULT 0 CHECK (collect_name IN (0, 1)),
  collect_email INTEGER NOT NULL DEFAULT 0 CHECK (collect_email IN (0, 1)),
  quick_replies_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(quick_replies_json)),
  ai_enabled INTEGER NOT NULL DEFAULT 0 CHECK (ai_enabled IN (0, 1)),
  retention_days INTEGER NOT NULL DEFAULT 365 CHECK (retention_days BETWEEN 30 AND 1095),
  updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO chat_settings (
  id, welcome_title, welcome_message, offline_message, response_time_label, quick_replies_json
) VALUES (
  'default',
  'Bun venit în atelier',
  'Spune-ne ce melodie, poveste sau cadou cauți și te ajutăm să alegi cutiuța potrivită.',
  'Mesajul tău rămâne în atelier. Îți răspundem cât de curând.',
  'Răspundem de obicei în câteva minute',
  '["Vreau o recomandare","Caut un cadou","Am o întrebare despre comandă"]'
);

CREATE TABLE chat_conversations (
  id TEXT PRIMARY KEY,
  access_token_hash TEXT NOT NULL UNIQUE,
  visitor_key_hash TEXT,
  visitor_name TEXT,
  visitor_email TEXT,
  consent_at TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed', 'spam')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
  assigned_admin_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  source_path TEXT NOT NULL DEFAULT '/',
  context_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(context_json)),
  unread_admin_count INTEGER NOT NULL DEFAULT 0 CHECK (unread_admin_count >= 0),
  unread_visitor_count INTEGER NOT NULL DEFAULT 0 CHECK (unread_visitor_count >= 0),
  last_message_at TEXT NOT NULL,
  last_visitor_message_at TEXT,
  last_admin_message_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX chat_conversations_inbox_idx
  ON chat_conversations(status, last_message_at DESC);
CREATE INDEX chat_conversations_assignment_idx
  ON chat_conversations(assigned_admin_id, status, last_message_at DESC);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'admin', 'system', 'assistant')),
  sender_id TEXT,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL,
  read_at TEXT
);

CREATE INDEX chat_messages_timeline_idx
  ON chat_messages(conversation_id, created_at, id);

INSERT OR IGNORE INTO permissions (id, code, description) VALUES
  ('perm_chat_read', 'chat.read', 'Vizualizează conversațiile din chat.'),
  ('perm_chat_write', 'chat.write', 'Răspunde și configurează chatul.');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_owner', id FROM permissions WHERE code IN ('chat.read', 'chat.write');

UPDATE schema_metadata
SET value = '14', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
