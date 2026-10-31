# Marketplace: listări, stoc și comenzi

## Contract comun

Magazinul rămâne sursa centrală pentru produs, SKU, identificatori, media, cost și stoc fizic. O listare marketplace are propriul titlu, categorie, atribute, preț, stoc tampon, ID extern, status și hash al snapshotului. Nu copia mecanic descrierea socială într-o listare comercială.

Înainte de o activare:

1. verifică identitatea sellerului, țara, contractul, capabilitățile și secretul server-side;
2. validează categoria, atributele, identificatorii, imaginile și politica de livrare/retur cerute de canal;
3. rulează healthcheck și, când există, sandbox sau preview;
4. pregătește diferența dintre snapshotul catalogului și payloadul extern;
5. cere aprobarea reviziei și a efectului exact;
6. execută idempotent și salvează request hash, ID extern, status, răspuns și dovadă;
7. la rezultat incert, citește starea externă înainte de retry.

Importul comenzilor poate rula automat doar după verificarea conectorului. Deduplică strict prin `channel_id + external_order_id`, păstrează totalurile și statusul sursei, mapează SKU-ul la varianta locală și nu rezervă stoc de două ori. Confirmarea, anularea, prețul, stocul, factura, AWB-ul și fulfillmentul către platformă sunt efecte externe distincte și auditate.

## eMAG Marketplace

- folosește exclusiv API-ul oficial; documentația curentă observată este v4.5.1;
- capabilități: produse/documentații, oferte, preț, stoc și procesarea comenzilor;
- o ofertă se asociază produsului existent când platforma îl recunoaște; produsul nou necesită categoria, caracteristicile și identificatorii validați;
- imaginile trebuie să respecte standardul categoriei și să arate produsul real; nu încărca fundaluri sociale ca fotografie principală de catalog;
- nu considera emailul sursă sigură pentru comenzi după activarea API; folosește importul API și reconcilierea;
- până când credentialele, scope-urile și o citire de test sunt verificate, păstrează `setup_required` și permite numai ciorne/export.

Documentație oficială: `https://marketplace.emag.ro/infocenter/emag-academy/cum-se-adauga-un-produs/importul-prin-feed/documentatie-tehnica/`.

## Trendyol

- folosește numai Product V2 și Order V2; serviciile V1 au fost retrase la `2026-10-15`;
- capabilitățile oficiale includ transfer de produs, actualizare preț/stoc, comenzi, facturi și întrebări ale clienților;
- seller ID, piața țintă, categoria, brandul și atributele obligatorii trebuie verificate înaintea exportului;
- tratează operațiunile bulk asincron: păstrează batch ID-ul și citește rezultatul înainte de a marca listarea drept activă;
- importă numai statusurile de comandă eligibile conform API V2 și păstrează maparea statusurilor separat de starea internă;
- nu activa adapterul dacă răspunde un endpoint V1, piața sau identitatea sellerului este ambiguă.

Documentație oficială și index pentru agenți: `https://developers.trendyol.com/` și `https://developers.trendyol.com/llms.txt`.

## Okazii.ro

- importul XML oficial poate sincroniza produse, preț, cantitate, imagini, stare, plată, livrare și retur;
- fiecare produs are un `UNIQUEID`, titlu, categorie sincronizată, descriere, preț, monedă, cantitate/stoc și fotografii;
- categoria, curierii, atributele și brandurile acceptate se descarcă din contul magazinului; nu le ghici;
- documentația publică XML identificată este veche. Generează feedul numai după reconfirmarea formatului în portal și păstrează `setup_required` până la primul import valid;
- până există un API de comenzi verificat pentru cont, comenzile intră prin import manual asistat, cu ID extern și audit; nu extrage automat din email.

Documentație oficială: `https://ajutor.okazii.ro/wp-content/uploads/2017/12/product-import-manual_RO.pdf`.

## Vinted

Pentru o firmă înregistrată în România, nu publica și nu sincroniza stocul comercial printr-un cont standard. Regulile oficiale interzic activitatea comercială pe conturile standard, iar Vinted Pro nu este disponibil în România la ultima verificare. Produsele noi cumpărate pentru revânzare, articolele la comandă și listările profesionale sunt neeligibile.

- păstrează canalul `disabled_policy`/dezactivat și nu salva credentiale pentru automatizare;
- nu prezenta produsele Cutiuța Magică drept obiecte personale second-hand;
- nu folosi fotografii care nu reprezintă articolul efectiv;
- reevaluează numai dacă Vinted anunță oficial Pro pentru firme înregistrate în România și categoria/produsul devin eligibile.

Documentație oficială: `https://www.vinted.com/help/1120-komercny-predaj` și `https://www.vinted.com/catalog-rules`.

## Ordinea sincronizării

1. importă comenzile și deduplică;
2. recalculează stocul disponibil cu bufferul fiecărui canal;
3. propune pauzarea listărilor fără stoc;
4. sincronizează stocul, apoi prețul, apoi conținutul/listarea;
5. reconciliază ID-urile și statusurile externe;
6. raportează separat comenzile importate, listările actualizate, conflictele, erorile și acțiunile care așteaptă aprobare.

Ultima cercetare a acestei referințe: `2026-10-17`.
