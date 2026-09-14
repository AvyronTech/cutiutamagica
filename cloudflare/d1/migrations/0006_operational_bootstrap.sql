PRAGMA foreign_keys = ON;

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

INSERT OR IGNORE INTO admin_user_roles (admin_user_id, role_id)
SELECT id, 'role_owner' FROM admin_users
WHERE email IN (
  'cutiutamagica@gmail.com',
  'prometheus@avyron.eu',
  'ana@cutiutamagica.ro',
  'avyrontech@gmail.com'
);

INSERT OR IGNORE INTO sales_channels (
  id, code, name, channel_type, connection_mode, status, capabilities_json, settings_json
) VALUES
  ('channel_website', 'website', 'Cutiuța Magică', 'website', 'native', 'active', '["catalog","orders","inventory","prices","fulfillment"]', '{}'),
  ('channel_emag', 'emag', 'eMAG Marketplace', 'marketplace', 'api', 'setup_required', '["catalog","orders","inventory","prices","fulfillment"]', '{"requires_sandbox":true}'),
  ('channel_olx', 'olx', 'OLX', 'marketplace', 'manual_import', 'setup_required', '["manual_orders","manual_listings"]', '{"api_requires_official_access":true}'),
  ('channel_trendyol', 'trendyol', 'Trendyol', 'marketplace', 'api', 'setup_required', '["catalog","orders","inventory","prices","fulfillment"]', '{"requires_official_seller_access":true}'),
  ('channel_meta_marketplace', 'meta-marketplace', 'Meta Marketplaces', 'marketplace', 'catalog_feed', 'setup_required', '["catalog_feed","attribution","assisted_orders"]', '{}'),
  ('channel_facebook', 'facebook', 'Facebook', 'social', 'catalog_feed', 'setup_required', '["catalog_feed","attribution","assisted_orders"]', '{}'),
  ('channel_instagram', 'instagram', 'Instagram', 'social', 'catalog_feed', 'setup_required', '["catalog_feed","attribution","assisted_orders"]', '{}'),
  ('channel_tiktok', 'tiktok', 'TikTok', 'social', 'catalog_feed', 'setup_required', '["catalog_feed","attribution"]', '{}');

INSERT OR IGNORE INTO integration_accounts (
  id, channel_id, provider, environment, account_label, status, secret_reference, capabilities_json
) VALUES
  ('integration_emag_production', 'channel_emag', 'emag', 'production', 'eMAG', 'setup_required', 'EMAG_API_CREDENTIALS', '["pullOrders","pushProduct","pushOffer","pushInventory","pushFulfillment","reconcile"]'),
  ('integration_olx_production', 'channel_olx', 'olx', 'production', 'OLX', 'setup_required', 'OLX_API_CREDENTIALS', '["manualImport","manualListings"]'),
  ('integration_trendyol_production', 'channel_trendyol', 'trendyol', 'production', 'Trendyol', 'setup_required', 'TRENDYOL_API_CREDENTIALS', '["pullOrders","pushProduct","pushOffer","pushInventory","pushFulfillment","reconcile"]'),
  ('integration_meta_production', 'channel_meta_marketplace', 'meta', 'production', 'Meta Commerce', 'setup_required', 'META_API_CREDENTIALS', '["pushProduct","pushOffer","pushInventory","reconcile"]');

INSERT OR IGNORE INTO social_accounts (
  id, provider, account_type, label, secret_ref_id, capabilities_json, status
) VALUES
  ('social_facebook_page', 'facebook', 'page', 'Pagina Facebook', 'secret_meta', '["post","story","reel","video","insights"]', 'setup_required'),
  ('social_instagram_business', 'instagram', 'business', 'Instagram Business', 'secret_meta', '["post","story","reel","video","insights"]', 'setup_required'),
  ('social_tiktok_business', 'tiktok', 'business', 'TikTok Business', 'secret_tiktok', '["video","insights"]', 'setup_required');

INSERT OR IGNORE INTO stock_locations (id, code, name, location_type, active)
VALUES ('location_main', 'MAIN', 'Stoc principal', 'warehouse', 1);

INSERT OR IGNORE INTO fulfillment_locations (
  id, stock_location_id, code, name, fulfillment_mode, priority, status
) VALUES (
  'fulfillment_main', 'location_main', 'MAIN', 'Depozit principal',
  'own_stock', 10, 'setup_required'
);

INSERT OR IGNORE INTO invoice_series (
  id, code, prefix, next_number, document_type, status
) VALUES
  ('invoice_series_main', 'FACTURA', 'CM', 1, 'invoice', 'draft'),
  ('credit_series_main', 'STORNO', 'CMS', 1, 'credit_note', 'draft'),
  ('proforma_series_main', 'PROFORMA', 'CMP', 1, 'proforma', 'draft');

UPDATE schema_metadata
SET value = '6', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
