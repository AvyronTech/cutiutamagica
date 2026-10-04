PRAGMA foreign_keys = ON;

CREATE TABLE growth_event_daily_v2 (
  event_day TEXT NOT NULL,
  event_name TEXT NOT NULL CHECK(event_name IN (
    'page_view','product_view',
    'gift_finder_started','gift_finder_completed','audio_play','audio_75','gallery_open',
    'personalization_start','add_to_cart','gift_wrap_added','checkout_start','checkout_abandon',
    'purchase','review_submitted','waitlist_joined'
  )),
  product_slug TEXT NOT NULL DEFAULT '',
  path TEXT NOT NULL DEFAULT '',
  event_count INTEGER NOT NULL DEFAULT 0 CHECK(event_count >= 0),
  value_total REAL NOT NULL DEFAULT 0,
  quantity_total INTEGER NOT NULL DEFAULT 0 CHECK(quantity_total >= 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY(event_day,event_name,product_slug,path)
);

INSERT INTO growth_event_daily_v2 (
  event_day, event_name, product_slug, path, event_count,
  value_total, quantity_total, updated_at
)
SELECT
  event_day, event_name, product_slug, path, event_count,
  value_total, quantity_total, updated_at
FROM growth_event_daily;

DROP TABLE growth_event_daily;
ALTER TABLE growth_event_daily_v2 RENAME TO growth_event_daily;

CREATE INDEX growth_event_daily_name_idx
  ON growth_event_daily(event_name,event_day DESC);

UPDATE schema_metadata
SET value = '45', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
