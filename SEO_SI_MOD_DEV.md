# SEO și previzualizare locală — 23 septembrie 2026

Implementare locală. Nu s-au făcut push, deploy, modificări în baza de producție, activări de canale sau trimiteri în Google Search Console.

## Produse și conținut

- Toate cele 10 produse au titluri și descrieri SEO distincte, introduceri proprii, recomandări după destinatar, 30 de idei de cadou și 20 de situații de folosire în total.
- Cele 96 de expresii din catalog ajută căutarea internă. Nu sunt liste ascunse de cuvinte și nu sunt prezentate drept un mecanism care garantează clasarea în Google.
- Conținutul vizibil este păstrat în D1, în `products.discovery_json`. Administratorii îl pot modifica în Produs → SEO: introducere, destinatar, ocazii, momente și asocierea cu ghiduri. Migrarea păstrează titlurile și descrierile personalizate existente.
- `content/product-discovery.json` este sursa editorială inițială; paginile folosesc catalogul din baza de date. Modificarea fișierului nu suprascrie ulterior textele administratorilor.
- Produsele disponibile și cele viitoare sunt separate. Stocul, prețul și listarea activă rămân decisive pentru cumpărare. Datele structurate nu inventează oferte, recenzii, reduceri, coduri GTIN sau termene de livrare.

## Pagini sezoniere și indexare

Pagini noi: `/cadouri`, `/cadouri/halloween`, `/cadouri/secret-santa`, `/cadouri/mos-nicolae`, `/cadouri/craciun`.

Ghidurile au conținut distinct, recomandări reale din catalog, legături între ocazii și legături către fiecare model. Paginile produselor trimit înapoi către ghidurile relevante. Catalogul și subsolul oferă acces la noua secțiune.

Titlurile, descrierile, URL-urile canonice, previzualizările sociale și datele structurate au fost extinse. Sunt folosite Product, Offer numai pentru produse cumpărabile, BreadcrumbList, CollectionPage/ItemList, OnlineStore, WebSite și AboutPage, după tipul paginii. Conținutul administrabil din JSON-LD este serializat în siguranță pentru a nu închide elementele script.

Sitemapul include 22 de URL-uri pentru catalogul actual: 10 produse și 12 pagini publice. Include fotografii, date de actualizare ale produselor și URL-uri canonice; nu include dashboardul, autentificarea, coșul/comanda ori variantele filtrate. Modelele viitoare își păstrează paginile informative.

Mediile diferite de producție primesc `X-Robots-Tag: noindex, nofollow`. Dashboardul, API-ul și finalizarea comenzii sunt de asemenea excluse. Previzualizarea locală nu este destinată indexării.

## Modul de dezvoltare

Previzualizarea fără aprobările de marketing/drepturi este permisă doar când configurația serverului are `APP_ENV=local` și `PUBLIC_SITE_URL` indică localhost, 127.0.0.1 sau ::1. Parametrii URL și preferințele browserului nu pot activa această opțiune.

În studioul de produs, butonul **Activează local** permite testarea fișierelor fără a marca automat drepturile ca validate. Fișierele trebuie totuși selectate pentru afișare și activate; documentele private nu devin publice. Pentru scena Despre cutiuță, un câmp separat de previzualizare păstrează condiția existentă de publicare cu drepturi confirmate.

Autentificarea, validarea fișierelor, durata audio 15–30 secunde, controlul versiunilor, stocul, plățile și regulile sincronizării externe rămân funcționale. Nicio cheie, informație despre dashboard sau setare internă nouă nu apare în componentele publice.

Migrațiile 0029 și 0030 au fost aplicate numai local. Migrațiile anterioare aplicate nu au fost modificate.

## Verificare și publicare ulterioară

Testele acoperă catalogul central, păstrarea celor 5 produse disponibile și 5 viitoare, salvarea conținutului din dashboard, validitatea profilurilor, sitemapul, escaparea JSON-LD și separarea previzualizării locale de producție.

Rezultate: 143 de teste trecute în 21 de fișiere; verificarea TypeScript, lint, build și simularea de deploy în configurația de producție au trecut. Simularea confirmă `APP_ENV=production` și domeniul public, apoi se oprește fără deploy. Buildul păstrează avertismentul privind dimensiunea modulului Three.js; această rundă nu certifică performanța măsurată pe telefoane reale.

Verificarea vizuală desktop/mobil rămâne neefectuată în această rundă: accesul browserului la previzualizarea locală este blocat de politica mediului. Buildul și testele automate nu înlocuiesc această verificare.

După autorizarea publicării: se aplică migrațiile pe mediul țintă, se verifică paginile și sitemapul live, apoi se trimite sitemapul în Search Console și se inspectează URL-urile prioritare. Indexarea și pozițiile nu sunt garantate de cod și nu au fost declanșate în această rundă. Se urmăresc separat impresiile, clicurile și comenzile pe produse și pe fiecare ocazie; textele se ajustează pe baza interogărilor reale.

Referință: [Google — structura unui magazin online și legăturile dintre pagini](https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure).
