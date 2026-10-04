# Texte, tipografie și chat — 23 septembrie 2026

Schimbări locale, fără push, deploy sau actualizări în baza de producție.

## Corecții

- Chatul pornește implicit în stânga, la mijlocul înălțimii stabile a ecranului. Migrația `0027_chat_left_center.sql` schimbă latura inițială din configurație. O cheie nouă pentru preferința de poziționare evită restaurarea vechiului colț din dreapta. Vizitatorul poate muta în continuare chatul, iar administratorul îi poate configura latura.
- Fereastra conversației este poziționată separat de buton. Înălțimea și poziția urmăresc spațiul vizibil când apare tastatura; fereastra are derulare, închidere cu Escape și revenire la buton. Antetul cu închiderea rămâne accesibil în timpul derulării.
- Cele trei contacte rapide rămân în dreapta-jos, cu margini pentru zonele sigure ale ecranului; pe ecrane joase sunt dispuse orizontal. Latura dreaptă a chatului, dacă este aleasă explicit ulterior, păstrează spațiu pentru navigarea între secțiuni.
- Butoanele auxiliare se ascund cât timp este deschis un dialog modal. Coșul continuă să stea pe partea opusă chatului și nu apare pe landing.
- Cormorant Garamond rămâne fontul titlurilor; Inter este folosit pentru conținut și formulare. Titlurile cardurilor și descrierile au fost mărite, iar notele din subsol au primit dimensiune și contrast mai bune. Nu au fost adăugate fonturi externe.
- Câmpurile de formular au minimum 16 px pe mobil, zoomul prin gesturi rămâne permis, iar preferința pentru mișcare redusă este respectată. Textele lungi și fereastra chatului au reguli pentru ecrane înguste.
- Etichetele comune pentru închidere, carusel, paginare, traseul de navigare și meniul lateral sunt acum în română, inclusiv pentru cititoarele de ecran.
- Corectate „Fără produse” și denumirile cu diacritice pentru salvarea aplicației pe telefon. Titlul public de pe iOS este „Cutiuța Magică”.

## Catalog și diacritice

Scanarea statică a parcurs 252 de fișiere de implementare TypeScript/TSX. Au fost inspectate textele JSX și șirurile cu termeni românești frecvenți, caractere de înlocuire și variantele vechi cu sedilă. Nu au rămas caractere de înlocuire sau litere ș/ț cu sedilă în sursele scanate. Aceasta este o verificare tehnică și editorială direcționată, nu o certificare lingvistică exhaustivă a conținutului introdus ulterior de utilizatori.

Baza locală încă avea 30 de descrieri scurte și câmpuri SEO fără diacritice, în cele 10 produse. Migrația `0028_romanian_catalog_copy.sql` corectează aceste valori și denumirea brandului/canalului. Fiecare schimbare de descriere sau SEO verifică valoarea veche exactă, pentru a păstra textele personalizate de administratori. Aliasurile de căutare, URL-urile, mărcile filmelor și denumirile originale ale melodiilor nu au fost transliterate.

Migrațiile 0027 și 0028 au fost aplicate numai local. Citirea ulterioară confirmă poziția `left`, schema 28 și absența vechilor formulări fără diacritice din cele 40 de câmpuri publice verificate (descriere scurtă, titlu SEO, descriere SEO și brand).

## Verificări

- TypeScript, lint, build și 126 de teste în 19 fișiere: trecute.
- Testele includ noua poziție implicită și păstrarea editărilor administratorilor la reluarea corecțiilor SEO.
- Toate cele șase declarații de font importate au fișierele locale prezente, `font-display: swap` și intervale Unicode pentru `ăâîșțĂÂÎȘȚ`. Nu s-a efectuat o comparație vizuală a glifelor între dispozitive.
- `git diff --check`: trecut.
- Simularea finală a pachetului de producție: trecută, inclusiv verificarea configurației de producție și `wrangler deploy --dry-run`, exit 0. Jurnale: `/tmp/cutiuta-readability-{types,lint,tests,build,dry}.log`.
- Sintaxa aplicării locale a migrațiilor a fost verificată în [documentația oficială D1](https://developers.cloudflare.com/d1/wrangler-commands/).

## Ce nu este confirmat

Browserul integrat a refuzat accesul la previzualizarea locală deoarece verificarea politicii de securitate administrate nu era disponibilă. Restricția nu a fost ocolită. Nu declar teste vizuale efectuate pe Safari/iOS, Chrome/Android sau desktop și nici valori Core Web Vitals măsurate.

Înainte de publicare rămâne verificarea vizuală pe telefon și desktop: landing, catalog, produs/galerie, coș/checkout, retur, pagini informative și administrare; orientare portret/peisaj, zoom 200%, tastatură deschisă, meniuri și dialoguri. Configurația live și textele personalizate din baza de producție nu au fost modificate sau verificate în această etapă.
