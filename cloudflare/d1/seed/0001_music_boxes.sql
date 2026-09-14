PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO sales_channels (
  id, code, name, channel_type, connection_mode, status, capabilities_json, settings_json
) VALUES
  ('channel_website', 'website', 'Cutiuta Magica', 'website', 'native', 'active', '["catalog","orders","inventory","prices","fulfillment"]', '{}'),
  ('channel_emag', 'emag', 'eMAG Marketplace', 'marketplace', 'api', 'setup_required', '["catalog","orders","inventory","prices","fulfillment"]', '{"requires_sandbox":true}'),
  ('channel_olx', 'olx', 'OLX', 'marketplace', 'manual_import', 'setup_required', '["manual_orders","manual_listings"]', '{"api_requires_official_access":true}'),
  ('channel_facebook', 'facebook', 'Facebook', 'social', 'catalog_feed', 'setup_required', '["catalog_feed","attribution","assisted_orders"]', '{}'),
  ('channel_instagram', 'instagram', 'Instagram', 'social', 'catalog_feed', 'setup_required', '["catalog_feed","attribution","assisted_orders"]', '{}'),
  ('channel_tiktok', 'tiktok', 'TikTok', 'social', 'catalog_feed', 'setup_required', '["catalog_feed","attribution"]', '{}'),
  ('channel_pinterest', 'pinterest', 'Pinterest', 'social', 'catalog_feed', 'setup_required', '["catalog_feed","attribution"]', '{}'),
  ('channel_whatsapp', 'whatsapp', 'WhatsApp', 'assisted', 'assisted', 'setup_required', '["assisted_orders","notifications"]', '{}');

INSERT OR IGNORE INTO roles (id, code, name, description) VALUES
  ('role_owner', 'owner', 'Proprietar', 'Acces complet, inclusiv roluri, integrari si refunduri.'),
  ('role_manager', 'manager', 'Manager', 'Operare comerciala si rapoarte, fara administrarea proprietarului.'),
  ('role_fulfillment', 'fulfillment', 'Procesare comenzi', 'Comenzi, stoc, AWB si retururi.'),
  ('role_marketing', 'marketing', 'Marketing', 'Catalog, continut, SEO, promotii si feed-uri.'),
  ('role_support', 'support', 'Suport', 'Vizualizare comenzi si comunicare cu clientii.'),
  ('role_analyst', 'analyst', 'Analist', 'Rapoarte in mod read-only.');

INSERT OR IGNORE INTO permissions (id, code, description) VALUES
  ('perm_dashboard_read', 'dashboard.read', 'Vizualizeaza dashboardul si alertele.'),
  ('perm_orders_read', 'orders.read', 'Vizualizeaza comenzile.'),
  ('perm_orders_write', 'orders.write', 'Modifica comenzile si notele.'),
  ('perm_refunds_write', 'refunds.write', 'Initiaza rambursari.'),
  ('perm_catalog_read', 'catalog.read', 'Vizualizeaza catalogul.'),
  ('perm_catalog_write', 'catalog.write', 'Modifica produse, variante si media.'),
  ('perm_inventory_read', 'inventory.read', 'Vizualizeaza stocul.'),
  ('perm_inventory_write', 'inventory.write', 'Ajusteaza si rezerva stoc.'),
  ('perm_promotions_read', 'promotions.read', 'Vizualizeaza promotiile.'),
  ('perm_promotions_write', 'promotions.write', 'Creeaza si publica promotii.'),
  ('perm_integrations_read', 'integrations.read', 'Vizualizeaza integrarile si joburile.'),
  ('perm_integrations_write', 'integrations.write', 'Configureaza si reexecuta integrari.'),
  ('perm_content_write', 'content.write', 'Modifica SEO si continut editorial.'),
  ('perm_reports_read', 'reports.read', 'Vizualizeaza rapoarte.'),
  ('perm_team_write', 'team.write', 'Administreaza echipa si rolurile.'),
  ('perm_audit_read', 'audit.read', 'Vizualizeaza jurnalul de audit.');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_owner', id FROM permissions;

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_manager', id FROM permissions WHERE code NOT IN ('team.write');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_fulfillment', id FROM permissions
WHERE code IN ('dashboard.read', 'orders.read', 'orders.write', 'inventory.read', 'inventory.write', 'integrations.read');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_marketing', id FROM permissions
WHERE code IN ('dashboard.read', 'catalog.read', 'catalog.write', 'promotions.read', 'promotions.write', 'integrations.read', 'content.write', 'reports.read');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_support', id FROM permissions
WHERE code IN ('dashboard.read', 'orders.read', 'orders.write', 'catalog.read');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_analyst', id FROM permissions
WHERE code IN ('dashboard.read', 'orders.read', 'catalog.read', 'inventory.read', 'promotions.read', 'integrations.read', 'reports.read', 'audit.read');

