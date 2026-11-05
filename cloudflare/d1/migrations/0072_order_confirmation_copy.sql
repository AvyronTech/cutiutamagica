-- Refresh only the untouched seed message. Preserve every administrator edit.
UPDATE email_templates
SET subject_template = 'Comanda {{order_number}} a ajuns la noi ✨',
    text_template = 'Bună, {{customer_name}}!' || char(10) || char(10) ||
      'Mulțumim că ai ales Cutiuța Magică. Am primit comanda {{order_number}}, în valoare de {{total}}.' || char(10) || char(10) ||
      'Pregătim cu grijă următorii pași și îți trimitem vești când este gata de expediere.' || char(10) || char(10) ||
      'Cu drag,' || char(10) || 'Echipa Cutiuța Magică',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE code = 'order_confirmation'
  AND updated_by IS NULL
  AND subject_template = 'Am primit comanda {{order_number}}'
  AND text_template = 'Bună, {{customer_name}}.\n\nAm primit comanda {{order_number}}, în valoare de {{total}}.\n\nRevenim cu confirmarea livrării și următorii pași.\n\nCutiuța Magică';

UPDATE schema_metadata
SET value = '72', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE key = 'schema_version';

PRAGMA optimize;
