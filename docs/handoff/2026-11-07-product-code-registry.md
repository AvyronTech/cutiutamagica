# Registrul codurilor și dashboard compact — 7 noiembrie 2026

## Stare și scop

Implementare locală pe `codex/seo-compatibility-audit-20261107`, peste `9deb8ed` (cont client) și `e14759e` (SEO), cu baza de referință `a86494c`. Cele două livrări locale anterioare sunt păstrate. Administratorul va indica separat momentul publicării: **fără push, PR, merge, deploy sau migrare remote** în această etapă. Nu se configurează furnizori, secrete, costuri sau conturi reale.

## Coduri și sursa de adevăr

Migrare nouă, append-only: `0091_product_code_registry.sql`, schema 91.

- `product_internal_codes`: un cod permanent `CM-P-000001` pentru fiecare produs.
- `variant_merchant_codes`: o referință comercială proprie `CM-R-000001` pentru fiecare variantă. Poate fi folosită în pregătirea fișierelor externe, fără a pretinde că este ID atribuit de marketplace ori GTIN.
- SKU-urile existente, GTIN-urile și rezervările lor rămân neschimbate. Noile variante continuă să primească SKU prin allocatorul existent; noile coduri sunt adăugate prin trigger în aceeași tranzacție, inclusiv pentru alte căi de creare a produselor.
- Registrele au secvențe independente, unicitate, chei externe și blocarea modificării/ștergerii. Redenumirea, corectarea unui SKU înainte de publicare și arhivarea păstrează identitățile. Prefixele `CM-P-` și `CM-R-` sunt rezervate la introducerea unor SKU-uri noi, pentru a nu amesteca scanările.
- Loturile și serialele continuă să fie generate de sistemul existent, la recepție sau la cerere. Nu se inventează recepții ori unități fizice pentru completarea tabelului. GTIN, MPN și ID-urile platformelor se păstrează în fluxul lor de date verificate.

La release, aplică **0091 în D1 înainte de publicarea codului**; noile interogări administrative folosesc tabelele sale. Aplicată și verificată numai în D1 local în această etapă. Codurile numerice din DEMO nu se copiază în producție: se generează acolo, în ordinea deterministă `created_at,id` a datelor reale. După migrare se verifică schema, numărul de coduri față de produse/variante și `PRAGMA foreign_key_check`.

## Interfață și fluxuri

- Identificare păstrează ruta canonică și cele două file compatibile: Registru și etichete / QR comenzi. Registrul are tabel cu produs/variantă, cod intern, SKU, referință externă, GTIN, stoc și acces la etichetă; căutare/scanare, filtrare și copiere cu feedback. Tabelul are antet fix și derulare proprie pe mobil.
- Produsul selectat are panouri **Coduri / Etichete / Trasabilitate**. Formularele și formatul etichetei se păstrează la schimbarea filelor. Interogările și generarea grafică sunt oprite când panoul comun nu este activ; eticheta și barele se generează numai în panoul relevant.
- Tabele separate pentru ID-urile de canal deja înregistrate, loturi, seriale și personalizări. Stările canalelor sunt etichetate ca date înregistrate, fără confirmare ori publicare externă. Linkul către fișa produsului deschide secțiunea tehnică și canalele existente; cel de stoc păstrează produsul.
- CSV/Excel includ codul intern și referința comercială. Exportul registrului produce un singur fișier solicitat, fără descărcări auxiliare neașteptate. Codurile unitare afișate au CSV propriu. Codul intern, SKU, referința și serialele/personalizările pot fi copiate sau exportate Code 128 SVG cu valoare lizibilă.
- Etichetele păstrează PDF, SVG, PNG 300 dpi și A4. A4 indică limita de 30 de variante și cere filtrare peste limită; nu mai trunchiază în tăcere. Erorile de randare sunt afișate explicit. Recepția păstrează referința formularului înainte de `await`, astfel încât resetarea de după succes funcționează.
- Produse și Stocuri primesc aceleași coduri din D1 și le folosesc în căutare; fișa tehnică afișează codurile aceleiași variante. Datele rămân administrative, cu verificările de permisiune existente și `no-store`; nu se adaugă date private în cache-ul PWA sau în SEO public.
- Dashboardul comun are antet, navigare, margini și file mai compacte, fără reducerea câmpurilor de mobil sub 16 px. Spațierea de bază este redusă în paginile principale. În Conturi și dispozitive, URL-ul OAuth lung este divizabil și nu mai lărgește pagina la 320 px.
- Corecție observată în QA: formularele de login folosesc explicit POST, pentru ca o trimitere înainte de hidratarea JavaScript să nu expună datele în URL. Loginul normal DEMO prin formular a fost verificat; nu se schimbă parolele ori MFA ale conturilor reale.

## Verificări

- **407 teste / 71 fișiere**, toate trecute. Regresiile noi acoperă migrarea peste date existente, identități stabile și nereatribuibile, creare atomică din alte căi, variante multiple, rezervarea prefixelor, consecvența catalog/export/detaliu, permisiuni și ID invalid. Testele existente de loturi, GTIN, seriale, catalog și acces client rămân trecute.
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm run cf:deploy:dry`, `git diff --check`: trecute. Dry-run-ul final include buildul de producție și verificarea artefactului, fără publicare.
- **30 destinații din meniul admin × desktop 1440 px și mobil 320 px**, verificate cu sesiune DEMO locală. Toate au conținut și titlu; depășirea din Conturi a fost corectată și reverificată. Panourile Coduri/Etichete/Trasabilitate verificate separat și la 390 px. Derularea laterală rămâne numai în tabele, nu în pagina de administrare. Consola verificată fără erori/avertismente.
- Căutare după cod intern și referință, selectare prin Enter, copiere exactă în clipboard, linkul către fișa tehnică cu aceleași coduri, căutarea referinței în Stocuri, format de etichetă păstrat după QR comenzi și revenire: verificate.
- Fișiere descărcate în browser: registru CSV cu 10 rânduri / 18 coloane coerente, coduri noi prezente; Code 128 SVG cu valoarea `CM-R-000003`; PDF individual cu o pagină de exact 50 × 30 mm. Previzualizarea desktop și mobil a fost inspectată vizual. Nu se certifică scanarea unei etichete fizice fără imprimantă/scanner.
- D1 local: schema 91, codurile pentru toate produsele și variantele locale, fără încălcări de chei externe. Administratorul DEMO și sesiunea sa au fost numai locale; logout confirmat, zero sesiuni active, apoi contul DEMO și credențialele lui au fost eliminate din baza locală. Nicio comandă, plată, publicare, recepție ori e-mail real nu este creat.

Probe: `/Users/niss/.codex/visualizations/2026/11/07/cutiuta-code-registry/` — `label-desktop.png`, `registry-mobile-320.png`, `label-mobile-320.png`, `dashboard-route-matrix.json`, `identification-panels.json`. Loguri `/tmp/cutiuta-codes-{tests,typecheck,lint,build,dry}.log`.

## Limite de livrare

Aceste probe confirmă implementarea și testarea **locală**, nu o migrare sau publicare în producție. Funcționarea serviciilor externe și limita CPU a Workers Free sunt separate de sistemul de coduri. Nu s-a schimbat planul Free sau integrarea cu AVYRON. Nu s-au adăugat dependențe.

Surse tehnice: [D1 — coloane generate](https://developers.cloudflare.com/d1/reference/generated-columns/), [D1 — prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/), [Workers — bune practici](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/).
