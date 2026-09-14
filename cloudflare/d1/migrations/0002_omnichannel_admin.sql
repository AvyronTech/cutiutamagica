PRAGMA foreign_keys = ON;

CREATE TABLE integration_accounts (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  account_label TEXT NOT NULL,
  external_account_id TEXT,
  status TEXT NOT NULL DEFAULT 'setup_required' CHECK (status IN ('setup_required', 'connected', 'degraded', 'disabled', 'revoked')),
  secret_reference TEXT,
  config_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(config_json)),
  capabilities_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(capabilities_json)),
  last_healthcheck_at TEXT,
  last_success_at TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (channel_id, provider, environment, external_account_id)
);

CREATE INDEX integration_accounts_health_idx
ON integration_accounts(status, last_healthcheck_at);

CREATE TABLE channel_listings (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  integration_account_id TEXT REFERENCES integration_accounts(id) ON DELETE SET NULL,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE CASCADE,
  external_listing_id TEXT,
  external_product_id TEXT,
  external_offer_id TEXT,
  external_category_id TEXT,
  listing_url TEXT,
  title_override TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'active', 'paused', 'rejected', 'archived', 'error')),
  published_quantity INTEGER CHECK (published_quantity IS NULL OR published_quantity >= 0),
  last_export_hash TEXT,
  last_synced_at TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (channel_id, product_id, variant_id)
);

CREATE UNIQUE INDEX channel_listings_external_unique
ON channel_listings(channel_id, external_listing_id)
WHERE external_listing_id IS NOT NULL;
CREATE INDEX channel_listings_sync_idx ON channel_listings(channel_id, status, last_synced_at);
CREATE INDEX channel_listings_product_idx ON channel_listings(product_id, variant_id);

CREATE TABLE channel_price_overrides (
  id TEXT PRIMARY KEY,
  channel_listing_id TEXT NOT NULL REFERENCES channel_listings(id) ON DELETE CASCADE,
  price_bani INTEGER NOT NULL CHECK (price_bani >= 0),
  compare_at_bani INTEGER CHECK (compare_at_bani IS NULL OR compare_at_bani >= price_bani),
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (length(currency) = 3),
  starts_at TEXT,
  ends_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'scheduled', 'ended')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX channel_price_overrides_listing_idx
ON channel_price_overrides(channel_listing_id, status, starts_at, ends_at);

CREATE TABLE external_mappings (
  id TEXT PRIMARY KEY,
  integration_account_id TEXT NOT NULL REFERENCES integration_accounts(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'variant', 'order', 'shipment', 'customer', 'category', 'promotion')),
  internal_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  external_parent_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (integration_account_id, entity_type, internal_id),
  UNIQUE (integration_account_id, entity_type, external_id)
);

CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,
  integration_account_id TEXT REFERENCES integration_accounts(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  external_event_id TEXT,
  event_type TEXT NOT NULL,
  signature_valid INTEGER NOT NULL DEFAULT 0 CHECK (signature_valid IN (0, 1)),
  payload_hash TEXT NOT NULL,
  payload_json TEXT CHECK (payload_json IS NULL OR json_valid(payload_json)),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'processed', 'ignored', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  error_code TEXT,
  error_message TEXT,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  processed_at TEXT
);

CREATE UNIQUE INDEX webhook_events_provider_external_unique
ON webhook_events(provider, external_event_id)
WHERE external_event_id IS NOT NULL;
CREATE UNIQUE INDEX webhook_events_provider_hash_unique
ON webhook_events(provider, payload_hash, event_type);
CREATE INDEX webhook_events_status_idx ON webhook_events(status, received_at);

CREATE TABLE sync_jobs (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  integration_account_id TEXT REFERENCES integration_accounts(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('healthcheck', 'import_orders', 'export_catalog', 'export_inventory', 'export_prices', 'export_fulfillment', 'reconcile', 'manual_import')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound', 'bidirectional', 'internal')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'succeeded', 'partial', 'failed', 'cancelled')),
  requested_by TEXT NOT NULL DEFAULT 'system',
  cursor TEXT,
  input_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(input_json)),
  result_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(result_json)),
  records_seen INTEGER NOT NULL DEFAULT 0 CHECK (records_seen >= 0),
  records_changed INTEGER NOT NULL DEFAULT 0 CHECK (records_changed >= 0),
  records_failed INTEGER NOT NULL DEFAULT 0 CHECK (records_failed >= 0),
  started_at TEXT,
  finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX sync_jobs_channel_idx ON sync_jobs(channel_id, created_at DESC);
CREATE INDEX sync_jobs_status_idx ON sync_jobs(status, created_at);

