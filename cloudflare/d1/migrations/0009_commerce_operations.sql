PRAGMA foreign_keys = ON;

CREATE TABLE legal_entities (
  id TEXT PRIMARY KEY,
  legal_name TEXT NOT NULL,
  tax_id TEXT NOT NULL UNIQUE,
  registration_number TEXT,
  vat_status TEXT NOT NULL CHECK (vat_status IN ('non_vat_payer', 'vat_payer', 'oss')),
  country_code TEXT NOT NULL DEFAULT 'RO' CHECK (length(country_code) = 2),
  registered_address TEXT,
  public_email TEXT,
  public_phone TEXT,
  bank_name TEXT,
  iban_masked TEXT,
  invoice_provider TEXT NOT NULL DEFAULT 'fgo',
  status TEXT NOT NULL DEFAULT 'incomplete'
    CHECK (status IN ('incomplete', 'verified', 'inactive')),
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE provider_configurations (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  capability TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'sandbox'
    CHECK (environment IN ('sandbox', 'production')),
  secret_binding_names_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(secret_binding_names_json)),
  settings_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(settings_json)),
  status TEXT NOT NULL DEFAULT 'setup_required'
    CHECK (status IN ('setup_required', 'ready_for_test', 'active', 'degraded', 'disabled')),
  last_healthcheck_at TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (provider, capability, environment)
);

CREATE TABLE provider_operations (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  idempotency_key TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  external_id TEXT,
  request_hash TEXT,
  response_code INTEGER,
  response_summary_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(response_summary_json)),
  error_code TEXT,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_retry_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (provider, idempotency_key)
);

CREATE INDEX provider_operations_queue_idx
  ON provider_operations(provider, status, next_retry_at, created_at);
CREATE INDEX provider_operations_entity_idx
  ON provider_operations(entity_type, entity_id, created_at DESC);

CREATE TABLE policy_versions (
  id TEXT PRIMARY KEY,
  policy_type TEXT NOT NULL
    CHECK (policy_type IN ('terms', 'privacy', 'returns', 'warranty', 'shipping', 'cod', 'marketing_consent')),
  version TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'ro-RO',
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(content_json)),
  legal_basis_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(legal_basis_json)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'active', 'retired')),
  effective_at TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (policy_type, version, locale)
);

CREATE UNIQUE INDEX policy_versions_active_unique
  ON policy_versions(policy_type, locale) WHERE status = 'active';

CREATE TABLE consent_templates (
  id TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('checkout', 'newsletter', 'email', 'sms', 'whatsapp')),
  locale TEXT NOT NULL DEFAULT 'ro-RO',
  version TEXT NOT NULL,
  text TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 0 CHECK (required IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'retired')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (purpose, channel, locale, version)
);