INSERT OR IGNORE INTO stock_locations (id, code, name, location_type, active) VALUES
  ('location_main', 'MAIN', 'Stoc principal', 'warehouse', 1);

INSERT OR IGNORE INTO melodies (id, title, rights_status, rights_notes) VALUES
  ('melody_in_dreams', 'In Dreams', 'review_required', 'Drepturile pentru preview si denumire trebuie validate.'),
  ('melody_hedwigs_theme', 'Hedwig''s Theme', 'review_required', 'Drepturile pentru preview si denumire trebuie validate.'),
  ('melody_this_is_halloween', 'This Is Halloween', 'review_required', 'Drepturile pentru preview si denumire trebuie validate.'),
  ('melody_a_thousand_years', 'A Thousand Years', 'review_required', 'Drepturile pentru preview si denumire trebuie validate.'),
  ('melody_hes_a_pirate', 'He''s a Pirate', 'review_required', 'Drepturile pentru preview si denumire trebuie validate.'),
  ('melody_imperial_march', 'Imperial March', 'review_required', 'Drepturile pentru preview si denumire trebuie validate.'),
  ('melody_la_vie_en_rose', 'La Vie en Rose', 'review_required', 'Drepturile pentru preview si denumire trebuie validate.');

INSERT OR IGNORE INTO products (
  id, slug, status, name, tagline, short_description, description, story, category,
  mechanism_type, material, tax_class, tax_rate_bps, rights_status, rights_notes,
  seo_title, seo_description, search_terms, published_at, updated_at
) VALUES
  (
    'product_lotr_rings', 'lotr-rings', 'active', 'Stapanul Inelelor - One Ring',
    'Un dar pentru cei care stiu ce inseamna pretioasa comoara.',
    'Cutiuta muzicala din lemn, cu manivela si melodie inspirata de fantasy.',
    'Obiect muzical decorativ din lemn, actionat manual prin manivela.',
    'Un obiect mic pentru o amintire mare, prezentat cu fotografia produsului real.',
    'Fantasy', 'manual_crank', 'Lemn', 'review_required', 0, 'review_required',
    'Denumirea, artwork-ul si melodia necesita verificarea drepturilor.',
    'Cutiuta muzicala fantasy cu manivela - Cutiuta Magica',
    'Cutiuta muzicala din lemn cu mecanism manual si melodie fantasy, potrivita pentru cadou.',
    'cutiuta muzicala fantasy manivela cadou mecanism clasic',
    '2026-06-09T00:00:00.000Z', '2026-06-09T00:00:00.000Z'
  ),
  (
    'product_hp_always', 'hp-always', 'active', 'Harry Potter - I Solemnly Swear',
    'Pentru fanul care zambeste din prima la o poveste despre magie.',
    'Cutiuta muzicala albastra din lemn, cu mecanism manual si manivela.',
    'Obiect muzical decorativ din lemn, actionat manual prin manivela.',
    'O cutiuta tematica gandita ca dar pentru iubitorii povestilor magice.',
    'Fantasy', 'manual_crank', 'Lemn', 'review_required', 0, 'review_required',
    'Marca, textul, artwork-ul si melodia necesita verificarea drepturilor.',
    'Cutiuta muzicala cu manivela si tema magica - Cutiuta Magica',
    'Cutiuta muzicala din lemn cu manivela, finisaj albastru si tema magica pentru cadou.',
    'cutiuta muzicala magica manivela lemn cadou',
    '2026-06-09T00:00:00.000Z', '2026-06-09T00:00:00.000Z'
  ),
  (
    'product_hp_keeper', 'hp-keeper', 'active', 'Harry Potter - I''m a Keeper',
    'Un cadou jucaus pentru cineva care iubeste povestile magice.',
    'Cutiuta muzicala din lemn inchis, cu manivela si mecanism vizibil.',
    'Obiect muzical decorativ din lemn, actionat manual prin manivela.',
    'O cutiuta cu personalitate, potrivita unei colectii tematice.',
    'Fantasy', 'manual_crank', 'Lemn', 'review_required', 0, 'review_required',
    'Marca, textul, artwork-ul si melodia necesita verificarea drepturilor.',
    'Cutiuta muzicala din lemn cu manivela - Cutiuta Magica',
    'Cutiuta muzicala din lemn inchis, actionata manual, pentru un cadou tematic.',
    'cutiuta muzicala lemn manivela mecanism cadou',
    '2026-06-09T00:00:00.000Z', '2026-06-09T00:00:00.000Z'
  ),
  (
    'product_halloween', 'halloween', 'active', 'Halloween - Castelul Bantuit',
    'Pentru cei care iubesc atmosfera misterioasa, nu doar sarbatoarea.',
    'Cutiuta muzicala din lemn cu tema de Halloween si mecanism manual.',
    'Obiect muzical decorativ din lemn, actionat manual prin manivela.',
    'Un model sezonier cu prezenta vizuala puternica si mecanism clasic.',
    'Halloween', 'manual_crank', 'Lemn', 'review_required', 0, 'review_required',
    'Artwork-ul si melodia necesita verificarea drepturilor.',
    'Cutiuta muzicala Halloween cu manivela - Cutiuta Magica',
    'Cutiuta muzicala Halloween din lemn, cu mecanism manual, potrivita pentru cadou.',
    'cutiuta muzicala halloween manivela cadou lemn',
    '2026-06-09T00:00:00.000Z', '2026-06-09T00:00:00.000Z'
  ),
  (
    'product_fairy', 'fairy', 'active', 'Zana Padurii Fermecate',
    'Un cadou delicat pentru visatoare si iubitoare de magie.',
    'Cutiuta muzicala delicata din lemn, cu manivela si ilustratie fantasy.',
    'Obiect muzical decorativ din lemn, actionat manual prin manivela.',
    'Un model luminos, potrivit pentru aniversari si daruri oferite din suflet.',
    'Fantasy', 'manual_crank', 'Lemn', 'review_required', 0, 'review_required',
    'Artwork-ul si melodia necesita verificarea drepturilor.',
    'Cutiuta muzicala cu zana si manivela - Cutiuta Magica',
    'Cutiuta muzicala din lemn cu manivela si tema de poveste, potrivita pentru cadou.',
    'cutiuta muzicala zana fantasy manivela cadou',
    '2026-06-09T00:00:00.000Z', '2026-06-09T00:00:00.000Z'
  ),
  (
    'product_pirates', 'pirates', 'active', 'Piratii Caraibilor - Furtuna',
    'Pentru cei care aleg mereu aventura.',
    'Cutiuta muzicala din lemn cu manivela si tema de aventura pe mare.',
    'Obiect muzical decorativ din lemn, actionat manual prin manivela.',
    'Un model cu imagine dramatica si mecanism clasic actionat manual.',
    'Aventura', 'manual_crank', 'Lemn', 'review_required', 0, 'review_required',
    'Marca, artwork-ul si melodia necesita verificarea drepturilor.',
    'Cutiuta muzicala de aventura cu manivela - Cutiuta Magica',
    'Cutiuta muzicala din lemn, cu manivela si tema de aventura, pentru un cadou memorabil.',
    'cutiuta muzicala aventura pirati manivela cadou',
    '2026-06-09T00:00:00.000Z', '2026-06-09T00:00:00.000Z'
  ),
  (
    'product_starwars_dad', 'starwars-dad', 'active', 'Star Wars - Best Dad in the Galaxy',
    'Un cadou dedicat pentru tata.',
    'Cutiuta muzicala din lemn cu manivela, gandita ca dar pentru tata.',
    'Obiect muzical decorativ din lemn, actionat manual prin manivela.',
    'Un obiect mic si memorabil pentru o ocazie dedicata tatalui.',
    'Cadouri speciale', 'manual_crank', 'Lemn', 'review_required', 0, 'review_required',
    'Marca, textul, artwork-ul si melodia necesita verificarea drepturilor.',
    'Cutiuta muzicala cadou pentru tata - Cutiuta Magica',
    'Cutiuta muzicala din lemn cu manivela, potrivita drept cadou pentru tata.',
    'cutiuta muzicala cadou tata manivela lemn',
    '2026-06-09T00:00:00.000Z', '2026-06-09T00:00:00.000Z'
  ),
  (
    'product_kitten', 'kitten', 'active', 'Pisicuta cu Stele',
    'O alegere calda pentru iubitorii de pisici si gesturi fine.',
    'Cutiuta muzicala din lemn cu manivela si ilustratie cu pisicuta.',
    'Obiect muzical decorativ din lemn, actionat manual prin manivela.',
    'Un model bland si usor de oferit pentru aniversari sau surprize.',
    'Cadouri speciale', 'manual_crank', 'Lemn', 'review_required', 0, 'review_required',
    'Artwork-ul si melodia necesita verificarea drepturilor.',
    'Cutiuta muzicala cu pisicuta si manivela - Cutiuta Magica',
    'Cutiuta muzicala din lemn cu manivela si ilustratie delicata, potrivita pentru cadou.',
    'cutiuta muzicala pisicuta manivela cadou lemn',
    '2026-06-09T00:00:00.000Z', '2026-06-09T00:00:00.000Z'
  );

