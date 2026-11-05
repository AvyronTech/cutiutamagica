-- One first-order delivery benefit per authenticated customer, claimed atomically
-- in the order transaction. The constraint also guards competing guest orders.
CREATE TABLE first_order_shipping_redemptions (
  account_id TEXT PRIMARY KEY NOT NULL REFERENCES review_accounts(id),
  order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
  first_order_verified INTEGER NOT NULL CHECK(first_order_verified=1),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
UPDATE schema_metadata SET value='90' WHERE key='schema_version';
