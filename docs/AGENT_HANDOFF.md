# Handoff pentru agenții care lucrează la Cutiuța Magică

## Handoff 2026-10-22 — confirmarea plății înainte de acceptarea comenzii

- Checkoutul cu card creează o înregistrare provizorie `pending/unpaid` necesară sesiunii de plată. Nu trimite e-mailuri, notificări de comandă nouă, evenimente de conversie și nu crește contorul/valoarea clientului înainte de confirmarea semnată a procesatorului. Webhookul validează furnizorul, mediul, sesiunea, suma și moneda, apoi marchează plata și pune notificările în coadă; trimiterea e-mailurilor și consumul outboxului refuză înregistrările încă neplătite.
- Clientul poate alege altă metodă numai când sesiunea Stripe este `open/unpaid`: endpointul verifică sesiunea în contul Stripe, o expiră și anulează înregistrarea provizorie, eliberând și codurile promoționale/de recomandare rezervate. O sesiune completată ori ambiguă rămâne în verificare. În admin, solicitările neplătite sunt etichetate „Așteaptă plata”, iar procesarea este blocată atât în UI, cât și în repository.
- Fișiere: `src/server/api/payments.ts`, `router.ts`, `db/order.repository.ts`, `db/admin.repository.ts`, `integrations/stripe.ts`, `integrations/resend.ts`, `queue/commerce-consumer.ts`, `src/components/site/PaymentRecovery.tsx`, `src/admin/pages/Orders.tsx`, contractul de plată și testele checkout. Fără migrare sau schimbare de secrete.
- Verificări: 314 teste în 56 fișiere, tipuri, lint, build și dry deploy Cloudflare trecute. Testele acoperă lipsa notificărilor și a valorii CRM înainte de plată, blocarea procesării, abandonarea sigură a sesiunii Stripe, capturarea idempotentă și refuzul unei confirmări după anulare. Checkoutul local cu produs a fost inspectat la 390 × 844 și 1280 × 720; bara mobilă se retrage la butonul din formular. Metodele online și panoul administrativ nu pot fi probate vizual în preview fără conexiunile furnizorilor și sesiunea admin. Identificarea/anularea comenzii reale rămân necesare. Nu s-a făcut push, migrare remote sau deploy în acest handoff.

## Handoff 2026-10-22 — prezentarea checkoutului și alegerea curierului

- În ramura locală `codex/notification-glass-20261022`, checkoutul are acțiunea principală „Confirmă comanda” imediat după acordul precontractual. Bara fixă de mobil spune „Finalizează comanda” și se retrage când butonul principal intră în zona vizibilă. Ambele folosesc același formular, validări și cheie de idempotentă; un blocaj sincron previne trimiterea simultană.
- Stripe apare ca „Plata Online”, cu descrierea scurtă a cardului și portofelului digital, fără promisiunea unui portofel anume. Rambursul descrie plata la primire, cu metodele condiționate de curier sau de capacitatea punctului Easybox. Transportul la cost zero este prezentat ca inclus în comandă.
- Ofertele de livrare au titlul „Alege curierul potrivit:”, selector radio lizibil, accent cromatic pentru numele de curieri recunoscute (SAMEDAY, FAN Courier, Cargus, DPD, GLS, FedEx, PTT) și data estimată pe rând separat sub „Transport estimat după predare:”. Pentru nume neidentificate rămâne un card neutru. Nu s-a schimbat calculul tarifelor sau selecția ofertelor.
- Fișiere: `src/routes/comanda.tsx`, `src/components/site/CheckoutDelivery.tsx`, `src/styles.css`, acest handoff. Fără migrații noi sau configurări externe. Nu s-a creat nicio comandă sau plată în preview. Produsele demo au fost încărcate numai în D1 local; Pisicuța a fost marcată local disponibilă pentru a vedea checkoutul cu produs.
- Verificări: `npm run typecheck`, `npm test -- --maxWorkers=2` (56 fișiere, 310 teste), `npm run lint`, `npm run build`, `npm run cf:deploy:dry`, Prettier și `git diff --check` au trecut. Aspectul checkoutului a fost inspectat în browser la 1280×720 și 390×844; bara mobilă dispare la butonul principal, iar documentul nu depășește 390 px. Cardurile de ofertă live și plata online nu s-au putut proba vizual deoarece previewul local nu are conexiunile furnizorilor.
- Revizia este locală, peste commiturile nepublicate `6f66dd2` și `733feec`; push, PR, migrațiile D1 remote și deployul rămân în așteptarea aprobării explicite pentru întregul pachet.

## Handoff 2026-10-22 — contact rapid și asistentul public

