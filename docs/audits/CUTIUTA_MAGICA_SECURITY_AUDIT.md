> Release pregătit la cererea administratorului, 9 noiembrie: toate loturile sunt în PR #94. Contul Stripe live a fost reverificat prin API-ul existent, cu verificarea identității contului/țării și `charges_enabled`. Revolut Merchant rămâne neconfigurat/dezactivat. Pentru continuitate, hostname-ul Worker istoric acceptă numai callbackurile POST Stripe/Revolut cu verificarea semnăturii în handler; orice altă rută și preview rămân blocate. Activarea MFA sau Access nu face parte din publicare. Starea live finală este documentată în handofful releaseului; constatările de mai jos sunt instantaneul auditului anterior.

# Cutiuța Magică — audit de securitate și calitate e-commerce

Data: 9 noiembrie 2026 (Europe/Bucharest). Evaluare tehnică a codului, staging local izolat și probe publice read-only. Obiectiv ASVS L2 în zonele autentificate; **nu este o certificare sau declarație de conformitate integrală**.

## 1. Perimetru, versiuni și limite

Bază verificată: `origin/main` și `origin/codex/cutiuta-cloudflare-final` la `dc0006ed32540aa975f4f2bb54ba988382d405a7`. Ramură de lucru: `codex/ecommerce-security-audit-20261109`, în worktree separat. Loturile `ee96d09`/`4116b2a` (PR #93) și `19cbf5a` au fost recuperate local prin cherry-pick, cu păstrarea ramurilor originale. Nu s-a făcut merge extern, push sau deploy în acest audit.

Producția reconfirmată read-only: Worker `8d51b7d8-d05a-4486-897f-aa691476c00e`, sursă runtime `2ade5f0`, D1 schema **91**. Schema pregătită local este **94**. `FIXED` în acest raport înseamnă cod remediat și testat local; nu înseamnă activ în producție.

Nu s-au creat comenzi, plăți, rambursări ori facturi reale. Testele comerciale folosesc SQLite/D1 local, identități sintetice și `fetch`/queue simulate. Nu s-au modificat produse, prețuri, stocuri, conturi sau configurații financiare reale. Nu s-au trimis e-mailuri/social media și nu s-au activat servicii ori abonamente. `caffeinate` rămâne activ, conform cererii; nu schimbă blocarea de securitate a Macului.

Stări: **PASS** = dovada trecută în perimetrul precizat; **FAIL** = cerință aplicabilă neîndeplinită; **FIXED** = remediat local; **NOT_APPLICABLE** = funcția/condiția nu există în perimetrul auditat; **NOT_VERIFIED** = dovezi insuficiente; **ACCEPTED_EXCEPTION** = abatere explicit acceptată de administrator. Nicio stare nu trebuie extinsă la alte rute sau la producție fără verificare.

## 2. Inventarul infrastructurii și al accesului

| Componentă                         | Inventar / sursă                                                                                                  | Stare și limită                                                                                                                                                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domeniu public                     | `cutiutamagica.eu`; `www` canonicalizat                                                                           | PASS — HTTPS și probe publice; nu audit complet al tuturor înregistrărilor DNS                                                                                                    |
| Administrare                       | `/admin`, `/auth`, subdomeniul `app.cutiutamagica.eu`; funcții SSR TanStack                                       | FIXED local — RBAC backend, sesiuni și centru de securitate; 3 aplicații Access în cont, niciuna pentru magazin (reconfirmat UI read-only); modul dedicat/Access rămân neactivate |
| API                                | `/api/v1/*`, inclusiv `api.cutiutamagica.eu`; inventar pe fișiere în `src/server/api`, funcții în anexa JSON      | PASS pentru rutele testate; endpoint necunoscut 404 nu demonstrează autorizarea tuturor API-urilor                                                                                |
| URL alternativ                     | `cutiuta-magica-store.avyrontech.workers.dev`                                                                     | FAIL live — health 200/schema 91; FIXED local prin allowlist host + `workers_dev:false` și `preview_urls:false`; preview-urile concrete nu au fost enumerate din nou              |
| Runtime                            | TanStack Start/React SSR și API în Worker dedicat                                                                 | PASS — fără rescriere/backend nou; middleware de securitate înaintea rutării                                                                                                      |
| D1                                 | Bază dedicată magazinului; 205 tabele raportate live de `wrangler d1 info`                                        | PASS inventar; migrări 0092–0094 numai în baza disposable locală                                                                                                                  |
| R2                                 | Bucket dedicat; 19 obiecte / aproximativ 11,6 MB în inventarul read-only                                          | NOT_VERIFIED pentru fiecare obiect și toate vechile permisiuni; auditul precedent consemnează acces public de bucket dezactivat                                                   |
| KV                                 | Binding `CACHE` dedicat                                                                                           | PASS cod — cache/ephemeral; sesiuni autoritative în D1, nu KV                                                                                                                     |
| Queue/DLQ                          | `COMMERCE_EVENTS`, consumer și dead-letter dedicate                                                               | PASS simulări; recuperarea reală a tuturor mesajelor istorice nu a fost testată                                                                                                   |
| Workers AI                         | Binding AI, chat public limitat; Studio AI local/Ollama/ComfyUI separat                                           | NOT_VERIFIED generare live și heartbeat nou; nu s-a pornit un model                                                                                                               |
| Secrete                            | Worker secrets + seiful D1 AES-GCM existent                                                                       | PASS principiu/cod; s-au citit numai nume, nu valori. Prezența unui secret nu validează integrarea                                                                                |
| Stripe/Revolut                     | Checkout găzduit, webhook-uri semnate, tentative de plată în D1                                                   | PASS simulări; NOT_VERIFIED tranzacție sandbox reală în contul furnizorului                                                                                                       |
| Oblio                              | Adaptor facturare și reconciliere încasare separate de răspunsul webhook                                          | PASS simulări; NOT_VERIFIED cont, livrare document și reconciliere externă efectivă                                                                                               |
| SmartShip/Easybox                  | Oferte server, alegere locker, AWB cu idempotentă/reconciliere                                                    | PASS simulări; nu s-a emis AWB real                                                                                                                                               |
| Resend/Email Sending               | Transporturi și operații idempotente existente                                                                    | PASS simulări; NOT_VERIFIED livrare inbox/SPF/DKIM/DMARC în această rundă                                                                                                         |
| Metricool/marketplace/Brave/Google | Integrări opționale, cu conector/aprobări și disponibilitate distincte                                            | NOT_VERIFIED funcționare externă completă. Cheia Brave rămâne amânată; nu este declarată funcțională                                                                              |
| GitHub/CI                          | Repository public, quality gates și audit periodic                                                                | FIXED local — Actions fixate la SHA; FAIL extern — ramura de referință neprotejată, fără ruleset; secret scanning/push protection raportate dezactivate                           |
| Monitorizare                       | Worker observability, `security_events`, `audit_log`, `provider_operations`, `webhook_events`, notificări interne | PASS în simulări; NOT_VERIFIED răspuns operațional la incident real                                                                                                               |
| AVYRON                             | Fără bindings/DB/control operațional partajate                                                                    | FIXED — numai statistici agregate aprobate; asset/skill export și propuneri inbound blocate pe server și în consumer                                                              |

Inventarul funcțiilor SSR și permisiunilor este în [server-functions.json](ecommerce-20261109/evidence/server-functions.json). Regexurile rutelor și verificările resource-level rămân în codul API; anexa nu pretinde că enumeră orice adresă posibilă.

## 3. Constatări și remedieri

| ID / prioritate       | Constatare și risc                                                                                                                 | Stare / remediere / dovadă                                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01 / ridicată     | Consumerul AVYRON executa un mesaj fără reverificarea aprobării și hashului la execuție; concurența putea trimite de mai multe ori | FIXED — hash aprobat, status și expirare, payload numeric strict, CAS/lease, limită încercări, idempotency key, redirect interzis; `avyron-boundary.test.ts`                                 |
| SEC-02 / ridicată     | Exporturi asset/skill și propuneri AVYRON depășeau mandatul actual „numai statistici”                                              | FIXED — backend și UI restrânse, istoricul păstrat, migrare append-only 0094 fără modificări de produse sau conturi                                                                          |
| SEC-03 / medie        | Importul XLSX decomprima întreaga arhivă înainte de limita foii; referința de coloană putea produce array foarte mare              | FIXED — filtrare ZIP înainte de decomprimare, numai foaie/sharedStrings, max 4 MB/fișier și 6 MB cumulat, 128 intrări ZIP, maximum 30 coloane acceptate; teste de arhive comprimate malițios |
| SEC-04 / medie        | `formData()` putea aloca un upload mare înainte de verificarea fișierului dacă lipsea/era fals `Content-Length`                    | FIXED — multipart măsurat înainte de parsare; stream admin R2 întrerupt peste mărimea declarată/limita MIME; `upload-bounds.test.ts`                                                         |
| SEC-05 / medie        | Fotografia unei recenzii putea fi atașată după ce moderatorul îi schimba starea în timpul uploadului                               | FIXED — compare-and-set cere încă `status='pending'`; obiectul concurent neasociat este eliminat prin fluxul existent                                                                        |
| SEC-06 / medie        | Evenimentele de rambursare/dispută puteau fi confirmate fără sarcină vizibilă de reconciliere                                      | FIXED parțial — alertă internă idempotentă, validare mediu și identificatori; **nu** modifică automat contabilitatea; automatizarea ledgerului de refund rămâne FAIL, vezi FIN-02            |
| SEC-07 / medie        | Acțiunile CI erau referite prin tag mobil                                                                                          | FIXED — checkout/setup-node fixate la SHA oficial; permisiune `contents:read` păstrată                                                                                                       |
| SEC-08 / ridicată     | Protecțiile locale nu sunt încă publicate; hostname alternativ încă accesibil                                                      | FAIL live / FIXED local — release progresiv necesar; nu se declară remediat live                                                                                                             |
| SEC-09 / medie        | Fișierele sunt verificate MIME/magic bytes, dar nu există antivirus verificat                                                      | FAIL — nu se etichetează drept scanate; personalizarea nouă rămâne închisă; plan de scanare/transcodare și retenție necesar înainte de lansare                                               |
| SEC-10 / medie        | CSP compatibil de bază nu limitează scripturile prin nonce/hash                                                                    | FAIL pentru ASVS L2 strict — trecere inițial în report-only, inventar de scripturi și teste provider/checkout înainte de enforcement                                                         |
| SEC-11 / medie        | Setări externe GitHub lipsă                                                                                                        | FAIL — protecție ramură, verificări obligatorii și secret scanning necesită configurare separată, fără a bloca arbitrar colaboratorii                                                        |
| SEC-12 / operațională | Backupul v2 este redactat și plafonat; nu este o restaurare completă a serviciului                                                 | NOT_VERIFIED DR — restaurează separat D1/R2/config/secrete, apoi verifică FK, număr rânduri și permisiuni; arhivele v1 nu au fost șterse/modificate                                          |

Lotul de securitate precedent recuperat include cookie-uri `__Host-` pe HTTPS, HttpOnly/Secure/SameSite, quota înainte de KDF, sesiuni cu expirare/rotație/revocare, permisiuni explicite pe server, izolarea financiarului prin `operations.read`, JWT Access pregătit, identități runner criptate și limitate, loguri fără raw errors, backup v2 redactat și scripturi staging/smoke/rotație offline. Detalii și probe în [auditul lotului](../security/2026-11-08-audit.md) și [rollout](../security/ROLLOUT.md). Acestea nu sunt o nouă activare a MFA sau Access.

Lotul public recuperat include consimțământ opțional nebifat/retragere, tracking numai după acord, minimizarea URL/referrer, cereri JSON limitate, retry fotografie fără recenzie duplicată, corecții de landmarks/focus și carduri mobile. [Raportul public și capturile](storefront-20261108/report.md) rămân dovezi datate, completate de regresia reunită.

## 4. Checkout, comenzi, plăți și riscuri financiare

| Verificare                             | Rezultat / dovadă / limită                                                                                                                                                                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Prețuri, monedă, reduceri și transport | PASS în simulări — catalog D1 autoritativ, bani întregi, ofertă server cu fingerprint/expirare și total acceptat; prețul trimis din frontend nu decide suma                                                                                                                          |
| Coș și idempotentă comandă             | PASS — normalizare cantități, request hash, cheie unică, tranzacție atomică; cereri concurente identice produc o comandă, alt coș cu aceeași cheie este respins                                                                                                                      |
| Stoc și rezervare                      | PASS local — trigger în aceeași tranzacție, respinge stoc insuficient, eliberează anulări și consumă expedierea o dată; **FIN-01:** nu este implementată curățarea automată verificată a rezervărilor abandonate după expirare                                                       |
| Cupoane/recomandări/primul transport   | PASS — revendicare atomică și prevenire dublă utilizare în testele existente; identitatea contului se rezolvă pe server                                                                                                                                                              |
| Stripe                                 | PASS simulări — hosted Checkout, account/environment check, semnătură HMAC cu fereastră de timp, sumă/monedă/tentativă exactă; NOT_VERIFIED sandbox la furnizor                                                                                                                      |
| Revolut                                | PASS simulări — semnătură și timp, citire server a comenzii providerului, recuperarea create-ului cu răspuns pierdut fără repetarea lui; NOT_VERIFIED sandbox la furnizor                                                                                                            |
| Redirect succes                        | PASS — nu marchează plata; statusul vine din backend, prin token capabilitate; tokenul nu este trimis procesatorului în URL                                                                                                                                                          |
| Duplicate/ordine evenimente            | PASS — replay și succese distincte nu dublează încasarea/counterele; expirarea/eșecul întârziat nu retrogradează plata capturată; webhook timpuriu răspunde retry                                                                                                                    |
| Anulare după plată întârziată          | PASS fail-closed — plata pe comandă anulată intră la verificare; nu reactivează automat stoc/comandă; reconcilierea manuală rămâne necesară                                                                                                                                          |
| Facturi și AWB                         | PASS în mock-uri pentru cererile documentate și reconciliere; niciun document sau AWB real emis                                                                                                                                                                                      |
| Rambursări și dispute                  | FIN-02 / FAIL pentru sincronizare financiară automată completă: nu există ledger complet provider→refund→factură/storno, testat în sandbox. Alertarea este FIXED; sumele și documentele necesită verificare umană. Nu este creat un refund pornind doar de la un eveniment incomplet |
| Recuperare întreruperi                 | PASS parțial — outbox, queue/DLQ, chei și joburi de reconciliere existente; NOT_VERIFIED fault-injection pe infrastructura live și întrerupere în fiecare punct posibil                                                                                                              |
| Taxe, marjă și conformitate fiscală    | NOT_VERIFIED juridic/fiscal — formulele existente sunt păstrate; auditul nu inventează TVA, marje, facturi sau statut fiscal                                                                                                                                                         |

FIN-01 are risc de disponibilitate falsă și vânzări pierdute: rezervările pot rămâne active dacă abandonul nu ajunge la anulare. Nu se eliberează automat stocul unei plăți ambigue: soluția necesită reconcilierea procesatorului, apoi expirarea atomică a comenzii neplătite. Nu s-au schimbat stocuri reale.

FIN-02 are risc de rapoarte de încasări supraevaluate după un refund extern. Operatorul verifică procesatorul, comanda și documentele, folosind alerta internă. Automatizarea ulterioară trebuie să trateze refund parțial/multiplu, monedă, mediu, referință exactă, chargeback, retry și idempotentă, înainte de orice activare.

## 5. Produse, importuri, fișiere și date clienți

- **PASS:** registre SKU/GTIN și coduri proprii, constrângeri unice și istoric, validarea checksumului GTIN, codurile de test separate de cele comerciale. Nu se inventează EAN/certificat ori sursă de furnizor.
- **PASS:** CSV export neutralizează prefixele de formulă, XLSX export scrie celule text; importul este validat în backend pentru câmpurile/permisiunile acceptate. Parserul XML nu execută macro-uri, formule sau relații externe. Limitele ZIP/coloane sunt remediate în acest lot.
- **PASS local:** clientul vede numai datele legate de identitatea sa; billing/cards, comenzi, loialitate, personalizări și notele interne sunt acoperite de teste de izolare. Cookie-ul unui client nu dă drepturi administrative.
- **PASS local:** R2 privat nu este expus prin cheie arbitrară; media publică cere asset activ/public/aprobat/drepturi validate, documentele și personalizările cer autorizare. Preview local este legat de mediu/loopback, fără flag public de bypass.
- **NOT_APPLICABLE lansare publică:** atelierul nu acceptă cereri noi până la activare explicită; GET păstrează istoricul propriu. **NOT_VERIFIED** previzualizare/producție/comandă personalizată cap-coadă, retenția și ștergerea completă a tuturor fișierelor istorice.
- **FAIL antivirus:** tipul și semnătura nu exclud un fișier poliglot sau conținut malițios. Nu se afișează badge „scanat”. Necesare procesare sigură/transcodare și un scaner verificat, cu acces închis pentru obiecte nevalidate; nu se introduce acum un furnizor plătit sau o carantină care ar bloca media comercială existentă fără migrare verificată.

## 6. Matrice OWASP ASVS 5.0.0

[Anexa cu toate cele 345 ID-uri, niveluri și stări](ecommerce-20261109/ASVS_5_0_0_MATRIX.md) folosește CSV-ul release-ului oficial și îi păstrează hashul în dovezi. Fiecare cerință incomplet verificată rămâne `NOT_VERIFIED`, inclusiv când există teste utile în familie. Nu se echivalează o testare parțială cu PASS pe întregul capitol.

| Familie                                      | Evaluare                                                                                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1 Encoding / V2 Validation & Business Logic | Interogări parametrizate, contracte Zod, escaping, tranzacții și concurență verificate în fluxurile principale; inventarul exhaustiv al tuturor sink-urilor rămâne NOT_VERIFIED |
| V3 Frontend / V4 API                         | Cookie-uri și Origin remediate/testate; CSP strict FAIL; GraphQL/WebSocket neimplementate NOT_APPLICABLE                                                                        |
| V5 File Handling                             | Limite FIXED; antivirus FAIL; accesul privat testat, retenție completă NOT_VERIFIED                                                                                             |
| V6 Authentication                            | Autentificarea existentă păstrată; V6.3.3 ACCEPTED_EXCEPTION pentru MFA; L2 integral nu poate fi declarat                                                                       |
| V7 Sessions / V8 Authorization               | Remedieri/teste de rotație, expirare, revocare și izolare; reautentificarea suplimentară înaintea oricărei operațiuni critice nu este atestată integral                         |
| V9 Tokens / V10 OAuth                        | JWT Access verificat local; toate identitățile și sesiunile IdP live NOT_VERIFIED                                                                                               |
| V11 Crypto / V12 Communication               | Hash parole, AES-GCM și HMAC revizuite, HTTPS/HSTS observate; rotație/recuperare efective și toate conexiunile NOT_VERIFIED                                                     |
| V13 Configuration / V14 Data                 | Separare infrastructură, secret scanning limitat, cache și minimizare; controale externe/retentie/DR rămân deschise                                                             |
| V15 Architecture / V16 Logging               | Boundary-uri, CI și jurnal documentate; exercițiul de incident și atestarea completă sunt NOT_VERIFIED                                                                          |
| V17 WebRTC                                   | NOT_APPLICABLE — absent                                                                                                                                                         |

## 7. OWASP Top 10:2025 și API Top 10:2023

| Top 10:2025                               | Evaluare contextuală                                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| A01 Broken Access Control                 | FIXED pe permisiunile și izolările identificate; teste backend, fără garanție pentru rute netestate                        |
| A02 Security Misconfiguration             | FAIL live pe URL alternativ și protecții externe neactivate; plan/cod local pregătite                                      |
| A03 Software Supply Chain Failures        | FIXED pin Actions și override dev deja recuperat; audit dependențe, lockfile și istoric limitat; proveniență semnată lipsă |
| A04 Cryptographic Failures                | PASS în testele AES-GCM/HMAC/session tokens; rotația reală a secretelor NOT_VERIFIED                                       |
| A05 Injection                             | PASS eșantion de contracte/SQL/escaping/import; nu este pentest exhaustiv SQLi/XSS/SSRF                                    |
| A06 Insecure Design                       | FIXED boundary AVYRON/AI, idempotentă; FAIL flux complet refund/DR                                                         |
| A07 Authentication Failures               | FIXED sesiuni/quota; ACCEPTED_EXCEPTION lipsă MFA și păstrarea conturilor existente                                        |
| A08 Software or Data Integrity Failures   | PASS semnături/totale/concurență simulate; integrări reale NOT_VERIFIED                                                    |
| A09 Logging and Alerting Failures         | FIXED jurnal/redactare/alerte; NOT_VERIFIED răspuns operațional                                                            |
| A10 Mishandling of Exceptional Conditions | FIXED timeouts/upload/retry UI; recuperare totală după crash NOT_VERIFIED                                                  |

| API Top 10:2023               | Dovadă / limită                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| API1 BOLA                     | Teste două identități și resurse proprii, token de comandă greșit respins                                            |
| API2 Broken Authentication    | Cookie/session/runner/Access testate; MFA excepție explicită                                                         |
| API3 Property Authorization   | Rol/identitate nu se iau din payload; notele interne nu se trimit clientului                                         |
| API4 Resource Consumption     | Quota D1 atomică, limite body/arhivă/timeouts; CPU Free rămâne limită acceptată                                      |
| API5 Function Authorization   | Permisiuni backend + inventar SSR; deny-by-default în navigație și server                                            |
| API6 Sensitive Business Flows | Idempotentă, cupoane/stoc, aprobare social și AVYRON, fără agenți financiari autonomi                                |
| API7 SSRF                     | Allowlist checkout/runner/destinație AVYRON și redirect blocat; toate adaptoarele nu sunt atestate exhaustiv         |
| API8 Misconfiguration         | Config staged/host/Origin; Access/WAF/live aliases încă deschise în rollout                                          |
| API9 Inventory                | Rute/hosts/funcții inventariate; deployment previews concrete NOT_VERIFIED                                           |
| API10 Unsafe API Consumption  | Schema/amount/currency/provider identity verificate în adaptoarele principale; răspunsuri reale sandbox NOT_VERIFIED |

WSTG 4.2 folosit pentru informații/configurație/identity/authentication/authorization/session/input/error/crypto/business logic/client-side. Probe active numai în local; în producție numai cereri read-only cu volum mic. Nu s-au folosit brute force, SQLi distructiv, plăți sau fișiere malițioase pe producție. Un audit automat nu înlocuiește un pentest independent.

## 8. PCI DSS 4.0.1 — aplicabilitate

Codul folosește redirect către checkout găzduit și tokenuri de procesator pentru card salvat. Nu colectează PAN/CVV în formularele magazinului. Aceasta reduce perimetrul, dar nu dovedește automat eligibilitatea SAQ A sau conformitatea comerciantului. Eligibilitatea, AOC-ul furnizorilor și cerințele băncii/procesatorului rămân **NOT_VERIFIED**.

| Arie PCI relevantă                              | Stare                                                                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Date card în aplicație                          | PASS în codul revizuit — nu există câmpuri PAN/CVV; token/brand/last4 nu se prezintă drept date complete  |
| Cerințe 3/4, protecție date și transport        | PASS eșantion local/public; storage/fluxurile externe totale NOT_VERIFIED                                 |
| Cerințe 6, dezvoltare și scripturi              | FIXED gates/consent/pin; CSP strict și inventar verificat al tuturor scripturilor rămân FAIL/NOT_VERIFIED |
| Cerințe 7/8, privilegii și autentificare        | RBAC/sesiuni FIXED; fără MFA ACCEPTED_EXCEPTION a produsului, **nu derogare PCI acordată de procesator**  |
| Cerințe 10/11, jurnal/testare                   | PASS simulări; ASV scan/pentest/frecvențe PCI reale NOT_VERIFIED                                          |
| Cerințe 12, responsabilități/furnizori/incident | NOT_VERIFIED organizațional; necesare dovezi operator/furnizori                                           |

[FAQ PCI SSC 1588](https://www.pcisecuritystandards.org/faqs/1588/) distinge redirectul de formularul de plată încorporat pentru criteriul de scripturi SAQ A. Nu se atribuie magazinului cerințe de iframe fără să existe iframe, dar nici nu se declară tot standardul neaplicabil.

## 9. NIST SSDF 1.1, CSF 2.0, OpenSSF și SLSA

| SSDF                          | Evaluare                                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| PO — pregătirea organizației  | PASS reguli repository, perimetru, handoff și inventar; responsabilități organizaționale și training NOT_VERIFIED        |
| PS — protejarea software-ului | FIXED SHA Actions/lockfile/secrete separate; FAIL protecție ramură externă; proveniență și arhivare release NOT_VERIFIED |
| PW — producere sigură         | PASS type/lint/teste/build, threat boundaries și regresii comerciale; analiză independentă/fuzzing extins NOT_VERIFIED   |
| RV — răspuns vulnerabilități  | PASS raport/backlog și scan periodic pregătit; SLA, canal formal și exercițiu de incident NOT_VERIFIED                   |

CSF 2.0: **GOVERN** reguli/excepții definite, roluri organizaționale NOT_VERIFIED; **IDENTIFY** inventar și riscuri documentate; **PROTECT** controale locale remediate, live parțial; **DETECT** jurnal/alerte locale; **RESPOND** procedură și revocare pregătite, exercițiu NOT_VERIFIED; **RECOVER** rollback documentat, restaurare completă NOT_VERIFIED.

OpenSSF Scorecard: evaluare contextuală a Token-Permissions, Pinned-Dependencies, CI-Tests, Vulnerabilities, Branch-Protection și Code-Review; **nu s-a produs un scor oficial Scorecard**. Lockfile+audit nu certifică siguranța întregului supply chain. SLSA v1.2: **NOT_VERIFIED**, fără nivel atribuit; buildurile locale și un hash de fișier nu sunt atestare de proveniență semnată. Nu se instalează un serviciu plătit pentru a simula acest rezultat.

## 10. AI și automatizări — OWASP LLM Top 10:2026

Ediția 2026 a fost confirmată în [sursa canonică publicată](https://github.com/GenAI-Security-Project/GenAI-LLM-Top10/blob/main/2026/README.md), nu presupusă din numerotarea paginii istorice 2025.

| Risc 2026                              | Evaluare în implementarea existentă                                                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| LLM01 Prompt Injection                 | PASS limitat — chat cu contexte publice și fără instrumente financiare; promptul nu acordă autorizare; robustness adversarial live NOT_VERIFIED |
| LLM02 Sensitive Information Disclosure | FIXED statistici numerice allowlist, runner fără date personale/secrete; redactare chat testată; retenția prompturilor externe NOT_VERIFIED     |
| LLM03 Excessive Agency                 | FIXED drepturi runner distincte, aprobare/conector/idempotentă; AI nu primește implicit admin și nu poate executa rambursări                    |
| LLM04 Supply Chain                     | Profil/model separat; artefactele modelelor locale și furnizorii nu au fost atestați end-to-end — NOT_VERIFIED                                  |
| LLM05 Data and Model Poisoning         | Conținut public verificat și aprobări; proveniență corpus/model completă NOT_VERIFIED                                                           |
| LLM06 Unbounded Consumption            | Quota, timeout și limite job; buget provider separat; capacitatea reală Free și generare live NOT_VERIFIED                                      |
| LLM07 Misinformation                   | Draft și verificare umană, claims de preț verificate în chat; adevărul comercial rămâne D1; nu se promite că modelul nu greșește                |
| LLM08 Hidden Context Exposure          | Fără secrete în contexte; limite scope și redactare; atacuri extinse live NOT_VERIFIED                                                          |
| LLM09 Vector and Embedding Weaknesses  | NOT_APPLICABLE — nu există Vectorize/RAG cu embeddings implementat în perimetrul revizuit                                                       |
| LLM10 Improper Output Handling         | Text/draft/contracte și aprobare, fără execuție de cod generat; toate formatele/model outputs NOT_VERIFIED                                      |

## 11. WCAG 2.2 AA, UX, SEO și performanță

Traseul homepage → catalog/categorie → produs → coș → checkout este verificat local fără submit de comandă. Personalizarea nouă este în pregătire; confirmarea financiară este simulată. Ecranul checkout găzduit al furnizorului nu poate fi declarat WCAG conform prin auditul acestui cod.

| Arie                               | Stare / probă                                                                                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Landmarks, H1, alt și nume butoane | FIXED/PASS pe cele 45 probe responsive din lotul public; 9 pagini × 5 lățimi, nu toate stările posibile                                                                       |
| Focus și consimțământ              | FIXED — titlu focusabil/revenire la opener, controale 44 px, banner scrollabil, fără cumpărare plutitoare peste banner                                                        |
| Formulare/erori/retry              | FIXED — păstrare valori, busy/single-flight, erori în română, foto retry fără dublare; eroarea inline retur necesită reconfirmarea vizuală consemnată în lotul anterior       |
| Tastatură/screen reader/zoom       | NOT_VERIFIED integral — inspecția DOM/focus nu este probă VoiceOver/NVDA completă sau zoom 400% în toate stările                                                              |
| Contrast                           | Corecții și capturi datate; NOT_VERIFIED toate combinațiile active/hover/disabled și media încărcată de utilizatori                                                           |
| iOS/Android și browsere            | Responsive emulat verificat; NOT_VERIFIED dispozitive fizice și toate versiunile Safari/Firefox                                                                               |
| SEO                                | Auditul public verifică 38 canonice, 7 produse, metadate/imagini/sitemap/404/noindex; dovada GSC individuală 38/38 este datată 8 noiembrie în handoff, nu dedusă din HTTP 200 |
| Core Web Vitals                    | Un eșantion Opera anterior LCP ~2,52 s și CLS foarte mic; NOT_VERIFIED CrUX/INP/percentile, fără scor Lighthouse inventat                                                     |
| Build/performance                  | Build poate raporta chunk-uri >500 kB; nu este echivalent cu experiență lentă demonstrată, dar reducerea JS necesită profilare înainte de noi schimbări comerciale            |

[WCAG 2.2](https://www.w3.org/TR/WCAG22/) este ținta tehnică. [EN 301 549 V4.1.1, 2026-09](https://www.etsi.org/deliver/etsi_EN/301500_301599/301549/04.01.01_60/en_301549v040101p.pdf) a fost verificat; publicarea standardului nu demonstrează singură aplicabilitatea juridică sau prezumția de conformitate pentru acest operator.

## 12. Confidențialitate și verificări juridice

**FIXED local:** consimțământ granular, fără opționale prebifate; retragere disponibilă în footer; tracking blocat înainte de acord și după retragere, fără ștergerea coșului; query/hash eliminate și referrer minimizat pentru pixelul de marketing. Cache privat explicit pentru cont/checkout/admin/API, PWA exclude date personale.

**NOT_VERIFIED / validare juridică:** textele publice existente despre autentificare/retentie/tracking nu reflectă toate mecanismele actuale. Drafturile exacte sunt în [legal-review.md](storefront-20261108/legal-review.md); nu au fost publicate ca afirmații juridice aprobate. Adresa reală eliminată public la cererea administratorului nu este restaurată și nu este inventată o adresă înlocuitoare; obligațiile de identificare comercială necesită validare juridică separată. Nu se inventează certificate, declarații CE sau documente ale furnizorilor.

[EAA, Directiva (UE) 2019/882](https://eur-lex.europa.eu/eli/dir/2019/882/oj/eng) include servicii e-commerce și o excepție pentru microîntreprinderi prestatoare de servicii. Statutul concret al operatorului, transpunerea națională și eventualele excepții sunt **NOT_VERIFIED**, nu presupuse. Accesibilitatea tehnică rămâne obiectiv chiar când există o excepție legală. Retenția fiscală, drepturile consumatorilor, ștergerea conturilor/documentelor și conformitatea produselor necesită validare de responsabilul juridic/fiscal și de furnizor.

## 13. Teste, dovezi și trasabilitate

Dovezile consolidate sunt în [ecommerce-20261109/evidence](ecommerce-20261109/evidence/). Scanările nu publică valori de secrete, parole, sesiuni ori date de comenzi reale.

- Regresii comerciale: `src/server/checkout.test.ts`, `storefront-experience.test.ts`, `oblio.test.ts`, `growth.test.ts`, `reviews.test.ts`.
- Autorizare/sesiuni: `src/server/security/*`, `customer-access.test.ts`, `customer-password.test.ts`, `admin-password-auth.test.ts`, `api/customer-loyalty.test.ts`.
- Noi: `avyron-boundary.test.ts`, `upload-bounds.test.ts`, arhive Excel ostile în `catalog-spreadsheet.test.ts`, concurență/ordine evenimente/refund alert în `checkout.test.ts`.
- Audit dependențe: `npm audit --json`; scanare surse `npm run security:check`; istoric accesibil local `npm run security:history`, euristici cu valori redactate. Nu reprezintă detecție completă prin entropie sau verificarea validității credențialelor.
- Build/dry-run fără deploy; D1 migrări numai într-o stare `/tmp/cutiuta-security-*`, cu bindings locale. Testele nu folosesc chei live de procesator.
- Stările finale și limitele execuției sunt în `verification.json`; un test întrerupt/timeout nu este numărat drept PASS.
- **Rezultat final:** typecheck, lint, **87 fișiere / 489 teste**, build și dry-run PASS; 19 probe HTTP locale, 38 URL-uri SEO, audit dependențe zero și scanare euristică istoric 2.894 bloburi candidate fără potriviri. Rularea serială a folosit timeout de test 20 s/hook 30 s numai în CLI, după nouă depășiri de 5 s în timpul buildurilor paralele. Nu reprezintă o măsurătoare de latență a magazinului.
- **UI reunit:** login local fără MFA, centru de securitate, politica AI doar statistici, istoricul produsului desktop/mobil și linkul către raportare verificate. Bannerul cookie la 320 × 568 este încadrat complet; acțiuni 44 px și retragere salvată. Coșul din antet s-a deschis la 375 px și checkoutul a fost atins fără submit. Ultima captură/măsurătoare a checkoutului a avut timeout în automatizarea browserului; nu se raportează drept probă vizuală nouă trecută. Activarea coșului plutitor nu a fost confirmată separat; două observații fără dialog nu sunt suficiente pentru a atribui un defect aplicației.
- [Fișă produs desktop](ecommerce-20261109/evidence/product-history-desktop.jpg), [mobil](ecommerce-20261109/evidence/product-history-mobile.jpg), [consimțământ ecran scurt](ecommerce-20261109/evidence/consent-short-mobile.jpg), [coș mobil — captură din lotul public anterior](storefront-20261108/evidence/cart-mobile.jpg).

## 14. Excepții și plan de remediere/rollout

| Prioritate / responsabil                       | Acțiune și criteriu de închidere                                                                                                                                                                      |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0 release / administrator                     | Revizuiește lotul reunit, CI la revizia exactă, schema 92–94 în staging, apoi release separat autorizat. Revalidează login, webhooks, dashboard și client înainte de restricții Access                |
| P1 securitate / administrator                  | URL alternativ blocat public după deploy și verificare independentă; inventariază fiecare preview. Access pilot doar după verificarea audienței, service tokens, integrărilor și accesului de urgență |
| P1 financiar / operator+dezvoltare             | Sandbox real Stripe/Revolut, scenarii refund/dispută/ordine inversă și ledger cu reconciliere exactă; nu activa rambursare autonomă                                                                   |
| P1 stoc / dezvoltare                           | Reconciliere rezervări expirate cu procesatorul; eliberare numai după stare confirmată, atomică, cu audit; test fără supravânzare                                                                     |
| P1 supply chain / administrator                | Branch protection/checks/review și secret scanning GitHub; niciun secret detectat nu se consideră sigur până la verificare/rotație coordonată                                                         |
| P2 fișiere / dezvoltare                        | Scaner/transcodare reală și lifecycle privat; test poliglot/malware, acces exclusiv, retenție și migrare legacy; fără lansarea prematură a atelierului                                                |
| P2 frontend / dezvoltare                       | CSP report-only cu nonce/hash și inventar resurse, apoi enforcement după teste SSR/plată/audio/media                                                                                                  |
| P2 recuperare / operator                       | Exercițiu restaurare D1/R2/config/secrete, măsurători RPO/RTO și verificări integritate; backup redactat nu este DR complet                                                                           |
| P2 legal/accesibilitate / responsabil desemnat | Validează textele și obligațiile operatorului/furnizorilor; audit manual WCAG cu tehnologii asistive și dispozitive reale                                                                             |

**ACCEPTED_EXCEPTION:** fără MFA administrativ, fără resetarea/suspendarea conturilor inițiale; autentificarea actuală este păstrată. Această alegere exclude declarația ASVS L2 integrală și nu reprezintă aprobare PCI. Cloudflare Free și riscul limitei CPU/1102 rămân acceptate de administrator; nu s-a activat Paid. Access/WAF strict nu se activează fără probe de acces și integrare, pentru a evita blocarea activității.

Rollback: se revine la versiunea Worker precedentă; schema nouă este aditivă/configurabilă, fără rescrierea migrărilor. Revenirea codului vechi ar redeschide și funcții AVYRON vechi: canalul trebuie menținut dezactivat extern și setările restrictive păstrate. Nu se restaurează orbește o bază veche peste comenzile intrate între timp. Pașii de staging, acces de urgență și verificare sunt în [ROLLOUT.md](../security/ROLLOUT.md).

## 15. Surse primare

[ASVS 5.0.0](https://github.com/OWASP/ASVS/releases/tag/v5.0.0_release), [OWASP Top 10:2025](https://top10.owasp.org/2025/), [API Top 10:2023](https://api-security.owasp.org/editions/2023/en/0x11-t10/), [WSTG 4.2](https://wstg.owasp.org/v4.2/), [NIST SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final), [NIST CSF 2.0](https://www.nist.gov/cyberframework), [PCI SSC SAQ A](https://www.pcisecuritystandards.org/faqs/1588/), [OpenSSF checks](https://github.com/ossf/scorecard/blob/main/docs/checks.md), [SLSA v1.2](https://slsa.dev/spec/v1.2/), [Stripe webhook ordering/retries](https://docs.stripe.com/webhooks), [Stripe refund events](https://docs.stripe.com/api/events/types). Referințele WCAG/EN/EAA și LLM 2026 sunt legate în secțiunile de aplicabilitate. Frameworkurile sunt instrumente de evaluare; nu certificări deduse dintr-un build reușit.
