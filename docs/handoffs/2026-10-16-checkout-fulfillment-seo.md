# Handoff — checkout, expediere și SEO, 16 octombrie 2026

## Scop și rezultat

- Checkoutul cere o ofertă SmartShip validă și pentru livrarea la adresă când politica de tarife live este activă, inclusiv la pragul de livrare gratuită. Clientul vede curierul și prețul selectat; serverul aplică aceeași regulă pentru card și ramburs.
- Stripe Checkout nu mai limitează sesiunea la `card`; metodele eligibile sunt determinate de setările contului Stripe și de monedă. Interfața descrie această disponibilitate fără a promite Revolut Pay înainte de activare. Adaptorul separat Revolut Merchant rămâne inactiv până la configurarea lui.
- Comenzile eligibile au acțiune explicită de emitere AWB SmartShip, verificare după numărul comenzii la rezultat incert, urmărire și descărcare a etichetei prin API administrativ autentificat. Cererea este rezervată înainte de apelul extern și auditată; emiterea nu se repetă automat. Un AWB poate implica un cost sau o solicitare de ridicare, astfel că UI cere confirmarea operatorului.
- Dashboardul are intrări către sitemap, SEO de produs și cardul Search Console. Indexarea efectivă în Google nu este afirmată fără date din Search Console.

## Fișiere și date

- Checkout: `src/routes/comanda.tsx`, `src/server/db/order.repository.ts`, `src/server/integrations/stripe.ts`, `src/server/services/checkout-readiness.ts`.
- Expediere și administrare: `src/server/services/smartship-fulfillment.ts`, `src/server/integrations/smartship.ts`, `src/server/api/admin-shipping-label.ts`, `src/server/api/router.ts`, `src/server/db/admin.repository.ts`, `src/lib/admin.functions.ts`, `src/lib/admin-contracts.ts`, `src/admin/pages/Orders.tsx`, `src/admin/pages/Shipping.tsx`.
- SEO navigabil: `src/admin/pages/Dashboard.tsx`, `src/admin/pages/MarketingOrdersAgentControl.tsx`.
- Migrare D1 append-only: `cloudflare/d1/migrations/0061_smartship_awb_requests.sql`. Se aplică înaintea versiunii Worker care citește această tabelă.
- Migrarea ulterioară `0062_smartship_schema_version.sql` aliniază markerul `schema_metadata` la versiunea ultimei migrații, fără a modifica 0061 deja aplicată. Testul de checkout verifică de acum această corespondență pentru toate migrările viitoare.
- Verificări automate adăugate în `src/server/checkout.test.ts` pentru tariful live, metodele Stripe, emiterea unică și verificarea AWB, precum și accesul la etichetă.

## Verificare

- `npm run typecheck`, `npm test` (48 fișiere, 255 teste), `npm run lint`, `npm run build`, `npm run cf:types:check`, `npm run cf:deploy:dry` și `git diff --check`: trecute.
- Migrarea 0061 a fost aplicată numai în D1 local; `PRAGMA foreign_key_check` a returnat zero erori.
- Pagina principală desktop și mobil, autentificarea clientului și a echipei, contul clientului, produsul și checkoutul fără articole au fost inspectate în browserul local la 390 × 844 și lățime desktop. Capturile au fost inspectate în sesiune; nu au fost salvate în repository. Dashboardul autentificat și un tarif SmartShip live nu pot fi probate fără acreditări.
- Audit public read-only: sitemapul de producție conține 39 URL-uri unice; fiecare a răspuns cu titlu, canonical propriu și fără `noindex` la verificarea efectuată. Acest audit nu dovedește indexarea în Google.
- Buildul afișează avertismentele preexistente pentru `node:crypto` externalizat în browser și pachete mari, inclusiv Three.js încărcat la cerere.

## Activare externă rămasă

1. Administratorul introduce și validează acreditările SmartShip și Stripe, apoi confirmă politica de tarife live, metodele disponibile în Stripe și webhookurile. Revolut Pay poate apărea în Stripe numai dacă este eligibil și activ în cont; integrarea separată Revolut Merchant cere configurare distinctă.
2. După aprobarea unei probe cu efect extern, se testează tariful live, harta easybox, plata de test, webhookul și emiterea AWB pe o comandă controlată. Emiterea AWB poate avea cost.
3. Search Console necesită acces la proprietate, verificarea sitemapului și a stării de indexare. Nu există probă de trimitere ori indexare în această livrare.
4. Migrarea remote, push, PR și deployul au nevoie de cerere explicită în conversație potrivit `AGENTS.md`. Niciuna dintre aceste acțiuni nu a fost executată aici.

Revenire: păstrați migrarea append-only și reveniți la versiunea Worker precedentă; dezactivați ofertele live și metodele de plată din setările existente dacă este necesar. Operațiile AWB deja emise se verifică la furnizor și nu se repetă.
