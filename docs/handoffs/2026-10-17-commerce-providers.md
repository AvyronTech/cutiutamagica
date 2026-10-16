# Stripe, Oblio și SmartShip — pregătirea integrărilor

## Scop și stare

Checkoutul folosește Stripe Checkout pentru card, Oblio pentru facturi și SmartShip pentru cotații și AWB. Cheile sunt citite exclusiv din secretele criptate ale magazinului. Acest handoff nu confirmă activarea plăților sau o plată reală. Identitatea celor trei conturi a fost comparată cu firma Cutiuța Magică; nu se folosesc acreditări din alte conturi de furnizor.

## Stripe

1. În contul Stripe al Cutiuța Magică, verifică firma, modul test/live și capacitatea de a accepta plăți. Salvează `acct_...` în **Conexiuni financiare → Stripe Account ID**; la inițierea unei plăți live Workerul compară acest ID cu contul care deține cheia și verifică țara și capacitatea de a încasa.
2. Salvează `STRIPE_SECRET_KEY` în panoul administrativ **Încasări cu cardul → Stripe** și `STRIPE_WEBHOOK_SECRET` în **Stripe · webhook**. Nu copia valorile în D1, documente, cod ori frontend.
3. Configurează endpointul `https://cutiutamagica.eu/api/v1/webhooks/stripe` pentru `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` și `checkout.session.expired`. Aplicația verifică semnătura din corpul brut și înregistrează evenimentele idempotent.
4. În mediul test, verifică totalul cu livrare, finalizarea cardului, întoarcerea în magazin, webhookul semnat, plata întârziată/eșuată și reconcilierea comenzii. Notează referința testului în admin. Abia apoi se poate activa opțiunea card pentru mediul potrivit.

