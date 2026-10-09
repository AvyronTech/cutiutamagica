# Handoff pentru agenții care lucrează la Cutiuța Magică

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
