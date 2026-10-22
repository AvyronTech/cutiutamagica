INSERT OR IGNORE INTO sales_channels(id,code,name,channel_type,connection_mode,status,capabilities_json) VALUES
 ('channel_google_merchant','google_merchant','Google Merchant Center','marketplace','catalog_feed','setup_required','["catalog_feed"]'),
 ('channel_okazii','okazii','Okazii.ro','marketplace','manual_import','setup_required','["manual_listings"]'),
 ('channel_vinted','vinted','Vinted','marketplace','manual_import','setup_required','["manual_listings"]');
CREATE TABLE sales_channel_profiles (
 code TEXT PRIMARY KEY REFERENCES sales_channels(code), account_url TEXT NOT NULL DEFAULT '',
 seller_id TEXT NOT NULL DEFAULT '', data_source_id TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1,
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE product_channel_drafts (
 product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 channel_code TEXT NOT NULL REFERENCES sales_channels(code),
 title TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
 listing_url TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','awaiting_publication','published_manual')),
 version INTEGER NOT NULL DEFAULT 1, published_catalog_hash TEXT, published_at TEXT,
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 PRIMARY KEY(product_id,channel_code)
);
CREATE TABLE channel_publication_requests (
 id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id), channel_code TEXT NOT NULL REFERENCES sales_channels(code),
 draft_version INTEGER NOT NULL, catalog_hash TEXT NOT NULL, snapshot_json TEXT NOT NULL CHECK(json_valid(snapshot_json)),
 status TEXT NOT NULL DEFAULT 'awaiting_publication' CHECK(status IN ('awaiting_publication','completed_manual','cancelled')),
 requested_by TEXT REFERENCES admin_users(id), completed_by TEXT REFERENCES admin_users(id),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), completed_at TEXT,
 UNIQUE(product_id,channel_code,draft_version,catalog_hash)
);
INSERT OR IGNORE INTO provider_configurations(id,provider,capability,environment,secret_binding_names_json,settings_json,status)
 VALUES('provider_netopia_production','netopia','payments','production','["NETOPIA_API_KEY"]','{"activation":"requires_sandbox_and_webhook_validation"}','setup_required');
UPDATE schema_metadata SET value='23' WHERE key='schema_version';
