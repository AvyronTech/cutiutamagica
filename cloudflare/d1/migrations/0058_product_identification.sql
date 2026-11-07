-- Internal identifiers are permanent reservations. Existing codes remain unchanged.
CREATE TABLE product_sku_registry (
  sku TEXT PRIMARY KEY COLLATE NOCASE,
  variant_id TEXT NOT NULL,
  prefix TEXT,
  sequence_number INTEGER CHECK(sequence_number IS NULL OR sequence_number > 0),
  assigned_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  assigned_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(prefix, sequence_number)
);
INSERT INTO product_sku_registry(sku,variant_id,assigned_at)
SELECT sku,id,created_at FROM product_variants;
CREATE TRIGGER product_sku_registry_no_delete BEFORE DELETE ON product_sku_registry
BEGIN SELECT RAISE(ABORT,'SKU_RESERVATION_IMMUTABLE'); END;
CREATE TRIGGER product_sku_registry_no_identity_update BEFORE UPDATE OF sku,variant_id,prefix,sequence_number ON product_sku_registry
BEGIN SELECT RAISE(ABORT,'SKU_RESERVATION_IMMUTABLE'); END;
CREATE TRIGGER product_variant_sku_published BEFORE UPDATE OF sku ON product_variants
WHEN NEW.sku != OLD.sku AND EXISTS(
  SELECT 1 FROM products p WHERE p.id=OLD.product_id AND p.published_at IS NOT NULL
)
BEGIN SELECT RAISE(ABORT,'PUBLISHED_SKU_IMMUTABLE'); END;
CREATE TRIGGER product_variant_sku_reserved BEFORE UPDATE OF sku ON product_variants
WHEN NEW.sku != OLD.sku AND EXISTS(
  SELECT 1 FROM product_sku_registry r WHERE r.sku=NEW.sku AND r.variant_id!=OLD.id
)
BEGIN SELECT RAISE(ABORT,'SKU_ALREADY_RESERVED'); END;
CREATE TRIGGER product_variant_sku_insert_reserved BEFORE INSERT ON product_variants
WHEN EXISTS(SELECT 1 FROM product_sku_registry r WHERE r.sku=NEW.sku AND r.variant_id!=NEW.id)
BEGIN SELECT RAISE(ABORT,'SKU_ALREADY_RESERVED'); END;
CREATE TRIGGER product_variant_sku_insert AFTER INSERT ON product_variants
BEGIN
  INSERT OR IGNORE INTO product_sku_registry(sku,variant_id) VALUES(NEW.sku,NEW.id);
END;
CREATE TRIGGER product_variant_sku_update AFTER UPDATE OF sku ON product_variants
WHEN NEW.sku != OLD.sku
BEGIN
  INSERT OR IGNORE INTO product_sku_registry(sku,variant_id) VALUES(NEW.sku,NEW.id);
END;

CREATE TABLE product_gtin_registry (
  gtin TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL,
  assigned_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO product_gtin_registry(gtin,variant_id)
SELECT ean_gtin,id FROM product_variants WHERE ean_gtin IS NOT NULL;
CREATE TRIGGER product_gtin_registry_no_delete BEFORE DELETE ON product_gtin_registry
BEGIN SELECT RAISE(ABORT,'GTIN_RESERVATION_IMMUTABLE'); END;
CREATE TRIGGER product_gtin_registry_no_identity_update BEFORE UPDATE OF gtin,variant_id ON product_gtin_registry
BEGIN SELECT RAISE(ABORT,'GTIN_RESERVATION_IMMUTABLE'); END;
CREATE TRIGGER product_variant_gtin_reserved BEFORE UPDATE OF ean_gtin ON product_variants
WHEN NEW.ean_gtin IS NOT NULL AND NEW.ean_gtin IS NOT OLD.ean_gtin AND EXISTS(
  SELECT 1 FROM product_gtin_registry r WHERE r.gtin=NEW.ean_gtin AND r.variant_id!=OLD.id
)
BEGIN SELECT RAISE(ABORT,'GTIN_ALREADY_RESERVED'); END;
CREATE TRIGGER product_variant_gtin_insert AFTER INSERT ON product_variants
WHEN NEW.ean_gtin IS NOT NULL
BEGIN
  INSERT INTO product_gtin_registry(gtin,variant_id) VALUES(NEW.ean_gtin,NEW.id);
END;
CREATE TRIGGER product_variant_gtin_update AFTER UPDATE OF ean_gtin ON product_variants
WHEN NEW.ean_gtin IS NOT NULL AND NEW.ean_gtin IS NOT OLD.ean_gtin
BEGIN
  INSERT OR IGNORE INTO product_gtin_registry(gtin,variant_id) VALUES(NEW.ean_gtin,NEW.id);
END;

ALTER TABLE product_identifier_sources ADD COLUMN gtin_type TEXT
  CHECK(gtin_type IS NULL OR gtin_type IN ('GTIN-8','GTIN-12','GTIN-13','GTIN-14'));
ALTER TABLE product_identifier_sources ADD COLUMN assigned_at TEXT;
ALTER TABLE product_identifier_sources ADD COLUMN document_id TEXT REFERENCES product_documents(id) ON DELETE SET NULL;
UPDATE product_identifier_sources SET
  gtin_type='GTIN-'||length(identifier_value), assigned_at=created_at
WHERE identifier_type IN ('EAN','GTIN') AND length(identifier_value) IN (8,12,13,14);
CREATE TRIGGER product_identifier_source_matches_variant BEFORE INSERT ON product_identifier_sources
WHEN NEW.identifier_type IN ('EAN','GTIN') AND NEW.identifier_value IS NOT
  (SELECT ean_gtin FROM product_variants WHERE id=NEW.variant_id)
BEGIN SELECT RAISE(ABORT,'GTIN_SOURCE_MISMATCH'); END;

CREATE TABLE product_identifier_history (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('sku_assigned','sku_changed','gtin_assigned','gtin_changed','gtin_cleared','gtin_verified','gtin_rejected')),
  old_value TEXT,
  new_value TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata_json)),
  actor_admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX product_identifier_history_variant_idx ON product_identifier_history(variant_id,created_at DESC);