- Lucrul este în worktree-ul `codex/notification-glass-20261022`, pornit din `origin/codex/cutiuta-cloudflare-final` la `3ae1877` și păstrând commitul local anterior `6f66dd2` pentru notificări. Checkoutul principal, cu modificări de catalog, nu a fost atins.
- Pe pagina de start, acțiunile plutitoare sunt asistent, telefon, WhatsApp, în această ordine. Messenger a fost retras numai din bara plutitoare; linkul obișnuit din pagina de contact rămâne. WhatsApp are accentul vizual al brandului și un îndemn lizibil. Pozițiile vechi ale bulei de chat sunt retrase o singură dată prin cheia de stocare nouă; vizitatorul poate muta apoi bula.
- Mesajul inițial nu mai conține propoziția despre preluarea comenzilor. Clientul vede răspunsurile automate în același chat, cu actualizare la 2,5 secunde când fereastra este deschisă. În `/admin/chat`, răspunsurile automate sunt marcate „Asistent AI”, iar administratorul poate monitoriza, prelua și relua conversația.
- Fila „Baza de cunoștințe” din `/admin/chat` permite editarea sursei, ordinii, aprobării publice și activării. Numai informațiile aprobate, cu sursă publică permisă și filtrate pentru date sensibile, ajung la model. Prețurile și disponibilitatea vin în continuare din catalogul D1. Istoricul trimis modelului exclude mesajele administratorilor; răspunsurile rezultate sunt verificate înainte de trimitere. Întrebările generale despre retur pot primi îndrumarea publică, iar cazurile unei comenzi concrete trec la echipă.
- Workers AI folosește bindingul existent `AI`, modelul `@cf/meta/llama-3.1-8b-instruct-fp8` și, când acesta e indisponibil, `@cf/meta/llama-3.2-3b-instruct`. Fiecare inferență intră în plafonul local de 30 pe zi, inclusiv fallbackul; alocarea gratuită Cloudflare este comună cu alte aplicații ale contului și nu este garantată exclusiv magazinului. Nu există cheie API nouă sau abonament nou.
- Migrarea append-only `0080_chat_public_knowledge_and_welcome.sql` adaugă aprobarea și sursa, rescrie doar mesajul inițial cunoscut și adaugă patru fapte publice verificate. Migrarea `0081_chat_returns_public_fact.sql` adaugă separat informația publică despre retur. Au fost aplicate și verificate doar în D1 local. La release trebuie aplicate în această ordine înaintea Workerului; informațiile vechi rămân neaprobate până la revizuirea din admin.
- În previewul local, bara și chatul au fost inspectate la 1280×720 și 390×844; cele trei acțiuni nu se suprapun, mesajul nou apare și documentul mobil nu depășește 390 px. Panoul administrativ modificat necesită încă verificare vizuală într-o sesiune autentificată. Nu s-a apelat modelul real și nu s-au făcut push, migrare D1 remote sau deploy pentru această revizie.
- Verificări: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run cf:types:check`, `npm run cf:deploy:dry` și `git diff --check` au trecut. `npm test -- --maxWorkers=2` a trecut cu 56 fișiere și 310 teste. Prima rulare paralelă a avut un timeout de 5 secunde într-un test SmartShip nemodificat; același fișier a trecut separat, apoi a trecut și suita completă cu două procese.

## Handoff 2026-10-21 — autentificare simplificată, portofele Stripe și încasări Oblio

- Ramura locală `codex/oauth-wallets-20261021` pornește din `origin/codex/cutiuta-cloudflare-final` la `ba22d4a`. Intrarea clientului începe cu un cod pe e-mail; Google și Apple apar primele numai când sunt configurate, iar cumpărarea fără cont rămâne vizibilă. Checkoutul descrie cardul și portofelele eligibile oferite de Stripe, fără a promite o metodă indisponibilă pe dispozitivul cumpărătorului.
- Pentru facturile deja emise în Oblio, o plată online capturată și verificată prin webhook este sincronizată ca încasare `Card` în fundal, după confirmarea locală a plății, fără a întârzia răspunsul procesatorului. Adapterul citește factura și încasările Oblio înainte și după scriere; operațiunea unică este jurnalizată în `provider_operations` și `audit_log`. Reconcilierea orară repară sincronizările întrerupte, fără a emite facturi noi. Panoul Facturare afișează starea încasării. Rambursul nu este marcat încasat la plasarea comenzii.
- Nu există migrații D1 noi. Nu s-au emis facturi sau încasări de test. Google OAuth are brandingul pregătit în proiectul firmei, dar clientul OAuth și secretul așteaptă aprobarea specifică și accesul la seiful administratorului. Loginul Apple cere un cont Apple Developer și configurarea Services ID. În Stripe live Cutiuța Magică au fost activate Google Pay și Revolut Pay, pe lângă Apple Pay deja activ; afișarea lor finală depinde de eligibilitatea Checkout și trebuie verificată cu o plată reală controlată. Sesiunea Revolut Merchant separată era expirată la ultima verificare.
- Verificări locale: `npm run typecheck`, `npm run lint`, `npm test` (56 fișiere / 306 teste), `npm run build`, `npm run cf:deploy:dry`, `git diff --check`; migrațiile 0001–0079 au trecut în D1 local. Autentificarea la desktop și 390 px a fost verificată în browser. Catalogul local nu are produse, deci checkoutul cu coș plin și panoul autentificat necesită verificare după conectarea contului de administrator. Nu s-au făcut push, merge sau deploy pentru această ramură.

## Handoff 2026-10-19 — inbox chat și asistent virtual autonom

- Ramura `codex/customer-ai-chat-inbox` pornește din `codex/cutiuta-cloudflare-final` la `e90f379`. Notificările administrative deschid acum ruta chatului și conversația indicată. Inboxul permite preluarea și reluarea asistentului, urmărirea răspunsurilor și editarea informațiilor aprobate de echipă.
- Chatul public identifică vizibil asistentul virtual. După autorizarea explicită a utilizatorului în conversație, acesta răspunde automat la întrebările obișnuite despre produsele disponibile, cu prețuri citite din catalogul D1; nu trimite același răspuns de două ori. Un administrator care preia conversația oprește răspunsul AI inclusiv dacă modelul încă generează. Întrebările despre comenzi, retururi, reclamații și situații sensibile sunt trimise echipei, iar clientul primește confirmarea de preluare. Mesajele și acțiunile AI se păstrează în conversație și în audit.
- Workers AI folosește bindingul `AI` existent și modelul `@cf/meta/llama-3.1-8b-instruct-fp8`. Limita internă este 30 de generări pe zi, fără chei noi sau abonament nou. Dacă bugetul se termină ori furnizorul nu răspunde, conversația trece la echipă. Limita este specifică magazinului și nu garantează că alte aplicații din același cont Cloudflare nu consumă alocarea gratuită.
- Migrații append-only: `0073_customer_chat_ai.sql` pentru cunoștințe, stare și jurnal de generare; `0074_chat_notification_deep_links.sql` pentru notificările vechi; `0075_chat_ai_autonomous_replies.sql` pentru jurnalul livrării și activarea asistentului. Aplică-le în această ordine, înainte de Worker. Migrarea 0075 activează răspunsurile AI în setările magazinului, așa cum a cerut utilizatorul; pot fi oprite din `/admin/chat`.
- Verificări locale: `npm run typecheck`, 56 fișiere / 298 teste înainte de completarea auditului, `npm run lint`, `npm run build`, `npm run cf:deploy:dry`, `git diff --check` și migrațiile 0073–0075 local. Chatul public a fost verificat în browser la 1280 și 390 px, fără depășire orizontală; panoul admin modificat necesită verificare cu sesiune autenticată după publicare. Nu s-a apelat modelul real în testul de browser local, deoarece bindingul AI local poate consuma resurse remote. Nu s-au făcut push, migrare remote sau deploy în această etapă.

## Handoff 2026-10-19 — cotații live cu tarife calibrate de rezervă

- Magazinul afișează cotațiile SmartShip live când serviciul răspunde și păstrează toate ofertele eligibile. Numai o eroare de furnizor, rețea sau timeout declanșează un tarif de rezervă; erorile de adresă, ramburs și lipsa unui curier eligibil nu sunt mascate.
- Tarifele de rezervă propuse sunt 32 RON la adresă, din ofertele observate pentru coletul standard (25,74, 27,49 și 42,55 RON; media 31,93 RON), și 24 RON la Easybox, aproape de oferta observată de 23,81 RON. Clientul vede explicit că oferta este de rezervă și prețul final. Valorile se salvează în `/admin/shipping`, păstrând cotațiile live activate; nu este necesară migrare D1.
- Diagnosticul din `/admin/shipping` afișează cotațiile live eligibile, fără curierii care cer imprimarea etichetei. La emiterea unui AWB pentru o comandă la adresă cu ofertă de rezervă, administratorul obține atunci ofertele reale și sistemul selectează cel mai ieftin curier eligibil. Costul furnizorului și curierul ales intră în jurnal; prețul promis clientului rămâne cel din comandă. Dacă această cotație eșuează, nu se creează o cerere AWB blocată și se poate încerca din nou. Rambursul este inclus în cererea către SmartShip.
- Revizia pornește din `c387cd9` și se livrează prin PR către `codex/cutiuta-cloudflare-final`. Nu s-a emis un AWB real; creditul SmartShip trebuie alimentat pentru expediere.

## Handoff 2026-10-19 — remediere SmartShip 91929

- SmartShip a confirmat în chatul contului DIGITAL ECOTECH SOLUTIONS că API-ul `/cost` respinge momentan textele cu diacritice cu codul `91929`, deși cheia și datele contului sunt corecte. Furnizorul pregătește corecția proprie; soluția recomandată între timp este textul fără diacritice.
- Ramura `codex/smartship-ascii-quotes` normalizează numai textul din cererile către SmartShip pentru diagnostic, cotații și emiterea AWB. Numele și adresele din magazin și din fișele comenzilor rămân în forma originală. Testul verifică atât cererea `/cost`, cât și `/awb/new`.
- Migrarea `0072_order_confirmation_copy.sql` a fost aplicată în D1 `cutiutamagica-db`: schema 72, o intrare în `d1_migrations` și paragrafe reale în mesajul comenzii, confirmate în consola Cloudflare.
- Cotațiile live și plata cu cardul rămân dezactivate până când răspunsul real al furnizorului și fluxul Stripe cu eveniment semnat sunt verificate. SmartShip afișează încă 0 RON credit disponibil pentru emiterea AWB.

## Handoff 2026-10-19 — sincronizare checkout și agent social

- Ramură: `codex/final-commerce-sync`, din `origin/codex/cutiuta-cloudflare-final` la `3758ca8`. Include corecția Easybox, e-mailurile comenzilor, schimbarea compatibilă a agentului din PR #21 și instrucțiunile Oblio/Revolut actualizate din PR #22. PR-urile vechi #2 și #3 nu se combină cu schema curentă; funcțiile lor de consimțământ Metricool și Studio AI există deja în aplicație.
- Easybox cu tarif fix salvează acum identificatorul oficial SmartShip pentru SAMEDAY Easybox (`12`) și contractul standard. Aceasta permite emiterea AWB din panou când contul SmartShip permite expedierea. Comenzile vechi cu identificatorul `0` păstrează calea de reconciliere manuală după numărul comenzii. Testul acoperă punctul oficial, prețul, adresa, AWB, identificatorul curierului, lockerul și idempotenta.
- Migrarea append-only `0072_order_confirmation_copy.sql` schimbă doar șablonul inițial neatins de administrator și actualizează marcajul schemei la 72. Textul nou este cald și folosește paragrafe reale. Notificarea internă adaugă starea plății, curierul, punctul Easybox și estimarea când acestea există. Nu pretinde că plata ori expedierea au fost confirmate înaintea evenimentelor furnizorilor.
- Verificări locale: `npm run typecheck`, 55 fișiere / 289 teste, `npm run lint`, `npm run build`, `git diff --check` și `npm run cf:deploy:dry` au trecut. Testarea vizuală desktop/mobil a paginilor live și verificarea panoului autentificat rămân de făcut după ce controlul Opera este reconectat.
- Activarea cardului necesită un checkout Stripe complet, cu sumă, revenire, webhook semnat și reconciliere; opțiunea rămâne oprită până atunci. SmartShip `/cost` continuă să răspundă `91929` și cotațiile live rămân oprite; cererea de suport este trimisă. Soldul/creditul SmartShip de 0 RON împiedică emiterea reală a AWB până la alimentare sau credit aprobat. Nu prezenta tariful fix drept cotație live.

## Handoff 2026-10-19 — diagnostic cotație SmartShip și verificare Stripe

- Ramură: `codex/stripe-smartship-readiness`, bazată pe `codex/social-dashboard-work` (`3bcb530`) pentru a păstra versiunea deja publicată a panoului social; PR-ul #23 rămâne deschis către ramura Cloudflare de referință.
- În `/admin/shipping`, „Testează cotația” face numai cereri `POST /cost` cu datele expeditorului configurat și cu destinatarul demonstrativ din documentația SmartShip. Compară cererea curentă, varianta fără contracte proprii și exemplul documentat; arată codul furnizorului și numărul de oferte, fără a crea comandă, AWB sau plată. Mesajele sunt curățate de e-mail, telefon, adresă și IBAN, iar rezultatul sumar este auditat.
- Adresa de ridicare din producție a fost salvată și verificată după reîncărcare ca `str. prof. Anton Sesan, nr. 6a, parter, mun. Iasi, jud. Iasi`, conform confirmării utilizatorului. Datele de contact mascate nu au fost modificate.
- Diagnostic live 19 octombrie: cheia din contul SmartShip este validă (`GET /account/balance` are `status: 200`), însă apelul direct `POST https://api.smartship.ro/cost` întoarce HTTP 200 cu `status: 91929` și fără oferte sau erori detaliate. Se reproduce atât din Worker, cât și direct de pe computer, cu exemplul exact din documentație, Iași–Cluj și București sector 1–Cluj, la 350 g / 12 × 8 × 6 cm și 2 kg / 30 × 20 × 10 cm, fără ramburs, cu sau fără `show_byoc`, cu un singur curier și cu antetele pluginului oficial WooCommerce. Testerul autentificat din documentația SmartShip returnează oferte inclusiv la 350 g; calculatorul site-ului cotează Iași–Cluj la 1 kg. `91929` nu este documentat. Filtrul pentru curierii care cer imprimare se aplică abia după primirea ofertelor, deci nu produce eroarea. O cerere de remediere cu aceste rezultate, fără cheie sau date de client, a fost trimisă în chatul contului SmartShip cu acordul utilizatorului. Cotațiile live rămân oprite; tarifele fixe de 25 RON la adresă și 15 RON Easybox sunt disponibile. Soldul și limita de credit sunt ambele 0 RON, astfel că emiterea AWB necesită separat alimentarea contului sau credit la termen.
- În checkout, selecția unui Easybox și confirmarea tarifului fix au dat totalul corect (139 + 15 = 154 RON). A fost observată o etichetă greșită care afișa oferta Easybox și la „Curier la adresă”; ramura corectează previzualizarea metodei și textul de preț, fără a schimba calculul serverului.
- Stripe este configurat în panoul financiar, însă plata cu cardul rămâne oprită până la o probă completă, inclusiv webhook și reconcilierea comenzii. Nu s-a creat o plată sau o comandă reală. Testele unitare existente acoperă semnătura, identitatea contului, suma, mediul și idempotenta, dar nu substituie proba live.
- Verificări locale: `npm run typecheck`, 55 fișiere / 289 teste, `npm run lint`, `npm run build`, `git diff --check` și `npm run cf:deploy:dry` au trecut. Nu există migrare nouă. Capturile desktop/mobil ale panoului autentificat și rezultatul real al diagnosticului sunt necesare după publicare.