INSERT OR IGNORE INTO product_variants (
  id, product_id, sku, name, melody_id, status, inventory_policy, attributes_json
) VALUES
  ('variant_lotr_rings_standard', 'product_lotr_rings', 'CM-LOTR-RINGS', 'Standard', 'melody_in_dreams', 'active', 'untracked', '{"mechanism":"manual_crank"}'),
  ('variant_hp_always_standard', 'product_hp_always', 'CM-HP-ALWAYS', 'Standard', 'melody_hedwigs_theme', 'active', 'untracked', '{"mechanism":"manual_crank"}'),
  ('variant_hp_keeper_standard', 'product_hp_keeper', 'CM-HP-KEEPER', 'Standard', 'melody_hedwigs_theme', 'active', 'untracked', '{"mechanism":"manual_crank"}'),
  ('variant_halloween_standard', 'product_halloween', 'CM-HALLOWEEN', 'Standard', 'melody_this_is_halloween', 'active', 'untracked', '{"mechanism":"manual_crank"}'),
  ('variant_fairy_standard', 'product_fairy', 'CM-FAIRY', 'Standard', 'melody_a_thousand_years', 'active', 'untracked', '{"mechanism":"manual_crank"}'),
  ('variant_pirates_standard', 'product_pirates', 'CM-PIRATES', 'Standard', 'melody_hes_a_pirate', 'active', 'untracked', '{"mechanism":"manual_crank"}'),
  ('variant_starwars_dad_standard', 'product_starwars_dad', 'CM-STARWARS-DAD', 'Standard', 'melody_imperial_march', 'active', 'untracked', '{"mechanism":"manual_crank"}'),
  ('variant_kitten_standard', 'product_kitten', 'CM-KITTEN', 'Standard', 'melody_la_vie_en_rose', 'active', 'untracked', '{"mechanism":"manual_crank"}');

