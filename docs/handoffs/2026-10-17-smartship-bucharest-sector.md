# Handoff: sector București pentru cotații SmartShip

## Scop

Testul real din checkout a primit HTTP 200 cu `status: 999` de la SmartShip: destinatarul din București avea `sector: 0`. Documentația furnizorului cere sectorul 1–6 pentru București; o probă fără sector a confirmat eroarea `302501`, iar aceeași cerere cu sector valid a întors oferte.

## Schimbări

- Checkoutul cere sectorul pentru o adresă din București. Pentru Easybox din București folosește sectorul din codul poștal al punctului când este disponibil și cere alegerea lui când lipsește.
- API-ul de cotații trimite sectorul corect către SmartShip și explică eroarea de completare. Sectorul intră în amprenta ofertei și este păstrat în ofertă, adresă și cererea ulterioară de AWB.
- Răspunsurile SmartShip cu erori de validare și IBAN nu mai apar ca eroare generică „(200)”. Nu se expun detalii sensibile ale furnizorului.
- Migrare append-only: `0066_bucharest_delivery_sector.sql`, cu coloanele `shipping_quotes.recipient_sector` și `order_addresses.sector`.

## Verificări și activare

- Verificări locale: typecheck, 49 fișiere / 268 teste, lint, build, tipuri Cloudflare și `cf:deploy:dry` trecute. Testul de integrare urmărește sectorul 3 de la cotație până la AWB. Verifică și interfața la 390 și 1440 px după publicare.
- Cotațiile live au fost dezactivate imediat după eșecul de producție și rămân dezactivate până la cotația de control după publicarea corecției. Nu a fost creată comandă, plată, factură sau AWB în proba reală.
- După publicare: verifică schema 66, cotație reală București cu sector ales, ofertele afișate și costul final; testează separat Easybox și ramburs. Lasă cotațiile live active numai dacă aceste probe reușesc. Dacă apare o eroare, oprește din nou cotațiile și păstrează checkoutul cu confirmare manuală.

## Revenire

Dezactivează `use_live_quotes` din politica de livrare. Migrarea rămâne aplicată, iar coloanele noi nu afectează livrarea manuală.