## Handoff 2026-10-19 — panou Rețele sociale și Metricool Free

- Ramură: `codex/social-dashboard-work`, pornită din `origin/codex/cutiuta-cloudflare-final` la `77c7270`, în worktree separat. Nu au fost modificate celelalte ramuri sau schimbările locale existente.
- Panou: `/admin/social` grupează Facebook, Instagram, TikTok, rapoarte datate din Metricool, numărul postărilor interne, statusul conectorilor și legături rapide spre postări, marketing, Agent Codex, conturi și integrări. Adăugarea rapoartelor este limitată la `marketing.write`, citirea la `marketing.read`.
- Date: migrarea append-only `0071_social_analytics_snapshots.sql` adaugă istoricul agregatelor și un punct de plecare verificat prin Metricool MCP la 2026-10-19 pentru perioada 2026-09-20–2026-10-18. Sursa, intervalul și data ultimei observații de urmăritori sunt vizibile; lipsa unei cifre rămâne `NULL`. Importul identic este idempotent și cererile de import sunt auditate.
- Limită Free: sesiunea Metricool din Codex/Opera nu este o conexiune API a Workerului. API-ul Metricool necesită plan Advanced/Custom; pagina oferă actualizare manuală verificată fără abonament nou și nu activează publicarea socială. Detalii: `docs/integrations/METRICOOL_SOCIAL_DASHBOARD.md`.
- Verificări: `npm run typecheck`, 55 fișiere / 288 teste, `npm run lint`, `npm run build` și `git diff --check` trecute; migrarea 0071 executată în SQLite local cu schema 71, trei rapoarte și `foreign_key_check` curat. `npm run cf:deploy:dry` a ajuns la `--dry-run: exiting now`. Wrangler D1 local nu a putut porni în sandbox (`listen EPERM 127.0.0.1`), de aceea nu s-a declarat o migrare D1 completă. Capturile desktop/mobil pentru ruta autentificată sunt încă necesare după publicare, deoarece nu există o sesiune admin locală în această ramură.
- Publicare: migrarea 0071 a fost aplicată manual în consola Cloudflare D1 pentru `cutiutamagica-db` înaintea Workerului, după un bookmark Time Travel. Consola a confirmat `schema_version=71`, trei rapoarte, înregistrarea `0071_social_analytics_snapshots.sql` în `d1_migrations` și `PRAGMA foreign_key_check(social_analytics_snapshots)` fără rezultate. SQL-ul aplicat are aceeași schemă și aceleași date ca migrarea versionată; `PRAGMA optimize` de la sfârșitul fișierului nu a fost executat. Workerul și ruta `/admin/social` nu erau încă publicate la această actualizare. După deploy, verificați pagina la 390 și 1440 px cu administratorul Cutiuța Magică și confruntați datele de bază cu Metricool. Nu au fost folosite chei API Metricool și nu a fost făcută publicare socială.
- Verificare după publicare: Workerul încărcat din revizia `e9720f9` apare în Cloudflare ca versiunea `7e880872`, activă cu 100% din trafic. Comanda Wrangler a ieșit cu eroare după upload, la citirea configurației Queues nepermisă tokenului limitat; activarea a fost confirmată separat în consola Cloudflare și în pagina live. `/admin/social` afișează administratorului cele trei rapoarte, legăturile, contoarele, setările și formularul; la mobil 390 px `documentWidth=viewport=390`. Health public raportează schema 71 și status `ok`.

