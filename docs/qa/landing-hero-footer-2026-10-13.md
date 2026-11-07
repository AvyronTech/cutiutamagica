# Handoff — hero, carusele și subsolul paginii principale

## Rezultat

- Caruselul din hero verifică disponibilitatea în componentă, în plus față de filtrarea paginii. Produsele care nu pot fi comandate nu intră în rotație.
- Eticheta „Limited Edition” și legenda produsului sunt unice în timpul tranziției dintre fotografii. Eticheta stă în colțul opus comenzilor caruselului; pe ecrane foarte înguste, punctele de progres se ascund și butonul de pauză rămâne accesibil.
- Subsolul are o invitație compactă, linkuri repartizate echilibrat pe categorii și păstrează bannerul Stripe. Pe mobil, coșul plutitor devine o pictogramă în colțul de jos numai când subsolul intră în ecran, astfel încât nu acoperă invitația.
- Scena din subsol folosește decorul animat CSS pe dispozitive echilibrate și oprește mișcarea la nivelul minim; profunzimea WebGL se încarcă numai pe dispozitive încadrate la nivelul complet.

## Fișiere și date

- `src/components/site/HeroProductRotator.tsx`, `src/components/site/LimitedEditionBadge.tsx`
- `src/components/site/Footer.tsx`, `src/components/site/FooterScene.tsx`, `src/components/site/FloatingCartButton.tsx`, `src/styles.css`
- Migrații noi: niciuna. Nu s-au modificat prețurile, stocurile, comenzile sau integrările.

## Verificare vizuală și performanță

- 1440 × 900 px: subsolul ocupă aproximativ 452 px, cu invitația, navigarea, contactele, ANPC, ADR și Stripe vizibile. Fără depășire orizontală și fără erori în consolă.
- 390 × 844 px: subsolul ocupă aproximativ 988 px, față de circa 1.230 px înainte. Coșul rămâne accesibil fără să acopere textul; linkurile și badge-urile nu se suprapun. La 320 × 700 px nu există depășire orizontală sau linkuri trunchiate.
- Caruselul „Magia care urmează”: cardurile au spațiu între ele, iar fotografiile primelor modele vizibile se încarcă. Colecțiile 02 și 03 din previewul izolat au câte 1, respectiv 3 produse și fotografii valide.
- Profilarea locală a paginii principale a măsurat CLS 0 și LCP 3,03 s la 1440 px fără limitare de CPU sau rețea; valoarea include latența serverului de dezvoltare și nu reprezintă o măsurare de producție. La profilul mobil echilibrat, scena WebGL din subsol nu se montează.
- Catalogul D1 al previewului izolat marchează toate modelele „în curând”, astfel că noua rotație din hero nu a putut fi observată cu produse comandabile în acel preview. Verificarea disponibilității este aceeași regulă folosită de coș și de datele structurate ale paginii.
- Capturi din previewul local: [subsol desktop](landing-footer-desktop-2026-10-13.webp), [subsol mobil](landing-footer-mobile-2026-10-13.webp), [subsol mobil cu Stripe](landing-footer-mobile-bottom-2026-10-13.webp).

## Verificări automate

- `npm run typecheck`: trecut.
- `npm test`: 45 fișiere, 236 teste trecute.
- `npm run lint`: trecut.
- `npm run build`: trecut, cu avertismentele existente pentru dimensiunea unor pachete și jurnalul Wrangler din sandbox.
- `npm run cf:types:check`: tipurile de binding sunt la zi.
- `npm run cf:deploy:dry`: pachetul de producție și bindingurile au fost validate; simularea Cloudflare a reușit.
- `git diff --check`: trecut.

## Predare

- Ramură locală: `codex/product-technical-carousel`, worktree `admin-operations-polish`; ramura de referință este `codex/cutiuta-cloudflare-final`.
- Pagina de la `127.0.0.1:8080` folosește un catalog local mai vechi și arată goale colecțiile 02 și 03. Worktree-ul verificat folosește migrarea append-only 0057 existentă; aplicarea ei în producție rămâne pentru un release autorizat.
- Nu s-au făcut push, pull request, deploy sau migrare remote. Revenirea se poate face prin revertul commitului local al acestei schimbări.
