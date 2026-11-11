# Pregătirea publicării fluxurilor comerciale

Revizia locală include migrarea D1 append-only `0096_marketplace_invoices.sql`, emiterea și imprimarea facturii Oblio din comandă, încărcarea configurabilă în marketplace și recuperarea confirmării Stripe. Comenzile, plățile, facturile și AWB-urile folosite în teste sunt fictive. Pachetul folosește configurația de producție a magazinului.

## Starea citită în producție la 11 noiembrie 2026

| Flux | Observat | Verificare rămasă |
| --- | --- | --- |
| Magazin și checkout | Health 200 cu D1 schema 95. Checkout afișează Stripe și ramburs în RON. SmartShip a returnat trei oferte de curier pentru o adresă din Iași și 80 de rezultate la căutarea easybox. | Confirmă aceleași metode și cotația reală de transport după publicare. |
| Stripe | Configurația de checkout activează mediul `production`. D1 are o sesiune expirată și un webhook semnat `checkout.session.expired` procesat. În D1 sunt zero plăți Stripe capturate. Catalogul istoric de furnizori marchează încă Stripe `disabled`, deși setarea de checkout și ruta publică îl oferă. | Verifică destinația și evenimentele live în contul Stripe al magazinului. Corelează prima comandă comercială plătită cu captura, webhookul, statusul comenzii și notificările. |
| Revolut Merchant | Opțiunea de checkout este dezactivată. | Pentru lansarea separată a metodei sunt necesare contul Merchant, credențialele, webhookul și acceptanța procesatorului. |
| Trendyol | Sincronizarea comenzilor și deconturilor este activă și a rulat în ziua verificării. Există un colet în procesare. | Confirmă PDF-ul primei facturi autorizate în portal după publicare. FAN Courier folosește AWB-ul Trendyol. |
| Oblio | Este furnizorul ales în checkout, cu profil activ în D1. Registrul magazinului are zero facturi Oblio emise. | Corelează prima factură reală emisă din dashboard cu documentul Oblio, arhiva și înregistrarea încasării, unde se aplică. |
| eMAG | Conectorul din revizie este pentru 3P. Portalul verificat avea lista IP-urilor autorizate goală. | Configurează ieșirea aprobată și contul API, validează citirea și verifică documentele. Deconturile și scrierea prețurilor/stocului în oferta eMAG nu sunt implementate de conectorul fiscal. |
| Integritate D1 | `PRAGMA foreign_key_check` a returnat zero încălcări. Ultima migrare live este 0095. Cloudflare a returnat un bookmark D1 de recuperare. | Verifică din nou istoricul migrărilor și integritatea după aplicarea 0096. |

Stripe poate confirma acum o comandă și când clientul revine înainte de webhook. Backendul citește de la Stripe sesiunea asociată încercării salvate, verifică mediul, identitatea comenzii, suma și moneda și marchează plata o singură dată. Aceeași confirmare poate sosi ulterior prin webhook. Rezultatul expirat și neplătit folosește logica existentă de eliberare a comenzii. O referință diferită sau un răspuns incomplet lasă comanda în așteptare. [Stripe Checkout și confirmarea plăților](https://docs.stripe.com/checkout/fulfillment)

## Ordinea de publicare

1. Verifică din nou ramurile de referință, Workerul activ, schema D1, triggerul orar și bookmarkul D1. Aplică doar migrarea 0096 înainte de publicarea Workerului.
2. Publică revizia validată pe Workerul Cutiuța Magică și păstrează variabilele de producție. Confirmă schema 96 pe domeniul public, accesul autorizat la documente, metodele de plată și livrare, respingerea callbackurilor nesemnate și funcționarea cozii.
3. În prima comandă plătită reală, corelează totalul și moneda din Stripe cu o singură captură, o singură comandă plătită, notificările și factura Oblio. Activează transmiterea automată pe fiecare marketplace după ce documentul primei comenzi este vizibil în portal.
4. Dacă trebuie revenit, folosește versiunea Worker anterioară și păstrează istoricul D1. Dezactivează transmiterea automată înainte de revenire dacă a fost activată.

[Pregătirea documentelor și particularitățile marketplace](2026-11-11-marketplace-fiscal-sync.md)

Typecheck, lint, build, verificarea configurației de producție, simularea de deploy și scanarea sursei au trecut. Din 559 de teste, 554 au trecut la prima rulare și cinci au depășit limita de cinci secunde. Toate cele cinci au trecut la reluare cu timp alocat mai mare. Testele de regresie acoperă recuperarea confirmării Stripe, referința de comandă greșită și webhookul sosit după confirmare.