## Handoff 2026-10-18 — carusele coerente și originalitate în lot

- Skillul `cutiuta-magica-marketing-comenzi` include acum contractul `references/carousel-sequencing.md`: o singură postare multi-imagine, ordine narativă aprobată, rol și text alternativ per cadru, produs real protejat și un singur CTA.
- Politica de link interzice controalele desenate artificial: linkul canonic intră în descriere, iar „link în bio” se folosește numai după verificarea destinației profilului în aceeași rulare. Story folosește stickerul nativ, nu un buton imprimat în imagine.
- Fiecare piesă salvează `creativeFingerprint`; variantele din același lot trebuie să difere material prin rol, unghi, copertă, ordine, hook și CTA, nu doar prin text sau fundal.
- Buildul local al agentului este `2026.10.18.1`; setările guvernate preferă caruselul când există minimum trei cadre eligibile și țintesc 3–7 cadre puternice, fără a trata limita tehnică drept obiectiv editorial.
- Nu există migrare D1 ori schimbare vizuală în Dashboard. Release-ul publică numai buildul revizuit al agentului; nu activează conectori, nu publică postări și nu execută alte acțiuni sociale.

## Handoff 2026-10-17 — aprobări multisursă și auditul automatizării

- Ramură locală: `codex/marketplace-social-agent`, worktree separat pornit din `codex/cutiuta-cloudflare-final`; nu s-au făcut push, deploy ori migrare D1 remote.
- Migrarea append-only `0069_multisource_approval_orchestration.sql` adaugă cerințe legate de cod/revizie/snapshot și chitanțe imuabile pentru `admin_dashboard` și `codex_conversation`. Publicarea socială și celelalte efecte critice cer 2 din 2; respingerea este terminală, iar aprobarea nu execută acțiunea.
- API și Dashboard: `/api/v1/admin/marketing-agent` expune ultimele cereri și chitanțe; `POST /api/v1/admin/marketing-agent/approvals/:id/decision` înregistrează decizii idempotente. `/admin/ai` arată cvorumul, sursele, codul, revizia și poate copia formularea exactă pentru Codex.
- Compatibilitate: deciziile vechi necritice sunt convertite în chitanțe Dashboard. Fluxul de draft social din Marketing Center salvează acum prima aprobare și rămâne `review` până la aprobarea Codex; bypassul direct al cvorumului critic este blocat în D1.
- Automatizare sigură: monitorul orar expiră cererile vechi și păstrează `externalCalls: 0`. Skillul `cutiuta-magica-marketing-comenzi` este versiunea `2026.10.17.2` și include contractul multisursă. Auditul complet al cerințelor realizate/blocate este în `docs/marketing/automation-gap-audit-2026-10-17.md`.
- Verificări: migrarea D1 locală a ajuns la schema 69 și are trigger-ele de imutabilitate/cvorum; `npm run typecheck`, 53 fișiere / 282 teste, `npm run lint`, `npm run build`, `npm run cf:types:check`, `git diff --check` și `npm run cf:deploy:dry` au trecut. Buildul confirmă bindingul Workers AI `AI`; folosirea lui de către agent rămâne dezactivată prin setare.
- Verificare vizuală rămasă: noua zonă din `/admin/ai` necesită o sesiune admin locală; nu a fost declarată verificată desktop/mobil în această sesiune. Înainte de release trebuie verificată la 390 px și desktop cu cereri pending/noncritical/critical.
- Activări rămase: conectorii live sociali, inboxurile, GSC backend, eMAG, Trendyol și Okazii cer identitate, secrete și test live separat. Vinted rămâne dezactivat. Migrarea 0069 trebuie aplicată remote înaintea codului la un release aprobat.

## Handoff 2026-10-17 — fișe pentru cinci produse și dosare parteneri

- Completare identificatori de test: `docs/catalog/generateplus-test-codes.csv` conține câte un EAN-13 și EAN-8 generat efectiv pe `generate.plus` pentru fiecare dintre cele cinci produse. Sunt exemple fictive, separate de GTIN-ul comercial și păstrate numai în zona administrativă. Migrarea append-only `0065_generated_barcode_test_samples.sql` le înregistrează cu statut `test_only` și împiedică salvarea lor în câmpul GTIN oficial. Fișa și modelele DOCX au spațiu explicit pentru GTIN-8 și GTIN-13 oficial; eticheta Code 128 continuă să folosească SKU-ul intern. Versiunea anterioară a acestei migrări fusese verificată doar în D1 local, înainte de renumerotarea cerută de migrarea Halloween deja aplicată în producție.

