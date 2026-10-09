PRAGMA foreign_keys = ON;

-- Date oficiale verificate în registrul public ANAF la 2026-10-04.
UPDATE legal_entities
SET legal_name = 'DIGITAL ECOTECH SOLUTIONS S.R.L.',
    registration_number = 'J2026041938009',
    registered_address = 'JUD. IAŞI, SAT DUMBRĂVIŢA COM. RUGINOASA, STR. RĂZEŞILOR, NR.14',
    vat_status = 'non_vat_payer',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'legal_entity_main' AND tax_id = '55055976';

UPDATE site_settings
SET value_json = json_set(
      value_json,
      '$.legal_name', 'DIGITAL ECOTECH SOLUTIONS S.R.L.',
      '$.registration_number', 'J2026041938009',
      '$.registered_address', 'JUD. IAŞI, SAT DUMBRĂVIŢA COM. RUGINOASA, STR. RĂZEŞILOR, NR.14',
      '$.vat_status', 'non_vat_payer'
    ),
    validation_status = 'verified',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'business.legal_entity';

UPDATE schema_metadata
SET value = '50', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
