# Cutiuța Magică — implementare locală pentru revizie

23 septembrie 2026. Lucrarea este în această copie izolată, pornită de la commitul `cc06017`. Repository-ul original și producția nu au fost modificate. Nu s-au făcut push, merge, deploy sau comenzi reale.

## Landing page

- Hero nou, atmosferă comună în tonuri de lemn și aur, fundaluri cu tranziții graduale și particule discrete cu profunzime.
- „Descoperă povestea”: carusel manual centrat, lățime desktop redusă de la 340 la 306 px.
- „Trăiește emoția”: produsul în partea dreaptă, mai sus; compoziție centrată pe mobil.
- „Cutiuțe dedicate”: decor nou cu centrul liber pentru produs.
- „Magia care urmează”: deplasare lentă spre stânga, swipe, săgeți, pornire/pauză; oprire la interacțiune, focus, ieșirea din ecran și ascunderea paginii.
- Loading-ul animat este păstrat: o cutiuță procedurală Three.js, animată cu GSAP, cu capac, mecanism și manivelă. Închiderea este programată la 1,75 secunde; efectul CSS ascunde introducerea și fără JavaScript. Logo-ul SVG rămâne alternativa imediată pentru încărcare lentă, WebGL indisponibil sau economisirea datelor. Escape/Tab închid introducerea. Sunetul introductiv sintetizat este opțional, prin buton; nu înlocuiește înregistrarea produsului.
- Confirmare personalizată a coșului, 5 secunde, cu cantitatea adăugată efectiv și acces la coș.
- Returul ocupă inițial doar un buton „Formular de retur”. Acesta deschide un panou modal compact, cu formularul existent în două etape, închidere prin X/Escape/exterior și păstrarea datelor în memoria paginii la închidere/redeschidere.
- Bara de sus eliminată; indicatorul din dreapta permite navigarea între capitole.

Distribuția inițială verificată în baza de test:

| Colecție           | Modele disponibile                                  |
| ------------------ | --------------------------------------------------- |
| Povești            | Harry Potter, Game of Thrones                       |
| Emoții             | You Are My Sunshine                                 |
| Dedicate           | Pisicuța, Halloween                                 |
| Magia care urmează | One Ring, I Solemnly Swear, Zâna, Pirații, Best Dad |

## Despre cutiuță și melodii

`/despre-cutiuta` înlocuiește pagina de prezentare; `/poveste` redirecționează permanent către ea. Scena Three.js construiește corpul, mecanismul, capacul și manivela, cu un fir luminos controlat de scroll. Există o prezentare alternativă pentru mișcare redusă sau WebGL indisponibil. Modelul este o ilustrație explicativă, nu o scanare exactă a unui anumit produs.

În dashboard, secțiunea Audio acceptă o înregistrare reală, permite selectarea și ascultarea unui fragment de 15–30 secunde și îl pregătește pentru publicare. Durata este verificată și pe server. După aprobarea fișierului și activarea experienței, pagina produsului afișează playerul. Audio nu pornește automat; sunetele decorative sunt suspendate în timpul melodiei.

Nu am inventat melodii și nu am adăugat înregistrări publice fictive. Înregistrările reale trebuie încărcate pentru fiecare produs.

## Dashboard și consistența catalogului

Textele și galeria publică folosesc datele administrate în D1. Vechile texte din cod sunt importate o singură dată, fără să suprascrie ulterior modificările administratorilor.

Sunt disponibile editarea numelui scurt, descrierilor, detaliilor, categoriei de landing, ordinii, produsului recomandat în hero, publicării, disponibilității și informațiilor despre lansare. Imaginile au ordine editabilă și stare de publicare. Cuvintele de căutare și câmpurile SEO rămân conectate catalogului. Prețurile folosesc modulul existent de promoții, accesibil din fișa produsului.

