# Reconciliere PR și integrări — 19 octombrie 2026

## Ramura de referință

`codex/cutiuta-cloudflare-final` la `77c7270` este baza aplicației Cloudflare. Această verificare a fost făcută într-un worktree separat, pe `codex/integrations-pr-reconcile`, fără a modifica checkoutul principal. Nu se rescriu migrațiile D1 deja aplicate și nu se combină proiectul Supabase din `main` cu Worker/D1/R2.

## Pull requesturi deschise

| PR | Stare față de baza curentă | Decizie de reconciliere |
| --- | --- | --- |
| [#21](https://github.com/AvyronTech/cutiutamagica/pull/21) carusele sociale | Head `065bacc`, bază `77c7270`, mergeable; 285 teste raportate în PR | Deja adaptat la ultima bază. Verifică din nou CI înainte de orice merge; nu activează publicarea socială. |
| [#2](https://github.com/AvyronTech/cutiutamagica/pull/2) Metricool | Head `63c8fe6`, bază veche `4b8ddc1`, conflicte | Nu combina: baza curentă are `MetricoolTracker` legat de consimțământul central. PR-ul ar afișa un al doilea dialog și ar stoca o alegere separată. |
| [#3](https://github.com/AvyronTech/cutiutamagica/pull/3) Studio AI | Head `24d774f`, bază veche `4b8ddc1`, conflicte | Nu aplica migrațiile vechi 0052–0053 ori hashul de cont codificat acolo: schema curentă are deja Studio AI, runnerul local, modulul admin și migrații ulterioare. Orice funcție unică se portează punctual prin migrare nouă și test. |
| [#1](https://github.com/AvyronTech/cutiutamagica/pull/1) spre `main` | Draft, altă bază | Păstrează draftul ca reconciliere separată. `main` conține infrastructură Supabase incompatibilă; nu face merge automat. |

## Starea integrărilor observată în producție

- **Stripe:** contul Cutiuța Magică a fost verificat prin API la 19 octombrie, după salvarea Account ID corect. Destinația webhook pentru `/api/v1/webhooks/stripe` este activă și ascultă patru evenimente Checkout; pagina Stripe arată zero livrări în săptămâna curentă. Checkoutul cu cardul rămâne dezactivat: lipsește testul complet, inclusiv confirmarea semnată.
- **Oblio:** planul Nelimitat este activ, utilizatorul curent este administrator, seria `CM` începe intern cu `0001`, iar magazinul nu a emis facturi. Titularul a activat autentificarea prin SMS. În nomenclator a fost adăugată cota `Neplatitor TVA` de 0% și setată implicită, în locul cotei `Normala` de 21%. Verificarea API din magazin a confirmat contul, firma, seria și cota la 19 octombrie, 02:56, fără emitere. Numărul Registrului Comerțului din Oblio avea un `J` suplimentar la final; corectarea la valoarea deja confirmată în magazin a fost introdusă, dar salvarea așteaptă codul de e-mail al titularului.
- **Revolut Business → Oblio:** fluxul GoCardless a fost inițiat după acordul explicit pentru detalii, sold și ultimele 90 de zile de tranzacții, cu expirare la 90 de zile. S-a ales profilul Business, dar Revolut cere codul de acces al titularului înainte de selectarea contului. Conexiunea nu este încă încheiată; la ecranul următor trebuie selectat exclusiv contul RON Cutiuța Magică și verificată apariția lui în Oblio. Revolut Merchant rămâne o integrare distinctă, neconfigurată în checkout.
- **SmartShip:** cheia, expeditorul și IBAN-ul ramburs sunt configurate. Cotațiile live sunt oprite după răspunsul furnizorului `91929`; tarifele fixe sunt 25 RON la adresă, 15 RON la locker și gratuite de la 300 RON. Contul SmartShip a raportat sold și credit disponibil zero la verificarea din 19 octombrie. Nu presupune că acest sold explică eroarea de cotație; cere clarificare furnizorului înainte de activarea cotațiilor.
- **E-mail:** Resend și domeniul sunt verificate; centrul de e-mail arată un test acceptat, două teste vechi eșuate către adresă neverificată, zero abonați confirmați. Planurile Transactional și Marketing sunt Free: pagina Usage din 19 octombrie arată 1/3.000 e-mailuri lunare, 0/100 zilnice, 0/1.000 contacte și 2/3 segmente. Opțiunile cu plată la depășirea cotei sunt oprite. Campaniile și mesajele Magic Rewards rămân controlate de consimțământ și de limitele Free.
- **Search Console:** proprietatea `sc-domain:cutiutamagica.eu` este salvată în magazin, iar sitemapul existent a fost retrimis pe 19 octombrie. În GSC era încă afișată starea veche „Nu s-a putut prelua”, cu ultima citire pe 17 octombrie; reprocesearea trebuie urmărită. Tokenul OAuth read-only pentru importul backend lipsește.

## Pregătire Google Cloud fără activare

Google Cloud a fost deschis în Opera cu `cutiutamagicaofficial@gmail.com`. După confirmarea expresă a titularului pentru termenii Google Cloud, a fost creat proiectul **Cutiuta Magica Search Console**, ID `cutiuta-magica-search-console`. Nu s-a pornit trialul, nu s-a activat Search Console API și nu s-a conectat facturare. Proiectul este doar pregătit.

Pentru import durabil al datelor GSC, proiectul dedicat Cutiuța Magică trebuie să aibă Search Console API și o aplicație OAuth web cu scope `https://www.googleapis.com/auth/webmasters.readonly`. Google emite tokenuri de acces temporare; importul automat are nevoie de flux server-side cu refresh token criptat, revocare și jurnal de verificare. Implementarea curentă acceptă un token read-only introdus manual și face import la cerere. Nu prezenta această stare ca sincronizare automată.

## Porți înainte de activare

1. Finalizează codul de e-mail pentru corectarea numărului Registrului Comerțului în Oblio și verifică valoarea salvată; la prima factură reală reconciliază numărul Oblio cu registrul intern.
2. Finalizează autentificarea Revolut pentru fluxul GoCardless, selectează doar contul RON al magazinului și verifică apariția lui în Oblio.
3. Rulează un checkout Stripe controlat în mediul potrivit, verifică suma, revenirea și webhookul semnat, apoi salvează referința de test. Nu activa cardul numai pe baza cheii sau a destinației webhook.
4. Obține un răspuns pentru eroarea SmartShip `91929`, apoi verifică o cotație reală și opțiunile care nu cer imprimarea etichetei înainte de a înlocui tarifele fixe.
5. Verifică reprocesearea sitemapului; pentru importul automat GSC pregătește OAuth cu acces numai pentru citire și reînnoire sigură.

Nu au fost create comenzi, plăți, facturi, AWB-uri, campanii sau transferuri bancare în timpul acestei verificări.
