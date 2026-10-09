PRAGMA foreign_keys = ON;

-- Customer accounts and commerce customers become one identity without renaming the
-- historical review tables used by authentication and Magic Rewards.
ALTER TABLE review_accounts
ADD COLUMN customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX review_accounts_customer_unique
ON review_accounts(customer_id)
WHERE customer_id IS NOT NULL;

INSERT OR IGNORE INTO customers(
  id, account_subject, email, email_normalized, full_name, customer_type, status,
  metadata_json, created_at, updated_at
)
SELECT
  'customer-account-' || id,
  id,
  email,
  lower(trim(email)),
  display_name,
  'registered',
  CASE WHEN status = 'active' THEN 'active' ELSE 'blocked' END,
  json_object('source', 'review_accounts', 'migratedBy', '0052_provider_neutral_billing'),
  created_at,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM review_accounts;

UPDATE review_accounts
SET customer_id = COALESCE(
  customer_id,
  (SELECT customers.id
   FROM customers
   WHERE customers.account_subject = review_accounts.id
   LIMIT 1),
  (SELECT customers.id
   FROM customers
   WHERE customers.email_normalized = lower(trim(review_accounts.email))
   LIMIT 1)
);

-- Public or internal services live beside the physical catalog. They do not loosen
-- the product_type guarantees of the existing products table.
CREATE TABLE service_offerings (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL,
  description_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(description_json)),
  fulfillment_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (fulfillment_mode IN ('manual', 'remote', 'on_site', 'digital')),
  billing_model TEXT NOT NULL DEFAULT 'one_time'
    CHECK (billing_model IN ('one_time', 'recurring', 'hybrid')),
  tax_rate_bps INTEGER NOT NULL DEFAULT 0 CHECK (tax_rate_bps BETWEEN 0 AND 10000),
  customer_visible INTEGER NOT NULL DEFAULT 0 CHECK (customer_visible IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused', 'retired')),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX service_offerings_public_idx
ON service_offerings(status, customer_visible, updated_at DESC);

CREATE TABLE billing_prices (
  id TEXT PRIMARY KEY,
  service_offering_id TEXT REFERENCES service_offerings(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (length(currency) = 3),
  unit_amount_bani INTEGER NOT NULL CHECK (unit_amount_bani >= 0),
  billing_type TEXT NOT NULL DEFAULT 'one_time'
    CHECK (billing_type IN ('one_time', 'recurring')),
  interval_unit TEXT CHECK (interval_unit IS NULL OR interval_unit IN ('day', 'week', 'month', 'year')),
  interval_count INTEGER CHECK (interval_count IS NULL OR interval_count BETWEEN 1 AND 36),
  trial_days INTEGER NOT NULL DEFAULT 0 CHECK (trial_days BETWEEN 0 AND 365),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK ((service_offering_id IS NOT NULL) != (product_id IS NOT NULL)),
  CHECK (
    (billing_type = 'one_time' AND interval_unit IS NULL AND interval_count IS NULL)
    OR
    (billing_type = 'recurring' AND interval_unit IS NOT NULL AND interval_count IS NOT NULL)
  )
);

CREATE INDEX billing_prices_service_idx
ON billing_prices(service_offering_id, status, billing_type);

CREATE INDEX billing_prices_product_idx
ON billing_prices(product_id, status, billing_type);

ALTER TABLE orders
ADD COLUMN commerce_type TEXT NOT NULL DEFAULT 'products'
  CHECK (commerce_type IN ('products', 'services', 'mixed', 'subscription'));

ALTER TABLE order_items
ADD COLUMN item_type TEXT NOT NULL DEFAULT 'product'
  CHECK (item_type IN ('product', 'service'));

ALTER TABLE order_items
ADD COLUMN service_offering_id TEXT REFERENCES service_offerings(id) ON DELETE SET NULL;

ALTER TABLE order_items
ADD COLUMN billing_price_id TEXT REFERENCES billing_prices(id) ON DELETE SET NULL;

CREATE INDEX order_items_service_idx
ON order_items(service_offering_id, created_at DESC)
WHERE service_offering_id IS NOT NULL;

CREATE TRIGGER order_items_billable_guard_insert
BEFORE INSERT ON order_items
BEGIN
  SELECT CASE
    WHEN NEW.item_type = 'product' AND NEW.product_id IS NULL
      THEN RAISE(ABORT, 'ORDER_ITEM_PRODUCT_REQUIRED')
    WHEN NEW.item_type = 'service' AND NEW.service_offering_id IS NULL
      THEN RAISE(ABORT, 'ORDER_ITEM_SERVICE_REQUIRED')
    WHEN NEW.item_type = 'product' AND NEW.service_offering_id IS NOT NULL
      THEN RAISE(ABORT, 'ORDER_ITEM_TYPE_MISMATCH')
    WHEN NEW.item_type = 'service' AND NEW.product_id IS NOT NULL
      THEN RAISE(ABORT, 'ORDER_ITEM_TYPE_MISMATCH')
  END;
END;

CREATE TRIGGER order_items_billable_guard_update
BEFORE UPDATE OF item_type, product_id, service_offering_id ON order_items
BEGIN
  SELECT CASE
    WHEN NEW.item_type = 'product' AND NEW.product_id IS NULL
      THEN RAISE(ABORT, 'ORDER_ITEM_PRODUCT_REQUIRED')
    WHEN NEW.item_type = 'service' AND NEW.service_offering_id IS NULL
      THEN RAISE(ABORT, 'ORDER_ITEM_SERVICE_REQUIRED')
    WHEN NEW.item_type = 'product' AND NEW.service_offering_id IS NOT NULL
      THEN RAISE(ABORT, 'ORDER_ITEM_TYPE_MISMATCH')
    WHEN NEW.item_type = 'service' AND NEW.product_id IS NOT NULL
      THEN RAISE(ABORT, 'ORDER_ITEM_TYPE_MISMATCH')
  END;
END;

-- External identifiers are tokens/references only. PAN, CVC and full card data must
-- never be stored in D1.
CREATE TABLE billing_customers (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'revolut_pay', 'netopia')),
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  external_customer_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'restricted', 'deleted')),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (customer_id, provider, environment),
  UNIQUE (provider, environment, external_customer_id)
);

