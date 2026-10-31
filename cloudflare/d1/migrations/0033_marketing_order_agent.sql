PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO ai_agents (
  id, code, name, purpose, allowed_tools_json, approval_policy,
  max_actions_per_run, status
) VALUES (
  'agent_marketing_orders',
  'marketing-orders',
  'Agent marketing + comenzi Cutiuța Magică',
  'Orchestrează ciorne sociale, conversații despre produse și comenzi asistate pe baza catalogului și politicilor aprobate.',
  '["catalog.read","product_media.read_approved","analytics.read","social.draft.create","social.proposal.create","chat.read","chat.reply_draft","order.create_cod","order.confirmation.read","avyron.metrics.propose"]',
  'always',
  50,
  'setup_required'
);

INSERT OR IGNORE INTO ai_knowledge_sources (
  id, agent_id, source_type, label, source_url, trust_level,
  refresh_interval_hours, status
) VALUES
  ('agent_marketing_orders_catalog', 'agent_marketing_orders', 'catalog',
   'Catalog public Cutiuța Magică', 'https://cutiutamagica.eu/api/v1/catalog/products',
   'verified', 1, 'active'),
  ('agent_marketing_orders_delivery', 'agent_marketing_orders', 'policy',
   'Politica de livrare', 'https://cutiutamagica.eu/livrare',
   'verified', 24, 'active'),
  ('agent_marketing_orders_returns', 'agent_marketing_orders', 'policy',
   'Politica de retur', 'https://cutiutamagica.eu/retur',
   'verified', 24, 'active'),
  ('agent_marketing_orders_terms', 'agent_marketing_orders', 'policy',
   'Termeni de utilizare', 'https://cutiutamagica.eu/termeni-de-utilizare',
   'verified', 24, 'active'),
  ('agent_marketing_orders_privacy', 'agent_marketing_orders', 'policy',
   'Politica de confidențialitate', 'https://cutiutamagica.eu/politica-de-confidentialitate',
   'verified', 24, 'active');

INSERT OR IGNORE INTO social_accounts (
  id, provider, account_type, label, capabilities_json, status
) VALUES (
  'social_facebook_profile', 'facebook', 'profile', 'Profil Facebook autorizat',
  '["post","story","reel","insights"]', 'setup_required'
);

INSERT OR IGNORE INTO operational_settings (
  key, value_json, version, updated_at
) VALUES (
  'agent.marketing_orders',
  '{"schemaVersion":1,"timezone":"Europe/Bucharest","mode":"draft_approval","dailyCadence":{"note":1,"story":1,"feedPost":1,"reel":1,"tiktokVideo":1},"testWindows":{"note":"08:15-09:00","story":"09:15-10:30","feedPost":"12:15-14:00","reel":"18:15-20:00","tiktokVideo":"20:00-22:00"},"minimumGapMinutes":90,"engagement":{"batchesPerDay":2,"minPerBatch":5,"maxPerBatch":10,"proposalOnly":true},"instagramUnfollow":{"maxPerDay":10,"proposalOnly":true},"publication":{"requiresApproval":true,"requiresVerifiedConnector":true},"orders":{"paymentMethod":"cash_on_delivery","requiresCustomerConfirmation":true,"requiresConsent":true},"avyron":{"async":true,"metricsOnly":true,"enabled":false}}',
  1,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

UPDATE schema_metadata
SET value = '33', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
