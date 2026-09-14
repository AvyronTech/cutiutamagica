PRAGMA foreign_keys = ON;

-- Staff identity is asserted by Cloudflare Access. D1 keeps authorization and onboarding state.
ALTER TABLE admin_users ADD COLUMN onboarding_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (onboarding_status IN ('pending', 'profile_required', 'complete'));
ALTER TABLE admin_users ADD COLUMN mfa_required INTEGER NOT NULL DEFAULT 1
  CHECK (mfa_required IN (0, 1));
ALTER TABLE admin_users ADD COLUMN access_email_verified_at TEXT;

CREATE INDEX admin_users_status_idx ON admin_users(status, onboarding_status, email);

CREATE TABLE admin_devices (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'desktop', 'unknown')),
  user_agent_hash TEXT,
  last_seen_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX admin_devices_user_idx ON admin_devices(admin_user_id, revoked_at, last_seen_at DESC);

CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  device_id TEXT REFERENCES admin_devices(id) ON DELETE SET NULL,
  endpoint_hash TEXT NOT NULL UNIQUE,
  endpoint_ciphertext TEXT NOT NULL,
  p256dh_ciphertext TEXT NOT NULL,
  auth_ciphertext TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  last_success_at TEXT,
  last_error_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX push_subscriptions_delivery_idx ON push_subscriptions(status, last_error_at);

CREATE TABLE notification_preferences (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  in_app_enabled INTEGER NOT NULL DEFAULT 1 CHECK (in_app_enabled IN (0, 1)),
  push_enabled INTEGER NOT NULL DEFAULT 1 CHECK (push_enabled IN (0, 1)),
  email_enabled INTEGER NOT NULL DEFAULT 1 CHECK (email_enabled IN (0, 1)),
  sound_enabled INTEGER NOT NULL DEFAULT 0 CHECK (sound_enabled IN (0, 1)),
  minimum_severity TEXT NOT NULL DEFAULT 'info'
    CHECK (minimum_severity IN ('info', 'success', 'warning', 'error', 'critical')),
  quiet_hours_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(quiet_hours_json)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (admin_user_id, event_type)
);

CREATE TABLE notification_deliveries (
  id TEXT PRIMARY KEY,
  notification_id TEXT REFERENCES admin_notifications(id) ON DELETE CASCADE,
  admin_user_id TEXT REFERENCES admin_users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'push', 'email', 'sms', 'webhook')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'queued', 'sent', 'delivered', 'failed', 'suppressed')),
  provider_message_id TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX notification_deliveries_queue_idx
  ON notification_deliveries(status, next_attempt_at, created_at);

CREATE TABLE connector_secret_refs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  account_scope TEXT NOT NULL,
  secret_binding_name TEXT NOT NULL UNIQUE,
  secret_kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'missing' CHECK (status IN ('missing', 'configured', 'rotating', 'revoked')),
  last_verified_at TEXT,
  rotated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX connector_secret_refs_provider_idx ON connector_secret_refs(provider, status);

CREATE TABLE fulfillment_locations (
  id TEXT PRIMARY KEY,
  stock_location_id TEXT REFERENCES stock_locations(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  fulfillment_mode TEXT NOT NULL
    CHECK (fulfillment_mode IN ('own_stock', 'supplier_stock', 'third_party_warehouse', 'marketplace_fulfillment')),
  provider TEXT,
  address_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(address_json)),
  cutoff_time TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Bucharest',
  priority INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'setup_required'
    CHECK (status IN ('active', 'disabled', 'setup_required', 'degraded')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX fulfillment_locations_routing_idx ON fulfillment_locations(status, priority, fulfillment_mode);

CREATE TABLE delivery_provider_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  label TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('sandbox', 'production')),
  secret_ref_id TEXT REFERENCES connector_secret_refs(id) ON DELETE SET NULL,
  capabilities_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(capabilities_json)),
  settings_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(settings_json)),
  status TEXT NOT NULL DEFAULT 'setup_required'
    CHECK (status IN ('active', 'degraded', 'disabled', 'setup_required')),
  last_healthcheck_at TEXT,
  last_error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (provider, label, environment)
);