Stocul poate fi administrat numeric. Checkout-ul rezervă atomic cantitățile pentru produsele urmărite în stoc, împiedică supravânzarea și eliberează rezervarea la anulare. Expedierea consumă stocul o singură dată. Modificările simultane ale administratorilor sunt verificate prin versiuni.

Produsele epuizate se mută automat în colecția viitoare. Cererile de interes sunt deduplicate și apar în fișa produsului. Precomanda este o solicitare fără plată, activabilă de administrator; când nu este activată, vizitatorul poate cere notificarea disponibilității. Trimiterea ulterioară a mesajelor rămâne o acțiune a echipei.

## Verificări și limite

Au trecut verificarea TypeScript, 117 teste în 18 fișiere, lint, compilarea aplicației și simularea de publicare. Testele includ migrarea unei baze SQLite reale, catalogul 5+5, respectarea editărilor din admin, stocul, cererile de interes, încărcarea audio și respingerea fragmentelor prea scurte.

Migrațiile 0019–0026 au fost aplicate doar în baza locală. La o publicare viitoare, aceste migrații trebuie aplicate înainte de noul Worker. Seed-ul `0004_storefront_content.sql` este pentru inițializarea locală după seed-urile 0001–0003; nu trebuie rulat peste date de producție deja administrate.

Scena 3D de la „Despre cutiuță” este încărcată separat, când vizitatorul se apropie de ea. Randarea este declanșată de scroll/redimensionare; după apăsarea manivelei, rotirea este randată la maximum 30 cadre pe secundă și se oprește odată cu redarea sau când scena nu mai este vizibilă. Introducerea 3D de pe landing încarcă dinamic Three.js + GSAP doar la prima vizită a sesiunii, fără să prelungească termenul de închidere pentru a aștepta importul. Aceasta adaugă aproximativ 192 KB gzip pentru Three și 29 KB gzip pentru introducere/GSAP, separat de pagina de bază. Animațiile respectă preferința pentru mișcare redusă.

Inspecția vizuală desktop/mobil și măsurarea Core Web Vitals nu au putut fi efectuate: instrumentul de browser a refuzat accesul deoarece nu putea valida politica impusă de administrator. Nu există, prin urmare, o confirmare vizuală a tuturor compozițiilor sau un scor de performanță măsurat.

Fundalurile noi au rezoluția nativă 1672 × 941, cu o variantă mobilă de 850 × 478 pentru bibliotecă. Sunt WebP de aproximativ 40–136 KB. Nu sunt imagini 4K native și nu au fost mărite artificial. Fotografiile existente ale produselor și variantele lor AVIF/WebP au fost păstrate.

## Revizie locală

Serverul de dezvoltare a fost pornit la `http://127.0.0.1:3000/`. Pentru repornire din acest director: `npm run dev -- --host 127.0.0.1 --port 3000`.

Verificarea vizuală rămasă: ecrane de 390 px, 768 px, 1440 px și ecran mare; loading, spațiul vizibil din fiecare decor, schimbarea cardurilor, swipe/pauză, notificare, formularul de retur, scena 3D și playerul cu o înregistrare reală. Autentificarea și dashboardul trebuie verificate cu un cont autorizat; în testele automate autentificarea este simulată, fără modificarea politicii reale de acces.


## Extinderea paginilor de produs și a subsolului

Fiecare produs are o pagină separată și o scenă implicită asociată tematicii sale. Sunt nouă decoruri: bibliotecă, iarnă, soare, grădină, toamnă, pădure, stele, ocean și galaxie. În fișa produsului, „Universul paginii de produs” permite schimbarea decorului, culorii și textului emoțional. Decorurile geometrice sunt scalabile; nu sunt fotografii 4K sau modele scanate ale produselor. Fotografiile reale rămân dominante.

Paginile păstrează titlul și descrierea SEO administrabile, canonical, Open Graph, date Product/Breadcrumb și sitemap din catalog. Acestea pregătesc indexarea; nu reprezintă confirmarea indexării Google. Cardurile și pagina produsului au o animație decorativă 3D către coș la adăugare, de 700 ms, dezactivată pentru mișcare redusă. Coșul se actualizează independent de animație.

