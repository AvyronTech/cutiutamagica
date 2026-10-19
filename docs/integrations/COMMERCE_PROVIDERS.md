# Infrastructură comercială și integrări

Actualizat: 2026-10-19

Verificarea live și starea PR-urilor din 19 octombrie sunt documentate în [handofful de integrări](../handoffs/2026-10-19-pr-integrations-readiness.md). Oblio Nelimitat este activ, SMS 2FA a fost activat de titular, iar cota de 0% pentru neplătitor a fost verificată prin API. Oblio vede șase conturi Revolut; titularul a decis să nu restrângem integrarea acum. Stripe Account ID a fost salvat și cheia a fost reverificată; checkoutul cu cardul rămâne oprit până la testul complet.

## Decizie curentă

- FGO este retras din fluxul activ. Istoricul facturilor și jurnalelor rămâne intact.
- Oblio are cheia configurată pentru DIGITAL ECOTECH SOLUTIONS S.R.L.; seria CM începe de la 0001. Verificarea API a contului, firmei, seriei și cotei de 0% a reușit la 19 octombrie, 02:56; nu s-a emis o factură de acceptanță. Numărul Registrului Comerțului corectat a fost confirmat prin e-mail de titular și verificat după reîncărcarea fișei firmei.
- Stripe are cheia și webhookul configurate pentru Cutiuța Magică, dar plata cu cardul rămâne dezactivată până la testul complet de checkout.
- Revolut Business este un cont bancar distinct. Fluxul GoCardless Revolut–Oblio este autorizat și Oblio afișează șase conturi, inclusiv contul RON al magazinului; titularul a cerut să nu modificăm conexiunile suplimentare. Nu descrie fluxul drept limitat la RON. API-ul Merchant nu este conectat. Oblio Nelimitat și SMS 2FA sunt active. Contul Merchant cere verificarea firmei înainte de emiterea unei chei.
- NETOPIA este rezervat pentru o etapă ulterioară și va folosi Payment API v2.
- SmartShip este configurat, dar cotațiile live rămân dezactivate: cererea de cost a întors codul furnizorului `91929`. Pentru comenzile eMAG, AWB-ul și curierii se tratează prin API-ul eMAG Marketplace, nu prin fluxul direct al magazinului.

## Model intern

Datele comerciale sunt separate în D1 astfel:

- `customers` reprezintă identitatea comercială; `review_accounts.customer_id` leagă autentificarea clientului de aceasta;
- `service_offerings` și `billing_prices` descriu servicii, produse și planuri unice sau recurente;
- `billing_customers` păstrează numai identificatori externi ai clientului la procesator;
- `customer_payment_methods` păstrează numai tokenul procesatorului și date mascate, niciodată PAN sau CVC;
- `payment_consents` păstrează dovada consimțământului pentru salvare, plăți în afara sesiunii și abonamente;
- `billing_subscriptions` și jurnalul imuabil `billing_subscription_events` păstrează starea locală reconciliată prin webhook;
- `provider_operations` asigură idempotentă și audit pentru orice apel extern;
- PDF-urile fiscale se arhivează privat în R2, cu metadate în D1.

## Reguli de activare

O integrare nu este considerată activă doar pentru că există o cheie. Activarea necesită, în ordine:

1. contract și cont verificate;
2. secrete configurate în Cloudflare sau în seiful criptat existent;
3. mediu corect (sandbox/producție);
4. webhook/IPN verificat criptografic;
5. test de acceptanță documentat pentru plată, revenire, anulare și reconciliere;
6. aprobare explicită înainte de activarea în checkout.

## Stripe

Documentație oficială:

