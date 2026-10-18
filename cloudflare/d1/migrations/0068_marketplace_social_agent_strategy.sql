PRAGMA foreign_keys = ON;

-- Align marketplace capabilities with the official platform documentation
-- verified on 2026-10-17. All connectors remain inactive until a repeatable
-- server-side healthcheck proves the exact seller identity and capability.
UPDATE sales_channels
SET connection_mode = 'api',
    status = 'setup_required',
    capabilities_json = '["catalog","orders","inventory","prices","fulfillment","reconcile"]',
    settings_json = json_set(
      settings_json,
      '$.apiVersion', '4.5.1',
      '$.requiresVerifiedSeller', json('true'),
      '$.approvalRequired', json('true')
    ),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE code = 'emag';

UPDATE sales_channels
SET connection_mode = 'api',
    status = 'setup_required',
    capabilities_json = '["catalog_v2","orders_v2","inventory","prices","fulfillment","invoices","customer_questions","reconcile"]',
    settings_json = json_set(
      settings_json,
      '$.productApiVersion', 'v2',
      '$.orderApiVersion', 'v2',
      '$.v1DisabledAfter', '2026-10-15',
      '$.requiresVerifiedSeller', json('true'),
      '$.approvalRequired', json('true')
    ),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE code = 'trendyol';

UPDATE sales_channels
SET connection_mode = 'catalog_feed',
    status = 'setup_required',
    capabilities_json = '["catalog_xml","manual_orders","reconcile"]',
    settings_json = json_set(
      settings_json,
      '$.feedFormat', 'okazii_xml',
      '$.requiresPortalCategoryMapping', json('true'),
      '$.requiresFormatRevalidation', json('true'),
      '$.approvalRequired', json('true')
    ),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE code = 'okazii';

UPDATE sales_channels
SET connection_mode = 'disabled',
    status = 'disabled',
    capabilities_json = '[]',
    settings_json = json_set(
      settings_json,
      '$.policyGate', 'commercial_selling_not_eligible_ro',
      '$.lastPolicyReview', '2026-10-17',
      '$.reevaluateWhen', 'vinted_pro_available_for_ro_registered_businesses'
    ),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE code = 'vinted';

UPDATE integration_accounts
SET status = 'setup_required',
    config_json = json_set(config_json, '$.apiVersion', '4.5.1'),
    capabilities_json = '["pullOrders","pushProduct","pushOffer","pushInventory","pushFulfillment","reconcile"]',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'integration_emag_production';

UPDATE integration_accounts
SET status = 'setup_required',
    config_json = json_set(
      config_json,
      '$.productApiVersion', 'v2',
      '$.orderApiVersion', 'v2'
    ),
    capabilities_json = '["pullOrdersV2","pushProductV2","pushOffer","pushInventory","pushFulfillment","pushInvoice","pullQuestions","reconcile"]',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'integration_trendyol_production';

INSERT OR IGNORE INTO integration_accounts (
  id, channel_id, provider, environment, account_label, status,
  secret_reference, config_json, capabilities_json
) VALUES (
  'integration_okazii_production', 'channel_okazii', 'okazii', 'production',
  'Okazii.ro · Cutiuța Magică', 'setup_required', NULL,
  '{"feedFormat":"okazii_xml","requiresPortalValidation":true}',
  '["exportCatalogXml","manualOrderImport","reconcile"]'
);

