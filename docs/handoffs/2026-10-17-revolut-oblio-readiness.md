# Revolut Business, Oblio și plăți — verificare 17 octombrie 2026

## Scop

Identificarea conexiunilor Revolut utile magazinului, păstrarea separării dintre contul bancar Business și procesarea plăților Merchant și afișarea pașilor în panoul financiar.

## Starea verificată în conturile oficiale

- Revolut Business: firma `DIGITAL ECOTECH SOLUTIONS`, cont RON `Cutiuta Magica`. Pagina API Business afișează „Adaugă certificatul API”; nu există certificat configurat. Un token de acces temporar nu asigură sincronizare continuă.
- Revolut Merchant: pagina API afișează „Nicio cheie API încă” și cere verificarea detaliilor afacerii. Magazinul nu are chei Merchant salvate și Revolut Pay nu este activat.
- Revolut → Oblio: Revolut oferă o integrare nativă de tip flux bancar. Documentația furnizorului spune că transferă tranzacții bancare, nu facturi sau cheltuieli. Utilizatorul Oblio disponibil la verificare era „Utilizator Operator”; accesul la conturile bancare a fost refuzat, iar pagina integrării a cerut „Oblio Nelimitat”. Nu s-a transmis consimțământ bancar și nu s-a comandat un abonament.
- Separat, conexiunea API Oblio pentru facturarea magazinului și seria CM de la 0001 rămân configurate. Fluxul bancar nativ nu înlocuiește integrarea de facturare.

## Schimbări pregătite local

- `src/admin/pages/ProviderSetupGuide.tsx`: ghiduri distincte Revolut Business → Oblio și Revolut Merchant, cu trimiteri oficiale.
- `src/admin/pages/CheckoutConnections.tsx`: afișează pașii Merchant lângă câmpurile cheilor și condițiile de activare.
- `src/admin/pages/GrowthSettings.tsx`: explică în Finanțe unde se autorizează și se verifică fluxul bancar și că referința contului este doar informativă.
- `docs/integrations/COMMERCE_PROVIDERS.md`: aduce inventarul furnizorilor la starea verificată în 17 octombrie.

Nu s-au adăugat migrații, secrete, transferuri bancare sau metode noi active în checkout.

## Verificări locale

- `npm run typecheck`: trecut.
- `npm test`: 49 fișiere, 268 teste trecute.
- `npm run lint`: trecut după formatare.
- `npm run build`: trecut; a apărut doar un avertisment de jurnal Wrangler fără efect asupra buildului.
- `npm run cf:deploy:dry`: trecut, fără publicare.
- `git diff --check`: trecut.

Schimbările vizuale sunt text în panouri administrative colapsabile. Capturile desktop și mobil necesită publicarea codului nou și accesul administrativ în browser; nu sunt prezentate ca verificări deja efectuate.

## Pași rămași

1. Administratorul Oblio verifică drepturile bancare și disponibilitatea planului Nelimitat. Numai dacă acestea există, se conectează contul RON `Cutiuta Magica` și se verifică apariția lui în Oblio. Orice cost de abonament se aprobă separat.
2. Pentru Revolut Pay, se finalizează verificarea Merchant în Revolut, apoi se configurează cheia și webhookul cu aprobare distinctă. Se face un test complet înainte de activarea în checkout.
3. Publicarea acestor instrucțiuni cere push, pull request, merge și deploy aprobate pentru această schimbare. Până atunci, ele sunt doar în ramura locală `codex/revolut-integration-readiness`.

## Surse

- [Revolut: conectarea Oblio](https://help.revolut.com/en-RO/business/help/integrating-with-external-apps/using-the-oblio-integration/bank-feed/how-do-i-connect-my-revolut-business-account-with-oblio-oblio-bank-feed/)
- [Revolut: ce sincronizează Oblio](https://help.revolut.com/en-RO/business/help/integrating-with-external-apps/using-the-oblio-integration/bank-feed/how-does-the-oblio-integration-work-oblio-bank-feed/)
- [Oblio: integrarea tranzacțiilor bancare](https://www.oblio.eu/integrari/tranzactii-bancare)
- [Revolut: Merchant API](https://developer.revolut.com/docs/guides/merchant/get-started)
