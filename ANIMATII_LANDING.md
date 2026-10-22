# Apariții, lumină și interacțiuni pe landing

Implementare locală, 23 septembrie 2026. Fără publicare.

## Conținut și apariții

Cele trei texte cerute sunt prezentate în carduri distincte: „Mecanism clasic”, „Fiecare model, o poveste” și „Cadou gata de dăruit”. Textul este păstrat, cu rândurile indicate. Pe desktop cardurile intră succesiv, cu 140 ms între ele; în fiecare card eticheta, titlul și explicația apar într-o succesiune scurtă. Pe mobil fiecare card pornește când intră în ecran. Primul conduce la „Despre cutiuță”, celelalte la colecție.

Titlurile colecțiilor și zonele de produse apar la intrarea în ecran. Conținutul deja vizibil, inclusiv la revenirea la o poziție anterioară de scroll, rămâne disponibil imediat. În lipsa JavaScript și pentru mișcare redusă, textele și legăturile rămân vizibile.

Titlul hero-ului are o reflexie aurie lentă, fără dublarea textului pentru cititoarele de ecran. Sunt cel mult două treceri; efectul se suspendă în afara hero-ului și când pagina este ascunsă. Nu există flashuri sau sclipiri rapide.

## Fundal continuu

Decorul comun acoperă acum întregul landing: bibliotecă → emoție → cutiuțe dedicate → cer discret pentru „Magia care urmează” → atelier spre întrebări, retur și contact. Imaginile existente sunt reutilizate, iar scena viitoare folosește un gradient și puncte de lumină CSS.

Poziția secțiunilor controlează amestecul dintre două decoruri adiacente. Următoarele imagini sunt pregătite în apropierea secțiunilor; dacă un fișier nu este încă disponibil, rămâne vizibil decorul încărcat. Nu se blochează și nu se interceptează scrollul. Cu mișcare redusă sau economisirea datelor sunt păstrate decorurile statice ale secțiunilor.

## Hover și apăsare

- Povești/hero: lumină aurie și un cerc fin la apăsare.
- Emoții: nuanță caldă, ușor roz și o undă rotunjită mai lentă.
- Dedicate: reflexie verde discretă și un contur organic.
- În curând: violet pal și o formă de constelație.
- Întrebări/retur/contact: tonuri de alamă și un răspuns reținut.

Reflexia cardului urmărește cursorul numai cu mouse și dispozitiv compatibil cu hover. Apăsarea butoanelor are o compresie mică și o undă decorativă scurtă; nu întârzie navigarea sau adăugarea în coș. Gesturile cu deplasare mai mare de 8 px nu generează unda, pentru a separa swipe-ul de tap. Activarea din tastatură folosește centrul controlului. Butoanele dezactivate și cardurile inactive ale caruselului sunt ignorate. Nu sunt introduse sunete, vibrații sau înlocuirea cursorului.

Actualizările cursorului și scrollului sunt grupate prin requestAnimationFrame, fără buclă permanentă pentru aceste efecte. Cel mult patru efecte de apăsare pot exista simultan. Efectele sunt curățate la schimbarea paginii, iar mișcarea redusă elimină animațiile decorative.

## Verificare

117 teste în 18 fișiere. Testele noi acoperă amestecul decorurilor, revenirea la secțiuni precedente, saltul la o poziție avansată, imaginile indisponibile și diferențierea tap/swipe/tastatură.

Inspecția vizuală desktop/mobil și măsurarea performanței reale rămân neefectuate: instrumentul de browser este blocat de verificarea indisponibilă a politicii administratorului. Valorile de timp și amplitudine de mai sus sunt limite configurate în cod, nu rezultate măsurate în browser.

Verificări finale reușite: TypeScript, lint, 117 teste în 18 fișiere, compilarea aplicației și simularea de publicare. Nu s-a făcut deploy și nu au fost necesare migrări noi ale bazei de date.