INSERT OR IGNORE INTO product_melodies (product_id, melody_id, is_default) VALUES
  ('product_lotr_rings', 'melody_in_dreams', 1),
  ('product_hp_always', 'melody_hedwigs_theme', 1),
  ('product_hp_keeper', 'melody_hedwigs_theme', 1),
  ('product_halloween', 'melody_this_is_halloween', 1),
  ('product_fairy', 'melody_a_thousand_years', 1),
  ('product_pirates', 'melody_hes_a_pirate', 1),
  ('product_starwars_dad', 'melody_imperial_march', 1),
  ('product_kitten', 'melody_la_vie_en_rose', 1);

INSERT OR IGNORE INTO price_lists (id, code, name, currency, channel_id, status, priority) VALUES
  ('price_list_website_ron', 'WEBSITE-RON', 'Pret website RON', 'RON', 'channel_website', 'active', 100);

INSERT OR IGNORE INTO price_list_items (id, price_list_id, variant_id, price_bani, min_quantity) VALUES
  ('price_lotr_rings_1', 'price_list_website_ron', 'variant_lotr_rings_standard', 11900, 1),
  ('price_hp_always_1', 'price_list_website_ron', 'variant_hp_always_standard', 11900, 1),
  ('price_hp_keeper_1', 'price_list_website_ron', 'variant_hp_keeper_standard', 11900, 1),
  ('price_halloween_1', 'price_list_website_ron', 'variant_halloween_standard', 11900, 1),
  ('price_fairy_1', 'price_list_website_ron', 'variant_fairy_standard', 11900, 1),
  ('price_pirates_1', 'price_list_website_ron', 'variant_pirates_standard', 11900, 1),
  ('price_starwars_dad_1', 'price_list_website_ron', 'variant_starwars_dad_standard', 11900, 1),
  ('price_kitten_1', 'price_list_website_ron', 'variant_kitten_standard', 11900, 1);

