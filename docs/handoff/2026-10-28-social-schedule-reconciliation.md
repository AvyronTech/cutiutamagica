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

## Efecte externe rămase

Nu s-au făcut încă push, merge, deploy, migrare D1 remote, publicare socială sau modificare de
conector. Pentru producție, migrațiile `0082` și `0083` trebuie aplicate în ordine înaintea codului.
Media `review_required`, conversațiile-test și comenzile nu sunt mutate automat de această
remediere.
