# Cutiuța Magică — storefront cinematic și checkout, 12 octombrie 2026

## Scop și rute

- Acasă: fundal cinematografic inspirat din mecanismul real, cu contrast păstrat pentru fotografiile produselor; eliminarea orbitelor decorative care concurau cu cutiuțele.
- Identitate: simbol nou al cutiuței cu lemn, capac, pieptene, cilindru și manivelă; ilustrație universală originală numai pe capac. Folosit de componenta comună BrandMark, inclusiv în upbar, footer, încărcări, notificări și checkout, precum și în teaserul public de personalizare. Faviconul și iconițele PWA sunt aliniate la același simbol.
- Catalog, produs, coș: prețuri integrate în suprafețe de lemn/pergament și sticlă, cu contrast și diacritice mai clare. Butoane refăcute pentru finalizare și continuarea cumpărăturilor.
- Checkout: CTA mai explicit, cu formularea legală „Comandă cu obligație de plată”; cardul este vizibil ca opțiune în pregătire până când API-ul confirmă Stripe. La activare, opțiunea reală vine din configurația serverului.
- Notificări: maximum două mesaje contextuale pe vizită, interval minim 45 secunde, afișare 2,8 secunde; toastul de coș 2,6 secunde. Suprafețe translucide cu suport pentru reducerea transparenței.
- Navigare laterală: pe ecrane medii și mici se reduce la un indicator îngust la marginea dreaptă, fără butoane peste text.
- Subsol și FAQ: eliminată promovarea Stripe ca metodă activă înainte de verificare; textul public descrie doar metodele disponibile în checkout.

## Fișiere și resurse

- Componente/rute: `src/components/site/BrandMark.tsx`, `ContextualMessages.tsx`, `LandingBackdrop.tsx`, `MiniCart.tsx`, `Footer.tsx`, `PersonalizationSpotlight.tsx`, `src/routes/index.tsx`, `comanda.tsx`, `personalizeaza.tsx`, `__root.tsx`.
- Stil și mesaje: `src/styles.css`, `src/lib/message-sequence.ts`, `src/lib/message-sequence.test.ts`, `src/lib/notify.ts`.
- Simbol master: `design/brand/music-box-universal-master.png`; variantă publică optimizată: `public/brand/music-box-universal.webp` (155 KiB).
- Fundaluri responsive: `public/scenes/music-box-world.webp` (39 KiB) și `music-box-world-mobile.webp` (16 KiB).
- Iconițe publice: `public/favicon.svg`, `favicon.ico`, `favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` și `manifest.webmanifest`.
- Capturi: `storefront-home-desktop.jpg`, `storefront-home-mobile.jpg`, `storefront-hero-product-mobile.jpg`, `storefront-checkout-desktop.jpg`, `storefront-checkout-mobile.jpg` în acest director.
- Migrații D1 noi: niciuna. Nu s-au modificat date sau configurări remote.

## Generarea imaginilor

Am folosit skillul `imagegen` în modul built-in, cu fotografiile reale `box-fairy.jpg` și `box-hp-keeper.jpg` ca referințe pentru proporții și mecanism.

1. Simbol: „Cutiuță muzicală mică, deschisă, din lemn brun, colțuri îmbinate, interior negru, pieptene și cilindru metalic, capac vertical și manivelă în dreapta; numai imaginea capacului devine o constelație originală aurie pe albastru închis; perspectivă trei sferturi, decupaj transparent, fără text, mâini sau obiecte suplimentare.”
2. Hero: „Macro spațial discret din interiorul mecanismului, cu lemn de nuc, dinți metalici și cilindru cu pini estompate spre marginile cadrului; spațiu întunecat generos pentru text și fotografiile produselor, lumină cinematică caldă, fără cercuri decorative, text ori produs concurent.”

## Verificări

- `npm run typecheck`: trecut.
- `npm test`: 39 fișiere / 223 teste trecute.
- `npm run lint`: trecut.
- `npm run build`: trecut. Avertismentul existent de mărime a unor pachete nu este introdus de aceste resurse.
- `npm run cf:types:check`: trecut.
- `npm run cf:deploy:dry`: trecut, fără deploy.
- Browser local la 1440 px și 390 px: home, catalog, pagină de produs, coș, teaserul de personalizare și checkout. Nicio depășire orizontală; CTA desktop este ascuns corect pe mobil. `/cont` și accesul protejat `/admin` au fost verificate la 390 px; dashboardul autentificat necesită o sesiune de administrator.
- Consola checkout după reload: fără erori sau avertismente. Accesul `/admin` redirecționează corect spre `/auth`.
- Urmărire de performanță în previzualizarea locală la 390 px: LCP 817 ms, elementul LCP fiind noua imagine `music-box-world-mobile.webp`; CLS 0,00. Acestea sunt valori locale, fără date reale de utilizatori sau throttling.

Pentru capturi am aplicat migrațiile și seedul exclusiv în D1 local, am marcat două produse existente ca disponibile numai în această bază de test și am încărcat cele două fotografii originale numai în R2 local. Aceste setări nu fac parte din cod, din producție sau din livrare.

## Următorul pas pentru Stripe

Backendul include deja sesiune Stripe Checkout, cheie de idempotentă, validarea semnăturii webhook, reconcilierea încercărilor de plată și blocarea plății când providerul nu este gata. Cardul devine activ în checkout numai când există cheia Stripe corespunzătoare mediului, secretul webhook, setarea `commerce.checkout.stripe` activată pentru mediul corect și o referință de test de acceptanță. Integrarea live și o tranzacție de probă necesită acreditările contului și aprobarea explicită a administratorului.

## Risc și revenire

Schimbarea este locală, doar de frontend și resurse media. Se poate reveni prin eliminarea acestui commit/branch; nicio migrație ori stare remote nu trebuie inversată. Nu s-au făcut push, merge, deploy sau activări cu cost.
