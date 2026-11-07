# Release consolidat — 8 noiembrie 2026

Publicarea a fost cerută explicit de administrator. [PR #90](https://github.com/AvyronTech/cutiutamagica/pull/90) și vechiul [PR #1](https://github.com/AvyronTech/cutiutamagica/pull/1) sunt integrate. `main` și `codex/cutiuta-cloudflare-final` au fost sincronizate la **2ade5f0bef1318cbbd668b65661abc96b8fd486e**, sursa runtime a acestui release. Documentarea ulterioară nu schimbă aplicația publicată.

## Îmbunătățiri incluse

Toate cele patru commituri locale `e14759e`, `9deb8ed`, `2646e5a`, `ecc573c`: SEO și accesibilitate, cont client cu acces limitat la date proprii, registru de coduri permanente, dashboard compact, sincronizare comună a panourilor și încărcare SSR redusă. Auditul ramurilor a recuperat suplimentar `4f99d57` ca **9775e93**, cu gestionarea coșului invalid și recuperarea cotației la indisponibilitatea localităților SmartShip.

Istoria `main` a fost reconciliată prin **9ead63d**, păstrând exact arborele Cloudflare verificat. Nu s-au reintrodus fișierele Supabase legacy ori `bun.lock`; pachetul și lockfile-ul npm rămân aliniate. CI-ul vechi eșuat pe PR #1 a fost înlocuit de verificări reușite ale arborelui reconciliat.

Ramurile vechi cu Metricool separat, Studio AI, carusele, recuperare socială și rapoarte de integrări au fost verificate semantic față de implementările actuale. Nu se reaplică migrații vechi 0052/0053 cu alte semnificații, hashuri de cont ori dialoguri de consimțământ duplicate. Notele istorice deja înlocuite nu sunt tratate drept funcții runtime omise. Worktree-urile altor conversații cu ciorne necomise de marketing/furnizori au fost păstrate intacte; nu s-au importat migrări experimentale cu numere deja folosite în producție.

## D1 și publicare

- Punctul de restaurare D1 a fost salvat privat înaintea migrării; schema inițială era 90, FK curat.
- **0091_product_code_registry.sql** aplicată remote: schema **91**, 10 produse/10 coduri și 10 variante/10 referințe; `foreign_key_check` fără rezultate, zero migrații rămase.
- Worker **8d51b7d8-d05a-4486-897f-aa691476c00e**, tag **2ade5f0**, distribuit **100%**, startup raportat de Wrangler **2 ms**. Startup nu este LCP/INP/CLS.
- Domeniile public, www, API și app, triggerul orar și Queue existente sunt păstrate. Variabilele din dashboard sunt păstrate prin `--keep-vars`. Planul Free, conturile administrative și furnizorii amânați nu sunt schimbate.

## Verificări

- CI: **415 teste / 74 fișiere**, `npm ci`, typecheck, lint, build producție și validarea resurselor Cloudflare trecute pentru pachetul integrat; ambele verificări ale referinței/PR #1 au trecut.
- Local: typecheck, lint, buildul inclus în `cf:deploy:dry`, validarea destinației și dry-run trecute. Primul test local de raportare a depășit limita implicită de 5 s; fișierul Growth a trecut separat. Un test Stripe a întâlnit temporar fișierul 0091 absent în timpul schimbării locale de branch; a fost repetat pe arbore stabil și a trecut. Codul sau aserțiunile nu au fost relaxate pentru aceste incidente. Setul complet a trecut independent în CI.
- **38 URL-uri în auditul SEO live**, 7 produse, 35 imagini, zero pagini orfane și **zero probleme**. Cele șase probe care răspundeau cu 503/1102 dau acum 200 pe paginile existente și 404 pe cele două adrese inexistente.
- Health: 200, `production`, schema 91. Cont, checkout și autentificare: `private, no-store` și `noindex, nofollow`; registrul administrativ API: **401** fără sesiune; pagina Admin: **302** către autentificare fără sesiune.
- Opera: dashboard și registrul celor 10 coduri reale, desktop/320 px; catalog → fișă produs → checkout, fără overflow. Coșul existent cu două produse a fost păstrat; formularul a fost doar inspectat, fără comandă/plată/email.
- Cont normal de test: login prin parola existentă reușit, toate cele cinci secțiuni la 320 px, zero legături admin în cont, logout cu eliminarea interfeței private. Nicio parolă, preferință sau adresă nu a fost schimbată. Viewporturile temporare au fost resetate, fila creată pentru test a fost închisă; sesiunea administrativă a titularului a fost păstrată.
- IndexNow a răspuns **200 / received** pentru catalog și cele șapte fișe modificate. Nu înseamnă indexare garantată. GSC rămâne distinct: ultima inspecție din 7 noiembrie confirmă patru sitemapuri Succes și Halloween indexat; `cadouri-mici` și `pentru-sora` încă așteaptă Google. Nu s-au repetat solicitări GSC neschimbate.

[Probe HTTP și rezumat verificabil](../seo/2026-11-08-production-release.json). Capturi și matrice client în `/Users/niss/.codex/visualizations/2026/11/08/cutiuta-production-release/`; logurile locale sunt `/tmp/cutiuta-release-*`.

Nu s-au observat erori 1102 în probele acestui release, inclusiv la loginul clientului. Aceasta nu garantează absența întreruperilor viitoare la limita Workers Free. Brave, activarea AI și celelalte configurări externe amânate explicit nu devin funcționale printr-un deploy de cod.
