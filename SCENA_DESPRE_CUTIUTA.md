# Despre cutiuță — manivelă interactivă și melodie

Implementare locală, 23 septembrie 2026. Fără publicare sau încărcare de muzică în producție.

## Experiența vizitatorului

- La `/despre-cutiuta`, scrollul aduce succesiv lemnul, mecanismul, capacul și manivela. Firul luminos păstrează traseul existent prin scenă.
- După asamblare, un cerc discret urmărește poziția reală a mânerului. Apăsarea pornește/oprește rotirea și fragmentul selectat. Există și un buton fix, cu focus vizibil și acces din tastatură.
- Mesaj scurt: „Apasă manivela. Ascultă povestea.” Niciun detaliu despre administrare nu este trimis în configurația publică.
- Sunetul pornește exclusiv după apăsare, fără autoplay și fără descărcare audio anticipată. Oprire la finalul fragmentului, părăsirea scenei, ascunderea paginii, revenirea la asamblare sau schimbarea paginii. A doua apăsare oprește; o apăsare nouă reia fragmentul, iar după final îl redă de la început.
- Când nu este activat un fragment, manivela oferă o demonstrație silențioasă de opt secunde, fără promisiunea unui sunet inexistent.
- Randare la scroll/redimensionare și maximum 30 cadre randate pe secundă în timpul rotirii; limita este implementată, performanța nu este măsurată. Preferința pentru mișcare redusă și lipsa WebGL folosesc ilustrația statică și păstrează redarea audio prin buton.
- Finalul paginii descrie textura, capacul, mecanismul, gestul de utilizare și îngrijirea. Mesajele se adresează fanilor, colecționarilor și celor care aleg un cadou. Atelierul este o prezentare cinematică, fără afirmații neconfirmate despre fabricație proprie.

## Configurarea internă

În `/admin/settings`, secțiunea **Despre cutiuță · scena și melodia** (`#despre-cutiuta`):

1. Alege înregistrarea reală, decupează un fragment de 15–30 secunde și ascultă previzualizarea.
2. Salvează fragmentul privat. Editorul îl convertește în PCM WAV; serverul verifică durata din bytes, nu din metadatele trimise de client. Limită server: 3 MB.
3. Alege titlul public, confirmă drepturile de difuzare, bifează activarea și salvează configurarea.
4. Deschide scena din linkul intern și verifică redarea. Muzica este separată de înregistrările asociate produselor.

Încărcările și salvările sunt auditate. Editările concurente sunt respinse. Previzualizările audio sunt autentificate. Accesul public este limitat la fragmentul selectat, activat și confirmat; înlocuirea/dezactivarea blochează cererile noi către URL-ul anterior. Fișierele deja descărcate nu pot fi retrase din memoria vizitatorului.

Rutele audio acceptă GET/HEAD și cereri Range valide; cererile invalide primesc 416. Răspunsurile nu sunt cache-ate. Operațiile de scriere cer autentificare, permisiunea existentă `integrations.write` și aceeași origine. Lectura administrativă cere `integrations.read`.

Migrare nouă: `0025_about_scene_audio.sql`, cu active audio private și configurație separată, inițial dezactivată. Stocarea folosește legătura R2 existentă, conform [documentației oficiale R2](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).

## Verificare și limite

Nouă teste pentru configurație, validarea audio, acces privat, aceeași origine, limitarea dimensiunii, concurență, Range, dezactivare/înlocuire și erori de stocare. Testele folosesc schema SQLite reală și un substitut local pentru stocarea R2; autentificarea este simulată în aceste teste.

Nu a fost furnizată o înregistrare reală; activarea inițială rămâne oprită. Verificarea vizuală desktop/mobil și redarea într-un browser rămân de făcut: instrumentul de browser a refuzat accesul deoarece nu putea verifica politica impusă de administrator. Nu s-a folosit o cale alternativă pentru a ocoli restricția.

Verificări finale: 107 teste în 16 fișiere, TypeScript, lint, compilare, verificarea configurației de producție și simularea de publicare au trecut. Migrarea 0025 a fost aplicată exclusiv bazei locale. Nicio publicare efectivă.
