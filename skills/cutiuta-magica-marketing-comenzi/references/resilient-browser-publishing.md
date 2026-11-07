# Publicare nativă rezilientă prin Opera

## Separă conținutul pregătit de capacitatea de execuție

Înainte să generezi, să prelucrezi sau să încarci materiale pentru o rută nativă, verifică read-only:

1. profilul expus este Opera dedicat Cutiuța Magică, nu o sesiune AVYRON;
2. fila exactă răspunde la observație și poate fi controlată;
3. identitatea vizibilă corespunde destinației aprobabile;
4. editorul oferă funcțiile cerute pentru acel plasament;
5. nu există challenge, CAPTCHA, 2FA sau selector ambiguu.

Păstrează separat două stări:

- `content_ready`: catalogul, asset-urile, copy-ul și QA-ul sunt complete;
- `execution_ready`: ruta, fila, contul, funcțiile native și butonul final au fost verificate în sesiunea curentă.

Un login existent, o filă deschisă sau o ciornă încărcată nu implică `execution_ready`.

## Manifest recuperabil

Înainte de încărcarea în browser, salvează în platforma internă sau, dacă aceasta nu este disponibilă, într-un manifest local temporar:

- `campaign_id`, revizia și hashul pachetului;
- produsul și URL-ul canonic;
- ordinea asset-urilor, căile/ID-urile și hashurile lor;
- copy-ul exact pe destinație, textul alternativ și hashtagurile;
- brief-ul muzical, CTA-ul, stickerul sau butonul funcțional;
- contul, plasamentul, ora și cheia de deduplicare;
- starea `prepared`, `staged`, `publish_clicked`, `published_unverified` sau `verified`.

Manifestul este sursa de reluare după resetarea browserului. Nu reconstrui copy-ul din memorie și nu pierde ordinea caruselului.

## Muzică și drepturi

Separă melodia redată de produs de coloana sonoră a postării. Faptul că produsul interpretează o melodie nu acordă dreptul de a încărca acea înregistrare în social media.

- Folosește o piesă cunoscută numai dacă biblioteca nativă o afișează contului și o permite pentru conținutul comercial respectiv.
- Pentru TikTok business folosește Commercial Music Library; pentru Meta business folosește biblioteca permisă contului sau Meta Sound Collection.
- Nu descărca, copia, extrage ori atașa direct o piesă protejată din altă sursă.
- Dacă piesa exactă nu este eligibilă, selectează o alternativă licențiabilă cu aceeași stare editorială și notează schimbarea înainte de aprobarea finală.
- Dacă interfața web nu expune muzica, pregătește handoff-ul nativ sau cere aprobarea unei variante fără muzică; nu pretinde că piesa a fost adăugată.

## Linkuri și elemente funcționale

- În Story folosește link sticker real către pagina canonică a produsului și text scurt, dacă opțiunea este disponibilă.
- Nu desena butoane, stickere ori linkuri false în imagine.
- În feed folosește URL-ul canonic în descriere când platforma îl face clicabil; altfel formulează corect `link în bio` și verifică destinația profilului.
- Nu activa abonamente sau funcții plătite pentru a depăși o limită Free fără aprobare distinctă.

## Confirmarea trebuie cerută la ultimul pas real

Nu cere confirmarea de publicare cât timp mai lipsesc căutarea muzicii, încărcarea, ordonarea caruselului, alt textul, stickerul, previzualizarea ori alegerea contului.

Pachetul de aprobare trebuie să arate exact:

- revizia și hashul;
- asset-urile și ordinea;
- captionul final, CTA-ul, linkul și hashtagurile;
- muzica selectată sau absența ei;
- destinația, identitatea, plasamentul și ora;
- o captură a ecranului final de previzualizare.

O aprobare de feed nu acoperă automat Story, Reel, TikTok, Facebook Page sau profilul Facebook personal. Un lot este valabil numai dacă toate destinațiile și asset-urile sunt enumerate în pachet.

## Recuperarea unei sesiuni Opera

La primul timeout ori la o filă devenită stale:

1. nu apăsa publicarea și nu comuta la Chrome sau la sesiuni AVYRON;
2. păstrează manifestul și starea ciornei;
3. citește ghidul de troubleshooting al controlului browserului;
4. reatașează același profil Opera și încearcă o singură observație read-only a filei exacte;
5. dacă fila nu este recuperabilă, deschide o filă nouă în același profil și reconstruiește din manifest numai după ce identitatea este verificată.

După două eșecuri consecutive ale controlului, oprește încercările, marchează `browser_unavailable`, păstrează ciorna și cere o singură intervenție precisă. Instrucțiunea pentru administrator trebuie să includă fila, extensia și semnalul verificabil de succes. Nu cere repetat `gata` fără să se fi schimbat starea observabilă.

## Publicare și dovadă

Publică o singură destinație odată:

1. verifică din nou contul și revizia;
2. execută clickul final aprobat;
3. caută semnalul autoritativ de succes;
4. deschide postarea/profilul și obține permalinkul ori dovada vizibilă cu identitatea contului;
5. salvează URL-ul, ora, asset hashul și captura în jurnalul de audit;
6. abia apoi continuă cu următoarea destinație.

Dacă rezultatul este incert, folosește cheia `campaign_id + platform + account_id + placement + revision`, verifică profilul/editorul și nu apăsa din nou. `publish_clicked` sau `published_unverified` nu înseamnă `verified`.

## Raportare fără ambiguitate

Folosește numai aceste formulări:

- `pregătit`: pachetul există în manifest;
- `încărcat/staged`: editorul conține pachetul, fără publicare;
- `publicare inițiată`: clickul a fost executat, rezultatul nu este încă dovedit;
- `publicat și verificat`: există permalink ori dovadă vizibilă pe contul corect;
- `blocat`: lipsește controlul, identitatea, capabilitatea sau aprobarea exactă.

Nu raporta `publicat` pe baza unei ciorne, a unui toast ambiguu sau a unei pagini care doar a acceptat încărcarea.
