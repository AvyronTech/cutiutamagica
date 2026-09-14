PRAGMA foreign_keys = ON;

CREATE TABLE schema_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT INTO schema_metadata (key, value) VALUES
  ('schema_version', '1'),
  ('money_unit', 'bani'),
  ('time_standard', 'UTC');

CREATE TABLE sales_channels (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('website', 'marketplace', 'social', 'assisted')),
  connection_mode TEXT NOT NULL CHECK (connection_mode IN ('native', 'api', 'catalog_feed', 'manual_import', 'assisted', 'disabled')),
  status TEXT NOT NULL DEFAULT 'disabled' CHECK (status IN ('active', 'degraded', 'disabled', 'setup_required')),
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (length(currency) = 3),
  stock_buffer INTEGER NOT NULL DEFAULT 0 CHECK (stock_buffer >= 0),
  capabilities_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(capabilities_json)),
  settings_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(settings_json)),
  last_healthcheck_at TEXT,
  last_healthcheck_status TEXT CHECK (last_healthcheck_status IS NULL OR last_healthcheck_status IN ('ok', 'warning', 'error')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE admin_users (
  id TEXT PRIMARY KEY,
  external_subject TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended')),
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  system_role INTEGER NOT NULL DEFAULT 1 CHECK (system_role IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL
);

CREATE TABLE role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE admin_user_roles (
  admin_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  assigned_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (admin_user_id, role_id)
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  actor_admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  actor_label TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  request_id TEXT,
  channel_id TEXT REFERENCES sales_channels(id) ON DELETE SET NULL,
  before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
  after_json TEXT CHECK (after_json IS NULL OR json_valid(after_json)),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TRIGGER audit_log_immutable_update
BEFORE UPDATE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'AUDIT_LOG_IMMUTABLE');
END;

CREATE TRIGGER audit_log_immutable_delete
BEFORE DELETE ON audit_log
BEGIN
  SELECT RAISE(ABORT, 'AUDIT_LOG_IMMUTABLE');
END;

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  account_subject TEXT UNIQUE,
  email TEXT COLLATE NOCASE,
  email_normalized TEXT COLLATE NOCASE,
  phone_e164 TEXT,
  full_name TEXT,
  customer_type TEXT NOT NULL DEFAULT 'guest' CHECK (customer_type IN ('guest', 'registered', 'business')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'anonymized')),
  first_order_at TEXT,
  last_order_at TEXT,
  order_count INTEGER NOT NULL DEFAULT 0 CHECK (order_count >= 0),
  lifetime_value_bani INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_value_bani >= 0),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX customers_email_normalized_unique
ON customers(email_normalized)
WHERE email_normalized IS NOT NULL AND status != 'anonymized';

CREATE INDEX customers_phone_idx ON customers(phone_e164) WHERE phone_e164 IS NOT NULL;

CREATE TABLE customer_addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT,
  full_name TEXT NOT NULL,
  company_name TEXT,
  tax_id TEXT,
  phone_e164 TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  county TEXT NOT NULL,
  postal_code TEXT,
  country_code TEXT NOT NULL DEFAULT 'RO' CHECK (length(country_code) = 2),
  pickup_point_provider TEXT,
  pickup_point_id TEXT,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX customer_addresses_customer_idx ON customer_addresses(customer_id, is_default DESC);

CREATE TABLE consent_events (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  subject_email_hash TEXT,
  purpose TEXT NOT NULL,
  channel TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('granted', 'withdrawn')),
  policy_version TEXT NOT NULL,
  source TEXT NOT NULL,
  request_id TEXT,
  occurred_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX consent_events_subject_idx ON consent_events(customer_id, purpose, channel, occurred_at DESC);