Documentație: [Stripe Checkout](https://docs.stripe.com/payments/checkout), [webhookuri](https://docs.stripe.com/webhooks), [evenimente](https://docs.stripe.com/api/events/types).

## Oblio

1. În contul Oblio al firmei, verifică CUI-ul și regimul **neplătitor de TVA**. E-mailul contului se salvează în **Facturare → Conexiunea Oblio**, iar `OBLIO_CLIENT_SECRET` în câmpul pentru secretul Oblio.
2. Creează/confirmă seria de facturi `CM` cu începutul `0001`. Registrul local este inițializat cu următorul număr `1`. Dacă Oblio are deja documente în serie, nu reseta seria automat: verifică numerele existente și reconciliază registrul înainte de prima emitere din magazin.
3. Activează seria locală după confirmarea persoanei responsabile. Butonul **Verifică** poate controla prin API firma, seria, numărul următor și cota de 0% pentru neplătitor de TVA fără emiterea unei facturi. Aceleași condiții sunt controlate din nou la emitere. Factura folosește numărul acordat de Oblio, iar PDF-ul este arhivat în R2. O emitere cu rezultat incert se verifică în Oblio înainte de reluare.
4. Verifică împreună cu contabilul mențiunile fiscale și configurarea e-Factura/SPV, inclusiv dacă Oblio trimite automat. Magazinul nu activează trimiterea în SPV prin această schimbare.

Documentație: [API Oblio](https://www.oblio.eu/api/) — autorizare OAuth, nomenclatoare `companies`, `series`, `vat_rates`, emitere `docs/invoice` și listare facturi.

## SmartShip

1. Confirmă profilul expeditorului Cutiuța Magică în SmartShip și salvează `SMARTSHIP_API_KEY` în **Livrare și SmartShip**. Pentru ramburs, salvează separat `SMARTSHIP_COD_IBAN` (IBAN-ul de încasare al firmei) în câmpul criptat din aceeași pagină. API-ul primește cheia în headerul `X-API-KEY`, numai din Worker; IBAN-ul este trimis furnizorului doar când suma rambursului este pozitivă.
2. Completează expeditorul, ID-ul numeric al localității, greutatea și dimensiunile reale ale coletelor. Activează cotațiile live și Easybox numai după o cotație verificată pe un traseu real.
3. Pentru adresa clientului, `/cost` furnizează prețul `cost` în RON cu TVA inclus și `delivery_date`. Magazinul afișează cel mult trei curieri distincți, ordonați după cost, numai dintre ofertele disponibile pentru rută. Pentru Easybox se face cotație separată cu `locker_id`; nu se presupune disponibilitatea tuturor curierilor în toate localitățile.
   Data SmartShip este afișată ca estimare de transport după predare. Durata de producție a modelelor realizate la comandă trebuie configurată distinct înainte de a promite o dată totală de sosire.
4. Totalul din checkout este prețul produselor după reducere plus livrarea selectată. Oferta selectată este păstrată zece minute și validată din nou la comandă. AWB-ul se emite administrativ, cu rezervare unică și verificare după numărul comenzii dacă răspunsul este incert.

Documentație: [API SmartShip](https://smartship.ro/api-docs) — `POST /cost`, `POST /awb/new`, `GET /awb/order_id/{order_id}`, geolocație și etichetă.

## Predare și verificări rămase

Verificări locale: `npm run typecheck`, `npm test` (49 fișiere, 265 teste), `npm run lint`, `npm run build`, `npm run cf:types:check` și `npm run cf:deploy:dry` au trecut. Checkoutul și pagina de livrare au fost inspectate în previzualizarea locală pe lățimi de mobil și desktop. Modificările de interfață administrativă din această etapă nu au fost încă publicate, deci trebuie reverificate vizual după deploy.

Verificări în conturile deschise în Opera, 17 octombrie 2026:

- Stripe: contul `acct_1UPpDiITqtuDYMgq` afișează Cutiuța Magică, firma DIGITAL ECOTECH SOLUTIONS și domeniul `cutiutamagica.eu`. Pagina de stare afișează Payments și Payouts active, fără sarcini active. Crearea unei chei restrânse cu cinci permisiuni a ajuns la verificarea titularului prin e-mail; nu există încă o cheie nouă sau webhook în magazin. Metoda card rămâne dezactivată.
- Oblio: sesiunea deschisă este pe DIGITAL ECOTECH SOLUTIONS S.R.L., CUI 55055976, cu „Plătitor de TVA” debifat. La cererea administratorului, „Adresa web” a fost schimbată în `https://cutiutamagica.eu` și s-a creat seria activă `CM` de la `0001`; ambele au rămas salvate după reîncărcare. Secretul API existent a fost salvat în câmpul criptat al magazinului, iar furnizorul și e-mailul API confirmat au fost salvate. După reîncărcarea magazinului au rămas „Cheie configurată” și furnizorul Oblio.
- SmartShip: sesiunea are adresa `cutiutamagicaofficial@gmail.com` și aceeași firmă. Cheia existentă în Workerul magazinului a trecut verificarea API din panoul Livrare. Profilul SmartShip nu are IBAN pentru ramburs și nici expeditor salvat. În panoul magazinului lipsește ID-ul localității de ridicare, iar cotațiile live sunt dezactivate.

- Safari nu a fost accesibil prin controlul browserului; identitatea de mai sus a fost verificată în Opera. Nu se copiază secrete din conturi AVYRON.
- Lipsesc probele cu răspunsuri reale SmartShip pentru trei curieri disponibili și Easybox, cu `delivery_date` actual; oferta depinde de adresă, colet și cont.
- Lipsesc timpii de pregătire confirmați pe fiecare dintre cele cinci produse; până atunci magazinul nu promite o dată totală de sosire pentru produsele făcute la comandă.
- Oblio are seria `CM` disponibilă; în magazin profilul juridic este încă neverificat de persoana responsabilă, iar seria locală este ciornă. Verificarea API completă va fi disponibilă după publicarea codului actual. Prima factură cu număr `0001` nu a fost emisă.
- Lipsesc testul Stripe cu contul Cutiuța Magică și confirmarea webhookului semnat. Nu s-au efectuat plată, AWB, factură, migrare remote, push sau deploy.
- Se verifică după publicare desktop și mobil: autentificare, catalog, coș, ofertele de livrare, suma finală și recuperarea plății.
