-- generate.plus explicitly marks its EAN output as fake test data. Keep these
-- samples separate from the commercial GTIN and all public/channel exports.
CREATE TABLE product_barcode_test_samples (
  product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  ean13_sample TEXT NOT NULL UNIQUE CHECK(length(ean13_sample)=13),
  ean8_sample TEXT NOT NULL UNIQUE CHECK(length(ean8_sample)=8),
  source_url TEXT NOT NULL,
  generated_on TEXT NOT NULL,
  usage_status TEXT NOT NULL DEFAULT 'test_only' CHECK(usage_status='test_only')
);

INSERT INTO product_barcode_test_samples
  (product_id, ean13_sample, ean8_sample, source_url, generated_on)
SELECT id,
  CASE slug
    WHEN 'hp-keeper' THEN '4641770966880'
    WHEN 'got-winter' THEN '1820120011330'
    WHEN 'kitten' THEN '2129412865682'
    WHEN 'halloween' THEN '5404119057132'
    WHEN 'sunshine' THEN '7026278963444'
  END,
  CASE slug
    WHEN 'hp-keeper' THEN '31705806'
    WHEN 'got-winter' THEN '19409665'
    WHEN 'kitten' THEN '90987359'
    WHEN 'halloween' THEN '41602942'
    WHEN 'sunshine' THEN '78336223'
  END,
  'https://generate.plus/en/number/ean', '2026-10-17'
FROM products WHERE slug IN ('hp-keeper','got-winter','kitten','halloween','sunshine');

CREATE TRIGGER product_test_ean_not_commercial_insert
BEFORE INSERT ON product_variants
WHEN NEW.ean_gtin IS NOT NULL AND EXISTS (
  SELECT 1 FROM product_barcode_test_samples
  WHERE ean13_sample=NEW.ean_gtin OR ean8_sample=NEW.ean_gtin
)
BEGIN
  SELECT RAISE(ABORT, 'test_only_gtin');
END;

CREATE TRIGGER product_test_ean_not_commercial_update
BEFORE UPDATE OF ean_gtin ON product_variants
WHEN NEW.ean_gtin IS NOT OLD.ean_gtin AND NEW.ean_gtin IS NOT NULL AND EXISTS (
  SELECT 1 FROM product_barcode_test_samples
  WHERE ean13_sample=NEW.ean_gtin OR ean8_sample=NEW.ean_gtin
)
BEGIN
  SELECT RAISE(ABORT, 'test_only_gtin');
END;

UPDATE schema_metadata SET value='65',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';
