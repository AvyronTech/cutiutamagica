# Catalog și acces rapid la coș — 23 septembrie 2026

Implementare locală în `/produse`. Nu s-au făcut push, merge, deploy, migrații remote sau activări de servicii.

## Experiența cumpărătorului

- Catalogul pornește cu toate modelele din catalogul central. Am eliminat cele trei liste hardcodate suprapuse: fiecare produs folosește acum colecția din dashboard, cu aceeași clasificare implicită ca landingul.
- „Descoperă povestea”, „Trăiește emoția” și „Cutiuțe dedicate” au accente aurii, roz și verzi, simboluri și compoziții distincte. Pe mobil, selecția este compactă.
- Căutarea acceptă diacritice sau text fără diacritice și combină termenii cu colecția și „Disponibile acum”. Filtrele sunt în URL; „Toate cutiuțele” le elimină pe toate. Nu sunt necesare sortare complicată ori paginare pentru 10–20 de modele.
- Modelele comandabile și „Magia care urmează” sunt separate folosind disponibilitatea reală. Prețurile și operațiile de coș folosesc mecanismul existent al magazinului.
- Butonul flotant apare când coșul conține produse, pe partea opusă chatului, inclusiv după mutarea chatului. Nu apare pe landing sau în checkout; se ascunde cât timp chatul ori coșul este deschis.
- Antetul și butonul flotant deschid un singur mini-coș: cantități, eliminare, reducere dacă există, total produse și „Finalizează comanda”. Livrarea este indicată explicit ca fiind calculată în checkout.
- Mini-coșul folosește dialogul accesibil existent în dependențe: focus în panou, Escape, blocarea fundalului, revenire la declanșator. Butoane de minimum 44 px, panou jos pe mobil și animații oprite pentru preferința de mișcare redusă.
- Niciun text despre dashboard, API sau integrarea plăților nu a fost adăugat în paginile publice.

## Decor și încărcare

Scenă nouă cu trei cutiuțe mecanice: lectură, cadou și colecție, cu spațiu întunecat central pentru text. Fotografiile reale ale produselor rămân în carduri. Fundalul decorativ este limitat la introducere și continuat prin culori discrete, fără animație WebGL suplimentară sau ascultători de scroll.

- Original păstrat: `design/catalog-atelier-source.png`, **1672 × 941**, nu 4K nativ. Instrumentul integrat nu a livrat rezoluția 3840 × 2160 solicitată; cerința de 4K nativ rămâne deschisă.
- Desktop: `public/scenes/catalog-atelier.webp`, aproximativ 204 KiB.
- Mobil: `public/scenes/catalog-atelier-mobile.webp`, aproximativ 75 KiB, 960 × 540.
- Se livrează o singură variantă prin `picture`, cu dimensiuni rezervate. Nu există dependențe noi.
- Promptul exact și modul de generare sunt în `design/catalog-atelier-prompt.md`.
- Metadatele catalogului, canonicalul și lista structurată sunt păstrate; imaginea de distribuire este actualizată, iar JSON-LD este protejat împotriva închiderii premature a tagului script.

## Verificare și limita pregătirii pentru publicare

Au trecut verificarea TypeScript, lint, build și 123 de teste în 19 fișiere. Cele șase teste noi acoperă clasificarea fără dubluri, căutarea fără diacritice, combinarea filtrelor cu disponibilitatea, validarea URL-ului și regulile butonului flotant.

Simularea pachetului de producție a trecut: build de producție, verificarea legăturilor de mediu și `wrangler deploy --dry-run`, exit 0. Această comandă nu a publicat magazinul. `git diff --check` a trecut. Jurnalele verificărilor sunt în `/tmp/cutiuta-catalog-{types,lint,tests,build,dry}.log`.

Nu declar validare vizuală sau Core Web Vitals măsurate: browserul sesiunii rămâne blocat de verificarea politicii de securitate. Înainte de publicarea finală trebuie verificat în browser desktop/mobil: încărcarea decorului, filtrarea și navigarea înapoi, adăugarea primului produs, mutarea chatului, focusul și derularea mini-coșului, eliminarea ultimului produs și trecerea către checkout. Nu se plasează o comandă reală pentru acest control.

Pregătirea catalogului nu activează procesatori de plată sau curierat; condițiile de lansare ale acestora rămân cele documentate în `CHECKOUT_LIVRARE.md`.
