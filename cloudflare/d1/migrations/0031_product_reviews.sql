CREATE TABLE review_accounts (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
 display_name TEXT NOT NULL, password_hash TEXT NOT NULL, password_salt TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked')),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE review_sessions (
 token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES review_accounts(id) ON DELETE CASCADE,
 expires_at INTEGER NOT NULL
);
CREATE INDEX review_sessions_expiry ON review_sessions(expires_at);
CREATE TABLE review_rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE product_reviews (
 id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES products(id),
 account_id TEXT REFERENCES review_accounts(id), display_name TEXT NOT NULL CHECK(length(display_name) BETWEEN 2 AND 60),
 email TEXT, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
 body TEXT NOT NULL CHECK(length(body) BETWEEN 10 AND 1200), language TEXT NOT NULL CHECK(language IN ('ro','en')),
 source TEXT NOT NULL DEFAULT 'store' CHECK(source IN ('store','facebook','tiktok','emag','trendyol','vinted','olx','okazii')),
 source_url TEXT, origin TEXT NOT NULL CHECK(origin IN ('guest','account','import')),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN (0,1)),
 version INTEGER NOT NULL DEFAULT 1, moderation_note TEXT NOT NULL DEFAULT '',
 moderated_by TEXT REFERENCES admin_users(id),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 CHECK(origin!='import' OR source_url IS NOT NULL), CHECK(source='store' OR origin='import')
);
CREATE INDEX reviews_public ON product_reviews(product_id,status,created_at DESC);
CREATE INDEX reviews_moderation ON product_reviews(status,created_at DESC);
CREATE UNIQUE INDEX reviews_source_unique ON product_reviews(source,source_url) WHERE source_url IS NOT NULL;
CREATE UNIQUE INDEX reviews_account_product ON product_reviews(account_id,product_id) WHERE account_id IS NOT NULL;
CREATE UNIQUE INDEX reviews_guest_product ON product_reviews(email,product_id) WHERE origin='guest';
UPDATE products SET name=trim(replace(name,'14+','')),version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE name LIKE '%14+%';
UPDATE product_media SET title=trim(replace(title,'14+','')),alt_text=trim(replace(alt_text,'14+','')),version=version+1 WHERE media_type='image' AND (title LIKE '%14+%' OR alt_text LIKE '%14+%');
UPDATE schema_metadata SET value='31',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE key='schema_version';