Subsolul are o invitație nouă, logo în perspectivă și un decor cinematic de atelier nocturn, cu lemn gravat, alamă, lumină aurie și profunzime verde-albăstruie. Imaginea ambientală este completată de filamente și particule Three.js reale, cu reacție discretă la cursor, oprire când subsolul nu este vizibil și alternativă statică. Navigarea și legăturile pentru consumatori rămân lizibile. Detaliile asseturilor și promptul sunt în `design/FOOTER_ATELIER.md`. Insigna Stripe afișată anterior necondiționat a fost eliminată, pentru a nu prezenta ca verificată o metodă de plată neconfirmată în acest mediu.

## Notificări

`/admin/notifications` include alertele private existente, actualizate la 15 secunde cât pagina este activă, și editorul mesajelor publice. Mesajele au pagină țintă, întârziere, prag de scroll, text, buton și activare. Vizitatorul vede maximum trei mesaje pe sesiune, pe rând, câte 5 secunde și cu minimum 18 secunde între ele. Închiderea manuală oprește restul sugestiilor. Mesajele nu apar peste alte notificări, dialoguri sau în timpul completării câmpurilor. Linkurile acceptate sunt limitate la pagini publice. Alertele interne nu sunt returnate de API-ul public.

O nouă cerere de interes/precomandă generează o alertă administrativă deduplicată. Nu există notificări despre vânzări fictive sau urgență inventată.

## Canale de vânzare și integrări

Canale cerute: eMAG, Trendyol, Okazii.ro (interpretarea „ekazii”), OLX, Vinted, plus Google Merchant Center. Restul canalelor existente au fost păstrate.

În fișa fiecărui produs publicat în catalog există acum „Cutiuța pe fiecare canal”: titlu și descriere adaptabile, ciornă, pregătirea publicării/republicării, acces la portal, copierea anunțului și confirmarea manuală cu link. Cererile și acțiunile sunt păstrate și auditate. Confirmarea manuală actualizează și listarea centrală, fiind etichetată explicit ca verificare a administratorului. Modificările ulterioare ale produsului, prețului sau disponibilității semnalează nevoia de revizie.

**Acesta este un flux de publicare asistată. Nu sunt implementați și activați conectori care să publice automat pe eMAG, Trendyol, Okazii, OLX sau Vinted.** Nu s-au publicat anunțuri, conectat sau creat conturi externe. Lipsesc linkurile conturilor și accesul oficial, iar mapările specifice de categorii/atribute și conectorii trebuie finalizați înaintea automatizării. Fișele canalelor indică explicit această stare.

Feedul XML `/api/v1/catalog/google.xml` este implementat și citește catalogul central la fiecare acces: prețuri RON, disponibilitate, fotografii aprobate și linkuri canonice. Produsele fără preț, imagine sau descriere sunt excluse. Nu sunt inventate GTIN-uri și nu este declarat artificial că identificatorii nu există. Înregistrarea sursei, identificatorii valizi ai produselor, livrarea, politicile și aprobarea Merchant Center rămân necesare. Editările de text specifice canalelor sunt ciorne pentru publicarea asistată; feedul Google folosește conținutul central.

`/admin/integrations` permite salvarea linkurilor și ID-urilor conturilor, separat de cheile criptate. Sunt disponibile câmpuri securizate pentru Google Merchant, eMAG, Trendyol, OLX, Okazii, FGO, SmartShip, Stripe și NETOPIA. Stocarea din dashboard necesită cheia de criptare a mediului. Salvarea unei chei nu certifică funcționarea conexiunii.

