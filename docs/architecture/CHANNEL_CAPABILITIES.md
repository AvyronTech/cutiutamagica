# Model omnichannel si capabilitati

## Principiu

Canalul nu detine produsul, stocul sau comanda. El detine numai listarea, pretul specific, maparea externa si starea sincronizarii. Catalogul si stocul canonic raman in D1.

## Canale initiale

| Canal     | Mod initial     | Directie                | Faza API               | Observatii                                    |
| --------- | --------------- | ----------------------- | ---------------------- | --------------------------------------------- |
| Website   | `native`        | bidirectional           | activa                 | Checkout si administrare interne              |
| eMAG      | `api`           | bidirectional           | pregatita, dezactivata | Produse, oferte, stoc si comenzi dupa sandbox |
| OLX       | `manual_import` | inbound/outbound manual | numai cu acces oficial | CSV/formular admin si deep link catre anunt   |
| Facebook  | `catalog_feed`  | outbound + atribuire    | ulterior Meta API      | Catalog si comenzi asistate                   |
| Instagram | `catalog_feed`  | outbound + atribuire    | ulterior Meta API      | Foloseste contul Meta conectat                |
| TikTok    | `catalog_feed`  | outbound + atribuire    | ulterior API           | Activare dupa pixel/events validate           |
| Pinterest | `catalog_feed`  | outbound                | ulterior API           | Product Pins si tracking                      |
| WhatsApp  | `assisted`      | inbound manual          | ulterior Business API  | Comanda asistata, nu checkout paralel         |

Un canal poate fi `disabled`, `manual_import`, `catalog_feed`, `assisted` sau `api`. Interfata nu afiseaza „conectat” pana cand un health check real nu a reusit.

## Entitati

- `sales_channels`: configuratia canonica si capabilitatile declarate.
- `integration_accounts`: contul extern, mediul si starea; fara secrete.
- `channel_listings`: listarea produs/varianta pe canal.
- `channel_price_overrides`: preturi si ferestre promotionale specifice.
- `external_mappings`: mapari stabile intre ID intern si ID provider.
- `sync_jobs`: o executie de import/export/reconciliere.
- `sync_failures`: erori reexecutabile si actiunea recomandata.
- `webhook_events`: eveniment primit, semnatura, deduplicare si rezultat.
- `outbox_events`: intentia interna de sincronizare.

## Import manual

Importul manual nu scrie direct in tabelele finale. Fluxul este:

1. Upload CSV sau creare comanda din admin.
2. Validare si preview fara modificari.
3. Identificarea clientului, SKU-ului, totalului si canalului.
4. Confirmare explicita.
5. Creare prin acelasi serviciu de comanda folosit de website.
6. Audit cu operator, fisier si checksum.

## Adaptor API

Fiecare adaptor implementeaza capabilitati independente:

```text
healthCheck
pullOrders
acknowledgeOrder
pushProduct
pushOffer
pushInventory
pushFulfillment
cancelOrder
reconcile
```

Capabilitatile absente sunt marcate explicit. Nu se inventeaza endpoint-uri si nu se foloseste automatizare de browser drept API de productie.

## Reconciliere

- Stoc: comparatie intern/extern per listing, cu buffer configurabil.
- Pret: comparatie intre price list si oferta publicata.
- Comenzi: detectarea comenzilor externe neimportate si a statusurilor divergente.
- Livrare: AWB si status final.
- Fiecare diferenta are severitate, owner, retry si rezolvare auditata.

## Dashboard avansat

Adminul va agrega:

- Venit, comenzi, unitati, AOV si marja pe canal.
- Comenzi care asteapta confirmare, plata, AWB sau interventie.
- Stoc disponibil si expunere totala pe marketplace-uri.
- Sanatatea integrarilor, varsta ultimei sincronizari si coada de erori.
- Produse/listari fara SKU, EAN, imagini, greutate sau mapare.
- Diferente de pret/stoc si impactul financiar estimat.
- Conversie website separat de vanzarile importate din marketplace/social.
