# Handoff — reconciliere programări sociale Metricool

## Scop

Platforma internă raporta cinci postări drept `scheduled`, deși verificarea brandului Metricool
`7230540` din 2026-10-28 arăta zero programări viitoare și un consum Free de `6/20`.
Conectorul backend al magazinului nu era confirmat, iar lipsa unei chitanțe externe nu mai poate fi
interpretată drept programare reușită.

## Schimbări

- migrarea append-only `0082_social_schedule_reconciliation.sql` adaugă registrul auditat
  `social_schedule_snapshots` și vederea `v_social_publication_state`;
- migrarea append-only `0083_social_schedule_reapproval.sql` întărește fluxul fără a rescrie 0082:
  cele cinci stări locale fără chitanță externă revin în `review`, pierd `scheduled_at` și
  `approved_by`, iar aprobările `pending` sau `approved` aferente expiră;
- dashboardul numără separat `scheduled_verified`, `schedule_unverified` și
  `approved_awaiting_connector`;
- panoul Rețele sociale poate înregistra o verificare manuală „zero programări viitoare” pentru
  planul Metricool Free și reconciliază tranzacțional numai stările interne fără dovadă. Cheia de
  idempotentă nu include ora execuției, iar actualizarea repetă verificarea chitanței provider ca să
  nu retrogradeze o programare confirmată apărută concurent;
- monitorul orar creează o alertă dacă reapare o stare locală `scheduled` fără chitanță externă;
- imaginile cu drepturi neverificate, mesajele, conversațiile și comenzile nu sunt modificate.

## Verificări

- `npm run typecheck` — trecut;
- `npm test -- --maxWorkers=2` — 60 fișiere, 328 teste trecute;
- testele dedicate — 3 fișiere, 9 teste trecute după întărirea idempotentei și concurenței;
- `npm run lint` — trecut;
- `npm run build` — trecut, cu avertismentele existente despre `node:crypto`, dimensiunea unor
  chunkuri și sourcemap CSS;
- `npm run cf:types:check` — trecut;
- `npm run cf:deploy:dry` — trecut și a confirmat bindingurile de producție fără deploy;
- `npm run cf:db:migrate:local` — toate cele 83 de migrații aplicate local;
- test dedicat: cinci programări fără dovadă sunt corectate, iar o programare cu chitanță provider
  rămâne `scheduled_verified`; retry-ul nu dublează snapshotul sau activitatea;
- verificare vizuală autentificată locală la 1440 × 900 și 390 × 844: Rețele sociale arată 5 în
  revizie, 0 programate confirmat, snapshot 6/20, 0 viitoare și 5 corectate; Marketing afișează
  „revizie nouă necesară”. Capturi: `docs/release-evidence/2026-10-29/`.

## Release production — 2026-10-29

- PR #48 a fost integrat în ramura de referință la commitul `c08fac5271a7dbd7b8b9e2bae53a965fe6a1593d`;
- înaintea migrării a fost salvat bookmarkul D1 Time Travel
  `00000b80-00000000-00005113-4bf7f1f7175d591dead44d723eac67eb`;
- migrările `0082` și `0083` au fost aplicate remote în această ordine, fără migrări rămase;
- D1 remote confirmă schema 83, snapshotul Metricool 6/20 cu zero programări viitoare, exact
  cinci postări în `review`, zero operațiuni provider confirmate pentru programare și
  `PRAGMA foreign_key_check` fără rezultate;
- Workerul `cutiuta-magica-store` a fost publicat la versiunea
  `0c6e0af0-ab0c-4a11-a5fa-4f1de059db52` pe domeniile configurate;
- `https://cutiutamagica.eu/` și `/api/v1/health` răspund 200; health confirmă mediul
  `production` și schema 83; endpointul administrativ răspunde 401 fără sesiune.

## Blocaje păstrate intenționat

Conectorul backend de publicare rămâne neconfirmat până la o citire oficială și o probă controlată.
Media `review_required` nu este promovată automat, iar conversațiile-test și comenzile nu sunt
mutate de această remediere. Nu s-a executat nicio publicare socială, reîncercare sau duplicare.
