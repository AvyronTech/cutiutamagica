# Dropshipping asistat — Cutiuța Magică

## Comportament

`/admin/dropshipping` este un spațiu privat de lucru pentru oportunități din orice categorie. Fluxul păstrează fișa furnizorului și oferta datată, specificațiile, stocul și livrarea confirmate, costurile în RON, texte și imagini pe canal, aprobarea reviziei și dovada rezultatului. Nu dublează comenzile, clienții sau inventarul: acestea rămân în secțiunile existente.

Destinații inițiale: magazin propriu, eMAG, Trendyol, Okazii. Produsele generale pot fi cercetate și pregătite pentru marketplace. Catalogul websiteului are încă schema și experiența pentru cutiuțe muzicale; legarea de website cere un produs compatibil existent. Modulul nu introduce un organizator de birou ca `music_box` și nu activează automat vânzarea produselor generale în checkout.

## Agent și modele

Skill canonic: [`skills/cutiuta-magica-dropshipping`](../skills/cutiuta-magica-dropshipping/SKILL.md), instalat local în `/Users/niss/.codex/skills/cutiuta-magica-dropshipping`. Dashboardul exportă un pachet versionat al skillului și un pachet privat al oportunității pentru Codex. Codex lucrează pe Mac în profilul Opera dedicat Cutiuța Magică sau printr-un conector oficial verificat. Nu există un daemon nou care pornește ori controlează automat sesiunea Codex.

Workers AI: Llama 3.2 3B pentru prima ciornă, Llama 3.1 8B FP8 Fast pentru revizie. Se folosesc numai numele, categoria și specificațiile confirmate; nu se transmit clienți, comenzi, secrete sau sesiuni. Modelul și rezultatul sunt în `ai_runs`. Rezultatul rămâne ciornă și se aplică în formular pentru verificare și salvare, fără suprascriere automată a catalogului.

- Maximum opt lucrări de cercetare/generare pe zi UTC în acest modul; apelurile eșuate consumă rezerva și nu declanșează fallback plătit. Ieșirea text are maximum 800 tokenuri.
- Rezultatele identice pe aceeași revizie/canal/model sunt reutilizate. Concurența pentru generare este limitată prin rezervare D1; o lucrare foarte veche poate fi reluată după fereastra de blocare.
- Generarea backend este dezactivată implicit. `DROPSHIPPING_AI_PLAN=free` se configurează numai după verificarea reală a planului Workers Free. Cloudflare are gratuitate zilnică comună la nivel de cont; o limită locală de apeluri nu garantează lipsa facturării pe Paid. Nu seta flagul doar pentru că există un binding AI.
- La verificarea din 5 noiembrie, sesiunea Cloudflare disponibilă afișa că pagina contului nu poate fi accesată ori lipsește permisiunea. Planul și consumul nu au fost confirmate și flagul nu a fost activat. Nicio inferență live nouă nu a fost executată în acest audit.
- `npm run ai:runner -- --check` confirmă în continuare că secretul runnerului, Ollama, modelul text, ComfyUI și workflowurile locale nu sunt pregătite. Acest modul nu instalează modele mari și nu modifică autentificarea Macului sau conturilor.

Cercetarea Brave folosește stocarea criptată/secretul existent. Cheia amânată de utilizator nu este inventată. Dacă lipsește, UI oferă cercetare asistată în browser și configurarea Aprovizionare. Rezultatele sunt surse observate pentru verificare, nu furnizori certificați. Ultimul rezultat reușit se păstrează în D1 și este disponibil la redeschiderea fișei.

## Imagini

Dintr-o fotografie locală se compun patru variante PNG pe suport alb: website/eMAG/Okazii 1200×1200, Trendyol 1200×1800. Sunt preseturi de lucru, nu o certificare universală a standardelor marketplace. Categoria, regulile și contul trebuie reconfirmate în portal înainte de aprobare. Nu se redimensionează produsul prin generare AI, nu se taie fotografia și nu se inventează detalii. Fundalul fotografiei originale rămâne; suportul alb nu este eliminare de fundal.

