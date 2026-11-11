PRAGMA foreign_keys=ON;

CREATE TABLE marketplace_invoice_settings (
  provider TEXT PRIMARY KEY CHECK(provider IN ('trendyol','emag')),
  enabled_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE marketplace_invoice_deliveries (
  invoice_id TEXT PRIMARY KEY REFERENCES invoices(id),
  provider TEXT NOT NULL CHECK(provider IN ('trendyol','emag')),
  external_target TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('blocked','sending','accepted','confirmed','review','rejected')),
  error_code TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(provider, external_target)
);

CREATE TABLE emag_sync_state (
  id INTEGER PRIMARY KEY CHECK(id=1),
  account_fingerprint TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
  cursor_at TEXT,
  window_end TEXT,
  lease_token TEXT,
  lease_until_ms INTEGER NOT NULL DEFAULT 0,
  page INTEGER NOT NULL DEFAULT 1,
  last_sync_at TEXT,
  last_error_code TEXT
);

CREATE TABLE emag_order_sources (
  order_id TEXT PRIMARY KEY REFERENCES orders(id),
  external_id INTEGER NOT NULL UNIQUE,
  modified TEXT NOT NULL,
  financial_hash TEXT NOT NULL,
  mutation_token TEXT NOT NULL,
  status INTEGER NOT NULL,
  payment_status INTEGER NOT NULL,
  delivery_mode TEXT NOT NULL,
  awb_id INTEGER,
  awb_number TEXT,
  carrier TEXT,
  existing_invoice INTEGER NOT NULL DEFAULT 0 CHECK(existing_invoice IN (0,1)),
  review_code TEXT,
  checked_at TEXT NOT NULL
);

CREATE TABLE emag_sync_issues (
  external_id INTEGER PRIMARY KEY,
  code TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

UPDATE schema_metadata SET value='96',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE key='schema_version';
