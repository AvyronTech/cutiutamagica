# Texte pentru validare înainte de publicare

Aceste propuneri nu schimbă paginile juridice publice și nu reprezintă certificarea conformității. Cerința auditului solicită validarea responsabilului pentru afirmațiile juridice. Nu au fost inventate adrese, date ale firmei sau termene de retenție ale furnizorilor.

## Confidențialitate — autentificare și sesiuni

Textul actual menționează numai Google și o sesiune de până la șapte zile. Codul `createReviewerSession` din `src/server/review-accounts.ts` folosește o zi, respectiv 30 de zile când este aleasă păstrarea conectării. Există și conectare cu cod pe e-mail/parolă proprie și fluxuri pentru furnizorii externi configurați.

Propunere pentru paragraful corespunzător, de validat:

> Contul opțional poate folosi codul trimis pe e-mail, parola proprie sau metodele de conectare afișate și active în magazin. Păstrăm numele afișat, datele de contact și identificatorii necesari contului. Parola proprie este verificată printr-un hash; nu primim parola contului de la furnizorul extern. Sesiunea folosește un cookie securizat cu durată de până la o zi sau până la 30 de zile dacă alegi „Păstrează-mă conectat”.

## Confidențialitate — analiză opțională și retragere

Implementarea nouă folosește același cont și endpoint Metricool, cu pixelul verificat în `be.js`, fără încărcarea scriptului extern care prelua URL-ul complet și referrerul complet. URL-ul trimis este limitat la origin și pathname, referrerul la origin; contul, autentificarea și checkoutul sunt excluse din Metricool. Stagingul local nu contactează Metricool. Analiza internă din browser este și ea condiționată de categoria „Experiență și analiză”. Evidențele comerciale și metricile operaționale server sunt distincte.

Propunere pentru paragrafele de analiză, de validat:

> Analiza opțională din browser și Metricool pornesc numai după acceptarea categoriei „Experiență și analiză”. Alegerea poate fi modificată din „Setări cookie-uri”, în subsol. Retragerea oprește trimiterile ulterioare și elimină identificatorii locali de analiză ai magazinului; nu elimină retroactiv datele deja transmise. Datele comerciale necesare gestionării comenzilor și jurnalele tehnice de securitate sunt gestionate separat.

Înainte de release, responsabilul trebuie să confirme descrierea furnizorului, temeiurile și retenția efectivă din conturile furnizorilor; acestea nu pot fi stabilite din codul clientului. Niciun identificator de analytics nou nu a fost inventat.

## Contact și termeni

Datele publice existente sunt contact@cutiutamagica.eu, comenzi@cutiutamagica.eu și +40 734 605 742, consecvente în footer și datele structurate. Identitatea juridică este citită din datele existente ale proiectului. Adresa sediului, retrasă public la cererea administratorului, nu este republicată și nu este înlocuită cu o adresă fictivă. Responsabilul validează separat forma de comunicare a adresei comerciale pentru documentele relevante.

Termenii, returul și confidențialitatea existente rămân accesibile; nu sunt rescrise automat. Checkoutul cere acord explicit și nu preselectează marketingul. Nu s-a plasat nicio comandă și nu s-a efectuat nicio plată în audit.

Surse de verificare: [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj), [orientări EDPB privind consimțământul](https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_en). Acestea nu confirmă configurația sau contractele furnizorilor magazinului.