Stripe, facturarea FGO și curieratul SmartShip păstrează implementările existente. Pentru NETOPIA este pregătit spațiul de configurare; checkoutul și webhookul NETOPIA trebuie implementate și testate înainte de activare. Numărul cardului firmei și CVV nu sunt colectate aici; dashboardul trimite administratorul la portalurile furnizorilor. Configurările și explicațiile interne nu apar în paginile cumpărătorilor.

Referințe oficiale folosite pentru delimitarea integrărilor: [eMAG API](https://marketplace.emag.ro/infocenter/emag-academy/cum-se-adauga-un-produs/importul-prin-feed/documentatie-tehnica/), [Trendyol Product V2](https://developers.trendyol.com/v3.0/reference/createproducts), [acces OLX API](https://developer.olx.ro/articles/getting-access-to-api), [import Okazii](https://ajutor.okazii.ro/wp-content/uploads/2017/12/product-import-manual_RO.pdf), [Google Merchant — identificatori](https://support.google.com/merchants/answer/6324478?hl=en), [NETOPIA API v2](https://doc.netopia-payments.com/docs/payment-sdks/php/).

Verificări pentru această extindere: TypeScript, 81 teste, lint, build și simularea de publicare au trecut. Testele noi verifică izolarea mesajelor publice, limitarea corpurilor cererilor, salvările concurente, domeniile conturilor, deduplicarea alertelor, publicarea asistată, detectarea catalogului modificat și escaparea XML. Verificarea vizuală și testele reale ale conturilor externe rămân neefectuate, cu motivele de mai sus.


## Checkout și plăți — completare 23 septembrie

Detaliile implementării și limitele integrărilor sunt în [CHECKOUT_LIVRARE.md](CHECKOUT_LIVRARE.md). Checkoutul are opțiuni publice curate, total verificat, revenire/relansare a aceleiași plăți, Stripe întărit, adaptor Revolut Merchant, oferte SmartShip legate de coș și configurații interne NETOPIA/FGO/Oblio. NETOPIA hosted checkout/IPN și emiterea Oblio rămân de implementat; nu sunt promovate ca active.

Verificare checkout: TypeScript, lint fără erori/avertismente, 98 teste în 15 fișiere, build și simularea de publicare au trecut. Migrarea 0024 a fost aplicată numai bazei locale. Browserul a refuzat din nou previzualizarea din cauza verificării indisponibile a politicii de securitate; nu există confirmare vizuală desktop/mobil și nu s-au făcut plăți reale sau probe în conturi sandbox.

## Manivela interactivă și melodia scenei

Scena „Despre cutiuță” are acum un punct de apăsare pe manivela 3D, un buton fix accesibil și redare audio la cererea vizitatorului. În Setări → Despre cutiuță există încărcare, decupare 15–30 secunde, previzualizare privată și activare explicită. Finalul paginii prezintă detaliile, mecanismul, îngrijirea și alegerea unei cutiuțe pentru fani și colecționari. Detalii, limite și pași de configurare: [SCENA_DESPRE_CUTIUTA.md](SCENA_DESPRE_CUTIUTA.md).

## Rafinarea hero-ului și a mesajelor de întâmpinare

Hero și prima colecție împart acum același decor. Fotografia reală este încadrată de o ramă inspirată de mecanism, butonul „Despre” apare din zona iluminată, iar separarea rigidă a fost înlocuită de un fir luminos la scroll. Secvența de maximum trei mesaje respectă încărcarea, interacțiunile și închiderea manuală. Detalii: [HERO_EXPERIENTA.md](HERO_EXPERIENTA.md).

## Continuitate și interacțiuni pe întregul landing

Cele trei carduri de prezentare folosesc textele furnizate și apar succesiv. Titlul hero-ului are o reflexie aurie limitată, iar decorul se schimbă gradual de-a lungul întregului landing. Hover-ul și apăsarea folosesc culori și forme adaptate colecției; swipe-ul, accesul din tastatură și mișcarea redusă sunt respectate. Detalii: [ANIMATII_LANDING.md](ANIMATII_LANDING.md).
