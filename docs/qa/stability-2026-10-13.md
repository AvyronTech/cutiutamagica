# Handoff — stabilizare magazin și prioritate pentru conversie

## Scop și ramură

- Ramură locală: `codex/product-technical-carousel`, în worktree-ul `admin-operations-polish`, pornită din `codex/cutiuta-cloudflare-final`.
- Rute verificate: `/`, `/produse`, `/comanda`, `/cont`, `/admin` și răspunsuri API private fără autentificare.
- Migrații D1 noi: niciuna. Nu s-au modificat secrete, configurații live sau resurse Cloudflare.

## Schimbări

- Checkoutul fără produse arată un singur pas util spre catalog; formularul, sumarul și promoțiile apar numai când există produse. Titlul mobil reflectă corect încărcarea, plata în curs și confirmarea.
- Mesajele promoționale nu apar în checkout, pe mobil sau peste consimțământ. Pe desktop apare cel mult unul pe vizită, după timp de explorare și derulare; se închide mai repede.
- Bannerul de cookie-uri are text explicit, opțiunea „Doar necesare” la vedere și un format mai compact pe mobil. Categoriile din setări sunt numite clar.
- Intro-ul cinematic nu blochează intrarea directă în catalog, cont sau checkout; pe prima pagină se retrage și fără hidratare JavaScript. Efectele continue, particulele, parallaxul și rotirea automată a produselor se adaptează la preferințele de mișcare, economisirea datelor, memoria, numărul de nuclee și ecranele tactile compacte. Dispozitivele capabile păstrează experiența completă.
- Erorile interne neașteptate din API-urile de fidelitate și studio AI nu mai expun detalii tehnice în răspuns; sunt jurnalizate doar pe server.
- Cele opt referințe vechi la fotografii din R2 răspund `404` și pe site-ul publicat. Catalogul folosește acum copiile locale verificate pentru aceste identificatoare; fotografiile noi încărcate din admin rămân prioritare.

## Fișiere modificate

- Checkout și mesaje: `src/routes/comanda.tsx`, `src/lib/notify.ts`, `src/components/site/ContextualMessages.tsx`, `src/components/site/CookieConsent.tsx`, `src/lib/message-sequence.ts`, `src/styles.css`.
- Efecte și performanță: `src/lib/visual-performance.ts`, `src/lib/page-loading.ts`, `src/components/site/PageStoryLoader.tsx`, `LandingBackdrop.tsx`, `HeroWorld.tsx`, `SceneAtmosphere.tsx`, `HeroProductRotator.tsx`, `UpcomingCollection.tsx`, `useLandingInteractions.ts`.
- Fotografii: `src/lib/product-image-source.ts`, `src/lib/catalog-products.ts`, `src/data/products.ts`, `src/components/site/ProductImage.tsx`.
- Protecția API: `src/server/api/customer-loyalty.ts`, `src/server/services/magic-rewards.ts`, `src/server/api/admin-ai-studio.ts`.
- Verificare: testele aferente și capturile din `docs/qa/`.

## Verificare vizuală și funcțională

- 390 × 844 px: homepage, catalog, checkout gol și autentificare; fără depășire orizontală. Checkoutul gol nu afișează formular sau sumar, iar bannerul poate fi închis cu „Doar necesare”.
- 1440 × 900 px: homepage, checkout gol, cont și redirecționarea `/admin` spre `/auth`; fără depășire orizontală.
- Caruselul „Magia care urmează”: 10 carduri în DOM; primele carduri sunt separate geometric și primele imagini încărcate sunt valide. Imaginile ulterioare sunt încărcate la nevoie.
- După remaparea fotografiilor vechi, reîncărcarea homepageului local nu mai face cereri la cele opt URL-uri `/media/media_*` defecte.
- API-urile protejate testate fără sesiune răspund `401` și nu livrează date administrative sau de fidelitate.
- Capturi: [homepage desktop](stability-home-desktop.png), [homepage mobil](stability-home-mobile.png), [checkout mobil](stability-checkout-mobile.png).

## Verificări automate

- `npm run typecheck` și `npm run lint`: trecute pe codul final.
- `npm test`: 45 fișiere / 236 teste trecute pe codul final; testul catalogului (26 cazuri) a fost rulat și separat după remaparea fotografiilor.
- `npm run build`: trecut; `npm run cf:deploy:dry` a refăcut ulterior pachetul de producție pe codul final, a verificat artefactul și a încheiat simularea Cloudflare cu succes.
- `npm run cf:types:check`: tipurile de binding sunt la zi. `git diff --check`: trecut.
- Teste de regresie noi pentru nivelurile efectelor, rutele fără intro și mascarea erorilor API. Testele secvenței de mesaje au fost ajustate pentru o singură apariție pe vizită.

## Limite și efecte externe

- Catalogul D1 local din acest worktree marchează produsele ca indisponibile; nu s-a putut încheia local o comandă reală. Nu s-a trimis nicio comandă și nu s-a inițiat nicio plată.
- Configurația publică observată la începutul lucrului avea plata cu cardul dezactivată. Stripe, Revolut Pay, Oblio, notificările de comandă prin e-mail și livrarea reală trebuie probate cap la cap numai după configurarea și activarea aprobate.
- Măsurarea mobilă a versiunii publicate înainte de aceste schimbări a arătat LCP de aproximativ 5,46 s în profil Slow 4G / CPU 4×, dominat de întârzierea afișării. Aceasta este o referință inițială, nu rezultatul codului local; după publicare trebuie repetată măsurarea.
- Nu s-au făcut push, pull request, deploy, migrare remote, DNS sau activări de procesatori. Revenirea se face prin revertul commitului local al acestui handoff.
