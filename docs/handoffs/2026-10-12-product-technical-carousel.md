# Fișa tehnică și colecțiile magazinului — 12 octombrie 2026

## Scop și rezultat

- Fiecare produs muzical are o fișă tehnică în dashboard, cu SKU, EAN/GTIN, MPN, proveniența codului, cost intern, stocuri pe locații și legături către comenzi, facturi, statistici, furnizori și canalele de vânzare.
- EAN-ul se validează după cifra de control, se resping duplicatele, iar modificările sunt auditate. O sursă schimbată revine în starea „de verificat”. Nu sunt generate coduri EAN fictive.
- Caruselul „Magia care urmează” afișează fotografiile existente chiar dacă o adresă media publică eșuează, folosește pași separați fără suprapunerea cardurilor și oprește derularea automată în timpul interacțiunii. Navigarea din bara laterală are durată limitată.
- Colecțiile 02 și 03 includ produse existente care urmează să revină, cu stare afișată explicit. Migrarea 0057 repară numai repartizările implicite ale modelelor cunoscute, corectează titlurile fără diacritice dintr-un seed târziu și respectă produsele editate de administrator.

## Fișiere și date

- Fișa: `src/admin/pages/ProductTechnicalSheet.tsx`, `src/admin/pages/ProductStudio.tsx`, `src/admin/pages/Products.tsx`.
- API și contracte: `src/server/api/product-technical-sheet.ts`, `src/server/api/router.ts`, `src/server/api/admin-product.ts`, `src/server/db/admin.repository.ts`, `src/lib/admin-contracts.ts`, `src/lib/gtin.ts`.
- Magazin: `src/components/site/ProductImage.tsx`, `src/components/site/RotatingSpotlight.tsx`, `src/components/site/UpcomingCollection.tsx`, `src/components/site/SideScrollMagic.tsx`, `src/lib/catalog-products.ts`, `src/lib/collections.ts`, `src/styles.css`.
- Migrare nouă: `cloudflare/d1/migrations/0057_reconcile_storefront_collections.sql`. Nu au fost modificate migrații aplicate.
- Verificări: `src/lib/gtin.test.ts`, `src/server/storefront-experience.test.ts`.

## Verificare vizuală

- Desktop, carusel complet: `docs/screenshots/upcoming-desktop-2026-10-12.png`.
- Mobil, colecția 03: `docs/screenshots/product-collections-mobile-2026-10-12.png`.
- Capturile provin din serverul local și din catalogul D1 local, în care a fost importat seed-ul 0002 și au fost repartizate produsele potrivit regulilor editoriale pentru a verifica interfața. Baza locală ignorată de Git nu este parte din livrare.
- Fișa administrativă a fost verificată prin API și teste; capturarea vizuală în contul de administrator necesită o sesiune autorizată.

## Verificări automate

- `npm run typecheck`, `npm run lint`, `npm run build` și `npm run cf:deploy:dry`: trecute.
- `npm test`: 231 teste trecute; testele pentru fișa tehnică și migrarea 0057 au fost rulate din nou după ultima corecție.
- `git diff --check`: fără probleme. Buildul afișează avertismente existente privind dimensiunea unor pachete; rularea uscată Wrangler a reușit, deși sandboxul nu a permis scrierea jurnalului în directorul global Wrangler.

## Configurare externă rămasă

- Migrarea 0057 se aplică odată cu viitorul release autorizat. Nu a fost aplicată în producție.
- Codurile EAN reale, documentele sursă și verificarea lor se completează de administrator pentru fiecare produs. Integrarea Oblio/Stripe/Revolut nu este activată de această schimbare.
- Nu s-au făcut push, PR, deploy sau activări de servicii externe.
