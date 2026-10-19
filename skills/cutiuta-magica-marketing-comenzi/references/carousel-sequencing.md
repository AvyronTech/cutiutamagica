# Carusele și secvențe multi-imagine

## Când alegi un carusel

Folosește o singură postare multi-imagine când minimum trei imagini aprobate pot spune aceeași poveste, pot demonstra produsul sau pot răspunde unei întrebări reale de cumpărare. Nu forța caruselul când imaginile repetă același unghi și nu fragmenta aceeași poveste în postări separate doar pentru volum.

Înainte de producție verifică `capability_snapshot` pentru platformă, cont și ruta de publicare: numărul de imagini acceptat, păstrarea ordinii, alegerea copertei, textul alternativ, eticheta de produs și comportamentul linkului. Limita tehnică a platformei nu este ținta editorială.

## Ordinea narativă

Construiește secvența în 3–7 cadre puternice, adaptate materialului real:

1. **Copertă și hook:** produsul este clar, iar promisiunea poate fi înțeleasă fără restul caruselului.
2. **Context:** persoana, ocazia sau întrebarea de cumpărare.
3. **Detaliu:** capac, ilustrație, material ori finisaj confirmat.
4. **Dovadă:** manivelă, mecanism sau alt element funcțional vizibil în media originală.
5. **Scară ori răspuns:** dimensiune în context sau o informație frecvent solicitată.
6. **Semnificație:** motivul pentru care produsul devine un cadou potrivit.
7. **Închidere:** CTA-ul unic și destinația reală.

Nu inventa cadre lipsă și nu păstra toate rolurile doar pentru a ajunge la șapte. Pentru fiecare slide salvează `slideRole`, `assetId`, `sourceCrop`, `altText` și `position`. Orice schimbare de ordine, copertă, asset sau CTA produce o revizie nouă și cere reaprobarea exactă.

## Calitate și coerență vizuală

- pornește de la sursa aprobată cu cea mai mare rezoluție și evită upscalingul agresiv;
- păstrează același raport, canvas, profil de culoare, temperatură și nivel de contrast;
- produsul rămâne dominant, iar fundalurile formează aceeași lume vizuală;
- respinge perspectivele, umbrele sau reflexiile imposibile;
- folosește text minim și lizibil, fără să acoperi produsul;
- verifică separat coperta și ultimul cadru în previzualizarea nativă;
- compară fiecare cadru cu fotografia-sursă pentru capac, gravură, mecanism, manivelă, șuruburi, text, culoare și proporții.

În mod implicit, un carusel are un singur produs erou. Include produse multiple numai într-o comparație intenționată, factuală și aprobată, când toate sunt cumpărabile.

## Link și CTA

Nu desena butoane sau linkuri aparent clicabile în imagine.

- Facebook: pune URL-ul canonic al produsului în descriere și verifică previzualizarea linkului.
- Instagram: pune URL-ul canonic lizibil în descriere; scrie „link în bio” numai dacă linkul corect este prezent și verificat în profil în aceeași rulare.
- Etichetă de produs: folosește-o numai când catalogul și funcția nativă sunt conectate și verificate.
- TikTok Photo Mode: folosește-l numai dacă este vizibil pe cont și păstrează ordinea, calitatea și CTA-ul aprobate. „Link în bio” este permis numai când profilul are un link funcțional verificat; altfel afișează domeniul fără a pretinde că este clicabil.
- Story: linkul se adaugă prin sticker nativ, separat de asset.

Întregul carusel are un singur CTA, exprimat consecvent în ultimul cadru și în descriere.

## Originalitate în același lot

Salvează pentru fiecare piesă un `creativeFingerprint` format din produs, audiență, ocazie, unghi editorial, hook, setul și ordinea asset-urilor, copertă, CTA, layout și brief audio.

Două piese din același lot trebuie să aibă roluri material diferite, nu doar alt text sau alt fundal:

- caruselul Instagram explică prin detalii și progresie;
- postarea Facebook spune povestea, invită la conversație și oferă linkul direct;
- Story-ul stârnește interes, poate cere o preferință și conduce prin stickerul real;
- Reel-ul pune accent pe mișcare, sunet și atmosferă;
- TikTok folosește hook direct și Photo Mode ori video numai după verificarea capabilității.

Compară `creativeFingerprint` cu restul lotului și cu ultimele 30 de materiale. Blochează revizia dacă repetă simultan coperta, ordinea, hook-ul și CTA-ul unei piese recente.

## QA și măsurare

Înainte de aprobare verifică:

- nu lipsesc imagini, nu există duplicate și nici cadre inversate;
- orientarea și decuparea sunt coerente;
- interfața platformei nu acoperă produsul sau textul;
- coperta funcționează și singură;
- ultimul cadru și descrierea au același CTA;
- linkul, bio-ul sau eticheta de produs există în realitate;
- fiecare imagine are text alternativ individual când platforma îl suportă;
- ordinea încărcată este identică cu ordinea aprobată.

Când platforma oferă date, măsoară progresia între cadre, salvările, distribuirile, vizitele produsului, conversațiile și comenzile. Schimbă o singură variabilă majoră per test.