CREATE TABLE invoice_series (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  next_number INTEGER NOT NULL DEFAULT 1 CHECK (next_number > 0),
  document_type TEXT NOT NULL DEFAULT 'invoice'
    CHECK (document_type IN ('invoice', 'credit_note', 'proforma', 'receipt')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  series_id TEXT REFERENCES invoice_series(id) ON DELETE RESTRICT,
  invoice_number TEXT UNIQUE,
  invoice_type TEXT NOT NULL DEFAULT 'invoice'
    CHECK (invoice_type IN ('invoice', 'credit_note', 'proforma', 'receipt')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'issued', 'paid', 'cancelled', 'credited', 'error')),
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (length(currency) = 3),
  subtotal_bani INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_bani >= 0),
  tax_bani INTEGER NOT NULL DEFAULT 0 CHECK (tax_bani >= 0),
  total_bani INTEGER NOT NULL DEFAULT 0 CHECK (total_bani >= 0),
  issuer_snapshot_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(issuer_snapshot_json)),
  customer_snapshot_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(customer_snapshot_json)),
  issued_at TEXT,
  due_at TEXT,
  paid_at TEXT,
  external_provider TEXT,
  external_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX invoices_status_idx ON invoices(status, issued_at DESC, created_at DESC);
CREATE INDEX invoices_order_idx ON invoices(order_id, invoice_type, created_at DESC);

CREATE TABLE invoice_lines (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  order_item_id TEXT REFERENCES order_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  quantity REAL NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'buc',
  unit_price_bani INTEGER NOT NULL CHECK (unit_price_bani >= 0),
  tax_rate_bps INTEGER NOT NULL DEFAULT 0 CHECK (tax_rate_bps BETWEEN 0 AND 10000),
  subtotal_bani INTEGER NOT NULL CHECK (subtotal_bani >= 0),
  tax_bani INTEGER NOT NULL DEFAULT 0 CHECK (tax_bani >= 0),
  total_bani INTEGER NOT NULL CHECK (total_bani >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX invoice_lines_invoice_idx ON invoice_lines(invoice_id, sort_order);

CREATE TABLE business_documents (
  id TEXT PRIMARY KEY,
  document_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  r2_key TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER CHECK (size_bytes IS NULL OR size_bytes >= 0),
  checksum_sha256 TEXT,
  retention_class TEXT NOT NULL DEFAULT 'business'
    CHECK (retention_class IN ('temporary', 'business', 'fiscal', 'legal_hold')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX business_documents_entity_idx ON business_documents(entity_type, entity_id, created_at DESC);

CREATE TABLE financial_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('bank', 'payment_processor', 'cash', 'marketplace', 'other')),
  label TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (length(currency) = 3),
  masked_identifier TEXT,
  secret_ref_id TEXT REFERENCES connector_secret_refs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'setup_required'
    CHECK (status IN ('active', 'degraded', 'disabled', 'setup_required')),
  settings_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(settings_json)),
  last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (provider, label, currency)
);

CREATE TABLE financial_entries (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES financial_accounts(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL
    CHECK (entry_type IN ('sale', 'fee', 'shipping', 'tax', 'refund', 'payout', 'adjustment', 'cost')),
  direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount_bani INTEGER NOT NULL CHECK (amount_bani >= 0),
  currency TEXT NOT NULL DEFAULT 'RON' CHECK (length(currency) = 3),
  occurred_at TEXT NOT NULL,
  external_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX financial_entries_period_idx ON financial_entries(occurred_at DESC, entry_type);
CREATE INDEX financial_entries_order_idx ON financial_entries(order_id) WHERE order_id IS NOT NULL;

CREATE TABLE report_exports (
  id TEXT PRIMARY KEY,
  report_type TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('csv', 'xlsx', 'pdf', 'xml', 'json')),
  period_start TEXT,
  period_end TEXT,
  filters_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(filters_json)),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'ready', 'failed', 'expired')),
  document_id TEXT REFERENCES business_documents(id) ON DELETE SET NULL,
  requested_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  expires_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT
);

CREATE INDEX report_exports_queue_idx ON report_exports(status, created_at);

CREATE TABLE social_accounts (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('profile', 'page', 'business', 'catalog')),
  external_account_id TEXT,
  label TEXT NOT NULL,
  secret_ref_id TEXT REFERENCES connector_secret_refs(id) ON DELETE SET NULL,
  capabilities_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(capabilities_json)),
  status TEXT NOT NULL DEFAULT 'setup_required'
    CHECK (status IN ('active', 'degraded', 'disabled', 'setup_required')),
  last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (provider, label, account_type)
);

CREATE TABLE social_posts (
  id TEXT PRIMARY KEY,
  account_id TEXT REFERENCES social_accounts(id) ON DELETE SET NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('post', 'story', 'reel', 'video', 'carousel')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'approved', 'scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  caption TEXT NOT NULL DEFAULT '',
  media_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(media_json)),
  campaign_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(campaign_json)),
  scheduled_at TEXT,
  published_at TEXT,
  external_post_id TEXT,
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  approved_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  last_error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX social_posts_schedule_idx ON social_posts(status, scheduled_at);

