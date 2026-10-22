-- Preserve the sector used in the live quote through order creation and AWB issuance.
ALTER TABLE shipping_quotes ADD COLUMN recipient_sector INTEGER NOT NULL DEFAULT 0
  CHECK (recipient_sector BETWEEN 0 AND 6);
ALTER TABLE order_addresses ADD COLUMN sector INTEGER NOT NULL DEFAULT 0
  CHECK (sector BETWEEN 0 AND 6);

UPDATE schema_metadata SET value='66',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';