INSERT OR IGNORE INTO account_connections (
  id, owner, provider, label, auth_method, status, scopes_json, notes,
  created_at, updated_at
) VALUES
  (
    'account_emag_cutiuta_magica', 'cutiuta_magica', 'emag',
    'eMAG Marketplace · Cutiuța Magică', 'api_key', 'setup_required',
    '["catalog.write","offers.write","inventory.write","orders.read","fulfillment.write"]',
    'Devine activ numai după verificarea sellerului, a API v4.5.1 și a unei citiri de test.',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  (
    'account_trendyol_cutiuta_magica', 'cutiuta_magica', 'trendyol',
    'Trendyol · Cutiuța Magică', 'api_key', 'setup_required',
    '["catalog_v2.write","inventory.write","orders_v2.read","fulfillment.write","invoices.write","questions.read"]',
    'Acceptă numai Product V2 și Order V2; endpointurile V1 sunt blocate.',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  (
    'account_okazii_cutiuta_magica', 'cutiuta_magica', 'okazii',
    'Okazii.ro · Cutiuța Magică', 'manual', 'setup_required',
    '["catalog_xml.write","orders.manual_import"]',
    'Feedul XML cere maparea categoriei și reconfirmarea formatului în portal înainte de activare.',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  (
    'account_workers_ai_cutiuta_magica', 'cutiuta_magica', 'cloudflare_workers_ai',
    'Workers AI · asistent editorial', 'manual', 'setup_required',
    '["draft.generate","copy.review","structured_output"]',
    'Binding opțional. Folosește numai limita gratuită configurată, fără date personale și fără publicare directă.',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  );

INSERT OR IGNORE INTO provider_configurations (
  id, provider, capability, environment, secret_binding_names_json,
  settings_json, status
) VALUES
  (
    'provider_emag_marketplace_production', 'emag', 'marketplace_sync', 'production',
    '["EMAG_API_CREDENTIALS"]',
    '{"apiVersion":"4.5.1","approvalRequired":true,"orderImportIdempotent":true}',
    'setup_required'
  ),
  (
    'provider_trendyol_marketplace_production', 'trendyol', 'marketplace_sync', 'production',
    '["TRENDYOL_API_CREDENTIALS"]',
    '{"productApiVersion":"v2","orderApiVersion":"v2","approvalRequired":true,"orderImportIdempotent":true}',
    'setup_required'
  ),
  (
    'provider_okazii_marketplace_production', 'okazii', 'marketplace_sync', 'production',
    '[]',
    '{"mode":"catalog_xml_and_manual_orders","requiresPortalValidation":true,"approvalRequired":true}',
    'setup_required'
  ),
  (
    'provider_cloudflare_workers_ai_editorial', 'cloudflare_workers_ai', 'editorial_assist', 'production',
    '[]',
    '{"binding":"AI","freeNeuronDailyCeiling":10000,"paidOverageAllowed":false,"personalDataAllowed":false,"autoPublish":false}',
    'setup_required'
  );

UPDATE ai_agents
SET purpose = 'Orchestrează conținut social nativ și complet, conversații, comenzi asistate și marketplace-uri eligibile, folosind catalogul, politicile, media aprobate și un playbook de conversie măsurabil.',
    allowed_tools_json = '["catalog.read","product_media.read_approved","analytics.read","connector.health.read","sync.monitor.read","social.draft.create","social.proposal.create","content.playbook.read","marketplace.profile.read","marketplace.listing.draft","marketplace.sync.propose","marketplace.orders.read","chat.read","chat.reply_draft","order.create_cod","order.confirmation.read","ai.editorial.propose","avyron.metrics.propose","avyron.skill.propose"]',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'agent_marketing_orders';

UPDATE operational_settings
SET value_json = json_set(
      value_json,
      '$.schemaVersion', 5,
      '$.contentPlaybook.version', '2026.10.17.1',
      '$.contentPlaybook.requireNativePreview', json('true'),
      '$.contentPlaybook.requireCapabilitySnapshot', json('true'),
      '$.contentPlaybook.noveltyWindowPosts', 30,
      '$.freeResources', json(
        '{"metricoolPublishedPostsPerMonth":20,"metricoolAnalyticsHistoryDays":30,"workersAiNeuronsPerDay":10000,"workersAiPaidOverageAllowed":false}'
      ),
      '$.marketplaces', json(
        '{"syncOrder":["orders","inventory","prices","catalog","reconcile"],"emag":{"mode":"api","version":"4.5.1","status":"setup_required"},"trendyol":{"mode":"api","productVersion":"v2","orderVersion":"v2","status":"setup_required"},"okazii":{"mode":"catalog_xml_manual_orders","status":"setup_required"},"vinted":{"mode":"disabled_policy","status":"disabled"}}'
      ),
      '$.workersAi', json(
        '{"enabled":false,"role":"draft_and_second_pass_review","binding":"AI","personalDataAllowed":false,"autoPublish":false}'
      )
    ),
    version = version + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'agent.marketing_orders';

UPDATE schema_metadata
SET value = '68', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