INSERT OR IGNORE INTO inventory_levels (
  id, variant_id, location_id, on_hand_quantity, reserved_quantity, safety_stock_quantity
) VALUES
  ('inventory_lotr_rings_main', 'variant_lotr_rings_standard', 'location_main', 0, 0, 0),
  ('inventory_hp_always_main', 'variant_hp_always_standard', 'location_main', 0, 0, 0),
  ('inventory_hp_keeper_main', 'variant_hp_keeper_standard', 'location_main', 0, 0, 0),
  ('inventory_halloween_main', 'variant_halloween_standard', 'location_main', 0, 0, 0),
  ('inventory_fairy_main', 'variant_fairy_standard', 'location_main', 0, 0, 0),
  ('inventory_pirates_main', 'variant_pirates_standard', 'location_main', 0, 0, 0),
  ('inventory_starwars_dad_main', 'variant_starwars_dad_standard', 'location_main', 0, 0, 0),
  ('inventory_kitten_main', 'variant_kitten_standard', 'location_main', 0, 0, 0);

INSERT OR IGNORE INTO collections (
  id, slug, name, description, collection_type, status, seo_title, seo_description, published_at
) VALUES
  ('collection_all', 'cutiute-muzicale', 'Toate cutiutele muzicale', 'Catalogul complet de cutiute muzicale.', 'manual', 'active', 'Cutiute muzicale din lemn', 'Descopera cutiute muzicale din lemn, cu mecanism manual si manivela.', '2026-06-09T00:00:00.000Z'),
  ('collection_crank', 'cutiute-muzicale-cu-manivela', 'Cutiute muzicale cu manivela', 'Modele actionate manual prin manivela.', 'mechanism', 'active', 'Cutiute muzicale cu manivela', 'Cutiute muzicale cu manivela si mecanism clasic, potrivite pentru cadou.', '2026-06-09T00:00:00.000Z'),
  ('collection_gift', 'cutiute-muzicale-cadou', 'Cutiute muzicale cadou', 'Idei de cadou cu melodie si poveste.', 'occasion', 'active', 'Cutiute muzicale cadou', 'Alege o cutiuta muzicala cadou dupa melodie, poveste si ocazie.', '2026-06-09T00:00:00.000Z');

