# Scene tematice pentru carduri și pagini de produs

## Scop

Cardul reutilizat în catalog, carusele și ghiduri de cadouri păstrează fotografia produsului dominantă, iar partea de jos primește un decor discret determinat de scena configurată a produsului. Pagina individuală continuă atmosfera produsului sub panoul principal, în zona de idei de cadou, recenzii și recomandări.

## Fișiere modificate

- `src/components/site/ProductCard.tsx` — un strat decorativ suplimentar în cardul comun.
- `src/routes/produs-cutiuta-muzicala-{$slug}.tsx` — scenă ambientală comună pentru subsecțiunile de după panoul principal, folosind fotografia deja asociată produsului.
- `src/styles.css` — motive discrete pentru cele nouă scene, tranziție cromatică spre fundalul inferior, suprafețe lizibile pentru subsecțiuni, corecție de contrast pentru descrierile din „Magia care urmează” și reglaje mobile/reduced motion.

Nu sunt migrații sau configurări externe noi. Identitatea vizuală se bazează pe `productScene` și pe media produselor existente.

## Verificări

- `npm run typecheck` — trecut.
- `npm test` — 251/251 teste trecute.
- `npm run lint` — trecut.
- `npm run build` — trecut.
- `npm run cf:types:check` — trecut.
- `npm run cf:deploy:dry` — trecut; nu a publicat nimic.
- `git diff --check` — trecut.
- Previzualizare locală pe desktop și la 390 × 844 px: catalog, carusel, carduri și pagina de produs. Fotografiile au fost confirmate în vizualizarea reală a caruselului, iar descrierile de pe cardurile crem au contrast îmbunătățit. Capturile desktop și mobile au fost inspectate în task.

## Predare

Modificările sunt locale pe `codex/landing-restoration`. Publicarea, pushul și pull requestul nu au fost efectuate, conform `AGENTS.md`. Datele catalogului din previzualizarea locală afișează toate modelele ca indisponibile; nu am modificat disponibilitatea sau prețurile.
