PRAGMA foreign_keys = ON;

ALTER TABLE chat_ai_runs ADD COLUMN sent_message_id TEXT;

UPDATE chat_settings SET ai_enabled=1,
  welcome_message='Bun venit! Sunt asistentul virtual Cutiuța Magică. Spune-mi ce cauți și te ajut să alegi. Pentru comenzi sau situații speciale, chem un coleg.',
  offline_message='Sunt asistentul virtual Cutiuța Magică și îți pot răspunde acum. Dacă ai nevoie de un coleg, mesajul tău rămâne înregistrat.',
  response_time_label='Asistent virtual · răspuns în câteva clipe',
  updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE id='default';

UPDATE schema_metadata SET value='75',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';

PRAGMA optimize;
