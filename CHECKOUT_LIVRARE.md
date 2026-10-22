# Checkout și infrastructură comercială — implementare locală

23 septembrie 2026. Nicio publicare, plată reală, conectare de cont sau emitere de factură efectuată.

## Experiența cumpărătorului

- Câmpuri cu etichete persistente, completare automată, validare și buton de comandă cu obligație de plată inclusiv pe mobil.
- Sumar separat: produse înainte de reducere, reducere, transport și total. Când transportul nu este cunoscut, suma este numită explicit „Produse, fără livrare”; acordul pentru totalul final precede expedierea.
- Opțiunile de plată provin din configurarea serverului. Metodele neactivate nu sunt promovate public. Textele despre activarea Stripe, validarea SmartShip și antifraudă au fost eliminate din coș.
- Datele cardului sunt introduse doar pe pagina procesatorului; magazinul nu colectează numărul cardului sau CVV.
- O comandă salvată pentru plata online este păstrată în sesiunea browserului, fără date personale. Revenirea verifică starea pe server; parametrul din URL nu confirmă plata. Coșul este consumat după plata confirmată, păstrând eventualele cantități adăugate ulterior.
- Plata întreruptă poate fi reluată pe aceeași comandă. O eroare de rețea la trimiterea comenzii păstrează aceeași cerere și aceeași cheie de idempotență, inclusiv dacă între timp oferta de transport expiră.
- Chatul este ridicat deasupra butonului de comandă pe telefon. Asistența la revenirea din plată reutilizează numărul de contact al magazinului.

## Plăți

**Stripe:** checkout găzduit, URL verificat, valoare calculată pe server, cheie de idempotență stabilă. Webhookurile folosesc semnătura HMAC, fereastră temporală și suport pentru rotația semnăturilor. Confirmarea cere sesiunea exactă, suma, moneda, mediul și starea `paid`. Un eveniment primit înaintea salvării sesiunii poate fi reluat. Expirarea sesiunii anulează numai comanda neplătită și eliberează rezervarea prin mecanismul existent.

**Revolut Pay:** adaptor Merchant separat de Revolut Business, checkout găzduit, produse și adresă din comanda salvată. Notificarea semnată este verificată și prin citirea autentificată a comenzii de la Revolut. O inițiere cu rezultat incert nu este repetată automat; notificarea poate recupera legătura folosind referința internă verificată. În lipsa notificării, este necesară reconcilierea operatorului în Merchant. Codul poștal este necesar pentru adresa transmisă.

**NETOPIA:** infrastructură internă pregătită pentru cheia API, cheia publică IPN, POS Signature, Active key ID, mediu și referința testului. Activarea publică este blocată în cod. **Adaptorul hosted checkout și verificarea IPN NETOPIA nu sunt încă implementate.** Documentația curentă prezintă atât contractul vechi cu XML criptat, cât și exemple v2 cu date de card. Implementarea finală trebuie să folosească fluxul găzduit confirmat pentru contul comerciantului; nu se colectează PAN/CVV în acest site.

Plățile Stripe/Revolut sunt implementate și testate local cu răspunsuri simulate, nu conectate sau certificate în conturi reale. Ambele sunt dezactivate implicit. Activarea din dashboard necesită cheile mediului curent și o referință declarată de administrator pentru testul complet reușit. Cheile Stripe de test nu activează producția. Acest control nu înlocuiește proba efectivă în sandbox.

Comenzile care au deja o încercare de plată din fluxul vechi sunt blocate de la inițierea unei a doua încercări și trebuie reconciliate înaintea migrării în producție. Mediul încercărilor istorice trebuie verificat în planul de migrare; nu se deduce că au fost plăți de test.

## Curierat în coș

Ofertele SmartShip se cer explicit după completarea datelor. Serverul rezolvă județul și localitatea prin nomenclatoarele oficiale, calculează valoarea coșului și aplică setările expeditorului, coletului și gratuității. Nomenclatoarele sunt păstrate temporar pentru a evita apelurile repetate. Cumpărătorul este informat înainte de transmiterea datelor de livrare către serviciul de curierat.

Ofertele returnează curierul, prețul și estimarea atunci când furnizorul o oferă. Sunt valabile 10 minute și sunt legate de produse, cantități, prețuri, adresă, contact și modalitatea de plată. Comanda citește prețul din baza de date, verifică oferta și o revendică atomic. Schimbarea datelor invalidează selecția. Un total schimbat față de cel acceptat în coș oprește comanda înainte de rezervare.

Greutatea este scalată cu numărul cutiuțelor; configurația coletului trebuie validată pe ambalajele reale înainte de activare. O estimare de curier nu este o garanție a orei de livrare. Rambursul folosit la estimare este valoarea produselor; eventualele diferențe comerciale ale taxei pentru colectarea transportului trebuie validate în contractul SmartShip. Nu se emite AWB la calcularea ofertelor.

Livrarea easybox nu este afișată și nici acceptată până la implementarea selecției efective a lockerului. Tariful standard verificat rămâne disponibil separat. În absența lui, clientul primește clar informarea privind confirmarea ulterioară a costului.

## Administrare

`/admin/integrations` include panoul privat „Plăți și facturare”: chei criptate, mediu, test de acceptanță, activare, încercări de plată în curs/de verificat, configurații NETOPIA și alegerea viitorului furnizor de facturare. Salvările concurente sunt protejate prin versiuni și auditate. Publicul nu primește starea cheilor, setările interne, dimensiunile implicite ale coletelor sau planurile de monede viitoare.

FGO păstrează fluxul existent de emitere din Facturare. Oblio are configurare internă pentru secret, email, CIF și serie; **adaptorul de emitere Oblio rămâne de implementat**. Selectarea unui furnizor nu emite facturi și nu activează automat plățile. Datele cardului firmei se completează exclusiv în portalul furnizorului.

Migrarea append-only `0024_checkout_foundation.sql` adaugă alegerea procesatorului, mediul plății, revendicarea ofertelor de curierat și blocarea modificării totalului unei comenzi cu plată inițiată. A fost aplicată doar local.

## Verificare

Rezultatele finale ale verificărilor sunt consemnate în `LIVRARE_EXPERIENTA_MAGICA.md`. Browserul aplicației a refuzat previzualizarea locală deoarece nu a putut verifica politica de securitate administrată. Nu s-a ocolit acest control: validarea vizuală desktop/mobil și un flux real în sandbox rămân necesare.

Surse oficiale consultate: [Stripe — confirmarea plății](https://docs.stripe.com/checkout/fulfillment), [Revolut — hosted checkout](https://developer.revolut.com/docs/guides/merchant/accept-payments/online-payments/hosted-checkout-page/api), [Revolut — Merchant API](https://developer.revolut.com/docs/api/merchant), [Revolut — semnătura webhook](https://developer.revolut.com/docs/guides/merchant/monitor-and-observe/webhooks/verify-the-payload-signature), [SmartShip — API](https://smartship.ro/api-docs), [NETOPIA — SDK Go v2](https://doc.netopia-payments.com/docs/payment-sdks/go/), [NETOPIA — pagina SDK Node](https://doc.netopia-payments.com/docs/payment-sdks/nodejs/).