CREATE TABLE newsletter_subscribers (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  email_normalized TEXT NOT NULL COLLATE NOCASE UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'unsubscribed', 'bounced', 'complained')),
  consent_event_id TEXT REFERENCES consent_events(id) ON DELETE SET NULL,
  confirmation_token_hash TEXT,
  confirmed_at TEXT,
  unsubscribed_at TEXT,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX newsletter_subscribers_status_idx ON newsletter_subscribers(status, created_at DESC);

CREATE TABLE newsletter_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preheader TEXT,
  content_r2_key TEXT,
  audience_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(audience_json)),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'approved', 'scheduled', 'sending', 'sent', 'cancelled', 'failed')),
  scheduled_at TEXT,
  sent_at TEXT,
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  approved_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX newsletter_campaigns_schedule_idx ON newsletter_campaigns(status, scheduled_at);

CREATE TABLE ai_agents (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL,
  model_binding TEXT NOT NULL DEFAULT 'AI',
  allowed_tools_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(allowed_tools_json)),
  approval_policy TEXT NOT NULL DEFAULT 'always'
    CHECK (approval_policy IN ('always', 'risk_based', 'read_only')),
  max_actions_per_run INTEGER NOT NULL DEFAULT 10 CHECK (max_actions_per_run BETWEEN 1 AND 100),
  status TEXT NOT NULL DEFAULT 'disabled' CHECK (status IN ('active', 'paused', 'disabled', 'setup_required')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE ai_knowledge_sources (
  id TEXT PRIMARY KEY,
  agent_id TEXT REFERENCES ai_agents(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('official_docs', 'site_data', 'market_research', 'analytics', 'catalog', 'policy')),
  label TEXT NOT NULL,
  source_url TEXT,
  r2_key TEXT,
  trust_level TEXT NOT NULL DEFAULT 'review_required'
    CHECK (trust_level IN ('verified', 'review_required', 'blocked')),
  refresh_interval_hours INTEGER CHECK (refresh_interval_hours IS NULL OR refresh_interval_hours > 0),
  last_checked_at TEXT,
  checksum_sha256 TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (source_url IS NOT NULL OR r2_key IS NOT NULL)
);

CREATE INDEX ai_knowledge_sources_refresh_idx ON ai_knowledge_sources(status, last_checked_at);

CREATE TABLE ai_runs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES ai_agents(id) ON DELETE RESTRICT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'scheduled', 'event')),
  input_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(input_json)),
  output_json TEXT CHECK (output_json IS NULL OR json_valid(output_json)),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'awaiting_approval', 'completed', 'failed', 'cancelled')),
  token_count INTEGER CHECK (token_count IS NULL OR token_count >= 0),
  estimated_cost_microunits INTEGER CHECK (estimated_cost_microunits IS NULL OR estimated_cost_microunits >= 0),
  requested_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  started_at TEXT,
  completed_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX ai_runs_queue_idx ON ai_runs(status, created_at);

CREATE TABLE approval_requests (
  id TEXT PRIMARY KEY,
  request_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  summary TEXT NOT NULL,
  proposed_action_json TEXT NOT NULL CHECK (json_valid(proposed_action_json)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'executed')),
  requested_by_agent_id TEXT REFERENCES ai_agents(id) ON DELETE SET NULL,
  requested_by_admin_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX approval_requests_queue_idx ON approval_requests(status, risk_level, created_at);

-- The owner role must exist before the initial staff accounts are assigned.
-- 0006 repeats these inserts with OR IGNORE so upgrades from older snapshots remain safe.
INSERT OR IGNORE INTO roles (id, code, name, description, system_role)
VALUES ('role_owner', 'owner', 'Proprietar', 'Acces complet la administrarea afacerii.', 1);

INSERT OR IGNORE INTO permissions (id, code, description) VALUES
  ('perm_dashboard_read', 'dashboard.read', 'Vizualizează dashboardul și alertele.'),
  ('perm_orders_read', 'orders.read', 'Vizualizează comenzile.'),
  ('perm_orders_write', 'orders.write', 'Modifică comenzile și notele.'),
  ('perm_refunds_write', 'refunds.write', 'Inițiază rambursări.'),
  ('perm_catalog_read', 'catalog.read', 'Vizualizează catalogul.'),
  ('perm_catalog_write', 'catalog.write', 'Modifică produse, variante și media.'),
  ('perm_inventory_read', 'inventory.read', 'Vizualizează stocul.'),
  ('perm_inventory_write', 'inventory.write', 'Ajustează și rezervă stoc.'),
  ('perm_promotions_read', 'promotions.read', 'Vizualizează promoțiile.'),
  ('perm_promotions_write', 'promotions.write', 'Creează și publică promoții.'),
  ('perm_integrations_read', 'integrations.read', 'Vizualizează integrările și joburile.'),
  ('perm_integrations_write', 'integrations.write', 'Configurează și reexecută integrări.'),
  ('perm_content_write', 'content.write', 'Modifică SEO și conținut editorial.'),
  ('perm_reports_read', 'reports.read', 'Vizualizează rapoarte.'),
  ('perm_team_write', 'team.write', 'Administrează echipa și rolurile.'),
  ('perm_audit_read', 'audit.read', 'Vizualizează jurnalul de audit.');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 'role_owner', id FROM permissions;

