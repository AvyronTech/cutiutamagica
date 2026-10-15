# Handoff — conturi clienți și administrarea membrilor

## Scop și rute

- `/auth` oferă intrare separată pentru clienți (cod temporar prin e-mail, Google unde este configurat) și echipă (sistemul administrativ existent), într-o prezentare adaptată brandului.
- `/cont` afișează istoricul comenzilor cu articole și paginare, Magic Rewards, calendarul cadourilor și cardurile bancare tokenizate la Stripe.
- `/admin/customers` afișează clienți, membri, comenzi, indicatori agregați, Magic Stars și datele salvate pentru cadouri, numai cu permisiunea `customers.read`.
- Calendarul oferă consimțământ individual pentru e-mail și mementouri la 7 și 3 zile; mesajele includ produse disponibile în catalog la momentul trimiterii.

## Date și securitate

- Migrări append-only: `cloudflare/d1/migrations/0059_customer_email_access.sql` (coduri temporare hash-uite, permisiune personal, sesiuni de salvare card, actualizarea intervalelor vechi 12/3 la 7/3) și `0060_customer_staff_access.sql` (aceeași permisiune de membri pentru rolurile care au deja `orders.read`).
- Codul de acces expiră după 10 minute și acceptă cel mult 5 încercări. Sesiunea rămâne în cookie HttpOnly; API-urile contului sunt private și nu sunt cache-uite.
- Datele complete ale cardului nu intră în Worker sau D1. Stripe Checkout `setup` obține consimțământul și metoda de plată; webhookul semnat confirmă, marchează numai această metodă drept afișabilă la plăți viitoare (`allow_redisplay=always`) și salvează numai identificatorul Stripe și metadatele de afișare. Eliminarea detașează metoda de Stripe.
- Checkoutul folosește clientul Stripe cu metode salvate numai când sesiunea clientului autentificat corespunde comenzii; accesul la un checkout deja inițiat în acest mod cere aceeași sesiune. Un vizitator care știe e-mailul sau tokenul comenzii nu primește cardul salvat.
- Alegerea `allow_redisplay=always` urmează [documentația Stripe pentru plăți ale clienților existenți](https://docs.stripe.com/payments/existing-customers?platform=web&ui=stripe-hosted); se aplică numai cardului pentru care s-a înregistrat acordul explicit.
- Salvarea cardului este disponibilă numai după configurarea secretelor Stripe, a webhookului și activarea explicită a checkoutului Stripe. Nu există în această livrare activare a plăților live, migrare remote sau trimitere externă de e-mail.

## Fișiere

- Interfață: `src/routes/auth.tsx`, `src/routes/cont.tsx`, `src/components/site/CustomerMagicCenter.tsx`, `src/components/site/Footer.tsx`, `src/admin/pages/Customers.tsx`, `src/routes/_authenticated/admin/customers.tsx`, `src/styles.css`. Sigla statică Stripe din subsol a fost eliminată până la activarea furnizorului.
- Backend: `src/server/review-accounts.ts`, `src/server/api/customer-billing.ts`, `src/server/api/customer-loyalty.ts`, `src/server/api/payments.ts`, `src/server/integrations/stripe.ts`, `src/server/services/customer-stripe-cards.ts`, `src/server/services/magic-rewards.ts`, `src/lib/customer-admin.functions.ts`.
- Teste: `src/server/reviews.test.ts`, `src/server/checkout.test.ts`.

## Verificări și limite

- `npm test`: 48 fișiere, 251 teste trecute, inclusiv izolarea metodelor de plată salvate față de checkoutul vizitatorului. După ajustarea Stripe `allow_redisplay`, fișierul de checkout a trecut din nou (27 teste).
- Migrările 0059 și 0060 aplicate numai pe D1 local; schema 60, cinci roluri autorizate, `PRAGMA foreign_key_check` fără erori. Interogarea locală a indicatorilor administrativi a reușit.
- `npm run typecheck`, `npm run lint`, `npm run build`, `npm run cf:types:check`, `npm run cf:deploy:dry` și `git diff --check` au trecut. Dry runul final include ajustarea `allow_redisplay` și a confirmat bindingul `EMAIL`, fără a trimite mesaje. Buildul afișează avertismente deja existente despre `node:crypto` externalizat în client și dimensiunea unor pachete.
- Inspectate vizual în browser la desktop și 390 × 844: autentificarea clientului, autentificarea echipei și intrarea în cont. Capturile au fost inspectate în sesiunea de browser, fără fișiere de captură persistate.
- Nu s-a probat un e-mail real, o sesiune Stripe reală sau accesul unui administrator cu credențiale reale. Acestea depind de configurarea furnizorilor și de aprobarea administrativă pentru integrarea live.

## Configurare externă rămasă

1. Verificarea domeniului de expediere e-mail și a bindingului `EMAIL`/transportului existent; apoi un test de cod de acces și un memento cu destinatar aprobat.
2. Secrete Stripe pentru mediul ales, secretul webhookului și activarea checkoutului Stripe în configurarea internă, urmate de probă cu card de test.
3. După aprobare separată: migrarea D1 remote, publicarea codului și verificarea efectivă pe desktop/mobil a conturilor autentificate.

Revenire: păstrați migrarea de date și reveniți la commitul aplicației precedent; dezactivați Stripe în setările checkoutului dacă este necesar. Migrația nu se rescrie.