CREATE TABLE sync_failures (
  id TEXT PRIMARY KEY,
  sync_job_id TEXT NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  entity_type TEXT,
  entity_id TEXT,
  external_id TEXT,
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
  error_code TEXT NOT NULL,
  error_message TEXT NOT NULL,
  retryable INTEGER NOT NULL DEFAULT 0 CHECK (retryable IN (0, 1)),
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  next_retry_at TEXT,
  resolved_at TEXT,
  resolution_note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX sync_failures_open_idx
ON sync_failures(severity, next_retry_at, created_at)
WHERE resolved_at IS NULL;

CREATE TABLE import_batches (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL REFERENCES sales_channels(id) ON DELETE RESTRICT,
  file_name TEXT,
  file_checksum TEXT,
  r2_key TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'validating', 'ready', 'importing', 'completed', 'failed', 'cancelled')),
  uploaded_by_admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  row_count INTEGER NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  valid_count INTEGER NOT NULL DEFAULT 0 CHECK (valid_count >= 0),
  invalid_count INTEGER NOT NULL DEFAULT 0 CHECK (invalid_count >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT
);

CREATE UNIQUE INDEX import_batches_checksum_unique
ON import_batches(channel_id, file_checksum)
WHERE file_checksum IS NOT NULL;

CREATE TABLE import_rows (
  id TEXT PRIMARY KEY,
  import_batch_id TEXT NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL CHECK (row_number > 0),
  source_json TEXT NOT NULL CHECK (json_valid(source_json)),
  normalized_json TEXT CHECK (normalized_json IS NULL OR json_valid(normalized_json)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'valid', 'invalid', 'imported', 'skipped')),
  error_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(error_json)),
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (import_batch_id, row_number)
);

CREATE INDEX import_rows_status_idx ON import_rows(import_batch_id, status, row_number);

CREATE TABLE admin_notifications (
  id TEXT PRIMARY KEY,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('order', 'inventory', 'integration', 'payment', 'shipping', 'security', 'target', 'system')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'error', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  channel_id TEXT REFERENCES sales_channels(id) ON DELETE SET NULL,
  deduplication_key TEXT UNIQUE,
  read_at TEXT,
  dismissed_at TEXT,
  action_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT
);

CREATE INDEX admin_notifications_unread_idx
ON admin_notifications(severity, created_at DESC)
WHERE read_at IS NULL AND dismissed_at IS NULL;

CREATE TABLE order_tags (
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_by_admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (order_id, tag)
);

CREATE TABLE saved_admin_views (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('orders', 'products', 'inventory', 'customers', 'integrations', 'reports')),
  name TEXT NOT NULL,
  filters_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(filters_json)),
  columns_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(columns_json)),
  sort_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(sort_json)),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (admin_user_id, resource_type, name)
);

CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_item_id TEXT REFERENCES order_items(id) ON DELETE SET NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified_purchase', 'manually_verified')),
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'published', 'rejected', 'flagged')),
  source_channel_id TEXT REFERENCES sales_channels(id) ON DELETE SET NULL,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX reviews_product_public_idx
ON reviews(product_id, published_at DESC)
WHERE moderation_status = 'published';

