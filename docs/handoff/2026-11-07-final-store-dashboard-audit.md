# Audit final magazin, administrare și SEO — 7–8 noiembrie 2026

## Livrare

Pregătire **locală**, pe `codex/seo-compatibility-audit-20261107`, peste `2646e5a`, `9deb8ed` și `e14759e`; baza de referință verificată este `a86494c`. Toate îmbunătățirile anterioare se păstrează. Fără push, PR, merge, deploy sau migrare remote, conform instrucțiunii administratorului. **0091, pregătită anterior, rămâne necesară înaintea codului la release.** Acest audit nu adaugă migrare, dependențe, servicii, costuri sau schimbări ale conturilor reale.

## Constatări și corecții

- Auditul live al celor 38 de URL-uri a trecut pentru paginile indexabile, sitemapuri și produse, dar a găsit **șase probe auxiliare cu 503**: Cont, Termeni, Confidențialitate, Personalizare și două URL-uri inexistente. Recereri cu același User-Agent al auditului au confirmat **1102 / Worker exceeded resource limits**, inclusiv Ray `a56f67412b5ffcdc-OTP` (Termeni), `a56f6742aa4a6247-OTP` (Personalizare), `a56f67437e13fcdc-OTP` (ghid inexistent). Aceste răspunsuri nu sunt ascunse prin reîncercări care să transforme raportul într-un succes aparent.
- Workerul încarcă acum API-ul, verificarea administrativă și media numai pe rutele lor. Consumatorul Queue și serviciile programate sunt încărcate în handlerul respectiv. Autorizarea, auditul, procesarea comenzilor și `waitUntil` rămân păstrate. Artefactul entrypoint scade de la **1.054,03 kB la 13,01 kB**; aceasta este dimensiunea entrypointului, nu a întregii aplicații și nu o măsurare a CPU-ului din producție.
- Paginile informative nu mai citesc/serializează catalogul în SSR. Home, catalogul, produsele, ghidurile cu produse și checkoutul păstrează datele necesare. `QueryClient` aparține fiecărui router/cereri; citirile părinte/copil folosesc același `fetchQuery`, fără cache global de date personale sau prețuri. Invalidarea forțează reîmprospătarea prețului; nu se ia un rezultat invalidat ca proaspăt.
- Probe locale înainte/după, **număr de caractere UTF-16 din răspunsul HTML**: catalog 155.206 → 117.032; ghid Pentru sora 100.678 → 84.667; Termeni 67.925 → 27.816; Personalizare 64.158 → 24.050. Valorile nu sunt octeți comprimați, timpi de încărcare sau Core Web Vitals. Conținutul comercial și metadatele au fost reverificate.
- Contul, checkoutul și autentificarea primesc `private, no-store` și `X-Robots-Tag: noindex, nofollow` la nivelul Workerului; Personalizare rămâne exclusă de la indexare. Antetele sunt păstrate și pentru răspunsuri de eroare ale aplicației. Aceste protecții nu pot modifica un răspuns 1102 generat înainte ca Workerul să termine cererea.
- `refreshCatalogWorkflows` unește actualizarea Produse, Identificare, Stoc, fișă tehnică, studio și canale. Panourile active sunt reîncărcate, cele ascunse sunt marcate neactualizate fără polling. Callbackurile de refetch redundante dintre componente au fost eliminate. Lista administrativă alege determinist prima variantă activă, astfel încât SKU-ul și referința provin din aceeași variantă.
- Dashboard: contrast mai bun pentru textele secundare pe fundal întunecat, păstrând contrastul în panourile albe; notificări și căutare etichetate, stare de deschidere accesibilă și acțiune explicită pentru ascunderea unei notificări. Cele trei câmpuri de ajustare Rewards au etichete vizibile. Secțiunile fără titlu propriu primesc titlu administrativ în browser.
- Copii de siguranță are titlu și stări în română, eroare reală și reîncercare; nu mai atribuie automat orice eroare unei migrări vechi lipsă. Referința D1 Time Travel trimite responsabilitatea restaurării către consola furnizorului. Copierea AWB gestionează indisponibilitatea clipboardului. Mesajul introductiv al contului promovează comenzile, nu cereri noi într-un atelier încă nelansat.

## GSC verificat în Opera

