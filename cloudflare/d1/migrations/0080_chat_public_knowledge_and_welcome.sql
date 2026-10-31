PRAGMA foreign_keys = ON;

ALTER TABLE chat_knowledge ADD COLUMN source_path TEXT;
ALTER TABLE chat_knowledge ADD COLUMN public_approved INTEGER NOT NULL DEFAULT 0
  CHECK (public_approved IN (0,1));

UPDATE chat_settings
SET welcome_message='Bun venit! Sunt asistentul virtual Cutiuța Magică. Spune-mi pentru cine cauți un cadou sau ce poveste îți place și găsim împreună cutiuța potrivită.',
    updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE id='default'
  AND welcome_message='Bun venit! Sunt asistentul virtual Cutiuța Magică. Spune-mi ce cauți și te ajut să alegi. Pentru comenzi sau situații speciale, chem un coleg.';

UPDATE chat_settings
SET welcome_message=REPLACE(welcome_message,
    ' Pentru comenzi sau situații speciale, chem un coleg.', ''),
    updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE id='default'
  AND instr(welcome_message, 'Pentru comenzi sau situații speciale, chem un coleg.')>0;

INSERT OR IGNORE INTO chat_knowledge
  (id,title,answer,enabled,sort_order,version,source_path,public_approved)
VALUES
  ('8d6574d1-5a64-4d1d-8df3-9441978d20a1','Despre Cutiuța Magică',
   'Cutiuța Magică reunește cutiuțe muzicale compacte din lemn, cu mecanism manual și teme familiare. Fiecare model este prezentat prin imagini și informații concrete, pentru a alege un cadou cu sens.',
   1,10,1,'/despre-noi',1),
  ('8d6574d1-5a64-4d1d-8df3-9441978d20a2','Cum funcționează cutiuța',
   'Deschizi capacul și învârți manivela ușor, fără să o forțezi. Melodia pornește mecanic, fără baterii. Păstrează cutiuța ferită de umezeală și șterge lemnul cu o lavetă moale, uscată.',
   1,20,1,'/despre-cutiuta',1),
  ('8d6574d1-5a64-4d1d-8df3-9441978d20a3','Cum aleg un cadou',
   'Alege o temă sau o melodie care îi amintește persoanei dragi de o poveste. În pagina fiecărui model găsești imaginile, dimensiunile și audiția disponibile; disponibilitatea și prețul actual vin din catalog.',
   1,30,1,'/despre-noi',1),
  ('8d6574d1-5a64-4d1d-8df3-9441978d20a4','Livrare la adresă sau easybox',
   'În checkout poți alege un curier la adresă sau un punct SAMEDAY easybox. Oferta disponibilă și termenul estimat se afișează pentru adresa și opțiunea alese, înainte de finalizarea comenzii.',
   1,40,1,'/livrare',1);

UPDATE schema_metadata SET value='80',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';

PRAGMA optimize;