- Ramură locală: `codex/catalog-product-files`, pornită din `codex/cutiuta-cloudflare-final`; checkout separat în `.worktrees/catalog-product-files` pentru a păstra modificările existente din checkoutul principal.
- Catalog: texte calde și concise pentru `hp-keeper`, `got-winter`, `kitten`, `halloween`, `sunshine`, cu titlu și descriere SEO; fișierul `docs/catalog/five-product-marketplace.csv` are anunțurile portabile și câmpul EAN gol.
- Documente: model universal și câte un dosar DOCX precompletat pentru fiecare produs în `docs/partners/product-packets/`, publicate ca șabloane descărcabile prin `public/templates/parteneri/`. Pentru `kitten` și `halloween`, dosarul indică producție proprie și rubrici de completat, fără aprobări sau semnături inventate.
- Admin: pagina produsului poate descărca șabloane, încărca/descărca PDF și DOCX private, actualiza documentul, apoi arhiva o versiune numai cu motiv de cel puțin 10 caractere. Motivul și schimbarea intră în audit; versiunea arhivată rămâne disponibilă administratorilor. Schimbarea/ștergerea GTIN ori MPN existent cere motiv auditat.
- Migrare append-only: `0064_five_product_editorial.sql` actualizează doar texte vechi cunoscute și păstrează editările deja făcute de administratori. Nu alocă GTIN și nu schimbă stoc, preț ori drepturi. Ramura include și `0063_halloween_social_revision.sql`, deja aplicată live; aceasta este păstrată fără modificări.
- Verificări: `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`, `npm run cf:deploy:dry`, migrarea și datele de test D1 locale; pagina produsului verificată la desktop și 390 px mobil, fără depășire orizontală. Capturi: `docs/catalog/screenshots/kitten-desktop.jpg` și `kitten-mobile-390.jpg`. Zona admin cere autentificare, deci nu a fost inspectată vizual în această sesiune.
- Efecte externe rămase: codurile GS1 nu au fost încă alocate; `generate.plus` oferă EAN de test, nepotrivite ca identificatori comerciali. Dosarele partenerilor au nevoie de completare/semnare, iar drepturile de folosire a mărcilor și melodiilor de verificat înaintea publicării pe alte platforme. Nu s-au făcut push, deploy, migrare D1 remote, upload live sau trimitere către parteneri.
- Revenire: nu aplica migrarea și nu publica buildul; după aplicare, o migrare nouă poate restaura punctual textele precedente din istoricul Git. Documentele încărcate sunt versiuni private, arhivate logic, nu șterse fizic.

## Handoff 2026-10-10 — playbook de conținut și agenți sincronizați

- Skillul canonic include `references/content-conversion-playbook.md`, cu structură completă pentru feed, Story în 3–5 cadre, Reel/TikTok nativ, montaj multi-foto, descrieri lungi, link specific către produs și măsurare la 24/72/168 de ore.
- Buildul agentului a fost ridicat la `2026.10.10.1`; manifestul, hashul și lista documentelor guvernate sunt vizibile în `/admin/ai`.
- Dashboardul afișează politica de conținut și agenții interni sincronizați: Studio conținut, Marketing Content Agent și Analist SEO. Agentul marketing + comenzi rămâne orchestratorul, iar efectele externe rămân în coada de aprobare.
- Migrarea append-only `0053_marketing_content_playbook.sql` aliniază scopurile și instrumentele agenților, adaugă sursa comună de cunoaștere și persistă politica playbookului în `agent.marketing_orders`.
- AVYRON rămâne o integrare opțională pentru statistici agregate și pachete aprobate; nu primește conversații, comenzi, date personale sau drepturi de publicare.

## Sursa de adevăr

- Repository: `AvyronTech/cutiutamagica`
- Ramură de referință Cloudflare: `codex/cutiuta-cloudflare-final`
- Runtime: TanStack Start pe Cloudflare Workers, D1, R2, KV, Queues și Analytics Engine
- Reguli obligatorii: `AGENTS.md`

Ramura `main` se poate schimba prin Lovable. Înainte de sincronizare, compară întotdeauna istoricul și lista de fișiere. Dacă o schimbare din `main` elimină Workerul, migrațiile D1, catalogul, checkoutul sau media, nu o integra automat. Mută schimbarea vizuală dorită într-o ramură pornită din ramura de referință și păstrează arhitectura comercială.

## Flux recomandat pentru Lovable și Claude

1. Actualizează referințele remote și pornește o ramură din `codex/cutiuta-cloudflare-final`.
2. Citește `AGENTS.md`, acest document și arhitectura din `docs/architecture/CLOUDFLARE_COMMERCE.md`.
3. Limitează schimbarea la scopul cerut. Nu modifica migrații deja existente și nu introduce secrete.
4. Pentru schimbări vizuale, verifică minimum 390 px și 1440 px. Respectă `prefers-reduced-motion`, evită blocarea firului principal și păstrează imaginile lazy în afara LCP.
5. Rulează verificările de mai jos și deschide un pull request către ramura de referință.
6. Deployul, migrațiile remote, DNS-ul și activarea providerilor se fac numai după aprobare explicită.

```bash
npm ci
npm run typecheck
npm test
npm run lint
npm run build
npm run cf:types:check
npm run cf:deploy:dry
```

## Contract de predare

Descrierea pull requestului trebuie să includă:

- rezultatul pentru utilizator și rutele afectate;
- lista migrațiilor noi, dacă există;
- verificările rulate și rezultatul lor;
- capturi desktop/mobil pentru modificări vizuale;
- efectele externe care nu au fost activate;
- risc și metodă de revenire.

## Porți de calitate

- Catalogul public și checkoutul folosesc prețurile și disponibilitatea validate pe server.
- Guest checkout rămâne funcțional.
- Recenziile publice provin numai din înregistrări aprobate; nu se adaugă testimoniale inventate.
- Integrările sunt afișate drept active numai după configurare și verificare live.
- Sitemapul, canonicalele, robots.txt, datele structurate și feedul Merchant rămân coerente.
- Paginile admin, API-urile și datele personale nu sunt cache-uite de PWA.

## Handoff 2026-10-04 — comerț, fidelitate și remindere

