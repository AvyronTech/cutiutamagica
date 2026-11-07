PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO account_connections (
  id, owner, provider, label, auth_method, secret_reference, status,
  scopes_json, notes, created_at, updated_at
) VALUES
  (
    'account_metricool_cutiuta_magica', 'cutiuta_magica', 'metricool',
    'Metricool · brand 7230540', 'device_session', NULL, 'setup_required',
    '["analytics.read_browser","planner.read_browser","planner.propose"]',
    'Contul browser verificat nu este un conector backend. Devine activ numai după o verificare repetabilă și auditată a identității Cutiuța Magică.',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  (
    'account_metricool_web_cutiuta_magica', 'cutiuta_magica', 'metricool_web',
    'Metricool Web · cutiutamagica.eu', 'manual', NULL, 'setup_required',
    '["traffic.collect_with_consent"]',
    'Trackerul este permis numai după consimțământul pentru Experiență. Activarea cere detectarea live a domeniului de către Metricool.',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  (
    'account_gsc_cutiuta_magica', 'cutiuta_magica', 'google_search_console',
    'GSC · sc-domain:cutiutamagica.eu', 'oauth', NULL, 'setup_required',
    '["webmasters.readonly"]',
    'Accesul browser nu înlocuiește tokenul readonly verificat din Seiful de conturi.',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  ),
  (
    'account_opera_cutiuta_magica', 'cutiuta_magica', 'browser_control',
    'Opera · profil Cutiuța Magică', 'device_session', NULL, 'setup_required',
    '["tabs.read","page.control_with_approval"]',
    'Profil separat de AVYRON. Oprire obligatorie la identitate ambiguă, CAPTCHA, challenge sau 2FA.',
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  );

UPDATE operational_settings
SET value_json = json_set(
      value_json,
      '$.schemaVersion', 4,
      '$.connectorContract', json(
        '{"metricoolBrandId":"7230540","ownerEmail":"cutiutamagicaofficial@gmail.com","website":"https://cutiutamagica.eu","facebookPageId":"1154774271054604","instagramHandle":"cutiutamagicaofficial","tiktokHandle":"cutiua.magic","gscProperty":"sc-domain:cutiutamagica.eu","timezone":"Europe/Bucharest"}'
      ),
      '$.monitoring', json(
        '{"enabled":true,"intervalMinutes":60,"staleAfterHours":26}'
      )
    ),
    version = version + 1,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'agent.marketing_orders';

UPDATE ai_agents
SET allowed_tools_json = '["catalog.read","product_media.read_approved","analytics.read","connector.health.read","sync.monitor.read","social.draft.create","social.proposal.create","content.playbook.read","chat.read","chat.reply_draft","order.create_cod","order.confirmation.read","avyron.metrics.propose","avyron.skill.propose"]',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'agent_marketing_orders';

UPDATE schema_metadata
SET value = '54', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
