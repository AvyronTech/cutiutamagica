# Recenzii și comentarii — implementare locală

## Experiența publică

Caruselul este ultima secțiune a landing page-ului înainte de subsol. Are carduri compacte cu nume, stele, cutiuță, text și sursă. Rulează continuu spre stânga, fără butoane de pauză, săgeți sau tragere. Animația se suspendă în afara ecranului; preferința de reducere a mișcării afișează cardurile static. Dublura vizuală nu este citită de cititoarele de ecran.

Fiecare produs are o secțiune de recenzii în partea de jos și un formular restrâns, deschis prin „Scrie o recenzie”. Sunt acceptate 1–5 stele, română sau engleză și texte de 10–1200 de caractere. Recenziile lungi sunt scurtate vizual în carusel și se citesc integral în pagina cutiuței.

Vizitatorii completează nume afișat și e-mail. Contul opțional pentru recenzii permite înregistrare, autentificare și deconectare; numele și e-mailul sunt apoi preluate din sesiunea serverului. Contul este separat de dashboard și nu oferă acces la istoricul comenzilor. Nu etichetăm conturile drept cumpărători verificați. Verificarea adresei prin e-mail și recuperarea parolei nu sunt incluse în această etapă; formularul fără cont rămâne disponibil.

Toate trimiterile, inclusiv cele din cont, intră în așteptare. Sunt acceptate și evaluările critice. E-mailul, identitatea internă a contului și notele de moderare nu apar în lista publică.

## Conținutul public

Exemplele fictive și toate etichetele aferente au fost eliminate din codul aplicației. Caruselul afișează numai recenzii aprobate din baza de date. Până la introducerea lor, caruselul este ascuns, iar produsele invită la prima recenzie.

## Administrare

Secțiunea nouă este `/admin/reviews` — „Recenzii” în meniul intern. Există și legătură directă din studioul fiecărui produs.

- Filtre după stare și cutiuță, paginare și reîmprospătare periodică.
- Aprobare, respingere și retragere în așteptare.
- Prioritate opțională în carusel și notă internă.
- Protecție la editări simultane și jurnal de moderare.
- Import manual al textului original cu numele public, produsul, nota, limba și linkul direct către sursă.

Surse acceptate: Cutiuța Store, Facebook, TikTok, eMAG, Trendyol, Vinted, OLX și Okazii. Linkurile importate trebuie să aparțină platformei selectate; sursele repetate sunt respinse. Importul intră întâi în verificare. Nu au fost conectate conturi externe, nu au fost extrase recenzii și nu s-a făcut publicare pe aceste platforme.

„14+” a fost eliminat din denumirile produselor și titlurile/textul alternativ al imaginilor. Recomandările de vârstă din detalii rămân intacte.

## Date și verificări

Migrarea `0031_product_reviews.sql` a fost aplicată numai local. Introduce recenziile, conturile pentru recenzii, sesiunile și limitarea încercărilor. Parolele folosesc scrypt; sesiunile sunt stocate ca hash și folosesc cookie HttpOnly/SameSite, Secure pe HTTPS. Scrierile verifică originea, dimensiunea cererii și câmpurile acceptate. Moderarea cere permisiunile administrative existente.

Au trecut 155 de teste în 22 de fișiere, inclusiv fluxurile de cont, aprobare, retragere, confidențialitate, validare și izolarea exemplelor față de producție. TypeScript, lint, build și simularea de deploy în configurația de producție au trecut. Simularea s-a încheiat fără publicare.

Verificarea vizuală în browser și pe dispozitive reale rămâne neefectuată: accesul la previzualizarea locală este blocat de mediul de browser. Nu s-au făcut push, deploy sau modificări în producție.
