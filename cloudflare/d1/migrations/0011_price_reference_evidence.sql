PRAGMA foreign_keys=ON;
CREATE TABLE price_reference_evidence (
  price_item_id TEXT PRIMARY KEY REFERENCES price_list_items(id) ON DELETE CASCADE,
  reference_bani INTEGER NOT NULL CHECK(reference_bani>0),
  evidence TEXT NOT NULL,
  approved_by TEXT NOT NULL REFERENCES admin_users(id),
  approved_at TEXT NOT NULL
);
CREATE TABLE price_change_history (
  id TEXT PRIMARY KEY,
  price_item_id TEXT NOT NULL REFERENCES price_list_items(id) ON DELETE CASCADE,
  old_price_bani INTEGER NOT NULL,
  new_price_bani INTEGER NOT NULL,
  changed_by TEXT NOT NULL REFERENCES admin_users(id),
  changed_at TEXT NOT NULL
);
CREATE INDEX price_history_item_date_idx ON price_change_history(price_item_id,changed_at DESC);
UPDATE schema_metadata SET value='11',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE key='schema_version';
