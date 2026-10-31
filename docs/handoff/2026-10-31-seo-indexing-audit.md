# Audit SEO și indexare — 31 octombrie 2026

## Stare verificată

| Sursă | Rezultat |
| --- | --- |
| GSC, indexarea paginilor, date actualizate la 23 octombrie | 7 URL-uri indexate, 2 neindexate. Cele două sunt `favicon.ico` și `/produse?q={search_term_string}` cu canonical corect către catalog. Rândul vechi `http://cutiutamagica.eu/` apare încă între indexate; astăzi redirecționează spre HTTPS. |
| GSC, inspecție individuală, 31 octombrie | `/produs-cutiuta-muzicala-winter-is-coming` este deja pe Google. `/produs-cutiuta-muzicala-you-are-sunshine` și `/cadouri/pentru-mama` nu erau cunoscute în index, însă testul live le declară indexabile. Google a confirmat solicitarea de indexare pentru ambele; procesarea nu este încă dovedită. |
| GSC, sitemapuri, 31 octombrie | `/sitemap.txt`: succes, 38 URL-uri descoperite, citit la 29 octombrie. `/sitemap-guides.xml`: succes, 23 URL-uri, citit la 31 octombrie. `/sitemap.xml`: eroare generică de citire, tip necunoscut, 0 URL-uri, ultima citire 26 octombrie. GSC nu expune un motiv HTTP sau XML mai precis. |
| Site public | Cele 38 URL-uri din sitemapul text răspund 200, au titlu și descriere, canonical exact, robots `index, follow` și H1. Cele 37 imagini distincte enumerate în XML răspund 200 cu tip imagine. Sitemapurile, robots și `llms.txt` răspund 200. |
| Dashboard SEO | 7 produse publicate, 22 ghiduri, 0 probleme critice, 0 îmbunătățiri pentru câmpurile auditate. Nu se pot inventa SKU, GTIN, licențe sau alte date care cer verificare comercială. |
| Feed Merchant | 5 produse comandabile, cu `price` și `sale_price` separate; prețurile finale corespund paginilor produselor verificate. |
| GSC, performanță, ultimele 3 luni | 88 afișări și un clic, eșantion insuficient pentru o concluzie despre rata de conversie. Căutările despre lumânări handmade au produs câteva afișări ale paginii de start și niciun clic; magazinul nu vinde aceste produse, deci nu au fost introduse texte sau pagini pentru ele. |

## Schimbare locală

`/sitemap.xml` devine un index static servit ca asset public. El trimite către sitemapul static al paginilor esențiale, sitemapul static al ghidurilor și sitemapul dinamic al produselor publicate. Astfel, accesul la fișierul principal nu mai depinde de D1 sau KV. Sitemapul produselor păstrează cache-ul KV și ultima versiune validă dacă D1 are o eroare temporară; lista text rămâne generată din aceeași sursă de catalog. Fiecare URL canonic apare o singură dată în cele trei sitemapuri copil.

`robots.txt` declară indexul XML și lista text. `llms.txt` enumeră în continuare doar paginile și produsele publice reale și indică ambele liste de URL-uri. Nu există o garanție de indexare sau apariție în răspunsurile AI asociată cu `llms.txt`; conținutul factual, linkurile, HTML-ul server-side și datele structurate sunt semnalele utile.

FAQ-ul produsului descrie acum decorurile din fotografii fără să enumere lumânări, care nu sunt vândute în magazin. Clarificarea despre ce primește clientul rămâne vizibilă; nu se adaugă termeni nerelevanți pentru căutare.

## Verificări și limite

Tipizarea, 328 teste, lint, build, dry-run-ul Cloudflare și `git diff --check` au trecut. XML-urile statice construite se parsează: indexul conține trei sitemapuri, paginile esențiale opt URL-uri și sitemapul ghidurilor 23. Testele verifică alinierea listelor canonice și cache-ul produselor.

FAQ-ul schimbat a fost verificat în preview cu D1 local la 1440 × 900 și 390 × 844: răspunsul este lizibil și fără depășire orizontală. [Captura desktop](../release-evidence/2026-10-31-seo/product-faq-desktop-1440.jpg) și [captura mobilă](../release-evidence/2026-10-31-seo/product-faq-mobile-390.jpg) păstrează dovada vizuală.

Nu s-a făcut deploy. Noua structură trebuie verificată public și trimisă în GSC după o lansare aprobată; până atunci GSC vede structura anterioară. Eroarea generică actuală a XML-ului nu are o cauză demonstrată, iar schimbarea statică este o măsură de fiabilitate, nu o remediere Google confirmată. Google poate alege să nu indexeze URL-uri eligibile, mai ales pe un site nou cu puține semnale externe.

Pentru conversii, codul emite evenimente de vizualizare produs, adăugare în coș și început de checkout; evenimentul de cumpărare este înregistrat de server după comanda confirmată. Numărul mic de afișări organice nu susține încă experimente de text orientate spre rată de conversie. Prioritatea este descoperirea celor cinci produse comandabile și a paginilor de alegere cu intenție comercială reală, apoi măsurarea clicurilor și comenzilor confirmate.