- Ramură locală: `codex/live-commerce-loyalty`, pornită din ramura Cloudflare de referință.
- Livrare: curier 25 lei și Easybox 15 lei; lockerul rămâne selectat prin integrarea oficială SmartShip, iar tariful public este fix și validat pe server.
- Magic Stars: configurare admin, cont client, registru append-only, ajustări auditate, recompensă cu cod unic și sincronizare la utilizarea codului.
- Calendarul cadourilor: profil de cadouri, evenimente recurente, remindere e-mail idempotente la 12 și 3 zile, procesate de cronul orar existent.
- Autentificare și e-mail: Google OAuth și Resend citesc numai acreditări criptate introduse din Dashboard; nu există secrete în repository.
- Catalog: reduceri de 10–20 lei față de prețurile publice anterioare și feed Merchant unic, derivat din catalogul comandabil.
- Recenzii: nu au fost introduse testimoniale inventate. Fluxul autentic permite fotografie R2 și publică numai recenzii aprobate.
- Migrații noi, append-only: `0048_magic_rewards_calendar_real_discounts.sql` și `0049_magic_rewards_redemption_sync.sql`.
- Verificări: typecheck, 206 teste, lint, build, `git diff --check` și dry-run Cloudflare trecute; checkout mobil și desktop verificate local.
- Confirmat extern, read-only: Email Routing este activ pentru `contact@cutiutamagica.eu` și `comenzi@cutiutamagica.eu`, cu destinația verificată; proprietatea Search Console este accesibilă, dar sitemapul necesită retrimitere.
- Rămas pentru activare live: acreditările Google OAuth și Resend, accesul corect la Merchant Center, aprobarea trimiterii sitemapului și autorizarea explicită pentru push/deploy/migrații remote.

## Handoff 2026-10-04 — adevăr public, SEO și autentificare

- Subsol și checkout: badge-ul public Stripe a fost eliminat până la activarea reală, iar metodele inactive nu mai sunt prezentate drept disponibile.
- Prețuri: prețul anterior și economia au contrast explicit pe teme deschise și întunecate; eticheta publică este „Preț final”. Societatea este afișată corect ca neplătitoare de TVA.
- Conținut public: au fost eliminate formulările interne despre infrastructură, furnizori, configurări viitoare și operațiuni administrative. Caruselul „ecosistem” descrie numai servicii și tehnologii confirmate în aplicație.
- Autentificare: clienții folosesc exclusiv Google OAuth când acreditările sunt active; în lipsa lor pagina comunică simplu disponibilitatea viitoare și păstrează guest checkout. Administratorii se autentifică prin e-mail și parolă atât din `/cont`, cât și din `/auth`; `/admin` rămâne protejat.
- Dashboard: secretele pentru Google OAuth/GSC/Merchant, Resend, SmartShip, Stripe și celelalte integrări sunt centralizate în Seiful de conturi și persistate numai criptat. Verificarea Merchant folosește Merchant API v1.
- SEO: sitemapul are 44 de URL-uri publice unice, fără rute private; toate au răspuns local 200. Canonicalele, robots meta, JSON-LD, `robots.txt` și feedul Merchant au fost reverificate. Feedul conține numai produse comandabile și este marcat `noindex`.
- Identitate legală: migrarea append-only `0050_verified_legal_identity.sql` aliniază denumirea, numărul de înregistrare, sediul și regimul fiscal la datele oficiale verificate.
- Verificare vizuală: catalog, produs, checkout și autentificare au fost verificate la 390 px; catalogul și subsolul au fost verificate și desktop. Consola browserului nu a raportat erori sau avertismente pe fluxurile de autentificare testate.
- Efecte externe neactivate: nu s-au făcut push, deploy, migrare remote, configurări DNS sau salvări de chei. Activarea live a Google OAuth, Resend, Merchant/GSC și a providerilor de plată necesită conturile și cheile introduse de administrator, apoi verificare reală pe provider.

## Handoff 2026-10-04 — fluiditate upbar și checkout

- Upbar: praguri separate pentru restrângere și extindere, navigație centrată independent de logo și acțiuni, plus o tranziție care nu mai animează `backdrop-filter` în timpul scrollului.
- Raza decorativă a upbarului se stinge în zona centrală și nu mai traversează până peste controalele din dreapta.
- Linkurile principale și butoanele `.magic-button` au stări hover/focus mai clare, cu reflexie scurtă și suport pentru `prefers-reduced-motion` deja existent.
- Checkout desktop: lista produselor este limitată la 560 px, iar numele poate ocupa două rânduri; cardul promoțional rămâne separat și compact.
- Performanță landing: scrierile CSS de opacitate și parallax sunt deduplicate; pe ecrane tactile mici parallaxul continuu este oprit, iar fundalurile schimbă scena discret, fără amestec calculat la fiecare pixel de scroll.
- Verificare vizuală locală: home și checkout la 1280 px, respectiv 390 px; navigația mobilă nu se suprapune, iar checkoutul păstrează fluxul `Date · Livrare · Plată`.
- Verificări automate: typecheck, lint, 207 teste, build de producție și `cf:deploy:dry` trecute; consola browserului a rămas fără erori sau avertismente în home și checkout.
- Fără efecte externe: schimbările sunt locale; nu s-au făcut push, deploy, DNS sau configurări de servicii.

## Handoff 2026-10-04 — lizibilitate prețuri

- Caruselele schimbătoare de pe landing folosesc explicit tema de preț pentru fundal întunecat; prețul anterior, prețul actual și eticheta „Preț final” rămân vizibile pe fiecare scenă.
- Selectorii generici ai melodiei și sumarului mobil din checkout au fost restrânși, ca să nu mai micșoreze sau estompeze accidental textele din componenta comună de preț.
- Culorile comune pentru tema deschisă au contraste calculate de minimum `6.25:1`; tema întunecată are minimum `10.53:1` pentru prețurile verificate, iar eticheta „Preț final” are fundal propriu.
- Verificare vizuală locală: landing desktop și mobil, catalog mobil, produs mobil și sumar checkout mobil; prețurile vechi și finale sunt randate și nu se suprapun.
- Fără efecte externe: schimbările sunt locale; nu s-au făcut push sau deploy.

## Handoff 2026-10-04 — landing compact și acces public simplificat

- Consimțământ: banner public scurt și narativ, fără nume de furnizori; acțiunea principală acceptă, iar setările rămân secundare și permit o alegere granulară.
- Landing: notificările sunt compacte și apar sus, railul cu navigare/progres este în stânga, chatul pornește jos-stânga, iar după hero upbarul se retrage și rămâne accesul liquid-glass la coș în dreapta sus.
- Conversie: „Magia care urmează”, Magic Drop și subsolul au fost reduse ca înălțime și greutate vizuală. Calendarul explică și Magic Stars, favoritele și urmărirea comenzilor.
- Personalizare: teaserul este marcat „În curând”, iar `/personalizeaza` nu mai expune formularul comercial; ruta afișează numai o stare noindex de pregătire.
- Recenzii: nu au fost create testimoniale artificiale. În lipsa recenziilor aprobate, „Ecouri” rulează 10 idei editoriale etichetate explicit ca inspirație.
- Autentificare: `/cont` prezintă numai intrarea clientului. Accesul administrativ rămâne separat pe ruta dedicată existentă.
- Verificări: typecheck, lint, 33 fișiere / 207 teste, build, verificarea bindingurilor de producție și `cf:deploy:dry` au trecut. Home, `/cont` și `/personalizeaza` au fost verificate local la 1440 px și 390 px; consola browserului nu a raportat erori sau avertismente.
- Migrații și efecte externe: nicio migrare nouă; fără push, deploy, DNS, publicare sau configurări live.

