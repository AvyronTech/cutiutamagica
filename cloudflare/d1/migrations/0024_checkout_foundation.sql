-- Checkout choice and payment creation are persisted before contacting a provider.
ALTER TABLE orders ADD COLUMN payment_provider_requested TEXT
  CHECK(payment_provider_requested IS NULL OR payment_provider_requested IN ('stripe','revolut_pay','netopia'));
ALTER TABLE payment_attempts ADD COLUMN environment TEXT NOT NULL DEFAULT 'sandbox'
  CHECK(environment IN ('sandbox','production'));
ALTER TABLE shipping_quotes ADD COLUMN delivery_estimate TEXT;
-- One attempt per website order prevents two providers collecting the same order.
CREATE UNIQUE INDEX payment_attempts_website_checkout_unique ON payment_attempts(order_id)
  WHERE idempotency_key LIKE 'website-checkout/%';
INSERT OR IGNORE INTO provider_configurations(id,provider,capability,environment,secret_binding_names_json)
VALUES
 ('provider_revolut_merchant_sandbox','revolut_merchant','payments','sandbox','["REVOLUT_MERCHANT_SECRET_KEY","REVOLUT_MERCHANT_WEBHOOK_SECRET"]'),
 ('provider_revolut_merchant_production','revolut_merchant','payments','production','["REVOLUT_MERCHANT_SECRET_KEY","REVOLUT_MERCHANT_WEBHOOK_SECRET"]'),
 ('provider_oblio_sandbox','oblio','invoicing','sandbox','["OBLIO_CLIENT_SECRET"]'),
 ('provider_oblio_production','oblio','invoicing','production','["OBLIO_CLIENT_SECRET"]');
ALTER TABLE orders ADD COLUMN shipping_quote_id TEXT REFERENCES shipping_quotes(id);
CREATE TRIGGER website_shipping_quote_guard BEFORE INSERT ON orders
WHEN NEW.shipping_quote_id IS NOT NULL BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM shipping_quotes q WHERE q.id=NEW.shipping_quote_id
   AND q.order_id IS NULL AND q.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')
   AND q.amount_bani=NEW.shipping_bani AND q.currency=NEW.currency)
 THEN RAISE(ABORT,'SHIPPING_QUOTE_EXPIRED') END;
END;
CREATE TRIGGER website_shipping_quote_claim AFTER INSERT ON orders
WHEN NEW.shipping_quote_id IS NOT NULL BEGIN
 UPDATE shipping_quotes SET order_id=NEW.id,selected_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.shipping_quote_id;
END;
-- Do not change the amount of an order while a hosted payment can still collect it.
CREATE TRIGGER website_payment_amount_lock BEFORE UPDATE OF total_bani,currency ON orders
WHEN (NEW.total_bani!=OLD.total_bani OR NEW.currency!=OLD.currency)
 AND EXISTS(SELECT 1 FROM payment_attempts p WHERE p.order_id=OLD.id
   AND p.idempotency_key LIKE 'website-checkout/%' AND p.status IN ('created','pending','authorized','captured')) BEGIN
 SELECT RAISE(ABORT,'PAYMENT_AMOUNT_LOCKED');
END;