- [SetupIntents](https://docs.stripe.com/api/setup_intents)
- [PaymentIntents și `setup_future_usage`](https://docs.stripe.com/api/payment_intents/create)
- [Payment methods](https://docs.stripe.com/api/payment_methods/attach)
- [Subscriptions](https://docs.stripe.com/billing/subscriptions/overview)

Pentru carduri salvate, implementarea trebuie să colecteze consimțământ explicit, să salveze numai ID-urile Stripe și datele mascate și să trateze plățile `off_session` care cer autentificare suplimentară. Existența cheilor nu activează checkoutul; confirmarea semnată și testul de acceptanță sunt necesare.

## Revolut Business și Revolut Pay

Documentație oficială:

- [Merchant API](https://developer.revolut.com/docs/api/merchant)
- [Conectarea Revolut Business la Oblio](https://help.revolut.com/en-RO/business/help/integrating-with-external-apps/using-the-oblio-integration/bank-feed/how-do-i-connect-my-revolut-business-account-with-oblio-oblio-bank-feed/)
- [Ce sincronizează integrarea Oblio](https://help.revolut.com/en-RO/business/help/integrating-with-external-apps/using-the-oblio-integration/bank-feed/how-does-the-oblio-integration-work-oblio-bank-feed/)
- [Metode de plată salvate](https://developer.revolut.com/docs/guides/merchant/optimise-checkout/save-payment-methods/charge-saved-payment-method)
- [Subscriptions API](https://developer.revolut.com/docs/guides/merchant/billing-subscriptions/api/get-started)

Pentru reconcilierea bancară, integrarea nativă Revolut–Oblio sincronizează tranzacții, nu facturi, cheltuieli sau plățile checkoutului. La 19 octombrie, planul Nelimitat, contul de administrator și SMS 2FA au fost verificate. După autorizarea GoCardless, Oblio a afișat șase conturi Revolut, deși intenția inițială era numai contul RON al magazinului. Titularul a refuzat modificarea integrărilor în acel moment; conexiunile suplimentare se păstrează până la o decizie nouă. Un token Business API temporar nu este o conexiune bancară durabilă; integrarea nativă nu cere cheia API a magazinului.

Revolut Pay necesită un cont Merchant aprobat, cheie Merchant și secret webhook separate. Comanda nu este considerată plătită pe baza revenirii în site. Starea finală vine din webhookul verificat și este reconciliată cu suma, moneda, mediul și ID-ul tentativei. Nu activa Revolut Pay înainte de un test complet documentat.

## Oblio

Documentație oficială:

- [API Oblio](https://www.oblio.eu/api/)
- [Documentație PDF](https://www.oblio.eu/download/api-oblio.pdf)

Autorizarea OAuth2 folosește emailul contului drept `client_id` și secretul API drept `client_secret`. Tokenul de acces este temporar. Emiterea se face prin `POST /api/docs/invoice`, cu `idempotencyKey`; produsele fizice și serviciile sunt diferențiate în payload. Conectorul nu emite nimic până când profilul juridic, CIF-ul, seria și secretul nu sunt configurate și aprobate.

## SmartShip și Sameday

Documentație oficială:

- [SmartShip API](https://smartship.ro/api-docs)
- [Integrare API SmartShip](https://smartship.ro/integrari/api)
- [eMAG Marketplace API](https://marketplace-api.emag.ro/api-doc)

Pentru magazinul propriu, fluxul folosește cotație, localități/lockere, creare AWB, status, anulare și etichetă prin SmartShip. Easybox necesită `locker_id`. Pentru comenzile eMAG, contul de curier și AWB-ul sunt gestionate separat prin API-ul Marketplace.

## NETOPIA — etapă ulterioară

Documentație oficială:

- [Payment API](https://doc.netopia-payments.com/docs/payment-api/)
- [Payment API v2](https://doc.netopia-payments.com/docs/payment-api/v2.x/start/start-strc/)
- [SDK-uri oficiale](https://github.com/netopiapayments)

Integrarea trebuie construită pe v2, cu medii și tokenuri separate, validare IPN și reconciliere server-to-server. Tokenizarea sau plățile recurente nu se activează până când funcționalitatea contractuală și schema exactă v2 sunt confirmate pentru contul comerciantului.