INSERT OR IGNORE INTO admin_users (
  id, external_subject, email, display_name, status, onboarding_status, mfa_required
) VALUES
  ('admin_cutiutamagica_gmail', 'pending:cutiutamagica@gmail.com', 'cutiutamagica@gmail.com', 'Cutiuța Magică', 'invited', 'pending', 1),
  ('admin_prometheus_avyron', 'pending:prometheus@avyron.eu', 'prometheus@avyron.eu', 'Prometheus', 'invited', 'pending', 1),
  ('admin_ana_cutiutamagica', 'pending:ana@cutiutamagica.ro', 'ana@cutiutamagica.ro', 'Ana', 'invited', 'pending', 1),
  ('admin_avyrontech_gmail', 'pending:avyrontech@gmail.com', 'avyrontech@gmail.com', 'AvyronTech', 'invited', 'pending', 1);

INSERT OR IGNORE INTO admin_user_roles (admin_user_id, role_id)
SELECT id, 'role_owner' FROM admin_users
WHERE email IN (
  'cutiutamagica@gmail.com',
  'prometheus@avyron.eu',
  'ana@cutiutamagica.ro',
  'avyrontech@gmail.com'
);

INSERT OR IGNORE INTO connector_secret_refs (
  id, provider, account_scope, secret_binding_name, secret_kind
) VALUES
  ('secret_smartship', 'smartship', 'shipping', 'SMARTSHIP_API_KEY', 'api_key'),
  ('secret_emag', 'emag', 'marketplace', 'EMAG_API_CREDENTIALS', 'api_credentials'),
  ('secret_olx', 'olx', 'marketplace', 'OLX_API_CREDENTIALS', 'oauth_credentials'),
  ('secret_trendyol', 'trendyol', 'marketplace', 'TRENDYOL_API_CREDENTIALS', 'api_credentials'),
  ('secret_meta', 'meta', 'marketplace_social', 'META_API_CREDENTIALS', 'oauth_credentials'),
  ('secret_tiktok', 'tiktok', 'social', 'TIKTOK_API_CREDENTIALS', 'oauth_credentials'),
  ('secret_stripe', 'stripe', 'payments', 'STRIPE_SECRET_KEY', 'api_key'),
  ('secret_revolut', 'revolut_business', 'payments', 'REVOLUT_API_CREDENTIALS', 'api_credentials'),
  ('secret_email', 'transactional_email', 'email', 'EMAIL_API_CREDENTIALS', 'api_credentials');

INSERT OR IGNORE INTO delivery_provider_accounts (
  id, provider, label, secret_ref_id, capabilities_json, status
) VALUES (
  'delivery_smartship', 'smartship', 'SmartShip principal', 'secret_smartship',
  '["rates","awb_create","awb_cancel","pickup","tracking","locker"]', 'setup_required'
);

INSERT OR IGNORE INTO financial_accounts (
  id, provider, account_type, label, secret_ref_id, status
) VALUES
  ('financial_stripe', 'stripe', 'payment_processor', 'Stripe', 'secret_stripe', 'setup_required'),
  ('financial_revolut', 'revolut_business', 'bank', 'Revolut Business', 'secret_revolut', 'setup_required');

INSERT OR IGNORE INTO ai_agents (
  id, code, name, purpose, allowed_tools_json, approval_policy, status
) VALUES
  ('agent_seo', 'seo_analyst', 'Analist SEO', 'Audit tehnic, intenții de căutare și recomandări de conținut.', '["read_catalog","read_analytics","propose_content"]', 'always', 'setup_required'),
  ('agent_market', 'market_analyst', 'Analist de piață', 'Analiză concurențială locală și națională din surse aprobate.', '["read_catalog","read_analytics","research_web","propose_report"]', 'read_only', 'setup_required'),
  ('agent_content', 'content_studio', 'Studio conținut', 'Propuneri pentru postări, newsletter și descrieri de produs.', '["read_catalog","propose_social_post","propose_newsletter"]', 'always', 'setup_required'),
  ('agent_operations', 'operations_assistant', 'Asistent operațional', 'Detectează erori de sincronizare, stoc și comenzi și propune acțiuni.', '["read_orders","read_inventory","read_sync_jobs","propose_action"]', 'always', 'setup_required');

UPDATE schema_metadata
SET value = '5', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';