INSERT OR IGNORE INTO product_collections (collection_id, product_id, sort_order)
SELECT 'collection_all', id, row_number() OVER (ORDER BY slug) FROM products WHERE product_type = 'music_box';

INSERT OR IGNORE INTO product_collections (collection_id, product_id, sort_order)
SELECT 'collection_crank', id, row_number() OVER (ORDER BY slug) FROM products WHERE product_type = 'music_box' AND mechanism_type = 'manual_crank';

INSERT OR IGNORE INTO product_collections (collection_id, product_id, sort_order)
SELECT 'collection_gift', id, row_number() OVER (ORDER BY slug) FROM products WHERE product_type = 'music_box';

INSERT OR IGNORE INTO channel_listings (
  id, channel_id, product_id, variant_id, status, title_override, last_synced_at
)
SELECT
  'listing_website_' || p.slug,
  'channel_website',
  p.id,
  pv.id,
  'active',
  p.name,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM products p
JOIN product_variants pv ON pv.product_id = p.id AND pv.status = 'active'
WHERE p.product_type = 'music_box';

INSERT OR IGNORE INTO integration_accounts (
  id, channel_id, provider, environment, account_label, status, capabilities_json
) VALUES
  ('integration_emag_sandbox', 'channel_emag', 'emag', 'sandbox', 'eMAG Sandbox', 'setup_required', '["pullOrders","pushProduct","pushOffer","pushInventory","pushFulfillment","reconcile"]'),
  ('integration_meta_sandbox', 'channel_facebook', 'meta', 'sandbox', 'Meta Commerce', 'setup_required', '["pushProduct","pushOffer","pushInventory","reconcile"]'),
  ('integration_tiktok_sandbox', 'channel_tiktok', 'tiktok', 'sandbox', 'TikTok Catalog', 'setup_required', '["pushProduct","pushOffer","pushInventory","reconcile"]'),
  ('integration_pinterest_sandbox', 'channel_pinterest', 'pinterest', 'sandbox', 'Pinterest Catalog', 'setup_required', '["pushProduct","pushOffer","pushInventory","reconcile"]');

INSERT OR IGNORE INTO shipping_zones (id, code, name, countries_json, status) VALUES
  ('shipping_zone_ro', 'RO', 'Romania', '["RO"]', 'active');

INSERT OR IGNORE INTO shipping_methods (id, code, name, provider, method_type, status) VALUES
  ('shipping_sameday_home', 'sameday-home', 'Sameday la adresa', 'sameday', 'home_delivery', 'setup_required'),
  ('shipping_sameday_easybox', 'sameday-easybox', 'Sameday Easybox', 'sameday', 'locker', 'setup_required'),
  ('shipping_manual_pickup', 'manual-pickup', 'Ridicare personala', 'manual', 'pickup', 'setup_required');

INSERT OR IGNORE INTO site_settings (key, value_json, visibility, validation_status) VALUES
  ('catalog.scope', '{"allowed_product_types":["music_box"]}', 'public', 'verified'),
  ('commercial.shipping', '{"status":"review_required"}', 'public', 'review_required'),
  ('commercial.returns', '{"status":"review_required"}', 'public', 'review_required'),
  ('commercial.warranty', '{"status":"review_required"}', 'public', 'review_required'),
  ('commercial.tax', '{"status":"review_required"}', 'private', 'review_required'),
  ('integrations.policy', '{"secrets":"cloudflare_secrets","api_only_when_official":true}', 'private', 'verified');