CREATE TABLE shipping_policy_configs (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (currency IN ('RON', 'EUR')),
  standard_price_bani INTEGER CHECK (standard_price_bani IS NULL OR standard_price_bani >= 0),
  locker_price_bani INTEGER CHECK (locker_price_bani IS NULL OR locker_price_bani >= 0),
  free_over_bani INTEGER CHECK (free_over_bani IS NULL OR free_over_bani >= 0),
  default_weight_g INTEGER NOT NULL DEFAULT 350 CHECK (default_weight_g > 0),
  default_length_cm INTEGER NOT NULL DEFAULT 12 CHECK (default_length_cm > 0),
  default_width_cm INTEGER NOT NULL DEFAULT 8 CHECK (default_width_cm > 0),
  default_height_cm INTEGER NOT NULL DEFAULT 6 CHECK (default_height_cm > 0),
  allowed_countries_json TEXT NOT NULL DEFAULT '["RO"]' CHECK (json_valid(allowed_countries_json)),
  easybox_enabled INTEGER NOT NULL DEFAULT 0 CHECK (easybox_enabled IN (0, 1)),
  use_live_quotes INTEGER NOT NULL DEFAULT 0 CHECK (use_live_quotes IN (0, 1)),
  validation_status TEXT NOT NULL DEFAULT 'requires_approval'
    CHECK (validation_status IN ('requires_approval', 'verified', 'disabled')),
  updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE shipping_quotes (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_quote_id TEXT,
  method_code TEXT NOT NULL,
  courier_id INTEGER,
  courier_name TEXT,
  locker_id TEXT,
  amount_bani INTEGER NOT NULL CHECK (amount_bani >= 0),
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (currency IN ('RON', 'EUR')),
  own_contract INTEGER NOT NULL DEFAULT 0 CHECK (own_contract IN (0, 1)),
  request_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  selected_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX shipping_quotes_order_idx ON shipping_quotes(order_id, created_at DESC);
CREATE INDEX shipping_quotes_expiry_idx ON shipping_quotes(expires_at);

CREATE TABLE return_requests (
  id TEXT PRIMARY KEY,
  return_number TEXT NOT NULL UNIQUE,
  public_token_hash TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL
    CHECK (request_type IN ('withdrawal', 'nonconformity', 'damaged', 'wrong_item', 'other')),
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'eligibility_review', 'approved', 'rejected', 'in_transit', 'received', 'inspecting', 'refund_pending', 'refunded', 'closed', 'cancelled')),
  resolution TEXT CHECK (resolution IS NULL OR resolution IN ('refund', 'replacement', 'repair', 'price_reduction', 'rejected')),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL COLLATE NOCASE,
  customer_phone_e164 TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  preferred_resolution TEXT NOT NULL DEFAULT 'refund'
    CHECK (preferred_resolution IN ('refund', 'replacement', 'repair', 'price_reduction')),
  delivery_date TEXT,
  withdrawal_deadline TEXT,
  eligibility_status TEXT NOT NULL DEFAULT 'manual_review'
    CHECK (eligibility_status IN ('eligible', 'manual_review', 'not_eligible')),
  personalized_items_present INTEGER NOT NULL DEFAULT 0 CHECK (personalized_items_present IN (0, 1)),
  return_shipping_payer TEXT NOT NULL DEFAULT 'customer'
    CHECK (return_shipping_payer IN ('customer', 'merchant', 'provider', 'pending')),
  refund_amount_bani INTEGER CHECK (refund_amount_bani IS NULL OR refund_amount_bani >= 0),
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (currency IN ('RON', 'EUR')),
  submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  approved_at TEXT,
  received_at TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX return_requests_status_idx ON return_requests(status, submitted_at DESC);
CREATE INDEX return_requests_order_idx ON return_requests(order_id, submitted_at DESC);

CREATE TABLE return_request_items (
  id TEXT PRIMARY KEY,
  return_request_id TEXT NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  condition_code TEXT NOT NULL DEFAULT 'unverified'
    CHECK (condition_code IN ('unverified', 'unopened', 'opened', 'used', 'damaged', 'defective')),
  inspection_notes TEXT,
  approved_quantity INTEGER CHECK (approved_quantity IS NULL OR approved_quantity >= 0),
  UNIQUE (return_request_id, order_item_id)
);

CREATE TABLE return_events (
  id TEXT PRIMARY KEY,
  return_request_id TEXT NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('customer', 'admin', 'system', 'integration')),
  actor_id TEXT,
  message TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX return_events_request_idx ON return_events(return_request_id, created_at DESC);

CREATE TRIGGER return_events_immutable_update BEFORE UPDATE ON return_events
BEGIN SELECT RAISE(ABORT, 'RETURN_EVENT_IMMUTABLE'); END;
CREATE TRIGGER return_events_immutable_delete BEFORE DELETE ON return_events
BEGIN SELECT RAISE(ABORT, 'RETURN_EVENT_IMMUTABLE'); END;

CREATE TABLE product_documents (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES product_media(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL
    CHECK (document_type IN ('origin', 'conformity', 'warranty', 'rights', 'license', 'supplier_invoice', 'safety', 'instructions', 'other')),
  document_number TEXT,
  issuer TEXT,
  jurisdiction TEXT NOT NULL DEFAULT 'RO',
  valid_from TEXT,
  valid_until TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'verified', 'rejected', 'expired')),
  notes TEXT,
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  verified_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (product_id, media_id)
);

