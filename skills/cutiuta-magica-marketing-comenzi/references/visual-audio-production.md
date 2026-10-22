# Producție vizuală și audio cu produsul protejat

## Contractul sursei

Pornește numai dintr-un asset aprobat și păstrează `asset_id`, checksumul, dimensiunile, profilul de culoare, drepturile și produsul asociat. Alege cea mai mare fotografie originală disponibilă; nu mări artificial o imagine slabă doar pentru a raporta o rezoluție mai mare.

Produsul este zonă imuabilă. Capacul, desenul, gravura, textul, mecanismul, cilindrul, manivela, șuruburile, culorile, raportul dintre piese și dimensiunile vizuale trebuie să provină din fotografia reală. Dacă nu poți separa produsul curat, folosește fotografia originală sau un crop aprobat; nu apela la inpainting peste produs.

## Fluxul pentru imagini AI

1. Selectează fotografia-sursă și creează o mască verificată manual a produsului.
2. Generează ori editează numai fundalul, fără produs în promptul de generare.
3. Compune determinist decupajul original peste fundal. Umbra de contact poate fi creată separat, fără a acoperi ori remodela produsul.
4. Aplică ajustări globale discrete de expunere și culoare; nu folosi retuș generativ în interiorul măștii produsului.
5. Adaugă copy-ul și elementele grafice în afara produsului și a zonelor ocupate de interfața platformei.
6. Salvează sursa, masca, fundalul, compoziția, parametrii și comparația QA ca o singură revizie.

Respinge rezultatul dacă produsul pare levitant, are umbre incompatibile, reflexii imposibile, perspectivă greșită, margini halo, elemente duplicate sau detalii diferite față de sursă. Nu simula un client real, o recenzie, un ambalaj ori un context de utilizare care nu poate fi susținut. O mână sau o persoană generată poate apărea numai ca decor editorial evident, fără a fi prezentată drept cumpărător real și fără să ascundă produsul.

## Calitatea exporturilor

- Feed/carousel Instagram: master `1080×1350`, sRGB, aceeași geometrie și același profil de culoare pe toate cadrele.
- Story/Reel/TikTok: master curat `1080×1920`, 9:16, fără watermark; verifică safe zones în previzualizarea contului real.
- Facebook feed: pornește din masterul de cea mai bună calitate și exportă separat dacă decuparea diferă; nu descărca și reîncarca versiunea comprimată de altă platformă.
- Păstrează textul vectorial până la export, contrastul verificat și o singură compresie finală. Pentru imagini folosește JPEG de calitate înaltă sau PNG/WebP când transparența/grafica o cere; pentru video folosește H.264, frame rate constant și audio AAC.
- Creează text alternativ factual. Nu introduce în alt text afirmații comerciale absente din catalog.

## Reel și video nativ

Construiește povestea din 4–8 cadre reale: produs complet, detaliu, manivelă/mecanism, scară, atmosferă și CTA. Arată produsul în primele 1–3 secunde. Poți folosi pan, crop, zoom discret, parallax al fundalului, tranziții și subtitrări; nu anima manivela, mecanismul ori capacul dacă mișcarea nu provine dintr-o filmare reală.

Păstrează un master fără text și fără sunet de platformă, apoi creează variante native. TikTok primește montaj direct, text scurt și sunet comercial disponibil. Reels poate primi ritm mai cinematic, copertă separată și subtitrări. Nu transporta watermarkul, stickerul sau captionul unei platforme în alta.

## Muzică și sunet

Pentru fiecare produs creează un `audio brief`: tema/melodia confirmată în catalog, starea emoțională, tempo, momentul hookului, durata, platforma, țara și tipul contului.

Ordinea de căutare este:

1. piesa exactă, numai dacă apare în biblioteca comercială disponibilă contului pentru plasamentul respectiv;
2. o versiune ori piesă tematică apropiată, autorizată comercial;
3. Meta Sound Collection, TikTok Commercial Music Library sau altă bibliotecă verificată a platformei;
4. audio original asupra căruia brandul are drepturi: sunetul mecanismului, ambience, voice-over sau o compoziție proprie/licențiată;
5. publicare fără muzică, dacă nicio opțiune nu este clar autorizată.

Nu extrage audio dintr-o postare, nu folosi biblioteca personală pentru conținut de brand și nu încorpora o piesă protejată în fișier ca soluție de rezervă. Audio se coace în master numai dacă licența permite explicit utilizarea comercială și multi-platformă; altfel se adaugă nativ pe fiecare platformă.

## QA și aprobare

Pachetul de review include: sursa, compoziția, overlay-ul măștii, comparație la 100%, preview cu interfața plasamentului, asset final, alt text, music brief, sursa/licența audio și lista elementelor native. Blochează aprobarea dacă nu poți dovedi că produsul a rămas identic sau că audio este autorizat.
