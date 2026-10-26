# Continuitatea proiectului Cutiuța Magică

Acest fișier este punctul de intrare pentru Codex, Lovable, Claude și alți agenți. Regulile obligatorii sunt în [AGENTS.md](../AGENTS.md); aici sunt harta proiectului și rutina de predare. Informațiile datate sunt un instantaneu, nu dovada stării live.

## Surse de adevăr

| Întrebare                             | Sursa de verificat                                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Ce are voie să facă agentul?          | `AGENTS.md` și instrucțiunile utilizatorului din conversația curentă                                                                |
| Ce există în cod?                     | Ramura și commitul curent, `src/`, `cloudflare/`, `package.json`, teste                                                             |
| Ce s-a lucrat recent?                 | Primele intrări datate din `docs/AGENT_HANDOFF.md`; verifică apoi codul                                                             |
| Cum sunt separate sistemele?          | `docs/architecture/CLOUDFLARE_COMMERCE.md`                                                                                          |
| Ce înseamnă termenii din UI și API?   | `docs/PROJECT_GLOSSARY.md`                                                                                                          |
| Ce asset AVYRON poate fi folosit?     | `docs/brand/AVYRON_LOGO_USAGE.md`; masterul din album rămâne de identificat                                                         |
| Ce este publicat sau configurat live? | Dashboardul furnizorului și endpointurile publice verificate la momentul lucrului; un draft sau un test local nu confirmă producția |

## Hartă tehnică

- TanStack Start/React livrează SSR, frontend și API într-un Worker Cloudflare dedicat magazinului. D1 păstrează date relaționale, R2 media, KV numai cache/date efemere, iar Queue operații asincrone.
- AVYRON OS este o integrare opțională prin API/webhook autentificat. Nu este baza de date, control plane sau condiție de funcționare a magazinului.
- Rutele publice și client sunt în `src/routes/`; UI comun în `src/components/site/`; API, servicii și repository în `src/server/`; migrațiile append-only în `cloudflare/d1/migrations/`.
- Prețurile, stocul, eligibilitatea livrării și starea plății sunt calculate/verificate pe server. Interfața poate explica rezultatul, dar nu devine sursă de adevăr.

## Înainte de o schimbare

1. Citește `AGENTS.md`, acest fișier și ultima intrare relevantă din `docs/AGENT_HANDOFF.md`.
2. Identifică repository-ul/worktree-ul, ramura, commitul de bază, `git status` și diferența față de `origin/codex/cutiuta-cloudflare-final`. Păstrează lucrul nepublicat al altor agenți; folosește ramură/worktree separat dacă există risc de conflict.
3. Verifică în cod, D1 local și, numai când e necesar, în sursa live. Nu deduce disponibilitatea unei integrări dintr-un buton, secret configurat sau ecran de admin.
4. Notează contractele afectate: API, DB, frontend, accesibilitate, SEO, performanță, audit și idempotentă. Migrațiile D1 noi sunt append-only.

## Înainte de predare

1. Rulează `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`, `npm run cf:deploy:dry` și `git diff --check` când mediul permite.
2. Verifică desktop și mobil pentru fluxurile modificate. Pentru checkout folosește date sintetice și oprește-te înainte de plasarea comenzii sau efectuarea plății, cu excepția unei aprobări explicite pentru testul exact.
3. Adaugă în capul `docs/AGENT_HANDOFF.md`: scop, ramură/bază/commit, fișiere, migrații, verificări cu rezultat, capturi desktop/mobil, ce a fost verificat live, ce lipsește și orice aprobare/configurare externă rămasă.
4. Predă prin PR către `codex/cutiuta-cloudflare-final` numai după cererea explicită de push/PR. Merge, deploy, migrarea remote, DNS, activarea unui furnizor și plățile reale sunt decizii separate, cu aprobare explicită în conversația curentă.

## Stare de reluare la 26 octombrie 2026

- Ramura locală `codex/customer-wallet-profile-20261026`, commit `2caac90`, are îmbunătățirile pentru cont, Portofel, checkout și meniul profilului. Nu este dovada unui release; detaliile și limitele testării sunt în primul handoff.
- Lucrul SEO/indexare menționat în alte conversații/worktree-uri nu se combină automat cu această ramură. Compară ramurile și rezolvă conflictele printr-un PR revizuit.
- Eroarea exactă de salvare a parolei după Google rămâne de identificat între aplicație și managerul de parole al browserului. Testul local Google → parolă → conectare trece, dar nu reproduce dispozitivul utilizatorului.
- Plata cu cardul și salvarea cardului au fluxuri de cod și teste; o tranzacție live completă, cu întoarcere, webhook și reconciliere, nu a fost executată în această ramură.

## Cum se păstrează sincronizarea

Documentația din repo merge cu codul prin Git/PR și este vizibilă pentru agenții care citesc repository-ul. Nota din memoria Codex disponibilă în acest mediu este un rezumat și un indicator către repo, nu o copie autoritară a codului sau un canal automat către ChatGPT, Lovable ori Claude. La fiecare schimbare semnificativă, actualizează handofful și glosarul/fișa de brand dacă termenii sau regulile se schimbă; după merge, verifică revizia publicată separat. Nu promite sincronizare între conturi sau agenți fără o integrare verificată.