## Handoff 2026-10-04 — pagini de produs tematice și compacte

- Pagina comună de produs păstrează aceeași structură și aceleași controale, dar fiecare slug primește o atmosferă cromatică proprie și fotografia sa în fundalul scenei.
- Galeria nu mai folosește înclinarea 3D la mouse; fotografia principală și miniaturile sunt afișate edge-to-edge, iar lightbox-ul păstrează navigarea prin swipe, săgeți și tastatură.
- „Despre cutiuță” a fost mutat sub galerie. Test drive-ul, selectorul de cantitate și CTA-ul pentru coș au fost compactate și redesenate, cu cantitatea explicit vizibilă.
- FAQ-ul are șase întrebări și comportament exclusiv: deschiderea unui răspuns nu mai întinde cardurile închise și închide răspunsul anterior.
- Formularul de recenzie permite alegerea cutiuței, deduce limba și țara din browser și nu mai afișează acele selectoare. Recenziile continuă să intre în moderare și să fie publicate numai după aprobare.
- Caruselul de recomandări este mai scund și avansează automat; se oprește la interacțiune și respectă `prefers-reduced-motion`.
- Verificare vizuală locală: produs disponibil la 390 px și 1440 px, două teme distincte, galerie, lightbox, cumpărare, FAQ, formular de recenzie și recomandări. Nicio eroare în consola browserului.
- Verificări automate: typecheck, lint, 33 fișiere / 207 teste, build de producție, verificarea bindingurilor și `cf:deploy:dry` au trecut. Wrangler a emis doar avertismentul local cunoscut pentru fișierul de log, fără să afecteze dry-run-ul.
- Migrații și efecte externe: nicio migrare nouă; fără push, deploy, DNS sau configurări live.

## Handoff 2026-10-04 — Magic Rewards pe activități

- Landing: secțiune compactă spre finalul paginii, cu invitație la cont și valorile esențiale: cont +5, recenzie aprobată +3, distribuire +1 cu maximum 5/zi și bonus aniversar +10.
- Conversie: regula publică și beneficiul real sunt aliniate la 5 Magic Stars = 5 lei; textele și pagina dedicată citesc configurația publică din D1.
- Cont client: activitățile eligibile, soldul, registrul, beneficiile și data aniversară sunt vizibile într-un singur centru. Pentru aniversare se păstrează numai ziua și luna, nu anul nașterii.
- Automatizare: contul, profilul de cadouri, primul moment din calendar, comenzile livrate, recenziile aprobate, distribuirile, recomandările, colecțiile și aniversarea acordă stele idempotent, cu limite pe perioadă. Cronul orar procesează și bonusurile aniversare.
- Dashboard intern: `/admin/rewards` are statistici pentru distribuiri și aniversări, plus catalog configurabil pentru activități, valori, limite și activare. Conversia administrativă este fixată la 1 stea = 1 leu pentru a evita promisiuni publice nealiniate.
- Migrare nouă, append-only: `0051_magic_rewards_activities.sql`; adaugă ziua/luna aniversării, catalogul activităților, evenimentele idempotente și integrarea lor în registrul append-only existent. Aplicată numai în D1 local.
- Confidențialitate și termeni: paginile legale descriu activitățile, limitele, registrul și utilizarea minimă a datei aniversare.
- Verificări automate: typecheck, lint, 33 fișiere / 208 teste, build, verificarea bindingurilor și `cf:deploy:dry` au trecut. Avertismentul local Wrangler privind scrierea logului nu a afectat rezultatele.
- Verificare vizuală locală: landing, pagina Magic Rewards, cont client autentificat și dashboard intern la 390 px și 1440 px; consola browserului nu a raportat erori sau avertismente.
- Activare live rămasă: migrarea `0051` trebuie aplicată remote înaintea codului, iar Google OAuth trebuie să aibă acreditările deja configurate. Nu s-au făcut push, deploy, migrare remote, DNS sau configurări live.

## Handoff 2026-10-04 — reorganizare și finalizare dashboard intern

- Navigația internă este grupată după flux: Principal, Comerț, Social Media Agent, Operațiuni, Clienți și creștere, respectiv Analiză și control. Pagina de intrare este „Prezentare generală”, cu indicatori D1, priorități, comenzi recente, canale și acțiuni rapide.
- Comenzile includ Magazin online, eMAG, Vinted, OLX, Okazii și Google Merchant. Formularul de adăugare creează o comandă D1 auditată, neplătită și neexpediată, folosind produsul și prețul real din catalog.
- Produsele sunt separate în disponibile și viitoare. Formularul de adăugare creează o ciornă D1 cu variantă, preț și inventar inițial, apoi deschide mini-dashboardul produsului pentru General, Media 01–06, documente, audio, 360°, animație, SEO, furnizori și sincronizare AVYRON.
- Social Media Agent reunește Agent Codex, Marketing și Postări și comunică explicit că agentul pregătește drafturi; publicarea externă rămâne în coada de aprobare și cere conector oficial verificat.
- Rutarea imbricată `/admin/products/:id` a fost reparată printr-un index separat, astfel încât mini-dashboardul nu mai este acoperit de lista de produse. Interogarea recenziilor din catalog folosește acum starea reală `approved`.
- Teste noi: creare produs cu variantă/preț/inventar și creare comandă manuală cu preț real, normalizare telefon și audit. Verificări automate trecute: typecheck, lint, 34 fișiere / 210 teste, build, `cf:types:check`, `git diff --check` și `cf:deploy:dry`.
- Verificare vizuală locală: toate cele 30 de rute din navigația admin au conținut, fără erori fatale sau depășire orizontală; prezentarea generală, comenzile, produsele, mini-dashboardul și Social Media Agent au fost reverificate la 390 px și desktop. Consola browserului nu a raportat erori sau avertismente.
- Migrații și efecte externe: nicio migrare nouă pentru această reorganizare; fără push, deploy, migrare remote, DNS, publicare socială sau activarea vreunui conector.

## Handoff 2026-10-04 — release final Cloudflare și indexare

- SEO public: toate cele 43 de URL-uri indexabile din sitemap au titlu și descriere unice, canonical exact, `index, follow`, Open Graph și Twitter Card. Toate cele 14 imagini de preview distincte răspund live cu tip de imagine valid.
- Indexare: `sitemap.xml` răspunde `200 application/xml`, conține 43 de URL-uri unice și exclude rutele private sau `noindex` (`/admin`, `/api`, `/auth`, `/cont`, `/comanda`, `/personalizeaza`). `robots.txt` și feedurile publice sunt servite separat.
- Identitate publică: faviconul a fost înlocuit cu simbolul Cutiuța Magică și este livrat în SVG, ICO, 16 px, 32 px, 180 px, 192 px și 512 px. Manifestul PWA public descrie magazinul, nu dashboardul administrativ.
- Verificări automate: typecheck, 35 fișiere / 212 teste, lint, build, `cf:types:check`, `git diff --check` și `cf:deploy:dry` au trecut.
- Baza de date: migrarea append-only `0051_magic_rewards_activities.sql` a fost aplicată în D1 production; lista remote confirmă că nu mai există migrări restante.
- Deploy production: Workerul `cutiuta-magica-store` a fost publicat pe domeniile configurate, versiunea `d23721c3-f14b-4940-877b-c681a8f3722e`. Paginile principale, produsul, Magic Rewards, personalizarea noindex, adminul noindex, sitemapul, robots, manifestul, faviconul și imaginea Open Graph au răspuns live cu 200.
- Verificare vizuală live: landingul și catalogul au fost verificate pe desktop și la 390 × 844 px; imaginile, navigarea, notificările, bara de progres și consimțământul se încarcă și se adaptează fără depășire vizibilă.
- GitHub: commitul local de release este pregătit, dar pushul către `AvyronTech/cutiutamagica` a fost oprit de verificarea de siguranță deoarece include 88 de fișiere și imaginile de campanie; este necesară confirmarea explicită a administratorului pentru acest payload și această destinație.

