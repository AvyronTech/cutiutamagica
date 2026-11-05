# Furnizori, importatori și persoane responsabile UE

## Scop și separarea rolurilor

- Salvează fiecare organizație ca posibilă sursă, nu ca furnizor verificat. Separă `supplier`, `manufacturer_or_seller`, `importer` și `eu_responsible_person`.
- O persoană responsabilă UE poate avea numai rol de conformitate. Nu presupune că vinde; cere redirecționarea către contactul comercial dacă este cazul.
- Leagă sursa de produs prin fișa produsului și păstrează URL-ul, platforma, data observației, dovezile și referința externă. Un număr observat într-o listare nu devine EAN/GTIN fără dovadă oficială.
- Nu transforma prețul, livrarea ori numărul de vânzări dintr-un marketplace într-o ofertă comercială confirmată.

## Cercetare și verificare

Înaintea unui mesaj verifică: produsul corect, compania, rolul declarat, țara, adresa, e-mailul și telefonul. Marchează informația drept `unverified` până la confirmarea directă. Cere în răspuns:

- denumirea juridică și rolul în lanțul de aprovizionare;
- MOQ, eșantion, trepte de preț, capacitate, termen de producție, plată și transport spre România;
- Incoterms și cost separat de transport; nu calcula costul ajuns fără toate componentele;
- specificații, mecanism, melodie, materiale, dimensiuni și ambalaj;
- țara de origine, trasabilitate lot, avertismente, declarații și rapoarte aplicabile;
- identitatea producătorului, persoana responsabilă UE și mandatul acesteia;
- EAN/GTIN oficial și dovada dreptului de utilizare, dacă există;
- dreptul de revânzare și permisiunea scrisă pentru fotografii/materiale;
- catalog/stock/order feed, CSV sau API pentru reaprovizionare și automatizare.

## Declanșare din două capturi

- Când administratorul trimite împreună o imagine clară a produsului și o captură cu datele de contact/siguranță, tratează perechea ca un singur import de aprovizionare. Nu porni importul cu o singură imagine și nu deduce date care nu sunt lizibile.
- Cere sau extrage separat linkul sursei, platforma, referința listării, companiile, rolurile declarate, e-mailurile, telefoanele, adresele și orice cod observat. Păstrează cele două imagini ca dovezi private în R2, cu rol, hash și raport D1; nu le introduce în media publică a produsului.
- Leagă datele de un produs numai după o potrivire exactă sau o selecție explicită a administratorului. Dacă produsul există, salvează contactele și linkurile în secțiunea de aprovizionare a fișei, iar EAN/GTIN-urile observate numai în registrul de candidați `unverified`.
- Dacă produsul nu există în catalog, nu crea produs, variantă, stoc ori listare. Creează numai raportul administrativ în română, cu imaginea produsului, toate datele extrase, identificatorii candidați și mesajul comercial propus.
- Pentru fiecare destinatar creează o ciornă separată. Înaintea butoanelor de aprobare, afișează integral traducerea română a mesajului; corpul extern rămâne EN → FR → chineză simplificată. Lipsa previzualizării române blochează aprobarea.
- Capturile sunt dovezi interne. Mesajul pleacă fără atașamente, exceptând cazul în care administratorul aprobă separat fișierele exacte și dreptul de distribuire.

## Mesajul comercial

- Creează câte un mesaj separat pentru fiecare destinatar. Nu pune companiile în CC și nu expune adresele între ele.
- Folosește același nucleu factual în ordinea engleză → franceză → chineză simplificată. Adaptează numai salutul și rolul când există dovadă.
- Spune că Cutiuța Magică dorește să achiziționeze produsul cât mai curând pentru revânzare în România și în magazinul online. Nu spune că produsul este deja vândut sau aprovizionat.
- Explică interesul pentru colaborare durabilă, creștere reciprocă, cantități planificate și progresiv mai mari, procese eficiente și schimb de date pentru automatizare.
- Folosește un subiect scurt și clar: `Wholesale Partnership – <product> | Cutiuța Magică Romania`.
- Încheie cu identitatea verificată: `Cutiuța Magică`, `https://cutiutamagica.eu`, `contact@cutiutamagica.eu`, `+40 734 605 742` telefon și WhatsApp, `Romania`.
- Nu atașa capturi de marketplace, fișiere sau fotografii până când administratorul nu aprobă exact atașamentele și dreptul de distribuire.

## Ciorne, aprobare și trimitere

1. Salvează separat contactul, sursa și legătura cu produsul.
2. Generează o ciornă cu destinatar, expeditor, subiect, corp complet, traducere română integrală pentru revizie, ordine lingvistică, atașamente goale și hash de revizie.
3. Creează o cerere `critical` pentru exact acea revizie. Trimiterea cere aprobările `admin_dashboard` și `codex_conversation`; aprobarea nu execută automat.
4. Înainte de Opera verifică vizual profilul dedicat Cutiuța Magică și expeditorul `cutiutamagicaofficial@gmail.com`. O sesiune AVYRON sau o identitate ambiguă oprește rularea.
5. După ultima confirmare, trimite un mesaj o singură dată. Confirmă în Sent destinatarul, subiectul și identificatorul mesajului. La rezultat incert, verifică înainte de orice reîncercare.
6. Salvează dovada minimă în platformă și schimbă sursa în `contacted`. Răspunsul furnizorului poate ridica starea la `verified` numai după verificarea documentelor; nu stoca secrete ori conversații brute în AVYRON.

Opera/Gmail este o rută de execuție supravegheată, nu sistemul de evidență. Platforma internă rămâne registrul pentru surse, ciorne, aprobări, stare și dovadă. Transportul server-side poate fi adăugat ulterior numai cu identitate verificată, secrete Cloudflare și același contract de aprobare/idempotency.
