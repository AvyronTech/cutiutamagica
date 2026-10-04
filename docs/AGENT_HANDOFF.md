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

## Handoff 2026-10-04 — cont Manager Codex Social

- Ramură izolată: `codex/manager-codex-social`, pornită din `codex/cutiuta-cloudflare-final`.
- Migrare append-only: `0052_manager_codex_social_account.sql`; numărul `0051` rămâne rezervat lucrului paralel de monitorizare al agentului social.
- Cont: `Manager Codex Social`, cu rolul separat `social_manager_agent` și credential temporar unic stocat local numai în Keychain; în D1 există exclusiv hashul scrypt și schimbarea parolei este obligatorie la primul acces.
- Permisiuni: dashboard, catalog, stoc, comenzi, rapoarte, marketing, conversații și integrări numai pentru citire, plus `marketing.draft` pentru campanii, ciorne și propuneri.
- Interdicții: fără aprobarea/publicarea propriilor materiale, răspunsuri directe către clienți, rambursări, modificări de catalog/stoc, promoții, secrete, conturi, echipă, audit sau controlul agentului.
- Separare de atribuții: crearea ciornelor acceptă `marketing.draft`; aprobarea socială și deciziile de unfollow continuă să ceară `marketing.write`.
- Dashboardul filtrează navigația și acțiunile rapide după permisiunile sesiunii; formularea de prim acces nu mai pretinde acces total pentru rolurile limitate.
