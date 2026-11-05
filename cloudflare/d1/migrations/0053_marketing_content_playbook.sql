PRAGMA foreign_keys = ON;

UPDATE ai_agents
SET purpose = 'Orchestrează conținut social nativ și complet, conversații despre produse și comenzi asistate, folosind catalogul, politicile, media aprobate și un playbook de conversie măsurabil.',
    allowed_tools_json = '["catalog.read","product_media.read_approved","analytics.read","social.draft.create","social.proposal.create","content.playbook.read","chat.read","chat.reply_draft","order.create_cod","order.confirmation.read","avyron.metrics.propose","avyron.skill.propose"]',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'agent_marketing_orders';

UPDATE ai_agents
SET purpose = 'Transformă datele reale ale catalogului și playbook-ul Cutiuța Magică în concepte, descrieri complete, Story-uri multi-cadru și scenarii video native, fără publicare directă.',
    allowed_tools_json = '["catalog.read","product_media.read_approved","content.playbook.read","analytics.read","social.draft.create","blog.draft.create"]',
    approval_policy = 'always',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id IN ('agent_content', 'agent_marketing_content');

UPDATE ai_agents
SET purpose = 'Transformă întrebările reale, ghidurile și datele catalogului în recomandări SEO și legături interne către produse, fără afirmații comerciale neverificate.',
    allowed_tools_json = '["catalog.read","analytics.read","content.playbook.read","seo.audit","content.propose"]',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'agent_seo';

INSERT OR IGNORE INTO ai_knowledge_sources (
  id, agent_id, source_type, label, source_url, trust_level,
  refresh_interval_hours, status, last_checked_at
) VALUES (
  'agent_marketing_orders_content_playbook',
  'agent_marketing_orders',
  'official_docs',
  'Playbook Cutiuța Magică pentru conținut și conversie',
  'https://cutiutamagica.eu/admin/ai',
  'verified',
  24,
  'active',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);

INSERT OR IGNORE INTO ai_knowledge_sources (
  id, agent_id, source_type, label, source_url, trust_level,
  refresh_interval_hours, status, last_checked_at
)
SELECT
  'content_playbook_' || id,
  id,
  'official_docs',
  'Playbook comun Cutiuța Magică pentru conținut și conversie',
  'https://cutiutamagica.eu/admin/ai',
  'verified',
  24,
  'active',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM ai_agents
WHERE id IN ('agent_content', 'agent_marketing_content', 'agent_seo');

UPDATE operational_settings
SET value_json = json_set(
      value_json,
      '$.schemaVersion', 3,
      '$.contentPlaybook', json('{"version":"2026.10.10.1","feedDaily":true,"storyDaily":true,"storyFramesMin":3,"storyFramesMax":5,"reelEveryDays":3,"tiktokEveryDays":3,"requireSpecificProductLink":true,"requireNativeVariants":true,"requireOriginalProductLayer":true,"measurementWindowsHours":[24,72,168]}')
    ),
    version = version + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'agent.marketing_orders';

UPDATE schema_metadata
SET value = '53', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
