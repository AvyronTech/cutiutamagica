# Stripe, Oblio și SmartShip — pregătirea integrărilor

## Scop și stare

Checkoutul folosește Stripe Checkout pentru card, Oblio pentru facturi și SmartShip pentru cotații și AWB. Cheile sunt citite exclusiv din secretele criptate ale magazinului. Acest handoff nu confirmă activarea plăților sau o plată reală. Identitatea celor trei conturi a fost comparată cu firma Cutiuța Magică; nu se folosesc acreditări din alte conturi de furnizor.

## Stripe

1. Contul Stripe Cutiuța Magică a fost identificat ca `acct_1UPpDiITqtuDYMgq`, cu Payments și Payouts active. După publicarea interfeței noi, salvează acest ID în **Conexiuni financiare → Stripe Account ID**; la inițierea unei plăți live Workerul compară ID-ul cu contul care deține cheia și verifică țara și capacitatea de a încasa.
2. Cheia restrânsă live pentru Checkout, clienți, metode de plată și verificarea contului este deja salvată criptat în magazin și a trecut verificarea conexiunii. Secretul webhookului este salvat separat, criptat. Nu copia valorile în D1, documente, cod ori frontend. Codul local acceptă acum și prefixul `rk_live_` al cheii restrânse.
3. Webhookul Stripe activ `we_1URK2vITqtuDYMgqQVm35plW` trimite către `https://cutiutamagica.eu/api/v1/webhooks/stripe` evenimentele `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` și `checkout.session.expired`. Aplicația verifică semnătura din corpul brut și înregistrează evenimentele idempotent; livrarea efectivă a unui eveniment semnat rămâne de testat.
4. În mediul test, verifică totalul cu livrare, finalizarea cardului, întoarcerea în magazin, webhookul semnat, plata întârziată/eșuată și reconcilierea comenzii. Notează referința testului în admin. Abia apoi se poate activa opțiunea card pentru mediul potrivit.

