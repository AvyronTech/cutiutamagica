# Trendyol RO, eMAG RO și Oblio — flux fiscal și documente

Stare: implementare în ramura locală `codex/marketplace-fiscal-sync`, din `73dbe67` (ramura Cloudflare de referință). Migrare append-only **0096**. Nicio emitere fiscală reală, încărcare, comandă, schimbare de preț/stoc, configurare provider sau publicare a acestei revizii.

## În dashboard

În **Comenzi → fișa comenzii**, administratorul poate emite factura în Oblio, deschide și imprima PDF-ul oficial, apoi transmite factura emisă către platforma comenzii. Factura descărcată din Oblio este arhivată în R2 privat; ruta de imprimare verifică sesiunea administrativă și dreptul de facturare. O factură a unei comenzi nu se poate trimite la altă comandă sau la alt marketplace. Documentele afișate în portal fără un corespondent fiscal local se consultă în portal.

**Comenzi → eMAG și facturi marketplace**: validare API eMAG, citire după ID, import orar, starea sincronizării și automatizarea transmiterii pe fiecare canal. Automatizarea se aplică exclusiv facturilor Oblio emise după activare și folosește cronul și coada existente. Înainte de emitere și transmitere se verifică datele, valoarea și existența unei facturi în platformă. O operație cu rezultat incert este izolată și trebuie verificată în portal înaintea oricărei alte trimiteri. Un blocaj de prevalidare nu reprezintă o încercare de upload și permite o nouă verificare manuală. Sumele marketplace sunt folosite din comandă, iar reducerile pe cantități se împart la ban, fără abatere în suma facturată.

## Particularități

- **Trendyol RO:** upload PDF multipart către coletul unic eligibil, nu trimitere de link. Se păstrează importul Order V2, reconcilierea decontului și reconcilierea de stoc din revizia precedentă. Trendyol emite eticheta, FAN Courier ridică la domiciliu; în fișa comenzii se poate deschide eticheta FAN. Coletul real a fost văzut în portal la verificare, cu facturarea în așteptare. Verifică separat baza fiscală după discountul vânzătorului și suma rambursului de pe etichetă. Încărcarea reală nu a fost executată.
- **eMAG RO 3P (comenzi expediate de vânzător):** API 4.5.2 citește comanda, statusul plății, transportul și documentele; păstrează prețul efectiv de vânzare, rezervă sau consumă stocul intern pe SKU unic confirmat și trimite la verificare voucherele complexe, garanțiile, schimbările financiare și retururile. Plata raportată de marketplace nu se înregistrează drept încasare bancară. Atașamentul facturii folosește URL-ul oficial Oblio pentru PDF, conform contractului API; acceptarea acestui URL de către eMAG nu este confirmată live. Un AWB emis prin eMAG API se asociază după ID numai dacă eMAG confirmă comanda, tipul 3P și documentul de livrare. Etichetele disponibile exclusiv în portal rămân acolo.
- **eMAG 2P (logistică eMAG):** serviciul de facturare 2P apare activ în cont. Fluxul local nu emite facturi pentru 2P și nu schimbă emitentul sau setările. Facturarea nativă 3P nu era activă la inspecție.
- **Oblio:** contul și activarea e-Factura au fost verificate în portal. Nu s-a modificat seria, profilul fiscal ori emitentul. Codul recuperează un document emis prin endpointul de citire Oblio și folosește doar URL-ul PDF oficial. Starea e-Factura a unui document nou se verifică separat în Oblio.

## Pași rămași pentru producție

1. Revizuiește ramura, aplică migrarea 0096 la release și publică revizia aprobată. Automatizările pornesc oprite. Dacă trebuie revenit, dezactivează automatizările din Comenzi, revino la Workerul anterior și păstrează migrarea și istoricul fiscal.
2. Trendyol: verifică fluxul pe prima factură reală autorizată, inclusiv statusul din portal și PDF-ul, apoi activează transmiterea automată. Folosește numai eticheta furnizată de Trendyol.
3. eMAG: în portal, la inspecție, lista de IP-uri autorizate era goală. Configurează contul API cu drepturi pentru operațiile aprobate și folosește o ieșire cu IP stabil autorizată de eMAG; Workerul Free actual nu oferă IP dedicat. Nu adăuga IP-uri partajate sau o plajă generală ca soluție. După conectare: verificare read-only, import individual, reconciliere stoc/valori, apoi verificarea primei facturi autorizate în portal înainte de automatizare. Integrarea nativă Oblio–eMAG este o opțiune fiscală separată de sincronizarea backend; nu activa doi emitenți pentru 3P.
4. Exporturile/deconturile eMAG și modificarea prețului sau stocului afișat în oferta eMAG nu fac parte din acest conector fiscal: sincronizarea păstrează valorile comenzii și inventarul intern; reconcilierea payout și maparea ofertelor au nevoie de acces live și validare comercială.

Contracte: [Trendyol upload PDF](https://developers.trendyol.com/v3.0/reference/uploadinvoicefile), [eMAG Marketplace API](https://marketplace-api.emag.ro/api-doc), [Oblio API](https://www.oblio.eu/api/), [Oblio–eMAG](https://www.oblio.eu/integrari/emag), [Cloudflare egress dedicat](https://developers.cloudflare.com/smart-shield/configuration/dedicated-egress-ips/other-products/).

## Dovezi locale

Schema aplicată într-o bază D1 de unică folosință. Testele cu răspunsuri API simulate verifică prețul, rezervarea, consumul și eliberarea stocului, reluarea importului și protecția PDF / anti-duplicare. În Opera s-a folosit o comandă și un PDF demonstrativ, fără efect fiscal, cu fișa verificată la dimensiunea desktop și la 390 px. Capturile sunt artefacte locale, în afara repo.

Verificări înainte de predare: 557 teste în 91 suite, typecheck, lint, build, verificarea bindingurilor de producție, Wrangler dry-run, scanarea sursei (0 constatări) și `git diff --check`. Ruta PDF fără sesiune a răspuns 401; ruta publică probată pentru cheia din R2 a răspuns 404. În Opera, fișierul demonstrativ a fost afișat inline cu opțiunea de imprimare.
