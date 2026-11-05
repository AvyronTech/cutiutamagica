# Handoff — statistici și tracking SmartShip în admin

## Scop

Ramura `codex/admin-shipping-insights` adaugă date operaționale SmartShip în dashboardul intern, pagina Livrare și fișa comenzii. Nu schimbă checkoutul, prețul clientului, emiterea AWB ori fluxul de ridicare.

## Ce este disponibil

- Dashboard: AWB-uri emise, în tranzit, livrate, de verificat și expirarea verificării la 48 de ore; acces direct la Livrare, Integrări și Statistici.
- Livrare: indicatori din D1 pentru AWB-uri, oferte din ultimele 30 de zile, curieri, evenimente de tracking și expedierile care cer atenție.
- Livrare: citire la cerere a soldului disponibil, listei de AWB-uri, deconturilor ramburs și facturilor SmartShip; linkurile PDF sunt limitate la domeniul SmartShip. Datele personale din răspunsurile SmartShip nu sunt returnate interfeței.
- Comenzi: starea ultimei expedieri SmartShip și buton de actualizare a trackingului. Fiecare verificare se auditează; evenimentele identice se deduplică.

API-urile consultate sunt documentate de [SmartShip](https://smartship.ro/api-docs): `GET /awb/status/{awb}`, `GET /account/balance`, `GET /awbs`, `GET /payouts`, `GET /invoices`. Citirile folosesc cheia SmartShip din seiful criptat existent. Nu se adaugă secrete ori migrații D1.

Accesul la expedieri cere `orders.read`, actualizarea trackingului cere `orders.write`, iar soldul, deconturile și facturile cer atât `integrations.read`, cât și `reports.read`.

## Fișiere

`src/admin/pages/Dashboard.tsx`, `Orders.tsx`, `Shipping.tsx`, `ShippingInsightsPanel.tsx`; `src/lib/admin-contracts.ts`, `admin.functions.ts`; `src/server/db/admin.repository.ts`, `services/shipping-insights.ts`, `integrations/smartship.ts`; testele `src/server/growth.test.ts` și `integrations/smartship.test.ts`.

## Dovezi și limite

- Datele locale provin din comenzile și expedierile reale ale magazinului. Datele contului sunt citite din SmartShip numai la apăsarea butonului.
- La verificarea D1 de producție din 17 octombrie 2026, magazinul avea 0 expedieri SmartShip și 0 cereri de AWB. Nu există încă un AWB real pentru verificarea end-to-end a trackingului.
- Durata de livrare este calculată între prima stare `in_transit` observată în magazin și prima stare `delivered` observată; nu reprezintă obligatoriu timpul exact înregistrat de curier.
- Secțiunile contului pot raporta separat indisponibilitate dacă API-ul sau planul SmartShip refuză o citire. Interfața nu promite gratuitate contractuală; aceste operații sunt citiri API, fără emitere de AWB.
- Nu s-au făcut push, merge, deploy, migrare remote ori activare de provider în cadrul acestei schimbări.

## Verificări

`npm run typecheck`, `npm test`, `npm run lint`, `npm run build`, `npm run cf:deploy:dry` și `git diff --check` trebuie să treacă înainte de PR. Testele includ parsarea răspunsurilor SmartShip, eliminarea datelor private din sumar și două actualizări consecutive ale aceluiași AWB fără eveniment duplicat.

Interfața administrativă locală necesită sesiune și D1; dacă acestea nu sunt disponibile, verificarea vizuală a ecranelor admin la 390 px și 1440 px rămâne de făcut într-un mediu autentificat înainte de publicare.
