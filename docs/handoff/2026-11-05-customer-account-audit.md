# Audit cont client — 5 noiembrie 2026

## Scop și stare

Audit al experienței clientului obișnuit, fără privilegii administrative. Contul reutilizabil din producție încă așteaptă adresa exactă de e-mail aleasă de utilizator și verificarea codului primit acolo. Nu a fost înlocuit cu un cont fabricat în D1 și nu s-au ocolit verificările de înregistrare. Parolele și codurile nu se includ în repository sau în această fișă.

## Corecții

- Interogările private sunt separate pe cont. Deconectarea din Cont sau din formularul recenziei anulează cererile în curs și elimină cache-ul privat, păstrând sincronizat meniul contului.
- Profilul de cadouri reîncarcă destinatarii, ocaziile și temele existente; salvarea nu mai pierde câmpurile omise din formularul anterior. Butoanele de salvare și acțiunile calendarului au stare de lucru pentru a limita trimiterile repetate.
- Profil și acces se deschide la cerere; linkurile directe către profil îl deschid automat. Navigare către beneficii, calendar, comenzi și portofel, câmpuri cu nume accesibile și controale mobile mai ușor de apăsat.
- Erorile de încărcare au o acțiune de reîncercare. Un eșec al citirii contului nu mai este prezentat ca deconectare.
- Checkoutul recunoaște utilizatorul conectat în mesajele afișate și nu îi mai cere să creeze un cont nou. Datele comenzii, plățile și calculul totalurilor nu sunt modificate.

## Probe funcționale locale

Bază D1 izolată, date DEMO, fără e-mailuri, publicări, comenzi sau plăți reale.

| Flux | Rezultat |
| --- | --- |
| Login cu e-mail/parolă și reconectare | Reușit prin formularul clientului |
| Profil de cadouri: salvare, redeschidere, persistare | Toate cele trei câmpuri păstrate; stelele actualizate |
| Calendar: adăugare și mementouri pornit/oprit | Moment și preferință actualizate; notificările DEMO rămân oprite |
| Ziua aniversară | 31 decembrie păstrat după deconectare/reconectare |
| Magic Stars și beneficiu | Sold actualizat și cod disponibil; exclusiv local |
| Recenzie autentificată | Identitate corectă în formular; fără recenzie publicată |
| Logout din formularul recenziei | Identitatea dispare și meniul revine la client neautentificat |
| Comenzi / portofel fără istoric | Stări explicite; lipsa salvării cardurilor este explicată |
| Checkout autentificat | Nume și e-mail completate, mesaj corect, fără invitație duplicată; fără trimitere comandă |
| Acces admin cu cont client | Redirecționare către autentificare administrativă |
| UI desktop / mobil | 1440 px, 390 px, 320 px; fără overflow orizontal |

Capturi: `/Users/niss/.codex/visualizations/2026/11/05/cutiuta-customer-audit/`. Testele automate de sesiune acoperă golirea datelor private, meniul deja montat și răspunsurile sosite după deconectare. Verificările complete și releaseul se confirmă separat din CI/Cloudflare; autentificarea DEMO locală nu dovedește un cont de producție.

## Rămase pentru contul reutilizabil

Adresa exactă de e-mail și codul de verificare. Ulterior: creare prin fluxul normal, parolă dedicată, reconectare în producție și predarea credențialelor direct utilizatorului. Validarea livrării e-mailurilor, a plăților sau a unei comenzi reale nu este dedusă din testele locale.
