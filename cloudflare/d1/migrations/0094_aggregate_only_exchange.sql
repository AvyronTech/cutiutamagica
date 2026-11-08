-- Scope reduction only. Preserve authentication, products, financial data and existing history.
UPDATE operational_settings
SET value_json=json_set(value_json,
    '$.avyron.shareSkillPackage',json('false'),
    '$.avyron.acceptDataProposals',json('false'),
    '$.avyron.acceptSkillProposals',json('false')),
    version=version+1,
    updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='agent.marketing_orders' AND json_valid(value_json);
UPDATE schema_metadata SET value='94' WHERE key='schema_version';