CREATE TABLE melodies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  composer TEXT,
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  preview_r2_key TEXT,
  rights_status TEXT NOT NULL DEFAULT 'review_required' CHECK (rights_status IN ('review_required', 'cleared', 'restricted', 'expired')),
  rights_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL COLLATE NOCASE UNIQUE,
  product_type TEXT NOT NULL DEFAULT 'music_box' CHECK (product_type = 'music_box'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  name TEXT NOT NULL,
  tagline TEXT,
  short_description TEXT,
  description TEXT,
  story TEXT,
  category TEXT NOT NULL,
  brand TEXT NOT NULL DEFAULT 'Cutiuta Magica',
  mechanism_type TEXT NOT NULL DEFAULT 'manual_crank' CHECK (mechanism_type IN ('manual_crank', 'spring', 'digital', 'other')),
  material TEXT,
  dimensions_text TEXT,
  weight_g INTEGER CHECK (weight_g IS NULL OR weight_g > 0),
  tax_class TEXT NOT NULL DEFAULT 'review_required' CHECK (tax_class IN ('review_required', 'standard', 'reduced', 'exempt')),
  tax_rate_bps INTEGER NOT NULL DEFAULT 0 CHECK (tax_rate_bps BETWEEN 0 AND 10000),
  rights_status TEXT NOT NULL DEFAULT 'review_required' CHECK (rights_status IN ('review_required', 'cleared', 'restricted', 'expired')),
  rights_notes TEXT,
  seo_title TEXT,
  seo_description TEXT,
  search_terms TEXT,
  published_at TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX products_status_updated_idx ON products(status, updated_at DESC);
CREATE INDEX products_category_status_idx ON products(category, status);
CREATE INDEX products_rights_status_idx ON products(rights_status, status);

CREATE TABLE product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL COLLATE NOCASE UNIQUE,
  ean_gtin TEXT UNIQUE,
  mpn TEXT,
  name TEXT NOT NULL DEFAULT 'Standard',
  melody_id TEXT REFERENCES melodies(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  inventory_policy TEXT NOT NULL DEFAULT 'deny' CHECK (inventory_policy IN ('deny', 'continue', 'untracked')),
  cost_bani INTEGER CHECK (cost_bani IS NULL OR cost_bani >= 0),
  weight_g INTEGER CHECK (weight_g IS NULL OR weight_g > 0),
  attributes_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(attributes_json)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX product_variants_product_idx ON product_variants(product_id, status, sort_order);
CREATE INDEX product_variants_melody_idx ON product_variants(melody_id) WHERE melody_id IS NOT NULL;

CREATE TABLE product_melodies (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  melody_id TEXT NOT NULL REFERENCES melodies(id) ON DELETE RESTRICT,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, melody_id)
);

CREATE TABLE product_media (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'audio', 'video', 'spin_360', 'model_3d', 'document')),
  r2_key TEXT,
  source_url TEXT,
  poster_r2_key TEXT,
  alt_text TEXT,
  mime_type TEXT,
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  checksum_sha256 TEXT,
  rights_status TEXT NOT NULL DEFAULT 'review_required' CHECK (rights_status IN ('review_required', 'cleared', 'restricted', 'expired')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (r2_key IS NOT NULL OR source_url IS NOT NULL)
);

CREATE INDEX product_media_product_idx ON product_media(product_id, sort_order);
CREATE UNIQUE INDEX product_media_primary_unique
ON product_media(product_id)
WHERE is_primary = 1 AND variant_id IS NULL;

CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL COLLATE NOCASE UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  collection_type TEXT NOT NULL DEFAULT 'manual' CHECK (collection_type IN ('manual', 'occasion', 'theme', 'mechanism', 'seasonal')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  seo_title TEXT,
  seo_description TEXT,
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE product_collections (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, product_id)
);

