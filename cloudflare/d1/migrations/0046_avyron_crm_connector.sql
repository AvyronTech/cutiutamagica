PRAGMA foreign_keys = ON;

-- Optional, outbound-only CRM connector. It remains inactive until an administrator
-- supplies an HTTPS endpoint, account id and HMAC secret, then explicitly approves activation.
INSERT OR IGNORE INTO integration_accounts (
  id, channel_id, provider, environment, account_label, status,
  secret_reference, config_json, capabilities_json
) VALUES (
  'integration_avyron_crm_production', 'channel_website', 'avyron_crm', 'production',
  'CRM intern · AVYRON', 'setup_required', 'AVYRON_CRM_HMAC_SECRET',
  '{"account_id":"","api_base_url":"","sync_mode":"orders_and_customers","activation":"admin_approval_required"}',
  '["pushCustomer","pushOrder","pushOrderStatus","reconcile"]'
);

INSERT OR IGNORE INTO provider_configurations (
  id, provider, capability, environment, secret_binding_names_json,
  settings_json, status
) VALUES (
  'provider_avyron_crm_production', 'avyron_crm', 'crm', 'production',
  '["AVYRON_CRM_HMAC_SECRET"]',
  '{"account_id":"","api_base_url":"","sync_mode":"orders_and_customers","activation":"admin_approval_required"}',
  'setup_required'
);

UPDATE schema_metadata
SET value = '46', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
