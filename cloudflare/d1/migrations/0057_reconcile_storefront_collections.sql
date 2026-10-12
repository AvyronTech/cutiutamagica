-- The Vinted catalog seed can be imported after migration 0019. Reconcile only
-- untouched default placements so an administrator's collection choices win.
-- Later SEO migrations also increment product.version, so the audit trail is
-- the reliable signal that the product has been edited by an administrator.
UPDATE products
SET landing_collection = 'emotion', landing_order = 4
WHERE slug = 'sunshine'
  AND landing_collection = 'story'
  AND landing_order = 0
  AND NOT EXISTS (
    SELECT 1 FROM audit_log a
    WHERE a.entity_type = 'product' AND a.entity_id = products.id
      AND a.action = 'product.update'
  );

UPDATE products
SET landing_collection = 'dedicated',
    landing_order = CASE slug
      WHEN 'kitten' THEN 2
      WHEN 'halloween' THEN 3
      WHEN 'starwars-dad' THEN 9
    END
WHERE slug IN ('kitten', 'halloween', 'starwars-dad')
  AND landing_collection = 'story'
  AND landing_order = 0
  AND NOT EXISTS (
    SELECT 1 FROM audit_log a
    WHERE a.entity_type = 'product' AND a.entity_id = products.id
      AND a.action = 'product.update'
  );

-- The same late seed contains two names without Romanian diacritics. Update
-- only the original seed strings; any edited title or tagline stays intact.
UPDATE products
SET name = 'Cutiuță Muzicală „You Are My Sunshine” cu Manivelă',
    tagline = CASE
      WHEN tagline = 'Uneori, cele mai frumoase amintiri incap intr-o cutiuta.'
      THEN 'Uneori, cele mai frumoase amintiri încap într-o cutiuță.'
      ELSE tagline
    END
WHERE slug = 'sunshine'
  AND name = 'Cutiuta Muzicala You Are My Sunshine cu Manivela'
  AND NOT EXISTS (
    SELECT 1 FROM audit_log a
    WHERE a.entity_type = 'product' AND a.entity_id = products.id
      AND a.action = 'product.update'
  );

UPDATE products
SET name = 'Cutiuță Muzicală Game of Thrones „Winter Is Coming” cu Manivelă',
    tagline = CASE
      WHEN tagline = 'Iarna vine... dar de data aceasta aduce si muzica.'
      THEN 'Iarna vine… dar de data aceasta aduce și muzică.'
      ELSE tagline
    END
WHERE slug = 'got-winter'
  AND name = 'Cutiuta Muzicala Game of Thrones Winter Is Coming cu Manivela'
  AND NOT EXISTS (
    SELECT 1 FROM audit_log a
    WHERE a.entity_type = 'product' AND a.entity_id = products.id
      AND a.action = 'product.update'
  );

UPDATE schema_metadata
SET value = '57', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';
