PRAGMA foreign_keys = ON;
CREATE TABLE marketplace_order_sources (
 order_id TEXT PRIMARY KEY REFERENCES orders(id),
 provider TEXT NOT NULL CHECK(provider='trendyol'),
 seller_id TEXT NOT NULL,
 external_order_id TEXT NOT NULL,
 source_modified_ms INTEGER NOT NULL,
 source_hash TEXT NOT NULL,
 snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
 mutation_token TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1,
 review_code TEXT,
 imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(provider,seller_id,external_order_id)
);
CREATE TABLE marketplace_packages (
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL REFERENCES orders(id),
 provider TEXT NOT NULL CHECK(provider='trendyol'),
 external_package_id TEXT NOT NULL,
 status TEXT NOT NULL,
 cargo_provider TEXT NOT NULL,
 cargo_number TEXT,
 shipment_number TEXT,
 invoice_status TEXT,
 invoice_number TEXT,
 gross_bani INTEGER NOT NULL CHECK(gross_bani>=0),
 seller_discount_bani INTEGER NOT NULL CHECK(seller_discount_bani>=0),
 platform_discount_bani INTEGER NOT NULL CHECK(platform_discount_bani>=0),
 invoice_total_bani INTEGER NOT NULL CHECK(invoice_total_bani>=0),
 campaigns_json TEXT NOT NULL CHECK(json_valid(campaigns_json)),
 source_modified_ms INTEGER NOT NULL,
 UNIQUE(provider,external_package_id)
);
CREATE INDEX marketplace_packages_order_idx ON marketplace_packages(order_id);
CREATE TABLE marketplace_financial_entries (
 id TEXT PRIMARY KEY,
 provider TEXT NOT NULL CHECK(provider='trendyol'),
 external_id TEXT NOT NULL,
 transaction_type TEXT NOT NULL,
 external_order_id TEXT,
 external_package_id TEXT,
 occurred_at_ms INTEGER NOT NULL,
 credit_bani INTEGER NOT NULL DEFAULT 0,
 debit_bani INTEGER NOT NULL DEFAULT 0,
 commission_bani INTEGER,
 seller_revenue_bani INTEGER,
 payment_order_id TEXT,
 currency TEXT NOT NULL CHECK(currency='RON'),
 source_json TEXT NOT NULL CHECK(json_valid(source_json)),
 imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 UNIQUE(provider,transaction_type,external_id)
);
CREATE TABLE trendyol_sync_state (
 id INTEGER PRIMARY KEY CHECK(id=1), seller_id TEXT NOT NULL,
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN(0,1)),
 verified_at TEXT, last_order_sync_at TEXT, last_finance_sync_at TEXT,
 window_start_ms INTEGER, window_end_ms INTEGER, cursor TEXT,
 lease_token TEXT, lease_until_ms INTEGER NOT NULL DEFAULT 0,
 last_error_code TEXT, finance_cursor_json TEXT, stock_buffer INTEGER NOT NULL DEFAULT 0 CHECK(stock_buffer>=0),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE trendyol_sync_issues (
 external_order_id TEXT PRIMARY KEY, code TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN('open','resolved')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE marketplace_inventory_snapshots (
 provider TEXT NOT NULL CHECK(provider='trendyol'), sku TEXT NOT NULL, barcode TEXT NOT NULL,
 quantity INTEGER NOT NULL CHECK(quantity>=0), sale_price_bani INTEGER NOT NULL CHECK(sale_price_bani>=0),
 list_price_bani INTEGER NOT NULL CHECK(list_price_bani>=0), source_modified_ms INTEGER,
 observed_at TEXT NOT NULL, PRIMARY KEY(provider,barcode)
);
CREATE TABLE trendyol_stock_updates (
 id TEXT PRIMARY KEY, payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
 status TEXT NOT NULL CHECK(status IN('sending','accepted','confirmed','uncertain','failed')),
 batch_id TEXT, error_code TEXT,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX marketplace_financial_order_idx ON marketplace_financial_entries(provider,external_order_id,occurred_at_ms);
CREATE INDEX trendyol_issues_status_idx ON trendyol_sync_issues(status,updated_at);
CREATE UNIQUE INDEX trendyol_stock_pending_sku ON trendyol_stock_updates(json_extract(payload_json,'$.sku')) WHERE status IN('sending','accepted','uncertain');
-- Preserve the administrator-confirmed model identity in fresh databases too.
UPDATE products SET name='Cutiuta Muzicala Intro Harry Potter WB',short_name='Intro Harry Potter WB',
 seo_title='Cutiuta Muzicala Intro Harry Potter WB | Cutiuța Magică',
 seo_description='Cutiuta Muzicala Intro Harry Potter WB, din lemn, cu manivelă și melodia Hedwig''s Theme. Vezi fotografiile, prețul și disponibilitatea.',
 version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE id='product_hp_keeper' AND name='Cutiuță muzicală Harry Potter „I''m a Keeper”';
UPDATE channel_listings SET title_override='Cutiuta Muzicala Intro Harry Potter WB',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE id='listing_website_hp-keeper' AND title_override='Harry Potter - I''m a Keeper';
UPDATE product_media SET alt_text='Cutiuta Muzicala Intro Harry Potter WB',version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
 WHERE id='media_hp_keeper_hero' AND alt_text='Cutiuță muzicală Harry Potter I am a Keeper';
UPDATE schema_metadata SET value='95',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE key='schema_version';
