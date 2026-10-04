-- Cele două modele noi preluate din anunțurile Vinted (22.09.2026).
-- Fără ele, checkout-ul respinge comanda („Unul dintre produsele din coș nu mai este disponibil”),
-- pentru că serverul validează fiecare slug în D1.
-- Idempotent: doar INSERT OR IGNORE, nu modifică nimic din ce există deja în admin.
-- Rulare: npx wrangler d1 execute DB --remote --env production --file=./cloudflare/d1/seed/0002_vinted_catalog.sql
PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO melodies (id, title, rights_status, rights_notes) VALUES
  ('melody_got_main_theme', 'Game of Thrones - Main Theme', 'review_required', 'Drepturile pentru preview si denumire trebuie validate.'),
  ('melody_you_are_my_sunshine', 'You Are My Sunshine', 'review_required', 'Drepturile pentru preview si denumire trebuie validate.');

INSERT OR IGNORE INTO products (
  id, slug, status, name, tagline, short_description, description, story, category,
  mechanism_type, material, dimensions_text, tax_class, tax_rate_bps, rights_status, rights_notes,
  seo_title, seo_description, search_terms, published_at, updated_at
) VALUES
  (
    'product_got_winter', 'got-winter', 'active',
    'Cutiuta Muzicala Game of Thrones Winter Is Coming cu Manivela',
    'Iarna vine... dar de data aceasta aduce si muzica.',
    'Cutiuta muzicala neagra din lemn, cu lupul direwolf, manivela si mecanism vizibil.',
    'Cutiuta muzicala cu atmosfera medieval-fantasy, actionata manual prin manivela, fara baterii.',
    'Un cadou mic, dar memorabil pentru fanii Game of Thrones si colectionari.',
    'Fantasy', 'manual_crank', 'Lemn', '6,5 x 4 x 5 cm', 'review_required', 0, 'review_required',
    'Marca, textul, artwork-ul si melodia necesita verificarea drepturilor.',
    'Cutiuta muzicala Game of Thrones cu manivela - Cutiuta Magica',
    'Cutiuta muzicala Game of Thrones Winter Is Coming, din lemn, cu manivela si mecanism manual.',
    'cutiuta muzicala game of thrones winter is coming manivela cadou',
    '2026-09-22T00:00:00.000Z', '2026-09-22T00:00:00.000Z'
  ),
  (
    'product_sunshine', 'sunshine', 'active',
    'Cutiuta Muzicala You Are My Sunshine cu Manivela',
    'Uneori, cele mai frumoase amintiri incap intr-o cutiuta.',
    'Cutiuta muzicala din lemn inchis, cu mesaj sub capac, manivela si mecanism vizibil.',
    'Cutiuta muzicala You Are My Sunshine, actionata manual prin manivela, fara baterii.',
    'Un gest simplu transformat intr-un moment special, pentru cupluri si familie.',
    'Cadouri speciale', 'manual_crank', 'Lemn', '6,5 x 3,8 x 5 cm', 'review_required', 0, 'review_required',
    'Melodia necesita verificarea drepturilor.',
    'Cutiuta muzicala You Are My Sunshine cu manivela - Cutiuta Magica',
    'Cutiuta muzicala You Are My Sunshine din lemn, cu manivela, cadou pentru cuplu si familie.',
    'cutiuta muzicala you are my sunshine manivela cadou cuplu',
    '2026-09-22T00:00:00.000Z', '2026-09-22T00:00:00.000Z'
  );

INSERT OR IGNORE INTO product_variants (
  id, product_id, sku, name, melody_id, status, inventory_policy, attributes_json
) VALUES
  ('variant_got_winter_standard', 'product_got_winter', 'CM-GOT-WINTER', 'Standard', 'melody_got_main_theme', 'active', 'untracked', '{"mechanism":"manual_crank"}'),
  ('variant_sunshine_standard', 'product_sunshine', 'CM-SUNSHINE', 'Standard', 'melody_you_are_my_sunshine', 'active', 'untracked', '{"mechanism":"manual_crank"}');

INSERT OR IGNORE INTO product_melodies (product_id, melody_id, is_default) VALUES
  ('product_got_winter', 'melody_got_main_theme', 1),
  ('product_sunshine', 'melody_you_are_my_sunshine', 1);

INSERT OR IGNORE INTO price_list_items (id, price_list_id, variant_id, price_bani, min_quantity) VALUES
  ('price_got_winter_1', 'price_list_website_ron', 'variant_got_winter_standard', 11900, 1),
  ('price_sunshine_1', 'price_list_website_ron', 'variant_sunshine_standard', 11900, 1);

INSERT OR IGNORE INTO inventory_levels (
  id, variant_id, location_id, on_hand_quantity, reserved_quantity, safety_stock_quantity
) VALUES
  ('inventory_got_winter_main', 'variant_got_winter_standard', 'location_main', 0, 0, 0),
  ('inventory_sunshine_main', 'variant_sunshine_standard', 'location_main', 0, 0, 0);

INSERT OR IGNORE INTO product_collections (collection_id, product_id, sort_order) VALUES
  ('collection_all', 'product_got_winter', 100),
  ('collection_all', 'product_sunshine', 101),
  ('collection_crank', 'product_got_winter', 100),
  ('collection_crank', 'product_sunshine', 101),
  ('collection_gift', 'product_got_winter', 100),
  ('collection_gift', 'product_sunshine', 101);

INSERT OR IGNORE INTO channel_listings (
  id, channel_id, product_id, variant_id, status, title_override, last_synced_at
) VALUES
  ('listing_website_got-winter', 'channel_website', 'product_got_winter', 'variant_got_winter_standard', 'active', 'Cutiuta Muzicala Game of Thrones Winter Is Coming cu Manivela', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('listing_website_sunshine', 'channel_website', 'product_sunshine', 'variant_sunshine_standard', 'active', 'Cutiuta Muzicala You Are My Sunshine cu Manivela', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
