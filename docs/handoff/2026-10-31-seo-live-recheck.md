# Reverificare live: indexare, vizibilitate și SEO — 31 octombrie 2026

## Rezultate confirmate

| Suprafață | Rezultat |
| --- | --- |
| Sitemap | Indexul XML are exact trei sitemapuri copil. Cele 38 URL-uri canonice din XML coincid cu lista text: 8 pagini esențiale, 7 produse publicate și 23 ghiduri. XML-urile se parsează. |
| Pagini | Toate cele 38 răspund 200 fără redirecționare, cu canonical propriu, title și description unice, H1, `index, follow` și imagine socială. Nu există pagini orfane în setul indexabil. |
| Date structurate | Toate cele 7 produse au Product și Offer JSON-LD. Produsul verificat manual are JSON valid, preț, monedă, disponibilitate și BreadcrumbList. |
| Imagini | Cele 35 imagini distincte din sitemapurile XML răspund 200 cu tip `image/*`. |
| Feed | `/google-products.xml` răspunde 200 și include 5 produse disponibile, fiecare cu URL din sitemapul produselor. Feedul are antet `X-Robots-Tag: noindex, follow`, adecvat unui feed și fără impact asupra paginilor de produs. |
| Canonicalizare | `http://cutiutamagica.eu/` și `https://www.cutiutamagica.eu/` redirecționează 308 spre `https://cutiutamagica.eu/`. |
| Pagini excluse | Termenii, confidențialitatea, autentificarea, contul, checkoutul și personalizarea verificate au `noindex` și nu apar în sitemap. |
| Legături interne | 43 destinații interne din setul de pagini indexabile au fost verificate, fără răspunsuri 4xx/5xx; toate paginile din sitemap au cel puțin o legătură internă. |

`robots.txt` este completat la edge de Cloudflare Managed. Semnalul `search=yes` permite indexarea pentru căutarea tradițională; directivele de `Disallow` din conținutul gestionat vizează o listă de crawleri de antrenare AI. `llms.txt` indică produsele publice reale și listele canonice. Aceste fișiere ajută descoperirea și exprimă preferințe, însă nu garantează apariția în căutare ori în răspunsuri AI. [Documentația Cloudflare despre Managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/) explică semnalele și separarea căutării de antrenare.

## Limite și acțiune rămasă

`Python-urllib/3.9` primește 403 pentru sitemapuri și produse, în timp ce cereri de probă cu User-Agent Googlebot și OAI-SearchBot primesc 200. User-Agent poate fi imitat, deci rezultatul nu probează accesul de la IP-urile crawlerelor reale. Dacă GSC continuă să afișeze eroare la sitemapul XML, verifică jurnalul de securitate Cloudflare pentru cererile Google verificate și regula care le-a procesat, apoi retestează exact URL-ul afectat.

Sesiunea Opera cu Search Console a fost inaccesibilă deoarece Mac-ul era blocat. Nu s-au putut citi starea actuală a sitemapului, motivele de neindexare și inspecția produselor. Ultima verificare GSC consemnată în [auditul anterior](2026-10-31-seo-indexing-audit.md) este istorică: XML avea eroare generică, în timp ce lista text și sitemapul ghidurilor erau citite cu succes. După deblocare, citește raportul actual, verifică exemplele exacte neindexate și trimite sitemapul XML numai dacă raportul arată că este necesar. Google decide indexarea; HTTP 200 și sitemapul corect nu reprezintă confirmarea indexării. [FAQ Google despre crawling și indexare](https://developers.google.com/search/help/crawling-index-faq) descrie această limită.

## Livrare

Se adaugă `scripts/audit-seo-live.mjs` și comanda `npm run seo:audit:live` pentru a repeta controalele de mai sus după fiecare lansare. Scriptul întoarce exit code 1 la erori SEO confirmate și nu scrie în producție. `npm run typecheck`, 334/334 teste, `npm run lint`, `npm run build`, `npm run cf:deploy:dry`, auditul live și `git diff --check` au trecut. Nu există schimbări de pagină, migrare D1, binding sau secret. Capturi desktop/mobil nu sunt necesare pentru schimbări de script și documentație. Revizia publicată se completează în handofful principal după CI și deploy.