CREATE TABLE payment_consents (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'revolut_pay', 'netopia')),
  scope TEXT NOT NULL CHECK (scope IN ('save_method', 'off_session', 'subscription')),
  state TEXT NOT NULL CHECK (state IN ('granted', 'withdrawn', 'expired')),
  policy_version TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('checkout', 'account', 'admin_import')),
  request_id TEXT,
  ip_hash TEXT,
  user_agent_hash TEXT,
  granted_at TEXT,
  withdrawn_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX payment_consents_customer_idx
ON payment_consents(customer_id, provider, scope, created_at DESC);

CREATE TABLE customer_payment_methods (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  billing_customer_id TEXT NOT NULL REFERENCES billing_customers(id) ON DELETE CASCADE,
  consent_id TEXT REFERENCES payment_consents(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'revolut_pay', 'netopia')),
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  external_payment_method_id TEXT NOT NULL,
  method_type TEXT NOT NULL DEFAULT 'card' CHECK (method_type IN ('card', 'wallet', 'bank')),
  display_label TEXT NOT NULL,
  brand TEXT,
  last4 TEXT CHECK (last4 IS NULL OR length(last4) = 4),
  expiry_month INTEGER CHECK (expiry_month IS NULL OR expiry_month BETWEEN 1 AND 12),
  expiry_year INTEGER CHECK (expiry_year IS NULL OR expiry_year BETWEEN 2020 AND 2200),
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'deleted')),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (provider, environment, external_payment_method_id)
);

CREATE INDEX customer_payment_methods_customer_idx
ON customer_payment_methods(customer_id, status, is_default DESC, updated_at DESC);

CREATE UNIQUE INDEX customer_payment_methods_default_unique
ON customer_payment_methods(customer_id, provider, environment)
WHERE is_default = 1 AND status = 'active';

CREATE TABLE billing_subscriptions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  billing_price_id TEXT NOT NULL REFERENCES billing_prices(id) ON DELETE RESTRICT,
  payment_method_id TEXT REFERENCES customer_payment_methods(id) ON DELETE SET NULL,
  consent_id TEXT NOT NULL REFERENCES payment_consents(id) ON DELETE RESTRICT,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'revolut_pay', 'netopia')),
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  external_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'incomplete'
    CHECK (status IN ('incomplete', 'trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired')),
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0 CHECK (cancel_at_period_end IN (0, 1)),
  cancelled_at TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (provider, environment, external_subscription_id)
);

