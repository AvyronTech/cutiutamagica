CREATE TABLE personalization_requests (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES review_accounts(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL CHECK(length(customer_name) BETWEEN 2 AND 100),
  email TEXT NOT NULL COLLATE NOCASE CHECK(length(email) <= 254),
  phone TEXT NOT NULL CHECK(length(phone) BETWEEN 7 AND 24),
  box_color TEXT NOT NULL CHECK(box_color IN ('black', 'yellow')),
  melody TEXT NOT NULL CHECK(melody IN ('melody-1', 'melody-2', 'melody-3')),
  lid_image_r2_key TEXT NOT NULL UNIQUE,
  lid_image_mime TEXT NOT NULL CHECK(lid_image_mime IN ('image/jpeg', 'image/png', 'image/webp')),
  lid_image_original_name TEXT NOT NULL CHECK(length(lid_image_original_name) BETWEEN 1 AND 180),
  gift_wrap INTEGER NOT NULL DEFAULT 0 CHECK(gift_wrap IN (0, 1)),
  base_price_bani INTEGER NOT NULL DEFAULT 18900 CHECK(base_price_bani = 18900),
  gift_wrap_bani INTEGER NOT NULL DEFAULT 0 CHECK(gift_wrap_bani IN (0, 3500)),
  total_bani INTEGER NOT NULL CHECK(total_bani = base_price_bani + gift_wrap_bani),
  notes TEXT NOT NULL DEFAULT '' CHECK(length(notes) <= 1000),
  status TEXT NOT NULL DEFAULT 'received'
    CHECK(status IN ('received', 'contacted', 'approved', 'in_production', 'shipped', 'cancelled')),
  consent_processing INTEGER NOT NULL CHECK(consent_processing = 1),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX personalization_requests_account_idx
  ON personalization_requests(account_id, created_at DESC);

CREATE INDEX personalization_requests_status_idx
  ON personalization_requests(status, created_at DESC);

CREATE INDEX personalization_requests_email_idx
  ON personalization_requests(email, created_at DESC);

UPDATE schema_metadata
SET value = '32', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';