CREATE TABLE review_media (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  r2_key TEXT NOT NULL,
  alt_text TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'published', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE landing_pages (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL COLLATE NOCASE UNIQUE,
  page_type TEXT NOT NULL CHECK (page_type IN ('collection', 'occasion', 'guide', 'campaign', 'policy')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published', 'archived')),
  title TEXT NOT NULL,
  excerpt TEXT,
  body_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(body_json)),
  seo_title TEXT,
  seo_description TEXT,
  canonical_path TEXT,
  noindex INTEGER NOT NULL DEFAULT 0 CHECK (noindex IN (0, 1)),
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX landing_pages_public_idx ON landing_pages(status, page_type, updated_at DESC);

CREATE TABLE redirects (
  id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL UNIQUE,
  destination_path TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 301 CHECK (status_code IN (301, 302, 307, 308)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  hit_count INTEGER NOT NULL DEFAULT 0 CHECK (hit_count >= 0),
  last_hit_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (source_path != destination_path)
);

CREATE TABLE faq_items (
  id TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL DEFAULT 'global' CHECK (scope_type IN ('global', 'product', 'collection', 'landing_page')),
  scope_id TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX faq_items_scope_idx ON faq_items(scope_type, scope_id, status, sort_order);

CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  validation_status TEXT NOT NULL DEFAULT 'review_required' CHECK (validation_status IN ('review_required', 'verified')),
  updated_by_admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE gift_cards (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  masked_code TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (length(currency) = 3),
  initial_balance_bani INTEGER NOT NULL CHECK (initial_balance_bani > 0),
  current_balance_bani INTEGER NOT NULL CHECK (current_balance_bani >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'expired', 'depleted')),
  issued_order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  assigned_customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (current_balance_bani <= initial_balance_bani)
);

CREATE TABLE gift_card_transactions (
  id TEXT PRIMARY KEY,
  gift_card_id TEXT NOT NULL REFERENCES gift_cards(id) ON DELETE RESTRICT,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('issue', 'authorize', 'capture', 'release', 'refund', 'adjustment')),
  amount_bani INTEGER NOT NULL CHECK (amount_bani != 0),
  balance_after_bani INTEGER NOT NULL CHECK (balance_after_bani >= 0),
  idempotency_key TEXT NOT NULL UNIQUE,
  actor_admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE daily_sales_metrics (
  metric_date TEXT NOT NULL,
  channel_id TEXT NOT NULL REFERENCES sales_channels(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (length(currency) = 3),
  orders_count INTEGER NOT NULL DEFAULT 0 CHECK (orders_count >= 0),
  units_count INTEGER NOT NULL DEFAULT 0 CHECK (units_count >= 0),
  gross_revenue_bani INTEGER NOT NULL DEFAULT 0,
  discount_bani INTEGER NOT NULL DEFAULT 0,
  shipping_bani INTEGER NOT NULL DEFAULT 0,
  refunded_bani INTEGER NOT NULL DEFAULT 0,
  estimated_cost_bani INTEGER NOT NULL DEFAULT 0,
  computed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (metric_date, channel_id, currency)
);

CREATE TRIGGER inventory_reservations_validate_order_insert
BEFORE INSERT ON inventory_reservations
WHEN NEW.order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM orders WHERE id = NEW.order_id)
BEGIN
  SELECT RAISE(ABORT, 'RESERVATION_ORDER_NOT_FOUND');
END;

CREATE TRIGGER promotion_redemptions_validate_order_insert
BEFORE INSERT ON promotion_redemptions
WHEN NEW.order_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM orders WHERE id = NEW.order_id)
BEGIN
  SELECT RAISE(ABORT, 'REDEMPTION_ORDER_NOT_FOUND');
END;

CREATE VIEW v_inventory_available AS
SELECT
  il.id AS inventory_level_id,
  il.variant_id,
  pv.sku,
  pv.product_id,
  p.slug,
  p.name AS product_name,
  sl.id AS location_id,
  sl.code AS location_code,
  il.on_hand_quantity,
  il.reserved_quantity,
  il.safety_stock_quantity,
  CASE
    WHEN pv.inventory_policy = 'untracked' THEN NULL
    ELSE MAX(0, il.on_hand_quantity - il.reserved_quantity - il.safety_stock_quantity)
  END AS available_quantity,
  pv.inventory_policy,
  il.updated_at
FROM inventory_levels il
JOIN product_variants pv ON pv.id = il.variant_id
JOIN products p ON p.id = pv.product_id
JOIN stock_locations sl ON sl.id = il.location_id;

CREATE VIEW v_admin_product_catalog AS
SELECT
  p.id,
  p.slug,
  p.name,
  p.category,
  p.status,
  p.mechanism_type,
  p.rights_status,
  p.updated_at,
  COUNT(DISTINCT pv.id) AS variant_count,
  MIN(pli.price_bani) AS min_price_bani,
  MAX(pli.price_bani) AS max_price_bani,
  SUM(CASE WHEN via.available_quantity IS NULL THEN 0 ELSE via.available_quantity END) AS available_quantity,
  MAX(CASE WHEN pv.inventory_policy = 'untracked' THEN 1 ELSE 0 END) AS has_untracked_inventory,
  COUNT(DISTINCT cl.id) AS listing_count
FROM products p
LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.status = 'active'
LEFT JOIN price_list_items pli ON pli.variant_id = pv.id
LEFT JOIN v_inventory_available via ON via.variant_id = pv.id
LEFT JOIN channel_listings cl ON cl.product_id = p.id AND cl.status = 'active'
WHERE p.product_type = 'music_box'
GROUP BY p.id;

CREATE VIEW v_admin_order_list AS
SELECT
  o.id,
  o.order_number,
  o.public_token,
  o.channel_id,
  sc.name AS channel_name,
  sc.code AS channel_code,
  o.external_order_id,
  o.customer_name,
  o.customer_email,
  o.customer_phone_e164,
  o.order_status,
  o.payment_status,
  o.fulfillment_status,
  o.currency,
  o.total_bani,
  o.paid_bani,
  o.refunded_bani,
  o.placed_at,
  o.updated_at,
  COUNT(oi.id) AS line_count,
  COALESCE(SUM(oi.quantity), 0) AS units_count,
  GROUP_CONCAT(oi.product_name || ' x' || oi.quantity, ', ') AS products_summary,
  MAX(s.awb) AS awb,
  MAX(s.status) AS shipment_status
FROM orders o
JOIN sales_channels sc ON sc.id = o.channel_id
LEFT JOIN order_items oi ON oi.order_id = o.id
LEFT JOIN shipments s ON s.order_id = o.id
GROUP BY o.id;

CREATE VIEW v_admin_channel_metrics AS
SELECT
  sc.id AS channel_id,
  sc.code,
  sc.name,
  sc.channel_type,
  sc.connection_mode,
  sc.status,
  sc.last_healthcheck_at,
  sc.last_healthcheck_status,
  COUNT(o.id) AS orders_count,
  COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN o.total_bani ELSE 0 END), 0) AS revenue_bani,
  COALESCE(SUM(CASE WHEN o.order_status != 'cancelled' THEN 1 ELSE 0 END), 0) AS valid_orders_count,
  MAX(o.created_at) AS last_order_at,
  (SELECT COUNT(*) FROM channel_listings cl WHERE cl.channel_id = sc.id AND cl.status = 'active') AS active_listings,
  (SELECT COUNT(*) FROM sync_failures sf JOIN sync_jobs sj ON sj.id = sf.sync_job_id WHERE sj.channel_id = sc.id AND sf.resolved_at IS NULL) AS open_sync_failures