CREATE INDEX product_documents_review_idx
  ON product_documents(product_id, review_status, document_type);

CREATE TABLE product_identifier_sources (
  id TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('GTIN', 'EAN', 'SKU', 'MPN')),
  identifier_value TEXT NOT NULL,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('gs1', 'manufacturer', 'supplier', 'marketplace', 'internal')),
  source_reference TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (identifier_type, identifier_value)
);

CREATE TABLE product_margin_policies (
  id TEXT PRIMARY KEY,
  channel_id TEXT REFERENCES sales_channels(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (currency IN ('RON', 'EUR')),
  minimum_margin_bps INTEGER NOT NULL DEFAULT 4000 CHECK (minimum_margin_bps BETWEEN 0 AND 10000),
  target_margin_bps INTEGER NOT NULL DEFAULT 5500 CHECK (target_margin_bps BETWEEN 0 AND 10000),
  include_shipping_cost INTEGER NOT NULL DEFAULT 1 CHECK (include_shipping_cost IN (0, 1)),
  include_marketplace_fees INTEGER NOT NULL DEFAULT 1 CHECK (include_marketplace_fees IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'disabled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (channel_id, currency)
);

CREATE TABLE order_risk_assessments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  decision TEXT NOT NULL CHECK (decision IN ('allow', 'review', 'require_prepaid', 'block')),
  factors_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(factors_json)),
  policy_version TEXT NOT NULL,
  assessed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (order_id, policy_version)
);

