-- Keep catalog excerpts and SEO metadata aligned with the verified product stories.
-- Administrator-edited products remain untouched.
UPDATE products
SET description=json_extract(editorial_json,'$.story') || ' ' || json_extract(editorial_json,'$.melody'),
    story=json_extract(editorial_json,'$.gift'),
    seo_title=name || ' | Cutiuța Magică',
    seo_description=short_description || ' ' || tagline,
    version=version+1,
    updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE slug IN ('hp-keeper','got-winter','kitten','halloween','sunshine','lotr-rings','hp-always','fairy','pirates','starwars-dad')
  AND editorial_json IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM audit_log a
    WHERE a.entity_type='product' AND a.entity_id=products.id AND a.action='product.update'
  );

UPDATE schema_metadata SET value='78',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';
