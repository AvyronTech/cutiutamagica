-- Snapshot the server-validated Easybox address together with the short-lived quote.
-- Orders already expose pickup_point_provider/pickup_point_id on order_addresses.

ALTER TABLE shipping_quotes ADD COLUMN locker_name TEXT;
ALTER TABLE shipping_quotes ADD COLUMN locker_address TEXT;
ALTER TABLE shipping_quotes ADD COLUMN locker_city TEXT;
ALTER TABLE shipping_quotes ADD COLUMN locker_county TEXT;
ALTER TABLE shipping_quotes ADD COLUMN locker_postal_code TEXT;
ALTER TABLE shipping_quotes ADD COLUMN locker_latitude REAL;
ALTER TABLE shipping_quotes ADD COLUMN locker_longitude REAL;

UPDATE schema_metadata
SET value = '40', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
