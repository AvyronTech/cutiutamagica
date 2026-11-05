# SEO, indexare și măsurarea traficului — 5 noiembrie 2026

## Verificare Search Console

- Proprietatea este `sc-domain:cutiutamagica.eu`. Inspecția individuală a tuturor celor 38 de URL-uri, confirmată prin reîncărcarea rezultatelor, arată **35 indexate**: 8/8 pagini esențiale, 7/7 produse și 20/23 pagini Cadouri. [Inventarul datat](../seo/2026-11-05-gsc-inventory.json) păstrează fiecare verdict. Raportul agregat „Pagini” este încă datat 23 octombrie și nu reflectă acest inventar.
- Zece cereri noi au fost acceptate: `pentru-iubita`, `fani-game-of-thrones`, `fani-fantasy`, `cadouri-mici`, `pentru-colegi`, `pentru-tata`, `pentru-sora`, `pentru-iubit`, `multumire`, `valentines-day`. Opt au devenit indexate în timpul verificării. `pentru-sora` și `cadouri-mici` încă sunt necunoscute în inspecție. Halloween este „Descoperită – nu este indexată”; solicitarea sa a fost respinsă prin cota zilnică, deci nu este acceptată în coadă.
- În Opera, trimiterea unei cereri a eșuat, iar pagina afișa eroare de conectare la reCAPTCHA. Sesiunea existentă Safari, pe aceeași proprietate, a acceptat cele zece cereri. Nu s-a rezolvat un CAPTCHA și nu s-au schimbat protecțiile browserului.
- Merchant, actualizat la 4 noiembrie: **2 elemente valide, 0 invalide**, zero probleme critice. Validările `audience` și `hasMerchantReturnPolicy` au reușit, fiecare cu zero elemente afectate. Avertismentul opțional `shippingDetails` afectează două elemente. Numărul elementelor Merchant nu este numărul paginilor indexate.
- Setările proprietății confirmă „AI generativ în Căutare: Includeți” și toate fișierele robots valide. Raportul de crawl, actualizat la 3 noiembrie, are 644 solicitări/90 zile, 95% răspunsuri 200 și o durată medie de 694 ms. GSC spune că gazda a avut probleme în trecut, dar nu recent; DNS și robots sunt în limite acceptabile, iar conectivitatea serverului a revenit în limite. Nu este identificată data sau cauza exactă a incidentului istoric.

## Trafic și descoperire

- În intervalul GSC **7 octombrie–3 noiembrie**, raportul de 28 zile are **1 clic, 65 afișări, CTR 1,5%, poziție medie 14,2**. Interogările nominalizate în acest eșantion sunt despre cutiuțe muzicale vinyl/vinil. Interogarea „lumanare botez handmade” are trei afișări istorice și zero clicuri către homepage în raportul separat pe trei luni; nu apare în lista interogărilor pe 28 zile. O astfel de afișare izolată nu dovedește existența unor produse ori pagini cu lumânări.
- D1 înregistrează activitate. Un instantaneu al celor 30 de zile UTC, înaintea verificărilor ulterioare din browser, avea 339 `page_view`, 82 `product_view`, 16 `add_to_cart`, 34 `checkout_start`. Acestea sunt acțiuni agregate, pot include administratori/teste și nu măsoară vizitatori unici sau trafic organic atribuit.
- `traffic_daily_metrics` este gol; proprietatea GSC este salvată, dar GA4 Property ID este gol. `GOOGLE_ACCESS_TOKEN` lipsește atât din secretele Workerului, cât și din credențialele criptate D1. Autentificarea în browser nu conectează API-ul dashboardului. Importul Google rămâne dependent de o credențială read-only validă; GA4 mai necesită o proprietate reală și configurarea măsurării. Nicio valoare de trafic nu a fost fabricată/importată manual.
- Dashboardul afișează acum întâi activitatea proprie, apoi importurile Google și starea fiecărei conexiuni. Butoanele fără configurare au explicații și sunt indisponibile; erorile de import rămân vizibile cu opțiunea de reîncercare. Intervalele, sursele și proprietățile se păstrează distincte. Zonele admin/API/auth și datele din afara perioadei sunt excluse din sumarul public de activitate.
- IndexNow este pregătit prin `npm run seo:indexnow -- --paths=/cale,...`. Fără `--submit` face numai verificări. Trimiterea verifică fișierul public de proprietate, lista sitemap, răspunsul 200, canonic propriu și lipsa noindex. Se trimit numai paginile modificate după activare; nu întregul inventar neschimbat și nu URL-uri private. Fișierul de proprietate este public conform protocolului și nu acordă acces administrativ. Recepția IndexNow nu dovedește indexarea Bing și nu este o cerere de indexare Google.

## Date de livrare și compatibilitate

- Politica D1 verificată are moneda RON, România, transport gratuit de la **300 RON după reduceri**, Easybox activ și cotații live. Valorile 32/24 RON sunt tarife de rezervă, nu tarifele tuturor comenzilor curente; nu sunt prezentate drept prețuri fixe în schema SEO.
- `/livrare` și cardul produsului afișează pragul din D1. `ShippingService` descrie numai gratuitatea condiționată de valoarea comenzii, pentru curier și Easybox. `OfferShippingDetails` referă serviciile de pe `/livrare`; sub prag se păstrează calculul real din checkout. Nu sunt inventate durate de pregătire sau tranzit. Componenta de livrare primește informația prin SSR și elimină cererea suplimentară `commerce/config` pentru acest card.
- Sunt adăugate dimensiuni de afișare pentru imaginile lazy din carduri și miniaturi și metadatumul standard `mobile-web-app-capable`.
- Măsurare înainte de release, mobil 390×844, Fast 4G/CPU 4×: produs Winter Is Coming LCP **2.248 ms**, CLS **0,00**; homepage LCP **2.109 ms**, CLS **0,00**. Sunt rezultate de laborator, fără date CrUX disponibile; INP nu a fost măsurat. Lighthouse mobil pe produs: **100 accesibilitate, 100 bune practici, 100 SEO, 100 navigare agentică**, 56 verificări trecute/0 eșuate. Nu reprezintă un scor Lighthouse de performanță.

## Cod și verificări

- Ramura `codex/seo-traffic-audit-20261105`, bază `1e6532e`, păstrează schimbările existente. Fără migrare D1, schimbare DNS, conturi, parole sau MFA.
- Verificările ultimei revizii de cod au trecut: `npm run typecheck`, `npm test -- --maxWorkers=2` (**344/344**), `npm run lint`, `npm run build`, `npm run cf:deploy:dry`, `git diff --check`. Auditul SEO al producției anterioare releaseului a trecut cu 38 URL-uri, 7 produse, 35 imagini și zero probleme/pagini orfane.
- Starea de publicare și verificările vizuale după deploy se consemnează separat; pregătirea locală nu confirmă activarea noului cod ori primirea unei notificări IndexNow.

## Referințe de implementare

- [Google: ShippingService și condiții de comandă](https://developers.google.com/search/docs/appearance/structured-data/shipping-policy), [referirea politicii globale din ofertă](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing).
- [Google: controlul includerii în funcțiile AI](https://support.google.com/webmasters/answer/16908024), [ghidul SEO pentru AI](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide).
- [IndexNow: verificare, notificare și răspunsuri HTTP](https://www.indexnow.org/documentation), [Bing: se notifică paginile modificate după activare](https://www.bing.com/indexnow/getstarted).
