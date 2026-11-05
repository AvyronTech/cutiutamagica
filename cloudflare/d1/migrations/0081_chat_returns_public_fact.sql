PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO chat_knowledge
  (id,title,answer,enabled,sort_order,version,source_path,public_approved)
VALUES
  ('8d6574d1-5a64-4d1d-8df3-9441978d20a5','Retur și garanție',
   'Informațiile despre retragere, garanția legală și formularul electronic sunt pe pagina Retur și garanție. Pentru o cerere legată de o comandă anume, folosește formularul de pe acea pagină; echipa o va verifica.',
   1,50,1,'/retur',1);

UPDATE schema_metadata SET value='81',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE key='schema_version';

PRAGMA optimize;
