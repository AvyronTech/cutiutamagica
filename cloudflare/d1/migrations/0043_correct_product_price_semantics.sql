PRAGMA foreign_keys = ON;

-- Corectează campania 0039: valorile de 149/149/129/139/129 RON sunt
-- prețurile curente aprobate, nu prețuri anterioare de referință.
-- Nu fabricăm un preț tăiat mai mare. O reducere viitoare poate fi publicată
-- numai după documentarea prețului anterior minim din ultimele 30 de zile.
INSERT OR IGNORE INTO price_change_history (
  id, price_item_id, old_price_bani, new_price_bani, changed_by, changed_at
)
SELECT 'price_history_20261003_hp_keeper_correction', id, price_bani, 14900,
       'admin_avyrontech_gmail', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM price_list_items
WHERE id = 'price_hp_keeper_1' AND price_bani = 11900;

INSERT OR IGNORE INTO price_change_history (
  id, price_item_id, old_price_bani, new_price_bani, changed_by, changed_at
)
SELECT 'price_history_20261003_got_winter_correction', id, price_bani, 14900,
       'admin_avyrontech_gmail', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM price_list_items
WHERE id = 'price_got_winter_1' AND price_bani = 10900;

INSERT OR IGNORE INTO price_change_history (
  id, price_item_id, old_price_bani, new_price_bani, changed_by, changed_at
)
SELECT 'price_history_20261003_kitten_correction', id, price_bani, 12900,
       'admin_avyrontech_gmail', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM price_list_items
WHERE id = 'price_kitten_1' AND price_bani = 9900;

INSERT OR IGNORE INTO price_change_history (
  id, price_item_id, old_price_bani, new_price_bani, changed_by, changed_at
)
SELECT 'price_history_20261003_halloween_correction', id, price_bani, 13900,
       'admin_avyrontech_gmail', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM price_list_items
WHERE id = 'price_halloween_1' AND price_bani = 11900;

INSERT OR IGNORE INTO price_change_history (
  id, price_item_id, old_price_bani, new_price_bani, changed_by, changed_at
)
SELECT 'price_history_20261003_sunshine_correction', id, price_bani, 12900,
       'admin_avyrontech_gmail', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM price_list_items
WHERE id = 'price_sunshine_1' AND price_bani = 9900;

UPDATE price_list_items
SET price_bani = CASE id
      WHEN 'price_hp_keeper_1' THEN 14900
      WHEN 'price_got_winter_1' THEN 14900
      WHEN 'price_kitten_1' THEN 12900
      WHEN 'price_halloween_1' THEN 13900
      WHEN 'price_sunshine_1' THEN 12900
    END,
    compare_at_bani = NULL,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE (id = 'price_hp_keeper_1' AND price_bani = 11900)
   OR (id = 'price_got_winter_1' AND price_bani = 10900)
   OR (id = 'price_kitten_1' AND price_bani = 9900)
   OR (id = 'price_halloween_1' AND price_bani = 11900)
   OR (id = 'price_sunshine_1' AND price_bani = 9900);

DELETE FROM price_reference_evidence
WHERE price_item_id IN (
  'price_hp_keeper_1',
  'price_got_winter_1',
  'price_kitten_1',
  'price_halloween_1',
  'price_sunshine_1'
)
  AND EXISTS (
    SELECT 1
    FROM price_list_items pi
    WHERE pi.id = price_reference_evidence.price_item_id
      AND pi.compare_at_bani IS NULL
  );

UPDATE products
SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id IN (
  'product_hp_keeper',
  'product_got_winter',
  'product_kitten',
  'product_halloween',
  'product_sunshine'
);

UPDATE schema_metadata
SET value = '43', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
