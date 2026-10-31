PRAGMA foreign_keys = ON;

ALTER TABLE product_reviews
ADD COLUMN country_code TEXT
CHECK (
  country_code IS NULL OR (
    length(country_code) = 2
    AND country_code = upper(country_code)
    AND country_code GLOB '[A-Z][A-Z]'
  )
);

UPDATE schema_metadata
SET value = '36', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