Documentație: [Stripe Checkout](https://docs.stripe.com/payments/checkout), [webhookuri](https://docs.stripe.com/webhooks), [evenimente](https://docs.stripe.com/api/events/types).

## Oblio

1. Contul Oblio al firmei are CUI `55055976`, cu regim **neplătitor de TVA**. E-mailul API și secretul sunt deja salvate în magazin, secretul în câmpul criptat; conexiunea a trecut verificarea API la 17.10.2026, 02:01.
2. Seria de facturi `CM` începe cu `0001` în Oblio și este activă și în registrul local, cu următorul număr intern `1`. Datele juridice au fost confirmate de administrator și profilul magazinului este marcat verificat. Înainte de prima emitere, reconciliază numărul real disponibil în Oblio cu registrul local.
3. În codul local, butonul **Verifică** controlează prin API firma, seria, numărul următor și cota de 0% pentru neplătitor de TVA fără emiterea unei facturi. Aceleași condiții sunt controlate din nou la emitere. Acest cod nu este încă publicat; verificarea API curentă din producție certifică accesul, nu întregul nomenclator. Factura folosește numărul acordat de Oblio, iar PDF-ul este arhivat în R2. O emitere cu rezultat incert se verifică în Oblio înainte de reluare.
4. Verifică împreună cu contabilul mențiunile fiscale și configurarea e-Factura/SPV, inclusiv dacă Oblio trimite automat. Magazinul nu activează trimiterea în SPV prin această schimbare.

Documentație: [API Oblio](https://www.oblio.eu/api/) — autorizare OAuth, nomenclatoare `companies`, `series`, `vat_rates`, emitere `docs/invoice` și listare facturi.

## SmartShip

1. Confirmă profilul expeditorului Cutiuța Magică în SmartShip și salvează `SMARTSHIP_API_KEY` în **Livrare și SmartShip**. Pentru ramburs, salvează separat `SMARTSHIP_COD_IBAN` (IBAN-ul de încasare al firmei) în câmpul criptat din aceeași pagină. API-ul primește cheia în headerul `X-API-KEY`, numai din Worker; IBAN-ul este trimis furnizorului doar când suma rambursului este pozitivă.
2. Completează expeditorul, ID-ul numeric al localității, greutatea și dimensiunile reale ale coletelor. Activează cotațiile live și Easybox numai după o cotație verificată pe un traseu real.
3. Pentru adresa clientului, `/cost` furnizează prețul `cost` în RON cu TVA inclus și `delivery_date`. Magazinul afișează toți curierii distincți oferiți pentru rută care nu cer imprimarea etichetei, ordonați după cost; când același curier apare pe două contracte, se păstrează oferta mai ieftină. În cotația verificată, DragonStar (`5`) și FedEx (`19`) au marcajul „Necesită imprimare” și sunt excluși. Răspunsul `/cost` documentat nu are indicator de imprimare; această mapare trebuie revizuită când SmartShip schimbă serviciile sau oferă indicator în API. Pentru Easybox se face cotație separată cu `locker_id`; nu se presupune disponibilitatea tuturor curierilor în toate localitățile.
   Data SmartShip este afișată ca estimare de transport după predare. Durata de producție a modelelor realizate la comandă trebuie configurată distinct înainte de a promite o dată totală de sosire.
4. Totalul din checkout este prețul produselor după reducere plus livrarea selectată. Oferta selectată este păstrată zece minute și validată din nou la comandă. AWB-ul se emite administrativ, cu rezervare unică și verificare după numărul comenzii dacă răspunsul este incert.

Documentație: [API SmartShip](https://smartship.ro/api-docs) — `POST /cost`, `POST /awb/new`, `GET /awb/order_id/{order_id}`, geolocație și etichetă.

## Predare și verificări rămase

Verificări locale după corecția Stripe: `npm run typecheck`, `npm test` (49 fișiere, 266 teste), `npm run lint`, `npm run build`, `npm run cf:types:check` și `npm run cf:deploy:dry` au trecut. Buildul indică fragmente JavaScript mari pentru modulele 3D și grafice, de optimizat înaintea unei ținte stricte de performanță. Checkoutul și pagina de livrare au fost inspectate în previzualizarea locală pe lățimi de mobil și desktop. Modificările de interfață administrativă din această etapă nu au fost încă publicate, deci trebuie reverificate vizual după deploy.

Verificări în conturile deschise în Opera, 17 octombrie 2026:

- Stripe: contul `acct_1UPpDiITqtuDYMgq` afișează Cutiuța Magică, firma DIGITAL ECOTECH SOLUTIONS și domeniul `cutiutamagica.eu`. Pagina de stare afișează Payments și Payouts active. Administratorul a confirmat verificarea prin e-mail și configurarea cheii restrânse și a webhookului. Cheia a trecut verificarea de acces din magazin la 17.10.2026, 01:53; webhookul este activ în Stripe și secretul apare configurat după reîncărcarea magazinului. Metoda card rămâne dezactivată. Configurația Stripe din magazin este încă pe mediu sandbox, dar cheia salvată este live; nu activa plata până la alinierea mediului, publicarea verificării `Stripe Account ID` și testarea cap-coadă.
- Oblio: sesiunea deschisă este pe DIGITAL ECOTECH SOLUTIONS S.R.L., CUI 55055976, cu „Plătitor de TVA” debifat. „Adresa web” este `https://cutiutamagica.eu` și seria `CM` începe cu `0001`. Secretul API, furnizorul și e-mailul API confirmat sunt salvate în magazin; verificarea accesului API a reușit la 17.10.2026, 02:01. Profilul juridic este verificat și seria locală `CM` este activă după confirmarea administratorului. Nu s-a emis factură.
- SmartShip: sesiunea are adresa `cutiutamagicaofficial@gmail.com` și aceeași firmă. Cheia existentă în Workerul magazinului a trecut verificarea API. Administratorul a confirmat adresa de ridicare din Iași și coletul implicit de 350 g, 12 × 8 × 6 cm. ID-ul localității `259539` a fost citit din selectorul SmartShip și salvat în magazin, confirmat după reîncărcare. Expeditorul a fost salvat în contul SmartShip după ce administratorul a introdus direct numărul de contact. Cardul adresei SmartShip afișează strada și numărul, fără mențiunea „parter”; politica magazinului conține adresa completă, iar această diferență trebuie rezolvată pentru expedieri create manual în SmartShip. Cu acordul administratorului, contul IBAN de ramburs a fost salvat în SmartShip cu beneficiarul DIGITAL ECOTECH SOLUTIONS S.R.L. și a rămas vizibil după reîncărcare. Câmpul criptat pentru același IBAN în magazin este disponibil numai în codul local nepublicat; valoarea nu apare în acest document.
- Calculatorul SmartShip a întors pentru Iași → București, un colet de 1 kg și 12 × 8 × 6 cm, cinci curieri la domiciliu și Easybox, cu prețuri finale și estimări. Ofertele fără marcaj de imprimare în această cotație au fost Cargus 23,81 RON și 20 oct., DPD 26,46 RON și 20 oct., SameDay 38,80 RON și 21 oct.; Easybox 21,12 RON și 21 oct. DragonStar și FedEx aveau marcajul „Necesită imprimare” și nu vor apărea în checkout. Interfața publică SmartShip refuză 0,35 kg (`step=1`), dar documentația API definește `weight` ca număr în kg și arată valori fracționare în exemple. Aceste tarife sunt pentru 1 kg și traseul ales, nu sunt prețuri universale. Cotațiile live din checkoutul magazinului rămân dezactivate; tarifele statice de 25/15 RON nu trebuie prezentate ca tarife sincronizate cu SmartShip.

- Safari nu a fost accesibil prin controlul browserului; identitatea de mai sus a fost verificată în Opera. Nu se copiază secrete din conturi AVYRON.
- Există o cotație reală în interfața SmartShip pentru traseul Iași → București la 1 kg, dar lipsește proba API prin Worker la greutatea reală de 0,35 kg, inclusiv Easybox și ramburs. Oferta depinde de adresă, colet, metodă de plată și cont.
- Lipsesc timpii de pregătire confirmați pe fiecare dintre cele cinci produse; până atunci magazinul nu promite o dată totală de sosire pentru produsele făcute la comandă.
- Oblio are seria `CM` disponibilă; verificarea API completă va fi disponibilă după publicarea codului actual. Prima factură cu număr `0001` nu a fost emisă.
- Lipsesc testul Stripe cu contul Cutiuța Magică și confirmarea webhookului semnat. Pentru test sandbox este necesară o cheie și un webhook de test într-un mediu separat; cheia live deja salvată nu se folosește pentru un test sandbox. Nu s-au efectuat plată, AWB, factură, migrare remote, push sau deploy.
- Se verifică după publicare desktop și mobil: autentificare, catalog, coș, ofertele de livrare, suma finală și recuperarea plății.