CREATE TABLE price_lists (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (length(currency) = 3),
  channel_id TEXT REFERENCES sales_channels(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  starts_at TEXT,
  ends_at TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE price_list_items (
  id TEXT PRIMARY KEY,
  price_list_id TEXT NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  price_bani INTEGER NOT NULL CHECK (price_bani >= 0),
  compare_at_bani INTEGER CHECK (compare_at_bani IS NULL OR compare_at_bani >= price_bani),
  min_quantity INTEGER NOT NULL DEFAULT 1 CHECK (min_quantity > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (price_list_id, variant_id, min_quantity)
);

CREATE INDEX price_list_items_variant_idx ON price_list_items(variant_id, price_list_id, min_quantity DESC);

CREATE TABLE stock_locations (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'warehouse' CHECK (location_type IN ('warehouse', 'workshop', 'virtual')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE inventory_levels (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  location_id TEXT NOT NULL REFERENCES stock_locations(id) ON DELETE RESTRICT,
  on_hand_quantity INTEGER NOT NULL DEFAULT 0 CHECK (on_hand_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  safety_stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (safety_stock_quantity >= 0),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (variant_id, location_id),
  CHECK (reserved_quantity <= on_hand_quantity)
);

CREATE INDEX inventory_levels_location_idx ON inventory_levels(location_id, variant_id);

CREATE TABLE inventory_reservations (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  location_id TEXT NOT NULL REFERENCES stock_locations(id) ON DELETE RESTRICT,
  cart_id TEXT,
  order_id TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'consumed', 'released', 'expired', 'cancelled')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (cart_id IS NOT NULL OR order_id IS NOT NULL)
);

CREATE INDEX inventory_reservations_active_idx ON inventory_reservations(status, expires_at);
CREATE INDEX inventory_reservations_order_idx ON inventory_reservations(order_id) WHERE order_id IS NOT NULL;

CREATE TRIGGER inventory_reservations_validate_insert
BEFORE INSERT ON inventory_reservations
WHEN NEW.status = 'active'
  AND (SELECT inventory_policy FROM product_variants WHERE id = NEW.variant_id) = 'deny'
BEGIN
  SELECT (CASE
    WHEN COALESCE((
      SELECT on_hand_quantity - reserved_quantity - safety_stock_quantity
      FROM inventory_levels
      WHERE variant_id = NEW.variant_id AND location_id = NEW.location_id
    ), -1) < NEW.quantity
    THEN RAISE(ABORT, 'INSUFFICIENT_STOCK')
  END);
END;

CREATE TRIGGER inventory_reservations_apply_insert
AFTER INSERT ON inventory_reservations
WHEN NEW.status = 'active'
BEGIN
  UPDATE inventory_levels
  SET reserved_quantity = reserved_quantity + NEW.quantity,
      version = version + 1,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE variant_id = NEW.variant_id AND location_id = NEW.location_id;
END;

CREATE TRIGGER inventory_reservations_prevent_active_quantity_change
BEFORE UPDATE OF quantity, variant_id, location_id ON inventory_reservations
WHEN OLD.status = 'active'
BEGIN
  SELECT RAISE(ABORT, 'ACTIVE_RESERVATION_IMMUTABLE');
END;

CREATE TRIGGER inventory_reservations_release
BEFORE UPDATE OF status ON inventory_reservations
WHEN OLD.status = 'active' AND NEW.status IN ('released', 'expired', 'cancelled')
BEGIN
  UPDATE inventory_levels
  SET reserved_quantity = reserved_quantity - OLD.quantity,
      version = version + 1,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE variant_id = OLD.variant_id AND location_id = OLD.location_id;
END;

CREATE TRIGGER inventory_reservations_consume
BEFORE UPDATE OF status ON inventory_reservations
WHEN OLD.status = 'active' AND NEW.status = 'consumed'
BEGIN
  UPDATE inventory_levels
  SET on_hand_quantity = on_hand_quantity - OLD.quantity,
      reserved_quantity = reserved_quantity - OLD.quantity,
      version = version + 1,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE variant_id = OLD.variant_id AND location_id = OLD.location_id;
END;

CREATE TRIGGER inventory_reservations_prevent_reactivation
BEFORE UPDATE OF status ON inventory_reservations
WHEN OLD.status != 'active' AND NEW.status = 'active'
BEGIN
  SELECT RAISE(ABORT, 'RESERVATION_CANNOT_BE_REACTIVATED');
END;

CREATE TRIGGER inventory_reservations_release_on_delete
BEFORE DELETE ON inventory_reservations
WHEN OLD.status = 'active'
BEGIN
  UPDATE inventory_levels
  SET reserved_quantity = reserved_quantity - OLD.quantity,
      version = version + 1,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE variant_id = OLD.variant_id AND location_id = OLD.location_id;
END;

CREATE TABLE inventory_movements (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  location_id TEXT NOT NULL REFERENCES stock_locations(id) ON DELETE RESTRICT,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('receipt', 'sale', 'return', 'adjustment', 'transfer_in', 'transfer_out', 'damage')),
  quantity_delta INTEGER NOT NULL CHECK (quantity_delta != 0),
  reference_type TEXT,
  reference_id TEXT,
  reason TEXT NOT NULL,
  actor_admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX inventory_movements_variant_idx ON inventory_movements(variant_id, created_at DESC);

CREATE TRIGGER inventory_movements_immutable_update
BEFORE UPDATE ON inventory_movements
BEGIN
  SELECT RAISE(ABORT, 'INVENTORY_MOVEMENT_IMMUTABLE');
END;

CREATE TRIGGER inventory_movements_immutable_delete
BEFORE DELETE ON inventory_movements
BEGIN
  SELECT RAISE(ABORT, 'INVENTORY_MOVEMENT_IMMUTABLE');
END;

CREATE TABLE carts (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  channel_id TEXT NOT NULL REFERENCES sales_channels(id) ON DELETE RESTRICT,
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (length(currency) = 3),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'abandoned', 'expired')),
  signed_token_hash TEXT UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX carts_status_expiry_idx ON carts(status, expires_at);

CREATE TABLE cart_items (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 20),
  personalization_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(personalization_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (cart_id, variant_id, personalization_json)
);

CREATE TABLE promotions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  promotion_type TEXT NOT NULL CHECK (promotion_type IN ('percent', 'fixed', 'free_shipping', 'tiered', 'buy_x_get_y', 'gift')),
  value INTEGER NOT NULL DEFAULT 0 CHECK (value >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'ended', 'archived')),
  priority INTEGER NOT NULL DEFAULT 0,
  stack_mode TEXT NOT NULL DEFAULT 'exclusive' CHECK (stack_mode IN ('exclusive', 'stackable')),
  starts_at TEXT,
  ends_at TEXT,
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  per_customer_limit INTEGER CHECK (per_customer_limit IS NULL OR per_customer_limit > 0),
  budget_bani INTEGER CHECK (budget_bani IS NULL OR budget_bani >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX promotions_status_window_idx ON promotions(status, starts_at, ends_at, priority DESC);

CREATE TABLE promotion_codes (
  id TEXT PRIMARY KEY,
  promotion_id TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  code TEXT NOT NULL COLLATE NOCASE UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'consumed')),
  assigned_customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE promotion_rules (
  id TEXT PRIMARY KEY,
  promotion_id TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('min_subtotal', 'min_quantity', 'customer_type', 'shipping_method', 'country', 'first_order', 'channel')),
  operator TEXT NOT NULL CHECK (operator IN ('eq', 'neq', 'gte', 'lte', 'in', 'not_in')),
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE promotion_targets (
  id TEXT PRIMARY KEY,
  promotion_id TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'product', 'variant', 'collection', 'channel')),
  target_id TEXT,
  exclusion INTEGER NOT NULL DEFAULT 0 CHECK (exclusion IN (0, 1)),
  UNIQUE (promotion_id, target_type, target_id, exclusion)
);

CREATE TABLE promotion_redemptions (
  id TEXT PRIMARY KEY,
  promotion_id TEXT NOT NULL REFERENCES promotions(id) ON DELETE RESTRICT,
  promotion_code_id TEXT REFERENCES promotion_codes(id) ON DELETE SET NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  order_id TEXT,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'consumed', 'released')),
  discount_bani INTEGER NOT NULL CHECK (discount_bani >= 0),
  reserved_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  consumed_at TEXT,
  released_at TEXT
);

