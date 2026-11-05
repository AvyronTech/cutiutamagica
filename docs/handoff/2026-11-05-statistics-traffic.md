# Statistici și trafic — 5 noiembrie 2026

## Scop

Ramura `codex/analytics-traffic-workspace-20261105`, bază `60a59c9` (PR #88). Cerere: unificare Statistici/Trafic, texte românești, UI compact și rapoarte consecvente între fluxuri. Fără migrare D1, activare de furnizori, schimbare de buget sau modificări ale datelor comerciale din producție.

## Interfață și compatibilitate

O singură intrare „Statistici și trafic”, la `/admin/statistics`, cu file Sinteză, Vânzări și produse, Trafic și conversii, Surse și conexiuni. Perioada de 7/30/90 zile și fila se păstrează în URL. `/admin/traffic` și notificările vechi ajung în fila Trafic, păstrând perioada; legăturile sociale folosesc ruta nouă.

Indicatorii esențiali apar primii, apoi situația curentă a operațiunilor și a stocului. Filele au relații ARIA și navigare cu săgeți/Home/End; pe mobil sunt pe două coloane. Un singur H1, contrast îmbunătățit și stări explicite de încărcare, lipsă date și eroare/reîncercare. Setările nesalvate se păstrează între file. Graficele se încarcă numai la cerere și nu se redau în file ascunse.

## Surse și definiții

- `analytics-overview.ts` agregă în D1 comenzile, încasările, rambursările, produsele, canalele, livrările și situația curentă a fluxurilor. Parametrii perioadei sunt validați și legați în interogări pregătite; operațiile de citire sunt grupate. Acces: `reports.read`, fără date personale ale clienților în răspuns.
- Vânzări și trafic: aceleași zile calendaristice UTC, inclusiv ambele capete; comenzile se selectează după data plasării. Ciornele și comenzile `pending` cu card neplătit sunt excluse. Valoarea netă comandată exclude anulările și scade rambursările; încasarea netă este suma plătită minus rambursări, inclusiv pentru comenzile anulate din cohorta aleasă. Nu este un registru de mișcări bancare după data decontării.
- Monedele nu se adună între ele. Produsele folosesc valoarea liniilor, fără repartizarea transportului/rambursărilor generale. Costul sau rezultatul se afișează numai când toate costurile relevante sunt cunoscute; costurile parțiale nu produc profit presupus.
- Financiar citește același endpoint și aceeași cheie de cache; selector de perioadă/monedă în URL și legături care păstrează perioada. Conexiunile financiare și fluxurile existente rămân disponibile. Raportul vechi `getAdminStatistics` este păstrat pentru compatibilitatea apelurilor existente, dar cele două interfețe nu îl mai folosesc pentru sume.
- Activitatea magazinului este agregată din evenimente observate, exclusiv paginile admin/API/autentificare. Poate include reveniri, administratori și teste; nu reprezintă vizitatori unici. Ultimul pas al traseului spre comandă vine din comenzile efective ale canalului website, inclusiv cardurile acceptate și rambursul, nu din evenimente de browser. API-ul respinge evenimente `purchase` trimise de browser; calea internă de confirmare rămâne disponibilă. Nu derivăm abandonul sau conversia pe persoane din numărătoarea unor acțiuni independente.
- Google: numai proprietatea selectată, cu intervalul efectiv și ultima dată de import vizibile; proprietățile istorice nu umflă totalul. Zero importat rămâne zero; lipsa importului este explicită. Rata de clic este calculată numai cu ambii indicatori disponibili pe același interval. Importul existent are o întârziere de trei zile și aduce doar date recente; selectarea a 90 zile nu fabrică istoric.
- Stocul folosește aceeași vedere de catalog ca secțiunea Stocuri, inclusiv politica variantelor mixte. Stocurile și operațiunile indică situația curentă, separat de filtrul istoric: comenzi de procesat, plăți eșuate, retururi, erori de sincronizare, aprobări, postări în revizie, operații automate eșuate și abonați activi. Fiecare are legătură către modulul responsabil. Comanda de aprobare a postărilor din Agent Codex a fost corectată către secțiunea socială comună.
- Modificările reușite și invalidarea surselor operaționale marchează rapoartele ca învechite. Nu se sondează periodic ecranele ascunse; raportul se actualizează la revenire, la cerere sau după operații relevante. Cheile de cache ale surselor sunt reutilizate.

## Verificări și probe

Date DEMO numai în baza D1 locală izolată: două comenzi EUR/RON, două linii și un import Google cu zero clicuri/50 afișări. Au fost eliminate după QA; setarea anterioară locală a fost restaurată, `foreign_key_check` curat. Nicio comandă, plată, postare sau trimitere e-mail externă.

UI autentificat: aceeași sumă în Statisticile pe 7/30 zile și Financiar, schimbare separată RON/EUR, zero Google distinct de lipsa datelor, import dezactivat când lipsește accesul, setări nesalvate păstrate între file, End selectează și focalizează ultima filă, redirecționarea veche păstrează 7 zile. Desktop, 390 și 320 px fără overflow orizontal; un singur H1 și zero erori în consola browserului. Sunt verificate și stările fără comenzi după eliminarea fixturelor.

Capturi în `/Users/niss/.codex/visualizations/2026/11/05/cutiuta-analytics-traffic/`: `overview-desktop-demo.png`, `traffic-desktop-demo.png`, `finance-eur-desktop-demo.png`, `traffic-mobile-390-demo.png`, `overview-mobile-320-demo.png`, `overview-desktop-empty.png`. Capturile cu DEMO nu reprezintă datele de producție.

Testele de regresie verifică limite UTC, rute/parametri invalizi, aceeași perioadă și în Financiar, monede separate, anulări/rambursări, plăți provizorii, lipsa dublării la mai multe linii, costuri incomplete, filtrarea proprietăților Google, invalidarea cache-ului și respingerea confirmărilor false din browser. Typecheck, lint și 391 teste / 68 fișiere trecute. Agregările finale au și o verificare separată: 25 teste trecute. Buildul și `cf:deploy:dry` au trecut, inclusiv verificarea mediului de producție. CI pe commitul exact și dovada versiunii live se consemnează în PR.

## Configurare externă

Accesul Google trebuie să fie configurat și valid pentru importuri; sesiunea Opera nu este o credențială backend. UI-ul nu pretinde că un token salvat este deja verificat. Workers Free rămâne neschimbat, inclusiv limitarea CPU acceptată anterior. Nu s-au activat chei Brave, modele AI sau servicii cu cost.
