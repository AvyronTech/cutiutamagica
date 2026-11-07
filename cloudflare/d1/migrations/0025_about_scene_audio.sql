CREATE TABLE story_audio_assets (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL UNIQUE,
  duration_seconds REAL NOT NULL CHECK(duration_seconds BETWEEN 15 AND 30),
  byte_size INTEGER NOT NULL CHECK(byte_size BETWEEN 44 AND 3000000),
  created_by TEXT NOT NULL REFERENCES admin_users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE story_scene_settings (
  id TEXT PRIMARY KEY CHECK(id='about'),
  audio_asset_id TEXT REFERENCES story_audio_assets(id),
  track_title TEXT NOT NULL DEFAULT 'Melodia cutiuței',
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  rights_confirmed INTEGER NOT NULL DEFAULT 0 CHECK(rights_confirmed IN (0,1)),
  version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT REFERENCES admin_users(id),
  updated_at TEXT NOT NULL,
  CHECK(enabled=0 OR (audio_asset_id IS NOT NULL AND rights_confirmed=1))
);
INSERT INTO story_scene_settings(id,updated_at) VALUES('about',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