CREATE TABLE cod_delivery_incidents (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  incident_type TEXT NOT NULL
    CHECK (incident_type IN ('unclaimed', 'refused', 'invalid_address', 'unreachable', 'fraud_suspected', 'resolved')),
  severity INTEGER NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  notes TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX cod_delivery_incidents_customer_idx
  ON cod_delivery_incidents(customer_id, resolved_at, created_at DESC);

CREATE TABLE market_locales (
  id TEXT PRIMARY KEY,
  market_code TEXT NOT NULL UNIQUE,
  countries_json TEXT NOT NULL CHECK (json_valid(countries_json)),
  currency TEXT NOT NULL CHECK (currency IN ('RON', 'EUR')),
  locales_json TEXT NOT NULL CHECK (json_valid(locales_json)),
  price_list_id TEXT REFERENCES price_lists(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('active', 'planned', 'disabled')),
  launch_target TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

ALTER TABLE orders ADD COLUMN payment_method_requested TEXT NOT NULL DEFAULT 'cash_on_delivery'
  CHECK (payment_method_requested IN ('cash_on_delivery', 'card', 'bank_transfer'));
ALTER TABLE orders ADD COLUMN shipping_option_requested TEXT NOT NULL DEFAULT 'home_delivery'
  CHECK (shipping_option_requested IN ('home_delivery', 'easybox', 'manual_confirmation'));
ALTER TABLE orders ADD COLUMN checkout_consent_version TEXT;

INSERT INTO legal_entities (
  id, legal_name, tax_id, vat_status, country_code, public_email, invoice_provider, status
) VALUES (
  'legal_entity_main', 'DIGITAL ECO TECH SOLUTION SRL', '55055976',
  'non_vat_payer', 'RO', 'cutiutamagica@gmail.com', 'fgo', 'incomplete'
);

INSERT INTO provider_configurations (
  id, provider, capability, environment, secret_binding_names_json, settings_json, status
) VALUES
  ('provider_fgo_sandbox', 'fgo', 'invoicing', 'sandbox', '["FGO_PRIVATE_KEY"]',
   '{"base_url":"https://api-testuat.fgo.ro/v1","tax_id":"55055976","series":"CM","vat_payer":false,"rate_limit_per_second":1}', 'setup_required'),
  ('provider_fgo_production', 'fgo', 'invoicing', 'production', '["FGO_PRIVATE_KEY"]',
   '{"base_url":"https://api.fgo.ro/v1","tax_id":"55055976","series":"CM","vat_payer":false,"rate_limit_per_second":1}', 'setup_required'),
  ('provider_stripe_sandbox', 'stripe', 'payments', 'sandbox', '["STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET"]',
   '{"currency":["RON","EUR"],"capture_method":"automatic","checkout_mode":"payment"}', 'setup_required'),
  ('provider_stripe_production', 'stripe', 'payments', 'production', '["STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET"]',
   '{"currency":["RON","EUR"],"capture_method":"automatic","checkout_mode":"payment"}', 'setup_required'),
  ('provider_smartship_production', 'smartship', 'shipping', 'production', '["SMARTSHIP_API_KEY"]',
   '{"base_url":"https://api.smartship.ro","show_byoc":false,"easybox_courier_id":12,"quote_before_awb":true}', 'setup_required'),
  ('provider_resend_production', 'resend', 'email', 'production', '["RESEND_API_KEY","RESEND_WEBHOOK_SECRET"]',
   '{"from":"Cutiuța Magică <comenzi@cutiutamagica.eu>","reply_to":"cutiutamagica@gmail.com"}', 'setup_required');

INSERT INTO shipping_policy_configs (
  id, code, standard_price_bani, locker_price_bani, free_over_bani,
  default_weight_g, default_length_cm, default_width_cm, default_height_cm,
  easybox_enabled, use_live_quotes, validation_status
) VALUES (
  'shipping_policy_ro', 'RO_STANDARD', NULL, NULL, NULL,
  350, 12, 8, 6, 0, 0, 'requires_approval'
);

INSERT INTO policy_versions (
  id, policy_type, version, title, summary, content_json, legal_basis_json,
  status, effective_at, reviewed_by
) VALUES
  ('policy_returns_ro_2026_09', 'returns', '2026.09', 'Retur și drept de retragere',
   'Consumatorul poate comunica retragerea în 14 zile de la primirea produsului. Produsele personalizate clar pot intra în excepția legală, analizată individual.',
   '{"withdrawal_days":14,"return_dispatch_days":14,"merchant_refund_days":14,"direct_return_cost_default":"customer","standard_delivery_refund":true,"personalized_goods_manual_review":true,"electronic_form_acknowledgement":true}',
   '[{"act":"OUG 34/2014","articles":[9,11,13,14,16]},{"act":"Directiva 2011/83/UE","articles":[9,13,14,16]}]',
   'active', '2026-09-15T00:00:00.000Z', 'Codex; validare juridică externă recomandată'),
  ('policy_warranty_ro_2026_09', 'warranty', '2026.09', 'Garanția legală de conformitate',
   'Pentru consumatori se aplică garanția legală minimă de conformitate de doi ani și remediile prevăzute de lege.',
   '{"legal_guarantee_months":24,"remedies":["repair","replacement","price_reduction","refund"],"repair_or_replace_max_calendar_days":15}',
   '[{"act":"OUG 140/2021","articles":[9,11,12]},{"act":"Directiva (UE) 2019/771","articles":[10,13,14]}]',
   'active', '2026-09-15T00:00:00.000Z', 'Codex; validare juridică externă recomandată'),
  ('policy_cod_ro_2026_09', 'cod', '2026.09', 'Comenzi cu plata ramburs',
   'Comenzile ramburs sunt evaluate proporțional pe baza incidentelor documentate. Deciziile sensibile necesită verificare umană.',
   '{"base_score":0,"unclaimed_points":35,"refused_points":25,"invalid_address_points":15,"unreachable_points":10,"review_threshold":35,"prepaid_threshold":60,"block_threshold":90,"manual_override_required":true,"retention_days":730}',
   '[]', 'active', '2026-09-15T00:00:00.000Z', 'Politică operațională internă');

INSERT INTO consent_templates (
  id, purpose, channel, version, text, required, status
) VALUES
  ('consent_checkout_terms_v1', 'contract_and_privacy', 'checkout', '2026.09',
   'Confirm că datele comenzii sunt corecte și că am citit informațiile despre livrare, plată, retur și confidențialitate.', 1, 'active'),
  ('consent_newsletter_v1', 'direct_marketing', 'newsletter', '2026.09',
   'Sunt de acord să primesc prin e-mail noutăți și oferte de la Cutiuța Magică. Mă pot dezabona oricând.', 0, 'active'),
  ('consent_whatsapp_v1', 'direct_marketing', 'whatsapp', '2026.09',
   'Sunt de acord să primesc mesaje promoționale pe WhatsApp. Consimțământul poate fi retras oricând.', 0, 'draft');

INSERT INTO product_margin_policies (
  id, channel_id, currency, minimum_margin_bps, target_margin_bps, status
) VALUES
  ('margin_website_ron', 'channel_website', 'RON', 4000, 5500, 'draft'),
  ('margin_emag_ron', 'channel_emag', 'RON', 4000, 5500, 'draft');

INSERT INTO market_locales (
  id, market_code, countries_json, currency, locales_json, status, launch_target
) VALUES
  ('market_ro', 'RO', '["RO"]', 'RON', '["ro-RO"]', 'active', NULL),
  ('market_eu', 'EU', '["AT","BE","BG","CY","CZ","DE","DK","EE","ES","FI","FR","GR","HR","HU","IE","IT","LT","LU","LV","MT","NL","PL","PT","SE","SI","SK"]', 'EUR', '["en-EU"]', 'planned', '2027-Q3');

INSERT OR IGNORE INTO connector_secret_refs (
  id, provider, account_scope, secret_binding_name, secret_kind
) VALUES
  ('secret_fgo', 'fgo', 'invoicing', 'FGO_PRIVATE_KEY', 'private_key'),
  ('secret_stripe_webhook', 'stripe', 'payments', 'STRIPE_WEBHOOK_SECRET', 'webhook_secret'),
  ('secret_resend_webhook', 'resend', 'email', 'RESEND_WEBHOOK_SECRET', 'webhook_secret');

INSERT INTO site_settings (key, value_json, visibility, validation_status)
VALUES
  ('business.legal_entity', '{"legal_name":"DIGITAL ECO TECH SOLUTION SRL","tax_id":"55055976","vat_status":"non_vat_payer","country":"RO","invoice_provider":"FGO"}', 'public', 'verified'),
  ('commerce.supported_currencies', '{"active":["RON"],"planned":["EUR"]}', 'public', 'verified'),
  ('commerce.gtin_policy', '{"accepted_sources":["gs1","manufacturer","supplier"],"manual_internal_gtin":false,"verification_required":true}', 'private', 'verified'),
  ('commerce.margin_policy', '{"minimum_margin_bps":4000,"target_margin_bps":5500,"status":"draft_until_costs_verified"}', 'private', 'review_required')
ON CONFLICT(key) DO UPDATE SET
  value_json = excluded.value_json,
  visibility = excluded.visibility,
  validation_status = excluded.validation_status,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');

UPDATE invoice_series
SET prefix = 'CM', status = 'draft', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'invoice_series_main';

UPDATE connector_secret_refs
SET provider = 'resend', account_scope = 'email', secret_binding_name = 'RESEND_API_KEY',
    secret_kind = 'api_key', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'secret_email';

UPDATE schema_metadata
SET value = '9', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
