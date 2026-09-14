PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO promotions (
  id, name, description, promotion_type, value, status, priority, stack_mode
) VALUES (
  'promotion_website_volume_2',
  'Preț de volum website',
  'Preț de 75 RON per cutiuță pentru un coș cu minimum două cutiuțe muzicale.',
  'tiered',
  7500,
  'active',
  100,
  'exclusive'
);

INSERT OR IGNORE INTO promotion_rules (
  id, promotion_id, rule_type, operator, value_json, sort_order
) VALUES (
  'promotion_rule_website_volume_2',
  'promotion_website_volume_2',
  'min_quantity',
  'gte',
  '2',
  1
);

INSERT OR IGNORE INTO promotion_targets (
  id, promotion_id, target_type, target_id, exclusion
) VALUES (
  'promotion_target_website_volume_2',
  'promotion_website_volume_2',
  'channel',
  'channel_website',
  0
);

INSERT INTO site_settings (key, value_json, visibility, validation_status)
VALUES (
  'commercial.volume_pricing',
  '{"currency":"RON","min_quantity":2,"unit_price_bani":7500,"scope":"website_music_boxes"}',
  'public',
  'verified'
)
ON CONFLICT(key) DO UPDATE SET
  value_json = excluded.value_json,
  visibility = excluded.visibility,
  validation_status = excluded.validation_status,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

UPDATE products
SET
  name = CASE slug
    WHEN 'lotr-rings' THEN 'Stăpânul Inelelor — One Ring'
    WHEN 'hp-always' THEN 'Harry Potter — I Solemnly Swear'
    WHEN 'hp-keeper' THEN 'Harry Potter — I''m a Keeper'
    WHEN 'halloween' THEN 'Halloween — Castelul Bântuit'
    WHEN 'fairy' THEN 'Zâna Pădurii Fermecate'
    WHEN 'pirates' THEN 'Pirații Caraibilor — Furtuna'
    WHEN 'starwars-dad' THEN 'Star Wars — Best Dad in the Galaxy'
    WHEN 'kitten' THEN 'Pisicuța cu Stele'
    ELSE name
  END,
  search_terms = CASE slug
    WHEN 'lotr-rings' THEN 'cutiuță piesă LOTR, cutiuță muzicală Stăpânul Inelelor, cutiuță cu manivelă fantasy, cadou fan Tolkien'
    WHEN 'hp-always' THEN 'cutiuță piesă Harry Potter, cutiuță muzicală Harry Potter, cadou Potterhead, cutiuță mecanică cu manivelă'
    WHEN 'hp-keeper' THEN 'cutiuță muzicală Harry Potter cadou, cutiuță cu mecanism clasic, cutiuță cu manivelă, cadou tematic magic'
    WHEN 'halloween' THEN 'cutiuță muzicală Halloween, cadou Halloween, cutiuță mecanică din lemn, cutiuță cu manivelă'
    WHEN 'fairy' THEN 'cutiuță muzicală cadou pentru ea, cadou cutiuță muzicală, cutiuță cu zână, cutiuță cu manivelă romantică'
    WHEN 'pirates' THEN 'cutiuță muzicală Pirații din Caraibe, cutiuță piesă pirați, cadou aventură, cutiuță mecanică cu manivelă'
    WHEN 'starwars-dad' THEN 'cutiuță muzicală cadou tata, cadou Star Wars tata, cutiuță cu manivelă, cadou cutiuță muzicală'
    WHEN 'kitten' THEN 'cutiuță muzicală cu pisică, cutiuță cadou, cadou aniversare, cutiuță muzicală cu manivelă'
    ELSE search_terms
  END,
  updated_at = '2026-09-05T00:00:00.000Z',
  version = version + 1
WHERE product_type = 'music_box'
  AND slug IN (
    'lotr-rings', 'hp-always', 'hp-keeper', 'halloween',
    'fairy', 'pirates', 'starwars-dad', 'kitten'
  );

UPDATE schema_metadata
SET value = '4', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