## Handoff 2026-10-12 — Metricool Web și monitorizarea agentului

- Identitate verificată în browser: Metricool brand `7230540`, proprietar `cutiutamagicaofficial@gmail.com`, fus `Europe/Bucharest`, Facebook Page Cutiuța Magică, Instagram `cutiutamagicaofficial` și TikTok personal `cutiua.magic`. Planul Free afișa 6 din 20 de postări folosite în luna curentă.
- Website: trackerul Metricool pentru `cutiutamagica.eu` este integrat în frontend numai după consimțământul existent pentru categoria „Experiență”; nu există un al doilea banner și nu se încarcă pe rutele administrative.
- Agent intern: `agent_marketing_orders` rămâne orchestratorul existent. Dashboardul afișează fluxul catalog → agent → aprobare → publicare → comandă, conectorii, GSC și prospețimea datelor.
- Monitorizare: cronul existent rulează o verificare internă fără apeluri externe, creează rulări auditate și notificări deduplicate pentru conectori neverificați, GSC neverificat/expirat și operațiuni eșuate.
- Migrare nouă, append-only: `0054_marketing_agent_connector_monitoring.sql`; adaugă referințe fără secrete pentru Metricool, Metricool Web, GSC și profilul Opera, păstrate `setup_required` până la verificarea backend/live repetabilă.
- Separare: Opera este executorul nativ pentru Cutiuța Magică; profilurile și filele AVYRON nu sunt fallback. AVYRON rămâne numai schimb asincron aprobat de statistici agregate și pachete de skill.
- Activare rămasă: după push/deploy și migrarea remote aprobate, se reia „Verify” în Metricool Web și se confirmă prima vizită. Tokenul GSC readonly trebuie salvat criptat în Seiful de conturi înaintea importului backend. Nu s-au făcut push, deploy sau migrare remote în acest handoff.

## Handoff 2026-10-17 — agent social nativ și marketplace-uri

- Ramură locală: `codex/marketplace-social-agent`, pornită din `codex/cutiuta-cloudflare-final`; nu s-au făcut push, pull request, deploy sau migrări remote.
- Skillul `cutiuta-magica-marketing-comenzi` include acum contracte distincte pentru producție nativă, previzualizare reală, limite Free, noutatea conținutului și operațiuni marketplace.
- Social: fiecare variantă trebuie generată și verificată în formatul destinației; elementele interactive există numai dacă sunt adăugate prin compositorul nativ și sunt funcționale. Metricool rămâne limitat la bugetul real al planului Free.
- Marketplace: eMAG folosește contractul API v4.5.1, Trendyol numai Product V2 și Order V2, iar Okazii este pregătit ca feed XML cu import manual auditat al comenzilor până la verificarea unui API oficial. Toate rămân `setup_required` până la verificarea sellerului și a conectorului.
- Vinted: listarea comercială este blocată în API și în dashboard; contul standard nu este folosit pentru produsele Cutiuța Magică, iar starea se reevaluează numai când Vinted Pro devine eligibil pentru o firmă înregistrată în România.
- Workers AI: bindingul `AI` este declarat, dar asistentul editorial rămâne neactivat, fără date personale, fără publicare automată și fără depășire plătită. Activarea cere verificarea limitei Free și aprobare administrativă separată.
- Migrare nouă, append-only: `0068_marketplace_social_agent_strategy.sql`; validată prin aplicarea integrală a migrărilor în D1 local. Schema locală este 68, cu eMAG/Trendyol/Okazii `setup_required`, Vinted `disabled` și Workers AI `setup_required`.
- Verificări: validatorul skillului, typecheck, 52 fișiere / 277 teste, lint, build, `cf:types:check`, `git diff --check` și `cf:deploy:dry` au trecut. Migrarea completă a fost aplicată numai în D1 local, iar o interogare read-only a confirmat schema 68 și stările conectorilor.
- Verificare vizuală: ruta locală `/admin/ai` redirecționează corect la autentificarea administrativă. Panoul autentificat nu a fost verificat vizual deoarece worktree-ul local nu are o sesiune sau acreditări admin; nu s-a copiat și nu s-a resetat nicio parolă.

## Handoff 2026-10-17 — retenție R2 și compactarea postărilor

- Migrare append-only: `0070_storage_retention.sql`; adaugă registrul și rulările de retenție, politica `storage.retention`, hashul de conținut și data compactării postărilor. Schema țintă este 70.
- Cron: jobul orar verifică aprobările deja finalizate și face inventarul eligibil cel mult o dată la 24 de ore. Nu listează și nu șterge obiecte R2 necunoscute; pornește numai din referințe D1 controlate.
- Retenție implicită: upload temporar la expirare, AI respins 7 zile, AI abandonat 14 zile, AI aprobat și nefolosit 90 de zile, copie socială publicată 30 de zile, copie socială arhivată 7 zile, payload complet al postării 90 de zile.
- Protecții: originalele de produs, vizualurile AI de tip `product_visual`, hero, audio, 360°, documentele, facturile, personalizările și backupurile nu intră în curățarea socială automată.
- Aprobare: fiecare lot are lista exactă, dimensiunile și `revisionHash`; ștergerea/compactarea este `critical` și cere cvorum Dashboard + Codex. Sursa este revalidată imediat înaintea execuției, iar eșecurile devin vizibile în monitorizarea agentului.
- După publicare: R2 poate fi eliminat după termen, dar D1 păstrează ID-ul extern, data, campania, produsul, platforma, plasamentul, UTM-ul, referințele media minime și SHA-256 al payloadului complet.
- Staging local: `.local-artifacts/` este ignorat de Git; noile randări intermediare trebuie create acolo sau în `/tmp`, iar repository-ul păstrează numai manifestul și sursele originale justificate.
- Verificări: typecheck, 54 fișiere / 285 teste, lint, build, `cf:types:check`, `git diff --check` și `cf:deploy:dry` trecute. Avertismentele de chunk Vite sunt preexistente și nu blochează buildul.
- Fără efecte externe: nu s-au șters obiecte din R2, nu s-a aplicat migrarea remote și nu s-au făcut push, deploy sau schimbări de lifecycle pe bucket.