Fișierele sunt private în R2, cu checksum SHA-256 și dovadă de drepturi. Endpointul de citire cere sesiune administrativă și trimite `private, no-store` și `nosniff`. Uploadul acceptă PNG normalizat de browser, maximum 8 MB/fișier, verifică semnătura și dimensiunile; nu este prezentat ca scanare antivirus. Fotografia de intrare are maximum 15 MB și 32 megapixeli. Nu există proxy server-side pentru URL-uri arbitrare de imagini.

## Aprobări și recuperare

Aprobarea se leagă de oportunitate, revizie, canal, cont, imagine și snapshot SHA-256. Se păstrează în `approval_requests`, cu receiptul imuabil al infrastructurii existente, și expiră după 24 ore. O modificare a fișei invalidează aprobările neexecutate; aprobarea expirată poate fi reînnoită fără a modifica artificial produsul. O revizie deja publicată nu poate fi publicată din nou fără o revizie nouă.

`approved → executing → published_manual | failed | uncertain`. La `uncertain`, modificarea fișei și retryul sunt blocate până la reconciliere. O execuție abandonată de peste 15 minute devine incertă la recitirea fișei. Confirmarea manuală cere URL public de produs pe domeniul canalului și dovadă; nu este verificare API independentă. Actualizarea păstrează URL-ul precedent și operația `update` în snapshot. Nu sunt automatizate plăți, achiziții, mesaje către furnizori ori fulfillmentul comenzilor.

## Implementare și verificare

- Migrarea append-only `0089_dropshipping_workspace.sql`: oportunități, plasamente, asset-uri și înregistrarea agentului în `ai_agents`; fără modificarea tabelelor/conturilor comerciale existente.
- Endpointuri private `/api/v1/admin/dropshipping`: fișe, cercetare, generare, upload/citire imagini, aprobare, claim, rezultat, reconciliere, retragerea aprobării și arhivare. Scrierile cer `catalog.write`, origine proprie, corp limitat și revizia așteptată. Imaginile și exporturile nu sunt introduse în sitemap; ruta admin are `noindex, nofollow`.
- Preview izolat: `CUTIUTA_DEV_STATE=/tmp/cutiuta-dropshipping-dev-state npm run dev -- --host 127.0.0.1 --port 8081`. Acest mod păstrează starea locală separată și dezactivează bindingurile remote. Nu modifica baza locală preexistentă pentru test.
- Test local cu utilizator sintetic, oportunitate „DEMO LOCAL” și grafic sintetic: creare, calcule zecimale, patru imagini private, selecție/salvare, aprobare, claim, întrerupere simulată, reconciliere în `failed` și export JSON real descărcat. Nicio publicare ori cerere de furnizor externă.
- Desktop 1440×900 și mobil 390×844, fără overflow orizontal; datele calendaristice sunt păstrate la salvare. Capturi locale în `/Users/niss/.codex/visualizations/2026/11/05/cutiuta-dropshipping/`.
- `typecheck`, teste, lint, build și dry run sunt documentate în logul `/tmp/cutiuta-dropshipping-final-checks.log`; validarea skillului și aplicarea tuturor migrărilor într-o bază locală izolată au trecut. Releaseul în producție se consemnează după verificare, separat de preview.

## Surse

[Cloudflare Workers AI: planuri și alocare gratuită](https://developers.cloudflare.com/workers-ai/platform/pricing/), [Llama 3.2 3B](https://developers.cloudflare.com/workers-ai/models/llama-3.2-3b-instruct/), [eMAG: imagine principală](https://marketplace.emag.ro/infocenter/emag-academy/cum-se-adauga-un-produs/standardul-pentru-imaginea-principala-a-produselor/), [Trendyol](https://developers.trendyol.com/), [Okazii: import produse](https://ajutor.okazii.ro/magazine-okazii-ro/import-produse.html). Unele pagini marketplace nu au putut fi citite public în această sesiune; de aceea verificarea în categoria sellerului este un pas explicit înainte de execuție.
