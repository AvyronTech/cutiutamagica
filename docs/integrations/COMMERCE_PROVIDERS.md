# Infrastructură comercială și integrări

Actualizat: 2026-10-09

## Decizie curentă

- FGO este retras din fluxul activ. Istoricul facturilor și jurnalelor rămâne intact.
- Oblio este furnizorul pregătit pentru facturare, dar emiterea rămâne blocată până la configurarea și verificarea explicită a contului.
- Stripe și Revolut Pay sunt pregătite arhitectural, însă rămân dezactivate și neconectate în această etapă.
- NETOPIA este rezervat pentru o etapă ulterioară și va folosi Payment API v2.
- SmartShip rămâne agregatorul pentru livrările magazinului. Pentru comenzile eMAG, AWB-ul și curierii se tratează prin API-ul eMAG Marketplace, nu prin fluxul direct al magazinului.

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

## Stripe — etapă ulterioară

Documentație oficială:

- [SetupIntents](https://docs.stripe.com/api/setup_intents)
- [PaymentIntents și `setup_future_usage`](https://docs.stripe.com/api/payment_intents/create)
- [Payment methods](https://docs.stripe.com/api/payment_methods/attach)
- [Subscriptions](https://docs.stripe.com/billing/subscriptions/overview)

Implementarea viitoare trebuie să creeze un `Customer`, să colecteze consimțământ explicit, să salveze numai ID-urile Stripe și datele mascate și să trateze plățile `off_session` care cer autentificare suplimentară. Cheile și webhookul nu se configurează în această etapă.

## Revolut Pay — etapă ulterioară

Documentație oficială:

- [Merchant API](https://developer.revolut.com/docs/api/merchant)
- [Metode de plată salvate](https://developer.revolut.com/docs/guides/merchant/optimise-checkout/save-payment-methods/charge-saved-payment-method)
- [Subscriptions API](https://developer.revolut.com/docs/guides/merchant/billing-subscriptions/api/get-started)

Comanda nu este considerată plătită pe baza revenirii în site. Starea finală vine din webhookul verificat și este reconciliată cu suma, moneda, mediul și ID-ul tentativei. Cheile și webhookul nu se configurează în această etapă.

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
