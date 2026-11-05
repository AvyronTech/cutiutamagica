# Stocuri și prioritizarea navigării — 5 noiembrie 2026

## Scop și implementare

Ramură scurtă `codex/inventory-navigation-20261105`, pornită din referința `codex/cutiuta-cloudflare-final` la `4a7237b`.

- `src/admin/Layout.tsx`: grupul Principal afișează Prezentare generală → Facturare → Livrare → Financiar → Retururi. Aceleași rute sunt eliminate din Operațiuni; căutarea navigării și meniul mobil folosesc aceeași listă, fără dubluri.
- `src/admin/pages/Inventory.tsx`: Stocuri reutilizează `ProductImage`, normalizarea media legacy și fotografia locală după slug. Dimensiuni stabile 44×44, încărcare lazy, decodare asincronă și variante thumbnail pentru imaginile procesate.
- Verificarea read-only D1 confirmă că 8/10 imagini primare administrative folosesc identificatori media legacy. În sesiunea Opera autentificată, exact aceste opt imagini au `naturalWidth=0`, iar celelalte două sunt încărcate. Cele 10 fotografii locale corespunzătoare sunt prezente și răspund HTTP 200 ca imagini; o miniatură verificată și pe subdomeniul aplicației răspunde 200.

Fără migrare, modificări de stoc, prețuri, drepturi, conturi sau servicii cu cost.

## Continuitate după întrerupere

PR #79–#86 sunt integrate în ramura de referință. La reluare, Git era curat și 0/0 față de referință; producția servea Worker `a409bf5b-d61b-499c-af72-f79973715883` la 100%, adică releaseul PR #86. Modificările precedente ale fișelor de produs și contului nu sunt pierdute. Limita CPU Workers Free rămâne acceptată explicit de administrator; nu se activează un plan plătit. Brave și audițiile fără fișiere nu devin configurate prin această revizie.

## Verificări

TypeScript, lint, build și dry run trec local. Verificarea vizuală finală desktop/mobil este făcută pe revizia publicată, cu capturi în `/Users/niss/.codex/visualizations/2026/11/05/cutiuta-inventory-navigation/`; starea live rămâne o probă distinctă de build. Prima rulare simultană cu compilarea a avut 367 teste trecute și patru timeouturi de 5 secunde în Growth/AI; reluarea celor două fișiere cu un singur worker a trecut toate cele 26 de teste, fără schimbarea testelor sau a limitelor lor. CI reia întreaga suită pe commitul propus. Nu se raportează rularea inițială ca trecută integral.
