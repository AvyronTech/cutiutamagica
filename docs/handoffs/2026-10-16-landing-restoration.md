# Landing page Cutiuța Magică — 16 octombrie 2026

## Scop și rezultat

- Hero nou, cu titlu care numește produsul, descriere mai clară și metadate SEO revizuite.
- Firul auriu pornește din colțul stânga sus al primului card și ajunge în colțul dreapta jos al ultimului. Progresul urmează derularea și funcționează și pe mobil; pentru mișcare redusă, firul rămâne complet vizibil.
- Hero, primul carusel și secțiunile ulterioare primesc scenele ilustrate existente. Scenele sunt încărcate progresiv, iar ultima imagine gata rămâne vizibilă în timpul tranziției.
- „Magia care urmează” are carduri și cadru mai compacte, cu text lizibil peste scena atelierului.

## Fișiere și date

- `src/routes/index.tsx`: copy, SEO, marcajul scenei hero și imaginea de rezervă a primului carusel.
- `src/components/site/LandingBackdrop.tsx`: asocierea scenelor și încărcarea imaginilor.
- `src/components/site/HeroWorld.tsx`, `src/components/site/HeroFeatures.tsx`: progresul și traseul firului.
- `src/components/site/UpcomingCollection.tsx`, `src/styles.css`: imagine de rezervă, proporții, contrast și poziționare responsive.
- Nu există migrații D1 ori configurări externe noi. Baza D1 locală a fost migrată și seed-uită numai pentru previzualizare.

## Verificare

- Verificare vizuală în browserul local la 1280 px și 1440 px desktop, respectiv 390 × 844 px mobil; capturile au fost inspectate în sesiunea de lucru. Au fost verificate hero, firul, colecțiile, „Magia care urmează” și absența derulării orizontale. Nu au fost salvate fișiere de captură în repository.
- `/cont`, `/produse` și `/comanda` au fost deschise pe mobil. `/admin` redirecționează către autentificare; dashboardul autentificat necesită accesul unui administrator.
- `npm run typecheck`, `npm test` (247 teste), `npm run lint`, `npm run build`, `npm run cf:types:check`, `npm run cf:deploy:dry` și `git diff --check`: trecute.
- Buildul raportează avertismente preexistente pentru `node:crypto` în browser și mărimea unor pachete.

## Limită de previzualizare și lansare

- Catalogul D1 local conține doar produse marcate „în curând”, așa că unele carusele locale nu pot reproduce exact conținutul catalogului public. Imaginile scenelor de pe domeniul public au fost verificate separat ca disponibile.
- Versiunea publică încă afișează pagina veche. Nu s-au făcut push, PR, merge ori deploy; acestea necesită cerere explicită în conversație, conform `AGENTS.md`.
