# Reverificare SEO, GSC și compatibilitate — 7 noiembrie 2026

## Stare și limită de livrare

Ramura locală `codex/seo-compatibility-audit-20261107`, din `a86494c` / `codex/cutiuta-cloudflare-final`, fără alte modificări preexistente. Administratorul a cerut explicit să păstrăm push-ul și deploy-ul până la o instrucțiune nouă. Nu s-a făcut push, PR, merge, deploy sau migrare remote. Fără migrare nouă, schimbare de conturi, MFA, DNS, secrete sau activare cu cost.

`caffeinate -di` rulează pentru a preveni somnul de inactivitate al sistemului și ecranului. Nu dezactivează blocarea de securitate și nu previne oprirea prin închiderea capacului.

## GSC verificat în Opera

- Toate cele **7/7 pagini publice de produs** sunt confirmate individual „Adresa URL este pe Google” / „Pagina este indexată”. [Inventarul curent](../seo/2026-11-07-gsc-recheck.json) păstrează exact domeniul verificării; celelalte pagini din inventarul de 35/38 din 5 noiembrie nu au fost reinspectate integral în această sesiune.
- `pentru-sora` și `cadouri-mici` încă sunt necunoscute în index. Cererile lor din 5 noiembrie erau deja acceptate; nu au fost repetate. Testul live Google pentru `pentru-sora`, 7 noiembrie, 21:11, confirmă disponibilitatea pentru indexare și un breadcrumb valid.
- `cadouri/halloween` este „Descoperită – nu este indexată”. De data aceasta cererea a fost **acceptată în coada prioritară**, cu modalul „Indexarea a fost solicitată”. Aceasta nu este confirmarea indexării. Nu s-a rezolvat un CAPTCHA.
- Toate cele patru surse trimise — core, produse, ghiduri, text — sunt **Succes**. Core și text au ultima citire 7 noiembrie; produse 5 noiembrie; ghiduri 3 noiembrie. Nu au fost retrimise sitemapuri neschimbate.
- Raportul agregat Pagini este în continuare datat **23 octombrie**, cu 7 indexate/2 excluse. Exemplele excluse sunt `favicon.ico` și `/produse?q={search_term_string}`. Iconul nu trebuie indexat ca pagină de vânzare; catalogul cu parametru folosește canonicalul catalogului. Nu au fost pornite validări pentru aceste excluderi intenționate.
- Merchant, actualizat 6 noiembrie: validările `hasMerchantReturnPolicy`, `shippingDetails` și `audience` au **reușit**, fiecare cu **0 elemente afectate**. Agregatul arată 0 valide/0 invalide, în timp ce inspecția individuală Winter confirmă Product, Merchant și Breadcrumb valide. Aceste totaluri agregate nu sunt numărul produselor indexate. Raportul Product arată 0 invalide, iar rândurile opționale review/aggregateRating au 0 afectate; nu se inventează recenzii.
- HTTPS: 28 URL-uri HTTPS, 0 non-HTTPS, nicio problemă raportată, actualizat 7 noiembrie. Acțiuni manuale și Probleme de securitate: „Nu au fost detectate probleme”. Core Web Vitals: date reale insuficiente pe ambele tipuri de dispozitive.

## Corecții locale

- Fișa comună de produs înlocuiește mesajul intern despre documente/licențe în așteptarea verificării cu două legături utile: **Livrare și costuri · Retur și garanție**. Nu sunt fabricate documente sau drepturi. Stilul compact și contrastul existent se păstrează.
- Magazinul are legătură de evitare a navigării **Mergi la conținut**, vizibilă numai la focus din tastatură. Activarea mută efectiv focusul la `<main>`. Nu adaugă spațiu sau JavaScript nou.
- `lastmod` al structurii comune de produs reflectă revizia locală din 7 noiembrie. Lista paginilor, stocurile și prețurile nu sunt modificate.
- `scripts/audit-seo-live.mjs` limitează cererile paralele la trei și verifică suplimentar JSON-LD parsabil, un singur H1, limba română/HTML, prețurile Merchant comparate cu ofertele paginilor, destinațiile interne, noindex-ul celor șase pagini excluse și răspunsuri 404 reale pentru trei adrese inexistente.

## Verificări

- `npm run typecheck`: trecut.
- `npm test -- --maxWorkers=2`: **391/391**, **68/68** fișiere.
- `npm run lint`, `npm run build`, `npm run cf:deploy:dry`, `git diff --check`: trecute. Dry-run-ul nu publică.
- Auditul public extins: **38 URL-uri, 7 produse, 5 produse Merchant, 35 imagini, 0 orfane, 5 destinații interne suplimentare, 6 pagini excluse, 3 probe 404, zero probleme detectate**. Health: 200 / production / schema 90 la `2026-11-07T19:26:41.446Z`.
- UI local cu bază D1 izolată și seedurile proiectului: toate cele șapte produse la 390 și 1440 px, fără overflow sau imagini eșuate încărcate, un H1 și chat exclus. Verificarea Pirates după hidratare confirmă H1-ul corect; o citire intermediară înainte de hidratare nu este un defect de pagină.
- La 320 px: homepage, catalog, hub Cadouri, cele trei ghiduri în așteptare, Despre cutiuță, Despre noi, Rewards, Livrare, Retur, ghidul de alegere, Personalizare și politicile. Fără overflow observat. Linkurile noi au fost accesate, iar skip-link-ul verificat cu Shift+Tab/Enter și focus pe `continut-principal`.
- Produs → adăugare în coș → Comandă acum → checkout verificat local; imagine încărcată și layout fără overflow la 390 px. Intrarea neautentificată în Cont se afișează. Fără login nou, comandă, plată sau mesaj real. Baza locală a fost inițializată din migrații și seeduri după constatarea că vechiul director temporar era gol; nu a fost copiată baza de producție.
- Chrome DevTools MCP nu a putut porni din cauza unui profil deja utilizat. Nu există o măsurare nouă Lighthouse/LCP/INP în această sesiune. Nu se atribuie scoruri din teste geometrice sau din date istorice.

Probe vizuale locale: `/Users/niss/.codex/visualizations/2026/11/07/cutiuta-seo/` — `halloween-indexing-request.png`, `merchant-validations.png`, `sitemaps-success.png`, `keyboard-skip-mobile.png`, `product-links-mobile.png`, `product-links-desktop.png`, `checkout-mobile.png`. Capturile GSC nu sunt incluse în repository-ul public. Loguri: `/tmp/cutiuta-seo-{expanded,typecheck,tests,lint,build,dry}-20261107.log` (auditul: `/tmp/cutiuta-seo-expanded-20261107.log`).

## Ce rămâne

Indexarea celor trei ghiduri depinde de procesarea Google. Lipsa datelor CrUX nu este o eroare remediabilă prin valori presupuse. Limitarea Workers Free acceptată anterior de administrator și configurarea Google API lipsă din backend rămân separate; nu au fost activate servicii sau costuri pentru a le ascunde. Publicarea corecțiilor de cod așteaptă instrucțiunea administratorului, după care se repetă auditul pe versiunea nouă.

Referințe: [Google — sitemapul nu garantează indexarea](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview), [Google — solicitări de recrawl și timpul de procesare](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl), [Google — depanarea crawlului, evitarea retrimiterilor neschimbate](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors).