INSERT OR IGNORE INTO product_media (
  id, product_id, media_type, r2_key, alt_text, mime_type, slot_code, title,
  promo_text_ro, file_format, tags_json, usage_type, marketing_approved,
  public_access, sync_to_avyron, status, rights_status, sort_order, is_primary
) VALUES
  ('media_lotr_rings_hero', 'product_lotr_rings', 'image', 'products/product_lotr_rings/images/01-hero.jpg', 'Cutiuță muzicală Stăpânul Inelelor cu manivelă', 'image/jpeg', '01_hero', 'Hero', 'O poveste mică. O emoție mare.', 'jpg', '["hero","lotr","cadou"]', 'hero', 1, 1, 0, 'active', 'review_required', 1, 1),
  ('media_hp_always_hero', 'product_hp_always', 'image', 'products/product_hp_always/images/01-hero.jpg', 'Cutiuță muzicală Harry Potter I Solemnly Swear', 'image/jpeg', '01_hero', 'Hero', 'Magia începe cu o rotire.', 'jpg', '["hero","harry-potter","cadou"]', 'hero', 1, 1, 0, 'active', 'review_required', 1, 1),
  ('media_hp_keeper_hero', 'product_hp_keeper', 'image', 'products/product_hp_keeper/images/01-hero.jpg', 'Cutiuță muzicală Harry Potter I am a Keeper', 'image/jpeg', '01_hero', 'Hero', 'Un dar care păstrează magia.', 'jpg', '["hero","harry-potter","cadou"]', 'hero', 1, 1, 0, 'active', 'review_required', 1, 1),
  ('media_halloween_hero', 'product_halloween', 'image', 'products/product_halloween/images/01-hero.jpg', 'Cutiuță muzicală Halloween din lemn', 'image/jpeg', '01_hero', 'Hero', 'Pornește magia de Halloween.', 'jpg', '["hero","halloween","cadou"]', 'hero', 1, 1, 0, 'active', 'review_required', 1, 1),
  ('media_fairy_hero', 'product_fairy', 'image', 'products/product_fairy/images/01-hero.jpg', 'Cutiuță muzicală cu zână și manivelă', 'image/jpeg', '01_hero', 'Hero', 'Mică cutie, vrajă mare.', 'jpg', '["hero","fantasy","cadou"]', 'hero', 1, 1, 0, 'active', 'review_required', 1, 1),
  ('media_pirates_hero', 'product_pirates', 'image', 'products/product_pirates/images/01-hero.jpg', 'Cutiuță muzicală Pirații Caraibilor', 'image/jpeg', '01_hero', 'Hero', 'Aventura pornește la manivelă.', 'jpg', '["hero","pirati","cadou"]', 'hero', 1, 1, 0, 'active', 'review_required', 1, 1),
  ('media_starwars_dad_hero', 'product_starwars_dad', 'image', 'products/product_starwars_dad/images/01-hero.jpg', 'Cutiuță muzicală Star Wars pentru tata', 'image/jpeg', '01_hero', 'Hero', 'Pentru tata, din toată galaxia.', 'jpg', '["hero","tata","cadou"]', 'hero', 1, 1, 0, 'active', 'review_required', 1, 1),
  ('media_kitten_hero', 'product_kitten', 'image', 'products/product_kitten/images/01-hero.jpg', 'Cutiuță muzicală cu pisicuță', 'image/jpeg', '01_hero', 'Hero', 'Un zâmbet la fiecare rotire.', 'jpg', '["hero","pisica","cadou"]', 'hero', 1, 1, 0, 'active', 'review_required', 1, 1);

PRAGMA optimize;
