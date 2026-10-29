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

- La 29 octombrie, PR #48 pentru reconcilierea programărilor sociale a fost integrat la `c08fac5`, migrațiile 0082–0083 au fost aplicate în D1 production, iar Workerul live este versiunea `0c6e0af0-ab0c-4a11-a5fa-4f1de059db52`. Remote, schema este 83, snapshotul Metricool păstrează 6/20 și zero programări viitoare, exact cinci rânduri necesită reaprobare în `review`, nu există programări confirmate de provider și `foreign_key_check` este curat. Health răspunde 200 cu mediul `production` și schema 83. Un conector Metricool configurat sau o sesiune Opera nu devin automat conector backend verificat; remedierea nu publică social și nu validează drepturile media.

- PR #43 a integrat intro-ul cinematic, SEO/indexarea, contul și Portofelul în `codex/cutiuta-cloudflare-final` la `e55c7dc`; PR #45 a adăugat cache pentru sitemapul catalogului la `3aa0bea`, PR #46 a adăugat sitemapul text la `c2de006`, iar PR #48 a adăugat reconcilierea programărilor sociale la `c08fac5`. Workerul `cutiuta-magica-store` este la versiunea `0c6e0af0-ab0c-4a11-a5fa-4f1de059db52`, verificată live pe 29 octombrie. Probele sunt în handoffurile dedicate și în cel mai nou handoff din `docs/AGENT_HANDOFF.md`. Verifică din nou versiunea live înainte de o nouă lansare.
- În Search Console, `/sitemap.txt` are `Succes` și 38 pagini descoperite, iar `/sitemap-guides.xml` are `Succes` și 23, pe 26 octombrie. `/sitemap.xml` a fost retrimis după noul deploy; testul live Google a confirmat preluarea reușită, dar raportul încă afișa „Nu s-a putut prelua”, tip `Necunoscut`, 0 pagini. XML-ul și textul au aceeași listă de 38 URL-uri, confirmată live. Urmărește procesarea XML și raportul de indexare; descoperirea nu înseamnă indexare.
- Raportul de indexare actualizat la 23 octombrie arăta 7 URL-uri indexate, inclusiv un vechi URL HTTP al paginii de start care acum redirecționează permanent la HTTPS. Rapoartele pentru acțiuni manuale și probleme de securitate nu indicau probleme la 26 octombrie.
- Inspecția live din 26 octombrie a confirmat că pagina publică `/produs-cutiuta-muzicala-winter-is-coming` poate fi indexată și are elemente valide pentru produs, înregistrare comercială și breadcrumb. Indexul încă o marca necunoscută; solicitarea de indexare a fost confirmată și pusă în coada Google. Aceasta nu înseamnă că pagina este deja indexată.
- Eroarea exactă de salvare a parolei după Google rămâne de identificat între aplicație și managerul de parole al browserului. Testul local Google → parolă → conectare trece, dar nu reproduce dispozitivul utilizatorului.
- Plata cu cardul și salvarea cardului au fluxuri de cod și teste; o tranzacție live completă, cu întoarcere, webhook și reconciliere, nu a fost executată în acest release.

## Cum se păstrează sincronizarea

Documentația din repo merge cu codul prin Git/PR și este vizibilă pentru agenții care citesc repository-ul. Nota din memoria Codex disponibilă în acest mediu este un rezumat și un indicator către repo, nu o copie autoritară a codului sau un canal automat către ChatGPT, Lovable ori Claude. La fiecare schimbare semnificativă, actualizează handofful și glosarul/fișa de brand dacă termenii sau regulile se schimbă; după merge, verifică revizia publicată separat. Nu promite sincronizare între conturi sau agenți fără o integrare verificată.