- Cele **patru sitemapuri sunt Succes**: produse 7 URL-uri, core 8, ghiduri 23, text 38. Nu au fost retrimise sitemapuri neschimbate.
- **Halloween este acum indexat**, cu HTTPS și breadcrumb valid. Cererea de indexare fusese acceptată anterior în aceeași zi; în această verificare nu s-a repetat.
- `cadouri-mici`: **Descoperită – nu este indexată**, cu sitemapurile de ghiduri/text și pagina Cadouri ca surse raportate. Este un progres față de starea necunoscută din verificarea precedentă.
- `pentru-sora`: **Google nu cunoaște adresa URL** în inspecția indexului. Cererea din 5 noiembrie era deja acceptată. Nu a fost retrimisă în mod repetat.
- Raportul Product, actualizat 6 noiembrie: zero elemente invalide; avertismentele review/aggregateRating au zero afectate. Nu se inventează recenzii. Cele șapte produse fuseseră confirmate individual mai devreme pe 7 noiembrie; acest audit nu prezintă acele probe drept o nouă inspecție individuală a tuturor celor 38 de pagini.
- Indexarea celor două ghiduri rămase este în procesarea Google. Nu este certificată indexarea integrală ori apariția în răspunsuri AI. `robots.txt`, canonical, sitemap și llms rămân aliniate cu paginile reale, fără pagini sau expresii fabricate.

## Verificări finale

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run cf:deploy:dry`, `git diff --check`: trecute. **413 teste / 74 fișiere**, inclusiv regresii pentru citiri de catalog comune și izolate pe cerere, reîmprospătare după invalidare, actualizare unică a panourilor active, dispatcher API/media/admin și protecția cache-ului privat.
- **30 secțiuni admin × desktop și 320 px = 60 verificări** ale stărilor principale: titlu/conținut, lățimi, butoane denumite și câmpuri vizibile etichetate. Cele trei probleme Rewards au fost corectate și reverificate. Această probă nu pretinde executarea operațiilor externe din fiecare modal sau activarea furnizorilor neconectați.
- **38 pagini publice × 1440/320 px = 76 verificări**: canonical exact, un singur H1, JSON-LD parsabil, fără depășiri ale documentului, fără imagini deja încărcate cu eroare, fără chat pe fișa de produs. Imaginile lazy fără `src` încă atribuit nu sunt considerate imagini eșuate.
- Produs → adăugare în coș → Comandă acum → checkout, total și formular încadrate la 320 px. Unicul produs adăugat pentru această probă a fost eliminat ulterior, coș gol confirmat. Fără completarea datelor personale, plasarea comenzii, plată sau e-mail.
- Client DEMO existent: login normal prin formular, toate cele cinci secțiuni, un singur link activ, zero legături administrative în conținut, fără overflow și logout cu eliminarea numelui privat. Nicio preferință sau parolă nu a fost modificată.
- Notificările administrative se deschid/închid cu etichetele corecte. Titlul Rewards din browser este distinct. Contul administrativ DEMO a fost exclusiv local și a fost eliminat după logout; sesiunile de test sunt închise, fila temporară și serverul local sunt oprite, verificarea FK nu găsește încălcări. Contul client DEMO existent este păstrat. Datele și parolele reale nu sunt în repository.
- Chrome DevTools MCP nu poate deschide profilul deja ocupat. Nu există un scor Lighthouse sau o măsurare nouă LCP/INP/CLS în această etapă; geometria, numărul de caractere și dimensiunea chunkurilor nu sunt prezentate drept Core Web Vitals.

Probe în `/Users/niss/.codex/visualizations/2026/11/07/cutiuta-final-audit/`: `admin-route-controls.json`, `public-route-matrix.json`, `customer-account-checks.json`, `rewards-fields-desktop.png`, `checkout-mobile.png`, `halloween-indexed.png`. Loguri `/tmp/cutiuta-final-{seo-live,tests,typecheck,lint,build,dry,focused,dev}.log`.

## Limite și pasul de release

Workers Free rămâne ales de administrator; nu este activat un plan plătit. Modificările reduc munca și încărcarea inițială locală, dar **nu dovedesc încă rezolvarea 1102 în producție**. După cererea de publicare, releaseul include toate cele patru commituri locale, migrarea 0091 înaintea codului, verificări D1 și apoi recereri independente pentru paginile publice, cele șase probe 503, cont și admin. Serviciile externe amânate explicit rămân separate de acest audit.

Surse: [Google — solicitări de recrawl și limite](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl), [Workers — bune practici](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/), [Core Web Vitals — diferența dintre măsurători](https://web.dev/articles/vitals), [D1 — Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/).
