# Handoff pentru agenții care lucrează la Cutiuța Magică

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
