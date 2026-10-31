# Hero și continuitatea primei colecții

Implementare locală, 23 septembrie 2026. Modificările sunt în copia de lucru, fără push sau publicare.

## Compoziție

- Mesaj principal: „O cutiuță mică. O lume care cântă.” Textul explică gestul: capac, manivelă, melodie. O singură acțiune dominantă, „Găsește cutiuța ta”, conduce spre prima colecție.
- Fotografia principală folosește prima imagine din galeria produsului disponibil și promovat, cu alternativa imaginii de catalog. Rama arcuită și cercurile fine sugerează mecanismul. Nu sunt adăugate produse inventate sau afirmații despre stoc.
- „Despre”, cu subtitlul „Dincolo de capac”, apare printr-o mișcare scurtă de profunzime din zona iluminată a decorului, atunci când intră în ecran, inclusiv pe mobil. Linkul conduce la scena interactivă existentă. Eticheta din navigarea principală este tot „Despre”.
- Un singur fundal continuu pentru hero, trecere și „Descoperă povestea”. Banda solidă și contururile de separare au fost înlocuite de un fir luminos și trei mesaje scurte. Scrollul completează firul pe circa 280 px; nu este interceptat și nu există opriri impuse.
- Loading-ul animat existent este păstrat.

## Performanță și accesibilitate

Este reutilizat decorul existent, cu varianta mobilă de aproximativ 38 KB și cea desktop de aproximativ 132 KB. Prima colecție nu mai solicită separat varianta desktop când hero-ul folosește imaginea mobilă. Fotografia produsului are prioritate de încărcare; decorul nu concurează explicit la aceeași prioritate. Nu s-au adăugat biblioteci, video, imagini mărite artificial sau o nouă scenă WebGL.

Mișcarea de profunzime are amplitudine de maximum 18 px, actualizări grupate la scroll și se oprește în afara decorului sau cu pagina ascunsă. Modul de economisire a datelor elimină aceste actualizări. Mișcarea redusă păstrează compoziția statică, cu toate legăturile accesibile. Fotografia are spațiu rezervat inclusiv înainte de disponibilitatea catalogului.

## Notificări

Sunt configurate trei mesaje pe landing, administrabile din secțiunea de notificări existentă:

1. „O lume mică, doar a ta.” — descoperirea colecției.
2. „Unele daruri se ascultă.” — mecanismul și scena „Despre”.
3. „Pentru cine păstrezi magia?” — alegerea unui cadou pentru fani sau colecționari.

Apar numai după încărcarea paginii și închiderea introducerii, unul câte unul, timp de 5 secunde. Pragurile sunt 8, 26 și 48 secunde de pagină vizibilă; pauza minimă de 18 secunde după dispariție poate amâna mesajele următoare. Fără interacțiuni sau alte întreruperi, apar aproximativ la 8, 31 și 54 secunde după pregătirea paginii.

Nu apar peste dialoguri, chat, câmpuri în curs de completare sau alte notificări. Așteaptă după apăsările utilizatorului. Închiderea manuală oprește restul sugestiilor pentru sesiune; schimbarea paginii retrage mesajul curent fără a dezactiva automat restul. Limita totală este trei mesaje pe sesiune, păstrată și după reîncărcare; pe alte pagini este cel mult unul la fiecare vizită, în limita totală. După epuizarea secvenței, verificarea periodică se oprește.

Migrarea `0026_hero_welcome_messages.sql` păstrează mesajele editate de administratori și adaugă textele inițiale numai dacă lipsesc.

## Validare

112 teste automate în 17 fișiere, inclusiv ordinea notificărilor, pragurile de timp și scroll, oprirea, persistența sesiunii, filtrarea după pagină și păstrarea editărilor administrative. Verificarea vizuală în browser și măsurarea Core Web Vitals nu au putut fi efectuate: instrumentul de browser a refuzat accesul local deoarece verificarea politicii administratorului era indisponibilă. Nu s-au folosit metode de ocolire.

Verificarea TypeScript, lint, compilarea și simularea finală de publicare au trecut. Migrarea 0026 a fost aplicată exclusiv bazei locale. Nu s-a făcut deploy.
