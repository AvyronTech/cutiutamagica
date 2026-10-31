PRAGMA foreign_keys = ON;

-- Campanie aprobată la 2026-10-03: prețurile publice existente devin
-- referința documentată, iar prețurile de vânzare scad cu 20–40 RON.
-- Condițiile pe prețul vechi împiedică suprascrierea unei modificări făcute
-- între timp din dashboard.
INSERT OR IGNORE INTO price_change_history (
  id, price_item_id, old_price_bani, new_price_bani, changed_by, changed_at
)
SELECT 'price_history_20261003_hp_keeper', id, price_bani, 11900,
       'admin_avyrontech_gmail', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM price_list_items
WHERE id = 'price_hp_keeper_1' AND price_bani = 14900;

INSERT OR IGNORE INTO price_change_history (
  id, price_item_id, old_price_bani, new_price_bani, changed_by, changed_at
)
SELECT 'price_history_20261003_got_winter', id, price_bani, 10900,
       'admin_avyrontech_gmail', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM price_list_items
WHERE id = 'price_got_winter_1' AND price_bani = 14900;

INSERT OR IGNORE INTO price_change_history (
  id, price_item_id, old_price_bani, new_price_bani, changed_by, changed_at
)
SELECT 'price_history_20261003_kitten', id, price_bani, 9900,
       'admin_avyrontech_gmail', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM price_list_items
WHERE id = 'price_kitten_1' AND price_bani = 12900;

INSERT OR IGNORE INTO price_change_history (
  id, price_item_id, old_price_bani, new_price_bani, changed_by, changed_at
)
SELECT 'price_history_20261003_halloween', id, price_bani, 11900,
       'admin_avyrontech_gmail', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM price_list_items
WHERE id = 'price_halloween_1' AND price_bani = 13900;

INSERT OR IGNORE INTO price_change_history (
  id, price_item_id, old_price_bani, new_price_bani, changed_by, changed_at
)
SELECT 'price_history_20261003_sunshine', id, price_bani, 9900,
       'admin_avyrontech_gmail', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM price_list_items
WHERE id = 'price_sunshine_1' AND price_bani = 12900;

UPDATE price_list_items
SET price_bani = CASE id
      WHEN 'price_hp_keeper_1' THEN 11900
      WHEN 'price_got_winter_1' THEN 10900
      WHEN 'price_kitten_1' THEN 9900
      WHEN 'price_halloween_1' THEN 11900
      WHEN 'price_sunshine_1' THEN 9900
    END,
    compare_at_bani = CASE id
      WHEN 'price_hp_keeper_1' THEN 14900
      WHEN 'price_got_winter_1' THEN 14900
      WHEN 'price_kitten_1' THEN 12900
      WHEN 'price_halloween_1' THEN 13900
      WHEN 'price_sunshine_1' THEN 12900
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
       'Preț anterior publicat pe website înainte de campania din 2026-10-03; păstrat în price_change_history.',
       'admin_avyrontech_gmail', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM price_list_items pi
WHERE pi.id IN (
  'price_hp_keeper_1',
  'price_got_winter_1',
  'price_kitten_1',
  'price_halloween_1',
  'price_sunshine_1'
)
  AND pi.compare_at_bani IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM price_change_history h
    WHERE h.price_item_id = pi.id
      AND h.old_price_bani = pi.compare_at_bani
      AND h.new_price_bani = pi.price_bani
  )
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
SET value = '39', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
