CREATE TABLE personalization_box_models (
  id TEXT PRIMARY KEY CHECK(id IN ('classic', 'panorama', 'keepsake')),
  public_label TEXT NOT NULL CHECK(length(public_label) BETWEEN 2 AND 80),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO personalization_box_models(id, public_label, sort_order) VALUES
  ('classic', 'Clasică', 10),
  ('panorama', 'Panorama', 20),
  ('keepsake', 'Cufăr', 30);

CREATE TABLE personalization_supplier_sources (
  id TEXT PRIMARY KEY,
  box_model_id TEXT NOT NULL REFERENCES personalization_box_models(id) ON DELETE RESTRICT,
  marketplace TEXT NOT NULL DEFAULT 'temu' CHECK(marketplace = 'temu'),
  source_url TEXT NOT NULL CHECK(length(source_url) BETWEEN 12 AND 2000),
  external_listing_id TEXT CHECK(external_listing_id IS NULL OR length(external_listing_id) <= 180),
  listing_title TEXT NOT NULL CHECK(length(listing_title) BETWEEN 2 AND 300),
  variant_label TEXT NOT NULL DEFAULT '' CHECK(length(variant_label) <= 240),
  price_text TEXT NOT NULL DEFAULT '' CHECK(length(price_text) <= 80),
  extraction_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(extraction_json)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'verified', 'inactive')),
  last_verified_at TEXT,
  created_by_admin_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX personalization_supplier_model_idx
  ON personalization_supplier_sources(box_model_id, status, updated_at DESC);

ALTER TABLE personalization_requests
  ADD COLUMN box_model TEXT NOT NULL DEFAULT 'classic'
  CHECK(box_model IN ('classic', 'panorama', 'keepsake'));

ALTER TABLE personalization_requests
  ADD COLUMN engraving TEXT NOT NULL DEFAULT '' CHECK(length(engraving) <= 28);

ALTER TABLE personalization_requests
  ADD COLUMN supplier_source_id TEXT REFERENCES personalization_supplier_sources(id) ON DELETE SET NULL;

ALTER TABLE personalization_requests
  ADD COLUMN procurement_status TEXT NOT NULL DEFAULT 'awaiting_source'
  CHECK(procurement_status IN ('awaiting_source', 'ready_to_order', 'ordered', 'received', 'cancelled'));

ALTER TABLE personalization_requests ADD COLUMN ordered_at TEXT;

CREATE INDEX personalization_procurement_idx
  ON personalization_requests(procurement_status, created_at DESC);

UPDATE schema_metadata
SET value = '41', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';
