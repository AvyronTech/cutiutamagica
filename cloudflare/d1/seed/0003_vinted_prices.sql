-- Prețurile de pe Vinted devin prețurile site-ului, iar oferta de volum (75 RON de la 2 bucăți)
-- se oprește. Serverul calculează comanda din D1, deci fără acest fișier site-ul ar afișa
-- prețurile noi, dar checkout-ul ar încasa 119 RON și ar aplica în continuare reducerea.
-- Idempotent: doar UPDATE-uri. Rulare:
--   npx wrangler d1 execute DB --remote --env production --file=./cloudflare/d1/seed/0003_vinted_prices.sql
PRAGMA foreign_keys = ON;

-- 1. Prețurile pe bucată, ca în anunțuri (bani).
UPDATE price_list_items
SET price_bani = CASE variant_id
    WHEN 'variant_hp_keeper_standard'  THEN 14900
    WHEN 'variant_got_winter_standard' THEN 14900
    WHEN 'variant_halloween_standard'  THEN 13900
    WHEN 'variant_kitten_standard'     THEN 12900
    WHEN 'variant_sunshine_standard'   THEN 12900
    ELSE price_bani
  END
WHERE price_list_id = 'price_list_website_ron'
  AND min_quantity = 1
  AND variant_id IN (
    'variant_hp_keeper_standard',
    'variant_got_winter_standard',
    'variant_halloween_standard',
    'variant_kitten_standard',
    'variant_sunshine_standard'
  );

-- 2. Oprește oferta „75 RON de la 2 cutiuțe” (rămâne în istoric, nu se mai aplică).
UPDATE promotions
SET status = 'ended',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'promotion_website_volume_2';

-- 3. Setarea publică aferentă nu mai e valabilă.
UPDATE site_settings
SET value_json = '{"enabled":false}',
    validation_status = 'verified',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'commercial.volume_pricing';