INSERT INTO product_identifier_history(id,variant_id,action,new_value,metadata_json,created_at)
SELECT 'sku-migrated-'||id,id,'sku_assigned',sku,'{"migration":true}',created_at FROM product_variants;
INSERT INTO product_identifier_history(id,variant_id,action,new_value,metadata_json,created_at)
SELECT 'gtin-migrated-'||id,id,'gtin_assigned',ean_gtin,'{"migration":true}',created_at
FROM product_variants WHERE ean_gtin IS NOT NULL;
CREATE TRIGGER product_identifier_history_no_update BEFORE UPDATE ON product_identifier_history
BEGIN SELECT RAISE(ABORT,'IDENTIFIER_HISTORY_IMMUTABLE'); END;
CREATE TRIGGER product_identifier_history_no_delete BEFORE DELETE ON product_identifier_history
BEGIN SELECT RAISE(ABORT,'IDENTIFIER_HISTORY_IMMUTABLE'); END;

CREATE TABLE product_lots (
  id TEXT PRIMARY KEY,
  lot_code TEXT NOT NULL COLLATE NOCASE UNIQUE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  location_id TEXT NOT NULL REFERENCES stock_locations(id) ON DELETE RESTRICT,
  source_kind TEXT NOT NULL CHECK(source_kind IN ('supplier','in_house')),
  supplier_reference TEXT,
  document_id TEXT REFERENCES product_documents(id) ON DELETE SET NULL,
  received_at TEXT NOT NULL,
  initial_quantity INTEGER NOT NULL CHECK(initial_quantity > 0),
  receipt_movement_id TEXT NOT NULL UNIQUE REFERENCES inventory_movements(id) ON DELETE RESTRICT,
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX product_lots_variant_idx ON product_lots(variant_id,received_at DESC);
CREATE TRIGGER product_lots_no_delete BEFORE DELETE ON product_lots
BEGIN SELECT RAISE(ABORT,'LOT_IMMUTABLE'); END;
CREATE TRIGGER product_lots_no_identity_update BEFORE UPDATE OF lot_code,variant_id,location_id,initial_quantity,receipt_movement_id ON product_lots
BEGIN SELECT RAISE(ABORT,'LOT_IMMUTABLE'); END;

-- A lot allocation tracks which physical stock fulfilled an order item. The
-- existing inventory ledger remains the only source of stock totals.
CREATE TABLE product_lot_allocations (
  id TEXT PRIMARY KEY,
  lot_id TEXT NOT NULL REFERENCES product_lots(id) ON DELETE RESTRICT,
  order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK(quantity > 0),
  status TEXT NOT NULL DEFAULT 'allocated' CHECK(status IN ('allocated','released')),
  actor_admin_user_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  released_at TEXT
);
CREATE INDEX product_lot_allocations_item_idx ON product_lot_allocations(order_item_id,status);
CREATE INDEX product_lot_allocations_lot_idx ON product_lot_allocations(lot_id,status);

CREATE TABLE product_serials (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  lot_id TEXT REFERENCES product_lots(id) ON DELETE RESTRICT,
  serial_code TEXT NOT NULL COLLATE NOCASE UNIQUE,
  order_item_id TEXT REFERENCES order_items(id) ON DELETE SET NULL,
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX product_serials_variant_idx ON product_serials(variant_id,created_at DESC);
CREATE TRIGGER product_serials_no_delete BEFORE DELETE ON product_serials
BEGIN SELECT RAISE(ABORT,'SERIAL_IMMUTABLE'); END;

CREATE TABLE personalization_identifiers (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL COLLATE NOCASE UNIQUE,
  request_id TEXT UNIQUE REFERENCES personalization_requests(id) ON DELETE RESTRICT,
  order_item_id TEXT UNIQUE REFERENCES order_items(id) ON DELETE RESTRICT,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK((request_id IS NOT NULL) != (order_item_id IS NOT NULL))
);
CREATE INDEX personalization_identifiers_product_idx ON personalization_identifiers(product_id,created_at DESC);
CREATE TRIGGER personalization_identifiers_no_delete BEFORE DELETE ON personalization_identifiers
BEGIN SELECT RAISE(ABORT,'PERSONALIZATION_CODE_IMMUTABLE'); END;

UPDATE schema_metadata SET value='58',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';
