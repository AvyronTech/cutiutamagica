PRAGMA foreign_keys = ON;

ALTER TABLE shipping_policy_configs ADD COLUMN sender_name TEXT;
ALTER TABLE shipping_policy_configs ADD COLUMN sender_address TEXT;
ALTER TABLE shipping_policy_configs ADD COLUMN sender_email TEXT;
ALTER TABLE shipping_policy_configs ADD COLUMN sender_phone TEXT;
ALTER TABLE shipping_policy_configs ADD COLUMN sender_city_id INTEGER;
ALTER TABLE shipping_policy_configs ADD COLUMN sender_sector INTEGER NOT NULL DEFAULT 0;
ALTER TABLE shipping_policy_configs ADD COLUMN sender_country_code TEXT NOT NULL DEFAULT 'RO';

INSERT OR IGNORE INTO shipping_methods (id, code, name, provider, method_type, status) VALUES
  ('shipping_smartship_home', 'smartship-home', 'Curier la adresă prin SmartShip', 'smartship', 'home_delivery', 'setup_required'),
  ('shipping_smartship_locker', 'smartship-locker', 'Locker prin SmartShip', 'smartship', 'locker', 'setup_required'),
  ('shipping_smartship_international', 'smartship-international', 'Curier internațional prin SmartShip', 'smartship', 'home_delivery', 'setup_required');

UPDATE schema_metadata
SET value = '16', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
