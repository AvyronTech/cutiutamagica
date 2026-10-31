PRAGMA foreign_keys = ON;

-- Păstrează prețurile curente aprobate și configurează separat valorile
-- comerciale de referință solicitate de administrator. Condițiile pe prețul
-- curent evită suprascrierea unei modificări făcute între timp din dashboard.
UPDATE price_list_items
SET compare_at_bani = CASE id
      WHEN 'price_hp_keeper_1' THEN 18900
      WHEN 'price_got_winter_1' THEN 18900
      WHEN 'price_kitten_1' THEN 15900
      WHEN 'price_halloween_1' THEN 16900
      WHEN 'price_sunshine_1' THEN 14900
    END,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE (id = 'price_hp_keeper_1' AND price_bani = 14900)
   OR (id = 'price_got_winter_1' AND price_bani = 14900)
   OR (id = 'price_kitten_1' AND price_bani = 12900)
   OR (id = 'price_halloween_1' AND price_bani = 13900)
   OR (id = 'price_sunshine_1' AND price_bani = 12900);

INSERT INTO price_reference_evidence (
  price_item_id, reference_bani, evidence, approved_by, approved_at
)
SELECT pi.id, pi.compare_at_bani,
       'Preț de referință comercială aprobat explicit de administrator pentru campania din 2026-10-04; prețul curent rămâne neschimbat.',
       'admin_avyrontech_gmail', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM price_list_items pi
WHERE pi.id IN (
  'price_hp_keeper_1',
  'price_got_winter_1',
  'price_kitten_1',
  'price_halloween_1',
  'price_sunshine_1'
)
  AND pi.compare_at_bani = CASE pi.id
    WHEN 'price_hp_keeper_1' THEN 18900
    WHEN 'price_got_winter_1' THEN 18900
    WHEN 'price_kitten_1' THEN 15900
    WHEN 'price_halloween_1' THEN 16900
    WHEN 'price_sunshine_1' THEN 14900
  END
ON CONFLICT(price_item_id) DO UPDATE SET
  reference_bani = excluded.reference_bani,
  evidence = excluded.evidence,
  approved_by = excluded.approved_by,
  approved_at = excluded.approved_at;

UPDATE products
SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id IN (
  'product_hp_keeper',
  'product_got_winter',
  'product_kitten',
  'product_halloween',
  'product_sunshine'
)
  AND EXISTS (
    SELECT 1
    FROM product_variants pv
    JOIN price_list_items pi ON pi.variant_id = pv.id
    WHERE pv.product_id = products.id AND pi.compare_at_bani IS NOT NULL
  );

UPDATE schema_metadata
SET value = '44', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