CREATE INDEX billing_subscriptions_customer_idx
ON billing_subscriptions(customer_id, status, updated_at DESC);

CREATE TABLE billing_subscription_events (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES billing_subscriptions(id) ON DELETE CASCADE,
  provider_event_id TEXT,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  payload_summary_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(payload_summary_json)),
  occurred_at TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (subscription_id, provider_event_id)
);

CREATE INDEX billing_subscription_events_idx
ON billing_subscription_events(subscription_id, occurred_at DESC);

CREATE TRIGGER billing_subscription_events_immutable_update
BEFORE UPDATE ON billing_subscription_events
BEGIN SELECT RAISE(ABORT, 'SUBSCRIPTION_EVENT_IMMUTABLE'); END;

CREATE TRIGGER billing_subscription_events_immutable_delete
BEFORE DELETE ON billing_subscription_events
BEGIN SELECT RAISE(ABORT, 'SUBSCRIPTION_EVENT_IMMUTABLE'); END;

-- FGO is retired without deleting historical invoices, logs or encrypted credentials.
-- Stripe and Revolut stay unconnected until an administrator explicitly configures them.
UPDATE legal_entities
SET invoice_provider = 'none', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE invoice_provider = 'fgo';

UPDATE provider_configurations
SET status = 'disabled', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE provider = 'fgo';

INSERT OR IGNORE INTO provider_configurations(
  id, provider, capability, environment, secret_binding_names_json, settings_json, status
) VALUES
  ('provider_stripe_saved_methods_sandbox','stripe','saved_payment_methods','sandbox','["STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET"]','{"customerInitiatedOnly":true}','disabled'),
  ('provider_stripe_saved_methods_production','stripe','saved_payment_methods','production','["STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET"]','{"customerInitiatedOnly":true}','disabled'),
  ('provider_stripe_recurring_sandbox','stripe','recurring_payments','sandbox','["STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET"]','{"requiresConsent":true}','disabled'),
  ('provider_stripe_recurring_production','stripe','recurring_payments','production','["STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET"]','{"requiresConsent":true}','disabled'),
  ('provider_revolut_saved_methods_sandbox','revolut_merchant','saved_payment_methods','sandbox','["REVOLUT_MERCHANT_SECRET_KEY","REVOLUT_MERCHANT_WEBHOOK_SECRET"]','{"requiresConsent":true}','disabled'),
  ('provider_revolut_saved_methods_production','revolut_merchant','saved_payment_methods','production','["REVOLUT_MERCHANT_SECRET_KEY","REVOLUT_MERCHANT_WEBHOOK_SECRET"]','{"requiresConsent":true}','disabled'),
  ('provider_revolut_recurring_sandbox','revolut_merchant','recurring_payments','sandbox','["REVOLUT_MERCHANT_SECRET_KEY","REVOLUT_MERCHANT_WEBHOOK_SECRET"]','{"requiresConsent":true}','disabled'),
  ('provider_revolut_recurring_production','revolut_merchant','recurring_payments','production','["REVOLUT_MERCHANT_SECRET_KEY","REVOLUT_MERCHANT_WEBHOOK_SECRET"]','{"requiresConsent":true}','disabled'),
  ('provider_netopia_payments_sandbox','netopia','payments','sandbox','["NETOPIA_API_KEY","NETOPIA_PUBLIC_KEY"]','{"apiVersion":"v2"}','disabled'),
  ('provider_netopia_payments_production','netopia','payments','production','["NETOPIA_API_KEY","NETOPIA_PUBLIC_KEY"]','{"apiVersion":"v2"}','disabled');

UPDATE provider_configurations
SET status = 'disabled', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE provider IN ('stripe', 'revolut_merchant', 'netopia')
  AND capability IN ('payments', 'saved_payment_methods', 'recurring_payments');

UPDATE operational_settings
SET value_json = json_set(
      value_json,
      '$.stripe.enabled', json('false'),
      '$.revolut_pay.enabled', json('false'),
      '$.netopia.enabled', json('false'),
      '$.invoiceProvider', 'none'
    ),
    version = version + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'commerce.checkout';

UPDATE schema_metadata
SET value='52', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key='schema_version';

PRAGMA optimize;
