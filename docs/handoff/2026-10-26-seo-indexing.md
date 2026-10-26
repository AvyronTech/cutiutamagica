# Indexare și descoperirea ghidurilor — 26 octombrie 2026

## Scop și constatări

- Ramura `codex/seo-indexing-20261026` pornește din `origin/codex/cutiuta-cloudflare-final` la `c00dfe4`. Checkoutul anterior al agentului avea modificări de marketing și a rămas neatins.
- În Search Console, sitemapul `https://cutiutamagica.eu/sitemap.xml` era încă „Nu s-a putut prelua”, cu ultima citire la 20 octombrie și zero pagini descoperite prin acel raport. Inspecția URL confirma separat că produsul Harry Potter Hedwig era indexat și a fost accesat de Googlebot pentru smartphone pe 20 octombrie. Ghidul `/cadouri/pentru-mama` era încă necunoscut de Google. Raportul agregat de pagini afișa date mai vechi; nu reprezintă o numărătoare completă a URL-urilor indexate în prezent.
- La verificarea publică, sitemapul dinamic avea 38 de URL-uri unice, fiecare cu HTTP 200, canonical exact, titlu și descriere distincte, fără `noindex`. XML-ul și toate cele 37 de URL-uri de imagini unice au fost accesibile. `robots.txt` permite sitemapul, iar HTTP și `www` redirecționează permanent la HTTPS fără `www`.
- Search Console nu raporta acțiuni manuale sau probleme de securitate. Performanța Web pentru 27 septembrie–24 octombrie: 41 afișări și 1 clic. Aceste cifre au latența raportului Google.

## Schimbare

- `public/sitemap-guides.xml` oferă separat hubul `/cadouri` și cele 22 de ghiduri ca asset static Cloudflare, fără interogare D1 sau randare Worker. Generatorul citește slugurile și data editorială direct din `src/data/gift-guides.ts`; buildurile obișnuite și de producție îl regenerează. Testul verifică toate URL-urile canonice și referința din `robots.txt`.
- `robots.txt` declară și noul sitemap. `public/_headers` setează tipul XML și cacheul pentru assetul static. Sitemapul existent continuă să reflecte catalogul public D1 și păstrează URL-urile ghidurilor pentru compatibilitate.
- Fișiere: `scripts/generate-guide-sitemap.mjs`, `public/sitemap-guides.xml`, `public/robots.txt`, `public/_headers`, `package.json`, `src/lib/discovery-seo.test.ts`, acest handoff. Migrații noi: niciuna.

## Verificări

- `npm run typecheck`, `npm test -- --maxWorkers=2` (56 fișiere, 315 teste), `npm run lint`, `npm run build`, `npm run cf:deploy:dry`, `git diff --check` și verificarea generatorului au trecut.
- D1 local a fost inițializat cu toate migrațiile. Local, `/`, `/produse`, `/cadouri`, `/cadouri/pentru-mama`, `/auth`, `/cont`, `/comanda`, ambele sitemapuri și `robots.txt` au răspuns 200; `/admin` a redirecționat corect. Ambele sitemapuri locale sunt XML valid, cu URL-uri unice: 41 în cel dinamic și 23 în cel static. Diferența față de cele 38 de URL-uri live reflectă catalogul D1 local.
- Hubul ghidurilor a fost inspectat la 390 × 844 și 1440 × 900 px, fără depășire orizontală; toate cele 22 de legături către ghiduri erau în HTML. Nu există modificări vizuale. Autentificarea administrativă și plasarea unei comenzi nu au fost efectuate.

## Activare și limită

- Nu s-au făcut push, merge, deploy, migrare D1 remote sau retrimitere în Search Console. După aprobarea acestor efecte, publică ramura, verifică live `sitemap-guides.xml` și `robots.txt`, apoi trimite sitemapul static în proprietatea `sc-domain:cutiutamagica.eu` și verifică raportul după procesare. Eșecul persistent al sitemapului dinamic trebuie corelat cu cererile Googlebot din jurnalul Cloudflare; contul Cloudflare nu era autentificat în browser în această sesiune.
- Sitemapurile ajută la descoperire, dar nu garantează accesarea cu crawlere, indexarea sau poziționarea. Dacă noul sitemap rămâne necitit după publicare, investighează WAF și răspunsul exact primit de Googlebot înaintea altor modificări de conținut.
