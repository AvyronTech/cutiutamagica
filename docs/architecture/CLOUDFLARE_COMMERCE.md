# Arhitectura Cloudflare pentru comert si administrare

## Decizie

Cutiuta Magica este un produs Cloudflare complet separat de AVYRON OS. Aplicatia ruleaza ca monolit modular TanStack Start pe un Worker dedicat, cu Static Assets pentru frontend si SSR/API in acelasi deployment. Aceasta forma pastreaza randarea SEO, server functions si API-ul intr-un singur release atomic; nu foloseste Pages sau resurse AVYRON la runtime.

Separarea frontendului intr-un proiect Pages distinct ramane posibila doar printr-o migrare explicita la doua deploymenturi si contracte HTTP. Nu se creeaza un proiect Pages gol si nu se renunta la SSR doar pentru a bifa formal o resursa.

## Resurse dedicate

| Resursa                       | Responsabilitate                                             | Regula de izolare          |
| ----------------------------- | ------------------------------------------------------------ | -------------------------- |
| Worker `cutiuta-magica-store` | frontend, SSR, API public si admin                           | build si loguri proprii    |
| D1 `cutiutamagica-db`         | catalog, media metadata, stoc, clienti, comenzi, RBAC, audit | nu se partajeaza cu AVYRON |
| R2 `cutiutamagica`            | imagini, audio, video, cadre 360 si arhive                   | structura per produs       |
| KV `cutiutamagica_kv`         | cache si limitare cu consistenta eventuala                   | nu este sursa de adevar    |
| Queues                        | outbox, integrari si sincronizare asincrona                  | nu blocheaza checkoutul    |
| Analytics Engine              | telemetrie agregata                                          | fara date personale brute  |
| Sesiuni admin D1              | autentificare e-mail si parola pentru patru conturi aprobate | RBAC ramane in D1          |

## Domenii interne

```text
catalog -> pricing -> inventory -> checkout -> order
                                      |          |
                                      |          -> outbox -> queue -> adapters
                                      -> payment/shipping placeholders

admin -> servicii de domeniu -> D1/R2 -> audit
public media -> metadata D1 -> obiect R2 -> range/etag/cache
optional sync -> queue -> HMAC webhook -> AVYRON OS
```

## Invariante

- Produsele publicabile au `product_type = 'music_box'`.
- Sumele sunt intregi in bani; calculele de pret si stoc se repeta pe server.
- Comanda pastreaza snapshot pentru produs, client si adresa.
- Disponibilul este `on_hand - reserved` si nu poate deveni negativ.
- Operatiile externe folosesc idempotency keys si retry asincron.
- Secretele providerilor sunt Cloudflare Secrets, niciodata D1 sau frontend.
- AVYRON este destinatie optionala; esecul sincronizarii nu blocheaza magazinul.
- Fisierele devin publice numai dupa validare MIME, drepturi si aprobare marketing.

## Media produs

Schema si Product Studio suporta sloturile `01_hero`, `02_decor`, `03_closed`, `04_dimensions`, `05_mechanism`, `06_melody`, plus audio, secvente 360 si animatie MP4/WebM. Experientele lipsa nu sunt randate public. Audio nu porneste automat cu sunet.

## Autentificare

- Productie si local: exclusiv e-mail si parola, validate server-side pentru cele patru conturi aprobate.
- Parolele sunt stocate numai ca hash PBKDF2 cu salt unic; sesiunile folosesc tokenuri aleatoare, iar D1 pastreaza numai digestul lor.
- Nu exista Cloudflare Access, autentificare prin cod, inregistrare, invitatie sau solicitare publica de acces pentru administratori.
- Parola initiala trebuie schimbata la prima autentificare; incercarile esuate sunt limitate si auditate.
- Conturile clientilor nu sunt inca activate; checkoutul este guest-first pana la alegerea furnizorului de identitate si e-mail tranzactional.

## Integrari

Structura de date si adaptoarele sunt pregatite pentru plati, SmartShip, facturare, eMAG, OLX, Trendyol, Meta si canale sociale. O integrare este considerata activa numai dupa configurarea secretelor, validarea contractului API, test sandbox si reconciliere. Nicio stare din dashboard nu trebuie prezentata drept conectare reala fara aceste conditii.
