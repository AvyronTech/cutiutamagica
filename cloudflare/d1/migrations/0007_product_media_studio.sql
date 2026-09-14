PRAGMA foreign_keys = ON;

ALTER TABLE product_media ADD COLUMN slot_code TEXT
  CHECK (slot_code IS NULL OR slot_code IN ('01_hero', '02_decor', '03_closed', '04_dimensions', '05_mechanism', '06_melody'));
ALTER TABLE product_media ADD COLUMN title TEXT;
ALTER TABLE product_media ADD COLUMN promo_text_ro TEXT;
ALTER TABLE product_media ADD COLUMN file_format TEXT;
ALTER TABLE product_media ADD COLUMN file_size_bytes INTEGER
  CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0);
ALTER TABLE product_media ADD COLUMN original_filename TEXT;
ALTER TABLE product_media ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]'
  CHECK (json_valid(tags_json));
ALTER TABLE product_media ADD COLUMN usage_type TEXT NOT NULL DEFAULT 'product'
  CHECK (usage_type IN ('product', 'social', 'story', 'advertising', 'hero', 'detail', '360', 'audio', 'animation'));
ALTER TABLE product_media ADD COLUMN marketing_approved INTEGER NOT NULL DEFAULT 0
  CHECK (marketing_approved IN (0, 1));
ALTER TABLE product_media ADD COLUMN public_access INTEGER NOT NULL DEFAULT 0
  CHECK (public_access IN (0, 1));
ALTER TABLE product_media ADD COLUMN sync_to_avyron INTEGER NOT NULL DEFAULT 0
  CHECK (sync_to_avyron IN (0, 1));
ALTER TABLE product_media ADD COLUMN status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'active', 'archived', 'processing', 'failed'));
ALTER TABLE product_media ADD COLUMN version INTEGER NOT NULL DEFAULT 1
  CHECK (version > 0);
ALTER TABLE product_media ADD COLUMN archived_at TEXT;

CREATE UNIQUE INDEX product_media_active_slot_unique
  ON product_media(product_id, slot_code)
  WHERE slot_code IS NOT NULL AND status != 'archived';
CREATE INDEX product_media_library_idx
  ON product_media(product_id, status, usage_type, updated_at DESC);
CREATE INDEX product_media_sync_idx
  ON product_media(sync_to_avyron, marketing_approved, updated_at)
  WHERE sync_to_avyron = 1 AND status = 'active';

CREATE TABLE product_audio_config (
  product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  melody_id TEXT REFERENCES melodies(id) ON DELETE SET NULL,
  media_id TEXT REFERENCES product_media(id) ON DELETE SET NULL,
  display_name TEXT,
  public_enabled INTEGER NOT NULL DEFAULT 0 CHECK (public_enabled IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'disabled'
    CHECK (status IN ('disabled', 'draft', 'active', 'processing', 'failed')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE product_360_config (
  product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  spin_type TEXT NOT NULL DEFAULT 'image_sequence'
    CHECK (spin_type IN ('image_sequence', 'turntable_video', 'glb_model')),
  cover_media_id TEXT REFERENCES product_media(id) ON DELETE SET NULL,
  frame_count INTEGER NOT NULL DEFAULT 0 CHECK (frame_count >= 0),
  manifest_r2_key TEXT,
  folder_r2_prefix TEXT,
  model_r2_key TEXT,
  status TEXT NOT NULL DEFAULT 'missing'
    CHECK (status IN ('missing', 'uploading', 'processing', 'ready', 'failed', 'disabled')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (enabled = 0 OR status = 'ready'),
  CHECK (
    spin_type != 'image_sequence' OR frame_count = 0 OR
    (manifest_r2_key IS NOT NULL AND folder_r2_prefix IS NOT NULL)
  )
);

CREATE TABLE product_animation_config (
  product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  video_media_id TEXT REFERENCES product_media(id) ON DELETE SET NULL,
  poster_media_id TEXT REFERENCES product_media(id) ON DELETE SET NULL,
  thumbnail_media_id TEXT REFERENCES product_media(id) ON DELETE SET NULL,
  title TEXT,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  autoplay_muted_preview INTEGER NOT NULL DEFAULT 0 CHECK (autoplay_muted_preview IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'missing'
    CHECK (status IN ('missing', 'uploading', 'processing', 'ready', 'failed', 'disabled')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (enabled = 0 OR (status = 'ready' AND video_media_id IS NOT NULL))
);

CREATE TABLE media_upload_sessions (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL REFERENCES admin_users(id) ON DELETE RESTRICT,
  media_type TEXT NOT NULL
    CHECK (media_type IN ('image', 'audio', 'video', 'spin_360', 'model_3d', 'document')),
  usage_type TEXT NOT NULL
    CHECK (usage_type IN ('product', 'social', 'story', 'advertising', 'hero', 'detail', '360', 'audio', 'animation')),
  slot_code TEXT
    CHECK (slot_code IS NULL OR slot_code IN ('01_hero', '02_decor', '03_closed', '04_dimensions', '05_mechanism', '06_melody')),
  r2_key TEXT NOT NULL UNIQUE,
  expected_mime_type TEXT NOT NULL,
  expected_size_bytes INTEGER NOT NULL CHECK (expected_size_bytes > 0),
  checksum_sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'uploading', 'uploaded', 'committed', 'expired', 'failed')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT
);

CREATE INDEX media_upload_sessions_expiry_idx
  ON media_upload_sessions(status, expires_at);

CREATE TABLE avyron_sync_targets (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  endpoint_url TEXT,
  auth_mode TEXT NOT NULL DEFAULT 'hmac'
    CHECK (auth_mode IN ('hmac', 'service_token')),
  secret_binding_name TEXT NOT NULL,
  source_label TEXT NOT NULL DEFAULT 'cutiuta-magica',
  status TEXT NOT NULL DEFAULT 'disabled'
    CHECK (status IN ('disabled', 'setup_required', 'active', 'degraded')),
  timeout_ms INTEGER NOT NULL DEFAULT 8000 CHECK (timeout_ms BETWEEN 1000 AND 30000),
  max_attempts INTEGER NOT NULL DEFAULT 8 CHECK (max_attempts BETWEEN 1 AND 20),
  last_healthcheck_at TEXT,
  last_error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE avyron_sync_jobs (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  asset_id TEXT REFERENCES product_media(id) ON DELETE SET NULL,
  destination TEXT NOT NULL DEFAULT 'avyron-os' CHECK (destination = 'avyron-os'),
  idempotency_key TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error TEXT,
  last_attempt_at TEXT,
  next_retry_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX avyron_sync_jobs_queue_idx
  ON avyron_sync_jobs(status, next_retry_at, created_at);
CREATE INDEX avyron_sync_jobs_asset_idx
  ON avyron_sync_jobs(asset_id, created_at DESC);

INSERT OR IGNORE INTO avyron_sync_targets (
  id, code, secret_binding_name, status
) VALUES (
  'target_avyron_os', 'avyron-os', 'AVYRON_SYNC_HMAC_SECRET', 'disabled'
);

UPDATE schema_metadata
SET value = '7', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