CREATE INDEX promotion_redemptions_customer_idx ON promotion_redemptions(customer_id, promotion_id, status);

CREATE TABLE shipping_methods (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  provider TEXT,
  method_type TEXT NOT NULL CHECK (method_type IN ('home_delivery', 'locker', 'pickup')),
  status TEXT NOT NULL DEFAULT 'setup_required' CHECK (status IN ('active', 'inactive', 'setup_required')),
  settings_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(settings_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE shipping_zones (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  countries_json TEXT NOT NULL DEFAULT '["RO"]' CHECK (json_valid(countries_json)),
  counties_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(counties_json)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE shipping_rates (
  id TEXT PRIMARY KEY,
  shipping_method_id TEXT NOT NULL REFERENCES shipping_methods(id) ON DELETE CASCADE,
  shipping_zone_id TEXT NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
  price_bani INTEGER NOT NULL CHECK (price_bani >= 0),
  free_over_bani INTEGER CHECK (free_over_bani IS NULL OR free_over_bani >= 0),
  min_weight_g INTEGER CHECK (min_weight_g IS NULL OR min_weight_g >= 0),
  max_weight_g INTEGER CHECK (max_weight_g IS NULL OR max_weight_g >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  starts_at TEXT,
  ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (max_weight_g IS NULL OR min_weight_g IS NULL OR max_weight_g >= min_weight_g)
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  public_token TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  channel_id TEXT NOT NULL REFERENCES sales_channels(id) ON DELETE RESTRICT,
  external_order_id TEXT,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  order_status TEXT NOT NULL DEFAULT 'pending' CHECK (order_status IN ('draft', 'pending', 'confirmed', 'processing', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'authorized', 'paid', 'partially_refunded', 'refunded', 'failed')),
  fulfillment_status TEXT NOT NULL DEFAULT 'unfulfilled' CHECK (fulfillment_status IN ('unfulfilled', 'reserved', 'picking', 'packed', 'shipped', 'delivered', 'returned')),
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (length(currency) = 3),
  subtotal_bani INTEGER NOT NULL CHECK (subtotal_bani >= 0),
  discount_bani INTEGER NOT NULL DEFAULT 0 CHECK (discount_bani >= 0),
  shipping_bani INTEGER NOT NULL DEFAULT 0 CHECK (shipping_bani >= 0),
  tax_bani INTEGER NOT NULL DEFAULT 0 CHECK (tax_bani >= 0),
  total_bani INTEGER NOT NULL CHECK (total_bani >= 0),
  paid_bani INTEGER NOT NULL DEFAULT 0 CHECK (paid_bani >= 0),
  refunded_bani INTEGER NOT NULL DEFAULT 0 CHECK (refunded_bani >= 0),
  estimated_cost_bani INTEGER CHECK (estimated_cost_bani IS NULL OR estimated_cost_bani >= 0),
  customer_name TEXT NOT NULL,
  customer_email TEXT COLLATE NOCASE,
  customer_phone_e164 TEXT NOT NULL,
  customer_note TEXT,
  internal_note TEXT,
  placed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  confirmed_at TEXT,
  cancelled_at TEXT,
  completed_at TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (discount_bani <= subtotal_bani),
  CHECK (paid_bani <= total_bani),
  CHECK (refunded_bani <= paid_bani)
);

CREATE UNIQUE INDEX orders_channel_external_unique
ON orders(channel_id, external_order_id)
WHERE external_order_id IS NOT NULL;
CREATE INDEX orders_created_idx ON orders(created_at DESC);
CREATE INDEX orders_status_idx ON orders(order_status, fulfillment_status, payment_status, updated_at DESC);
CREATE INDEX orders_customer_idx ON orders(customer_id, created_at DESC) WHERE customer_id IS NOT NULL;
CREATE INDEX orders_channel_idx ON orders(channel_id, created_at DESC);

CREATE TABLE order_addresses (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  address_type TEXT NOT NULL CHECK (address_type IN ('shipping', 'billing')),
  full_name TEXT NOT NULL,
  company_name TEXT,
  tax_id TEXT,
  phone_e164 TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  county TEXT,
  postal_code TEXT,
  country_code TEXT NOT NULL DEFAULT 'RO' CHECK (length(country_code) = 2),
  pickup_point_provider TEXT,
  pickup_point_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (order_id, address_type)
);

CREATE TABLE order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  variant_name TEXT,
  melody_name TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_bani INTEGER NOT NULL CHECK (unit_price_bani >= 0),
  unit_discount_bani INTEGER NOT NULL DEFAULT 0 CHECK (unit_discount_bani >= 0),
  tax_rate_bps INTEGER NOT NULL CHECK (tax_rate_bps BETWEEN 0 AND 10000),
  line_subtotal_bani INTEGER NOT NULL CHECK (line_subtotal_bani >= 0),
  line_discount_bani INTEGER NOT NULL DEFAULT 0 CHECK (line_discount_bani >= 0),
  line_total_bani INTEGER NOT NULL CHECK (line_total_bani >= 0),
  unit_cost_bani INTEGER CHECK (unit_cost_bani IS NULL OR unit_cost_bani >= 0),
  personalization_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(personalization_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (unit_discount_bani <= unit_price_bani),
  CHECK (line_discount_bani <= line_subtotal_bani)
);

CREATE INDEX order_items_order_idx ON order_items(order_id);
CREATE INDEX order_items_product_idx ON order_items(product_id, created_at DESC) WHERE product_id IS NOT NULL;

CREATE TABLE order_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'admin', 'customer', 'integration')),
  actor_id TEXT,
  message TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX order_events_order_idx ON order_events(order_id, created_at DESC);

CREATE TRIGGER order_events_immutable_update
BEFORE UPDATE ON order_events
BEGIN
  SELECT RAISE(ABORT, 'ORDER_EVENT_IMMUTABLE');
END;

CREATE TRIGGER order_events_immutable_delete
BEFORE DELETE ON order_events
BEGIN
  SELECT RAISE(ABORT, 'ORDER_EVENT_IMMUTABLE');
END;

CREATE TABLE order_notes (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  author_admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'customer')),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX order_notes_order_idx ON order_notes(order_id, created_at DESC);

CREATE TABLE payment_attempts (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('card', 'cash_on_delivery', 'bank_transfer', 'wallet', 'gift_card', 'store_credit')),
  external_payment_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'pending', 'authorized', 'captured', 'failed', 'cancelled', 'expired')),
  amount_bani INTEGER NOT NULL CHECK (amount_bani >= 0),
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (length(currency) = 3),
  failure_code TEXT,
  failure_message TEXT,
  provider_metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(provider_metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX payment_attempts_provider_external_unique
ON payment_attempts(provider, external_payment_id)
WHERE external_payment_id IS NOT NULL;
CREATE INDEX payment_attempts_order_idx ON payment_attempts(order_id, created_at DESC);

CREATE TABLE refunds (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  payment_attempt_id TEXT REFERENCES payment_attempts(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  external_refund_id TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
  amount_bani INTEGER NOT NULL CHECK (amount_bani > 0),
  reason TEXT NOT NULL,
  created_by_admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX refunds_order_idx ON refunds(order_id, created_at DESC);

CREATE TABLE shipments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  shipping_method_id TEXT REFERENCES shipping_methods(id) ON DELETE SET NULL,
  provider TEXT,
  external_shipment_id TEXT,
  awb TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'label_created', 'picked_up', 'in_transit', 'delivered', 'exception', 'cancelled', 'returned')),
  tracking_url TEXT,
  label_r2_key TEXT,
  parcel_count INTEGER NOT NULL DEFAULT 1 CHECK (parcel_count > 0),
  weight_g INTEGER CHECK (weight_g IS NULL OR weight_g > 0),
  shipped_at TEXT,
  delivered_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX shipments_provider_external_unique
ON shipments(provider, external_shipment_id)
WHERE external_shipment_id IS NOT NULL;
CREATE INDEX shipments_order_idx ON shipments(order_id, created_at DESC);
CREATE INDEX shipments_awb_idx ON shipments(awb) WHERE awb IS NOT NULL;

CREATE TABLE shipment_events (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  provider_event_id TEXT,
  status TEXT NOT NULL,
  description TEXT,
  location TEXT,
  occurred_at TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json))
);

CREATE UNIQUE INDEX shipment_events_provider_event_unique
ON shipment_events(shipment_id, provider_event_id)
WHERE provider_event_id IS NOT NULL;

CREATE TABLE idempotency_keys (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_status INTEGER,
  response_json TEXT CHECK (response_json IS NULL OR json_valid(response_json)),
  resource_type TEXT,
  resource_id TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (scope, idempotency_key)
);

CREATE INDEX idempotency_keys_expiry_idx ON idempotency_keys(expires_at);

CREATE TABLE outbox_events (
  id TEXT PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  destination TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'processing', 'completed', 'failed', 'dead_letter')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  locked_at TEXT,
  completed_at TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (aggregate_type, aggregate_id, event_type, destination)
);

CREATE INDEX outbox_events_dispatch_idx ON outbox_events(status, available_at, created_at);

PRAGMA optimize;
