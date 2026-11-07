-- Store-owned identities. These are not GS1 identifiers or provider-assigned IDs.
-- Existing SKUs, GTINs, stock, orders and marketplace mappings remain unchanged.
CREATE TABLE product_internal_codes (
  sequence_number INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL UNIQUE REFERENCES products(id) ON DELETE RESTRICT,
  code TEXT GENERATED ALWAYS AS ('CM-P-' || printf('%06d', sequence_number)) STORED UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE variant_merchant_codes (
  sequence_number INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id TEXT NOT NULL UNIQUE REFERENCES product_variants(id) ON DELETE RESTRICT,
  code TEXT GENERATED ALWAYS AS ('CM-R-' || printf('%06d', sequence_number)) STORED UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT INTO product_internal_codes(product_id)
SELECT id FROM products ORDER BY created_at,id;
INSERT INTO variant_merchant_codes(variant_id)
SELECT id FROM product_variants ORDER BY created_at,id;
CREATE TRIGGER product_internal_code_insert AFTER INSERT ON products
BEGIN INSERT INTO product_internal_codes(product_id) VALUES(NEW.id); END;
CREATE TRIGGER variant_merchant_code_insert AFTER INSERT ON product_variants
BEGIN INSERT INTO variant_merchant_codes(variant_id) VALUES(NEW.id); END;
CREATE TRIGGER product_internal_codes_no_update BEFORE UPDATE ON product_internal_codes
BEGIN SELECT RAISE(ABORT,'PRODUCT_CODE_IMMUTABLE'); END;
CREATE TRIGGER product_internal_codes_no_delete BEFORE DELETE ON product_internal_codes
BEGIN SELECT RAISE(ABORT,'PRODUCT_CODE_IMMUTABLE'); END;
CREATE TRIGGER variant_merchant_codes_no_update BEFORE UPDATE ON variant_merchant_codes
BEGIN SELECT RAISE(ABORT,'MERCHANT_CODE_IMMUTABLE'); END;
CREATE TRIGGER variant_merchant_codes_no_delete BEFORE DELETE ON variant_merchant_codes
BEGIN SELECT RAISE(ABORT,'MERCHANT_CODE_IMMUTABLE'); END;
-- Keep generated-code namespaces separate from manually entered SKUs.
CREATE TRIGGER product_variant_sku_code_namespace_insert BEFORE INSERT ON product_variants
WHEN NEW.sku GLOB 'CM-P-*' OR NEW.sku GLOB 'CM-R-*'
BEGIN SELECT RAISE(ABORT,'SKU_RESERVED_CODE_NAMESPACE'); END;
CREATE TRIGGER product_variant_sku_code_namespace_update BEFORE UPDATE OF sku ON product_variants
WHEN NEW.sku != OLD.sku AND (NEW.sku GLOB 'CM-P-*' OR NEW.sku GLOB 'CM-R-*')
BEGIN SELECT RAISE(ABORT,'SKU_RESERVED_CODE_NAMESPACE'); END;
UPDATE schema_metadata SET value='91',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';
