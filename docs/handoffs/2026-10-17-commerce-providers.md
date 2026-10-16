# Stripe, Oblio și SmartShip — pregătirea integrărilor

## Scop și stare

Checkoutul folosește Stripe Checkout pentru card, Oblio pentru facturi și SmartShip pentru cotații și AWB. Cheile sunt citite exclusiv din secretele criptate ale magazinului. Acest handoff nu confirmă activarea conturilor externe sau o plată reală. Identitatea celor trei conturi trebuie comparată cu firma Cutiuța Magică înainte de configurare; nu se folosesc sesiuni sau acreditări AVYRON.

## Stripe

1. În contul Stripe al Cutiuța Magică, verifică firma, modul test/live și capacitatea de a accepta plăți.
2. Salvează `STRIPE_SECRET_KEY` în panoul administrativ **Încasări cu cardul → Stripe** și `STRIPE_WEBHOOK_SECRET` în **Stripe · webhook**. Nu copia valorile în D1, documente, cod ori frontend.
3. Configurează endpointul `https://cutiutamagica.eu/api/v1/webhooks/stripe` pentru `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` și `checkout.session.expired`. Aplicația verifică semnătura din corpul brut și înregistrează evenimentele idempotent.
4. În mediul test, verifică totalul cu livrare, finalizarea cardului, întoarcerea în magazin, webhookul semnat, plata întârziată/eșuată și reconcilierea comenzii. Notează referința testului în admin. Abia apoi se poate activa opțiunea card pentru mediul potrivit.

Documentație: [Stripe Checkout](https://docs.stripe.com/payments/checkout), [webhookuri](https://docs.stripe.com/webhooks), [evenimente](https://docs.stripe.com/api/events/types).

## Oblio

1. În contul Oblio al firmei, verifică CUI-ul și regimul **neplătitor de TVA**. E-mailul contului se salvează în **Facturare → Conexiunea Oblio**, iar `OBLIO_CLIENT_SECRET` în câmpul pentru secretul Oblio.
2. Creează/confirmă seria de facturi `CM` cu începutul `0001`. Registrul local este inițializat cu următorul număr `1`. Dacă Oblio are deja documente în serie, nu reseta seria automat: verifică numerele existente și reconciliază registrul înainte de prima emitere din magazin.
3. Activează seria locală după confirmarea persoanei responsabile. La fiecare emitere, adaptorul verifică prin API firmele disponibile, seria, numărul următor și cota de 0% numită pentru neplătitor de TVA. Factura folosește numărul acordat de Oblio, iar PDF-ul este arhivat în R2. O emitere cu rezultat incert se verifică în Oblio înainte de reluare.
4. Verifică împreună cu contabilul mențiunile fiscale și configurarea e-Factura/SPV, inclusiv dacă Oblio trimite automat. Magazinul nu activează trimiterea în SPV prin această schimbare.

Documentație: [API Oblio](https://www.oblio.eu/api/) — autorizare OAuth, nomenclatoare `companies`, `series`, `vat_rates`, emitere `docs/invoice` și listare facturi.

## SmartShip

1. Confirmă profilul expeditorului Cutiuța Magică în SmartShip și salvează `SMARTSHIP_API_KEY` în **Livrare și SmartShip**. API-ul primește cheia în headerul `X-API-KEY`, numai din Worker.
2. Completează expeditorul, ID-ul numeric al localității, greutatea și dimensiunile reale ale coletelor. Activează cotațiile live și Easybox numai după o cotație verificată pe un traseu real.
3. Pentru adresa clientului, `/cost` furnizează prețul `cost` în RON cu TVA inclus și `delivery_date`. Magazinul afișează cel mult trei curieri distincți, ordonați după cost, numai dintre ofertele disponibile pentru rută. Pentru Easybox se face cotație separată cu `locker_id`; nu se presupune disponibilitatea tuturor curierilor în toate localitățile.
   Data SmartShip este afișată ca estimare de transport după predare. Durata de producție a modelelor realizate la comandă trebuie configurată distinct înainte de a promite o dată totală de sosire.
4. Totalul din checkout este prețul produselor după reducere plus livrarea selectată. Oferta selectată este păstrată zece minute și validată din nou la comandă. AWB-ul se emite administrativ, cu rezervare unică și verificare după numărul comenzii dacă răspunsul este incert.

Documentație: [API SmartShip](https://smartship.ro/api-docs) — `POST /cost`, `POST /awb/new`, `GET /awb/order_id/{order_id}`, geolocație și etichetă.

## Predare și verificări rămase

Verificări locale: `npm run typecheck`, `npm test` (48 fișiere, 260 teste), `npm run lint`, `npm run build` și `npm run cf:deploy:dry` au trecut. Checkoutul și pagina de livrare au fost inspectate în previzualizarea locală pe lățimi de mobil și desktop. Adminul autentificat și ofertele live nu au putut fi inspectate fără conturile și secretele potrivite.

- Secretele și identitatea reală a conturilor nu au fost citite din Safari: browserul accesibil în această sesiune a expus doar Opera. Nu se copiază secrete din conturi AVYRON.
- Lipsesc probele cu răspunsuri reale SmartShip pentru trei curieri disponibili și Easybox, cu `delivery_date` actual; oferta depinde de adresă, colet și cont.
- Lipsesc timpii de pregătire confirmați pe fiecare dintre cele cinci produse; până atunci magazinul nu promite o dată totală de sosire pentru produsele făcute la comandă.
- Lipsesc seria Oblio verificată în cont, cota de neplătitor, documentele anterioare și testul de factură controlată cu număr `0001`.
- Lipsesc testul Stripe cu contul Cutiuța Magică și confirmarea webhookului semnat. Nu s-au efectuat plată, AWB, factură, migrare remote, push sau deploy.
- Se verifică după publicare desktop și mobil: autentificare, catalog, coș, ofertele de livrare, suma finală și recuperarea plății.
