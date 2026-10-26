# Glosar de produs și implementare

Folosește forma din coloana „În interfață” pentru texte adresate clientului. Numele de furnizor, ID-urile și stările tehnice rămân în cod, admin și audit unde sunt necesare. Verifică eligibilitatea reală înainte de a promite o funcție.

| Termen                      | În interfață / sens                                                              | În implementare / limită                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Cutiuța Magică              | Numele magazinului și al produsului comercial independent                        | Worker, D1, R2, KV și deployment proprii; AVYRON nu este runtime obligatoriu                                              |
| Cutiuță muzicală            | Produsul fizic din lemn, cu manivelă și melodie                                  | `product_type = music_box`; folosește datele reale din catalog                                                            |
| Disponibile acum            | Produse care pot fi comandate în prezent                                         | Necesită preț, listare și stoc/politică eligibile pe server; nu confunda cu simpla publicare                              |
| În curând                   | Produse afișate fără promisiune de livrare imediată                              | `storefront_state = coming_soon`; nu le transforma în disponibile doar pentru marketing                                   |
| Profil                      | Zona contului pentru acces și datele clientului                                  | `/cont#profil`; Google OAuth și parola sunt căi de acces ale aceluiași cont, când configurate                             |
| Comenzi                     | Istoricul comenzilor clientului                                                  | `/cont#comenzi`; `pending/unpaid` nu este plată finalizată                                                                |
| Portofel                    | Carduri salvate și acces la plata coșului                                        | `/cont#portofel`; magazinul păstrează referințe și date mascate, nu numărul complet/CVV                                   |
| Adaugă card                 | Deschide salvarea securizată după acordul clientului                             | Fluxul de setup al procesatorului; butonul trebuie să explice indisponibilitatea/eroarea                                  |
| Plată online cu cardul      | Metoda de plată prezentată clientului                                            | Identitatea procesatorului rămâne în integrare/admin; activarea depinde de readiness și webhook                           |
| Ramburs                     | Plată la primire când metoda și curierul/punctul o acceptă                       | Nu presupune că orice Easybox permite ramburs                                                                             |
| Easybox                     | Punct de ridicare selectat de client                                             | Folosește identificatorul oficial, oferta validă și capacitatea de ramburs a punctului                                    |
| Magic Rewards               | Beneficiile clientului descrise de program                                       | Afișează numai drepturi și solduri calculate de serviciul real                                                            |
| Comandă provizorie          | Cerere tehnică necesară inițierii plății                                         | `pending/unpaid`; nu pornește notificări/fulfillment până la confirmarea semnată                                          |
| Confirmarea plății          | Evenimentul verificat care permite procesarea comenzii                           | Webhook semnat, sumă, monedă, furnizor, mediu și idempotentă verificate                                                   |
| Draft / pending approval    | Lucru pregătit, nevizibil sau neexecutat extern                                  | Nu raporta drept publicat, plătit sau sincronizat                                                                         |
| AVYRON                      | Marca și sistemul extern folosit numai în limitele aprobate                      | Integrare opțională HMAC/API; logoul de credit nu implică transfer de date                                                |
| SEO                         | Optimizare pentru căutări tradiționale                                           | Titluri, conținut, URL, canonical, accesibilitate și indexare verificate pe paginile reale; nu inventa trafic sau poziții |
| GEO / AEO                   | Conținut clar și verificabil pentru motoare de răspuns și căutări asistate de AI | Explică entități, servicii, produse și întrebări reale; nu promite includerea într-un răspuns AI                          |
| Date structurate Schema.org | Descriere lizibilă de mașini a firmei, produselor și ofertelor reale             | JSON-LD trebuie să corespundă conținutului vizibil, prețului, stocului și paginii canonice                                |
| `llms.txt`                  | Fișier de orientare pentru agenți care citesc site-ul                            | Generat din rute și date publice reale; nu este garanție de indexare                                                      |
| `robots.txt` și sitemap     | Instrucțiuni de acces și lista URL-urilor canonice pentru crawlere               | Verifică răspunsul public, starea HTTP, actualizarea și excluderea zonelor private                                        |
| Compatibilitate agentică    | Navigare semantică și formulare cu etichete, erori și pași previzibili           | Nu ocoli autentificarea, consimțământul sau confirmarea plății pentru agenți                                              |
| SSR                         | HTML randat pe server pentru pagini publice                                      | TanStack Start pe Worker; verifică HTML-ul livrat, nu numai DOM-ul după JavaScript                                        |
| D1 / R2 / KV                | Bază relațională / fișiere media / cache efemer                                  | Resurse Cloudflare dedicate Cutiuța Magică; D1 este sursa datelor comerciale                                              |
| HMAC / idempotentă          | Semnătură pentru mesaje între sisteme / prevenirea efectelor duble               | Se verifică pe server și se auditează; nu face transferul către AVYRON obligatoriu                                        |
| PR / deploy / live          | Revizie propusă / publicare / stare verificată în producție                      | Sunt etape diferite, cu aprobări și dovezi separate                                                                       |

## Ton și convenții

- Scrie românește, cu diacritice, clar și cald; păstrează numele proprii ale produselor/furnizorilor când sunt necesare.
- În copy de client explică acțiunea și următorul pas. Nu afișa jargon de furnizor dacă nu ajută la decizie.
- Distinge `local`, `dry-run`, `PR`, `deployed` și `verificat live`. O stare intermediară nu devine finală prin formulare.
- Nu inventa preț, stoc, timp de livrare, drepturi, certificare, recenzie, performanță SEO sau disponibilitatea unei metode de plată.
