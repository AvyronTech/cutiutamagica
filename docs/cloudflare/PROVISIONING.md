# Provisionare si publicare Cloudflare

## Resurse productie

| Binding    | Resursa                      |
| ---------- | ---------------------------- |
| Worker     | `cutiuta-magica-store`       |
| D1 `DB`    | `cutiutamagica-db`           |
| R2 `MEDIA` | `cutiutamagica`              |
| KV `CACHE` | `cutiutamagica_kv`           |
| Queue      | `cutiutamagica-commerce`     |
| DLQ        | `cutiutamagica-commerce-dlq` |

Toate resursele apartin proiectului Cutiuta Magica. AVYRON OS nu este binding, baza de date, storage sau conditie de disponibilitate.

## Ordinea releaseului

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run cf:types:check
npm run cf:deploy:dry
npx wrangler d1 migrations apply DB --env production --remote
npx wrangler d1 execute DB --env production --remote --file=./cloudflare/d1/seed/0001_music_boxes.sql
npm run cf:media:remote
npm run cf:deploy
```

`cf:deploy:dry` si `cf:deploy` construiesc obligatoriu cu `CLOUDFLARE_ENV=production` si opresc procesul daca pachetul generat nu contine ID-urile dedicate productiei.

## Verificari dupa release

- `/api/v1/health` raspunde si indica mediul `production`.
- Pagina principala, catalogul, produsul, sitemapul si media R2 raspund corect.
- D1 are versiunea de schema asteptata, opt produse muzicale si zero incalcari FK.
- `/admin` este protejat prin e-mail, parola, sesiune `HttpOnly` si RBAC D1 pentru cele patru conturi aprobate.
- Checkoutul recalculeaza server-side si creeaza outbox fara a astepta integrarile externe.
- Intreruperea endpointului AVYRON nu afecteaza magazinul.

## Secrete si integrari

Secretele se introduc exclusiv prin Cloudflare Secrets. `AVYRON_SYNC_HMAC_SECRET` se configureaza doar cand exista endpointul AVYRON validat; sincronizarea ramane dezactivata implicit. Stripe, Revolut Business, SmartShip, facturarea si marketplace-urile necesita chei si teste sandbox inainte de activare.

## Revenire

- Workerul se poate reveni la deploymentul anterior din Cloudflare Versions/Deployments.
- Migrarile D1 sunt append-only; nu se editeaza o migrare deja aplicata.
- Media R2 este versionata prin metadata si arhivare; inlocuirea nu sterge automat originalul.
- Modificarea domeniului se face dupa validarea pe `workers.dev`, pastrand inventarul DNS anterior.