FROM sales_channels sc
LEFT JOIN orders o ON o.channel_id = sc.id
GROUP BY sc.id;

CREATE VIEW v_admin_monthly_sales AS
SELECT
  substr(o.placed_at, 1, 7) AS month,
  o.channel_id,
  sc.name AS channel_name,
  COUNT(DISTINCT o.id) AS orders_count,
  COALESCE(SUM(oi.quantity), 0) AS units_count,
  SUM(CASE WHEN o.order_status != 'cancelled' THEN o.total_bani ELSE 0 END) AS revenue_bani,
  SUM(o.discount_bani) AS discount_bani,
  SUM(o.refunded_bani) AS refunded_bani
FROM orders o
JOIN sales_channels sc ON sc.id = o.channel_id
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY substr(o.placed_at, 1, 7), o.channel_id;

CREATE VIEW v_product_completeness AS
SELECT
  p.id AS product_id,
  p.slug,
  p.name,
  p.status,
  p.rights_status,
  (
    CASE WHEN p.short_description IS NULL OR trim(p.short_description) = '' THEN 1 ELSE 0 END +
    CASE WHEN p.description IS NULL OR trim(p.description) = '' THEN 1 ELSE 0 END +
    CASE WHEN p.material IS NULL OR trim(p.material) = '' THEN 1 ELSE 0 END +
    CASE WHEN p.weight_g IS NULL THEN 1 ELSE 0 END +
    CASE WHEN p.seo_title IS NULL OR trim(p.seo_title) = '' THEN 1 ELSE 0 END +
    CASE WHEN p.seo_description IS NULL OR trim(p.seo_description) = '' THEN 1 ELSE 0 END +
    CASE WHEN NOT EXISTS (SELECT 1 FROM product_media pm WHERE pm.product_id = p.id AND pm.media_type = 'image') THEN 1 ELSE 0 END +
    CASE WHEN NOT EXISTS (SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.status = 'active') THEN 1 ELSE 0 END
  ) AS missing_fields_count,
  p.updated_at
FROM products p
WHERE p.product_type = 'music_box';

CREATE VIEW v_admin_dashboard AS
SELECT
  (SELECT COUNT(*) FROM orders) AS orders_total,
  (SELECT COUNT(*) FROM orders WHERE order_status IN ('pending', 'confirmed', 'processing')) AS orders_open,
  (SELECT COUNT(*) FROM orders WHERE payment_status = 'failed') AS payments_failed,
  (SELECT COUNT(*) FROM orders WHERE fulfillment_status IN ('reserved', 'picking', 'packed')) AS fulfillment_open,
  (SELECT COALESCE(SUM(total_bani - refunded_bani), 0) FROM orders WHERE order_status != 'cancelled' AND placed_at >= datetime('now', '-30 days')) AS net_revenue_30d_bani,
  (SELECT COUNT(*) FROM orders WHERE placed_at >= datetime('now', '-30 days')) AS orders_30d,
  (SELECT COUNT(*) FROM products WHERE product_type = 'music_box') AS products_total,
  (SELECT COUNT(*) FROM products WHERE product_type = 'music_box' AND status = 'active') AS products_active,
  (SELECT COUNT(*) FROM v_product_completeness WHERE missing_fields_count > 0) AS products_incomplete,
  (SELECT COUNT(*) FROM sync_failures WHERE resolved_at IS NULL) AS sync_failures_open,
  (SELECT COUNT(*) FROM admin_notifications WHERE read_at IS NULL AND dismissed_at IS NULL) AS notifications_unread;

UPDATE schema_metadata
SET value = '2', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
