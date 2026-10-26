# Handoff SEO și indexare — 26 octombrie 2026

## Scop și implementare

- Ramura locală `codex/seo-indexing-20261026` pornește din `origin/codex/cutiuta-cloudflare-final` și include corecțiile anterioare pentru sitemapul ghidurilor și catalogul D1, plus această etapă. Magazinul rămâne independent de AVYRON OS.
- `/llms.txt` este servit din Worker: paginile editoriale și ghidurile provin din rutele reale, iar produsele exclusiv din catalogul publicat D1. Fișierul static anterior a fost eliminat, deoarece avea prioritate și ascundea ruta dinamică. La eroare D1 răspunde 503 fără cache, în loc să publice o listă incompletă ca fiind curentă.
- `/admin/seo` arată numărul de produse și ghiduri, câmpuri lipsă din catalog și corecții concrete. Citește de pe același domeniu `robots.txt`, ambele sitemapuri și `llms.txt`, apoi semnalează răspunsuri lipsă sau conținut nepotrivit. Folosește `reports.read` și protecția admin existentă; nu pretinde că poate confirma indexarea Google. Search Console este marcat separat.
- În pagina de produs, oferta Schema.org păstrează prețul real și când produsul este epuizat, cu `OutOfStock`; identitatea `OnlineStore` folosește adresa de e-mail în format Schema.org. Nu se inventează GTIN, ratinguri ori servicii separat vândute.
- Căutarea din catalog este formular semantic cu nume accesibile și buton de trimitere. `robots.txt` permite conținutul public și declară ambele sitemapuri, blocând doar `/admin` și `/api/`; paginile publice cu `noindex` rămân accesibile crawlerului pentru a citi directiva.

## Verificări

- `npm run typecheck`, `npm test` (58 fișiere, 320 teste), `npm run lint`, `npm run build`, `npm run cf:deploy:dry` și `git diff --check` au trecut.
- D1 local a fost populat numai cu seedul de dezvoltare pentru verificare. `/llms.txt` local a returnat 200, `text/plain`, produse din D1 și cache de 5 minute în browser / 1 oră la edge. `/sitemap.xml` local a returnat 200 XML. `/admin/seo` fără sesiune a redirecționat la autentificare cu `noindex` și `no-store`.
- Browser: catalog la 1440 px și 390 px fără depășire orizontală. Lighthouse local, mobil, modul snapshot: 100 pentru accesibilitate, bune practici, SEO și navigare agentică. Pe pagina de produs locală, URL-ul canonic, `OnlineStore`, `Product` și `Offer` cu prețul 119 RON și `OutOfStock` au fost citite din DOM. Capturi cu seed local: [desktop](catalog-desktop.png), [mobil](catalog-mobile.png). Panoul admin necesită o sesiune autentificată pentru verificarea sa vizuală.
- Trasare pe catalogul public, mobil emulat 390 px, fără limitare CPU/rețea: LCP observat 792 ms, CLS 0, TTFB 171 ms. Nu există date CrUX pentru această pagină în rezultat; aceasta este o singură măsurătoare de laborator, nu un scor real agregat.
- Starea publică la 26 octombrie: `/robots.txt` 200, `/sitemap.xml` 200, `/llms.txt` 200 în versiunea statică veche, `/sitemap-guides.xml` 404. În Search Console, citirea anterioară arăta sitemapul principal „Nu s-a putut prelua” la 20 octombrie; trebuie reverificat după lansare. Un răspuns 200, un sitemap acceptat și datele structurate nu garantează indexarea.

## Fișiere și activare

- Implementare: `src/lib/seo-llms.ts`, `src/routes/llms[.]txt.ts`, `src/lib/seo-audit.ts`, `src/lib/seo-audit.functions.ts`, `src/admin/pages/SeoAuditPage.tsx`, `src/routes/_authenticated/admin/seo.tsx`, `src/admin/Layout.tsx`, paginile de produs și catalog, schema rădăcină, CSS, rutele generate și testele. `public/llms.txt` a fost eliminat. Nu s-a adăugat migrare D1, secret sau integrare live.
- Publicarea necesită aprobarea explicită pentru push/PR/merge/deploy conform `AGENTS.md`. După publicare: verifică 200 pentru ambele sitemapuri și `llms.txt` dinamic, produsele și URL-urile canonice, indexabilitatea în producție, Schema.org pe produs, apoi retrimite sitemapurile în Search Console și urmărește inspecția URL și raportul de indexare. Verifică `/admin/seo` autentificat pe desktop și mobil. Nu afirma creșterea vizibilității până când datele Search Console o arată.
