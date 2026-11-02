# Indexarea ghidurilor de cadouri — 3 noiembrie 2026

## Search Console și site public

- Proprietatea verificată: `sc-domain:cutiutamagica.eu`. Inspecția individuală arată 8/8 pagini esențiale, 7/7 produse publicate și 3/23 pagini de ghid indexate: `/cadouri`, `/cadouri/pentru-mama`, `/cadouri/fani-harry-potter`. Total confirmat: 18/38 URL-uri canonice din sitemap. Raportul agregat „Pagini” este încă actualizat doar până la 23 octombrie, deci nu reflectă această inspecție.
- Dintre celelalte 20 de ghiduri, șapte sunt „Descoperită – nu este indexată”: `mos-nicolae`, `craciun`, `aniversare-cuplu`, `pentru-iubita`, `pentru-sora`, `fani-game-of-thrones`, `cadouri-mici`. Celelalte 13 apar ca necunoscute în inspecția URL. Aceste stări nu sunt erori HTTP sau `noindex`.
- Hubul `/cadouri` a fost accesat ultima oară de Googlebot pentru smartphone pe **20 octombrie, 07:05:29**. Pagina publică actuală răspunde 200 și livrează prin SSR legături HTML către toate cele 22 de ghiduri. Un test live GSC pentru `/cadouri/pentru-colega` la 00:13 a confirmat „Adresa URL este disponibilă pentru Google”, „Pagina poate fi indexată” și un Breadcrumb valid.
- Solicitarea nouă de indexare pentru `/cadouri/zi-de-nastere` a fost respinsă cu **„Cotă depășită”**; nu a intrat în coada Google. GSC afișează și o eroare de conectare la reCAPTCHA. Nu sunt justificate retrimiteri repetate în aceeași zi. Următoarea cerere, când cota revine, trebuie să vizeze hubul `/cadouri` sau un ghid prioritar; confirmarea cererii nu echivalează cu indexarea.
- `/sitemap-core.xml`, `/sitemap-products.xml`, `/sitemap-guides.xml` și `/sitemap.txt` rămân „Succes” în GSC. Rândul `/sitemap.xml` încă arată „Nu s-a putut prelua”, fără diagnostic, deși URL-ul live și testul Google au răspuns corect. Raportul Merchant actualizat la 1 noiembrie are șapte produse valide și zero invalide; avertismentele pentru câmpuri opționale și validarea vechiului `audience` rămân de urmărit.
- `npm run seo:audit:live` a găsit 38 URL-uri, șapte produse, 35 imagini, zero pagini orfane și zero probleme tehnice detectate. Un sitemap [ajută la descoperire, fără să garanteze indexarea](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview); Google recomandă [legături HTML accesibile și evitarea retrimiterilor repetate ale unui sitemap neschimbat](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors).

## Schimbarea de conținut

- Ghidurile promovau un configurator de personalizare ca și cum ar primi comenzi, în timp ce `/personalizeaza` este publicat ca „în curând” și `noindex`. Textele afectate din `src/data/gift-guides.ts` și secțiunea comună din `src/routes/cadouri.$ocazie.tsx` descriu acum modele disponibile, melodie, ilustrație și verificarea livrării; atelierul este declarat în pregătire.
- `DISCOVERY_UPDATED` și `public/sitemap-guides.xml` reflectă 3 noiembrie deoarece corpul tuturor paginilor de ghid s-a schimbat prin secțiunea comună. Numărul și URL-urile rămân 23, fără rute sau produse fictive.
- Fișiere: cele două surse de conținut de mai sus, sitemapul ghidurilor, acest handoff și rezumatele din `docs/AGENT_HANDOFF.md` / `docs/PROJECT_CONTINUITY.md`. Nu sunt migrații D1, secrete, DNS ori modificări de API.

## Verificări și livrare

- Ramura `codex/gsc-guides-20261103` a pornit din `origin/codex/cutiuta-cloudflare-final` la `e39cc26b`. `npm run typecheck`, `npm test -- --maxWorkers=2` (334/334), `npm run lint`, `npm run build`, `npm run cf:deploy:dry` și `git diff --check` au trecut.
- Capturile desktop/mobil și verificarea textului public după deploy se atașează în actualizarea de release. Starea de indexare Google se verifică separat după recrawl; codul publicat nu poate impune includerea celor 20 de ghiduri în index.
