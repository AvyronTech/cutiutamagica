# Business dashboard release, 2026-09-15

## Implemented

- `/admin/email`: owner recipients, Bucharest dispatch day/hour, monthly sales/product/traffic sections, preview and JSON export. Disabled by default. Only non-suspended owner accounts receive reports; permissions are checked again at dispatch.
- Resend monthly dispatch has per-month/per-recipient claims, bounded retries and idempotency. Uncertain sends older than 23 hours require manual review in `owner_report_deliveries`, rather than risking duplicates. Report periods use UTC and currencies remain separate. No customer identities are included.
- `/admin/suppliers`: assisted product-source research, daily request budget and freshness window. Product Studio has a supplier relevance tab with up to five deduplicated Temu/AliExpress/Alibaba links, snippet evidence, observed price and retrieval timestamp. Failed searches preserve the previous successful results.
- Search is a deterministic, auditable Brave Search workflow, not a self-training LLM. Search prices are unverified observations, not confirmed supplier quotes or landed costs. No purchasing or seller contact is automated.
- `/admin/traffic`: saved Google/social property identifiers and real on-demand GA4/GSC report imports. Daily metrics are replaced transactionally for the imported interval to avoid double counting. Social collection remains unconnected until platform authorization and endpoint-specific adapters are supplied.
- `/admin/financiar`: Stripe/Revolut credential storage and read-only checks, account references, FGO/SPV references and local monthly summary export. No data is sent to AVYRON.
- `/admin/shipping`: package dimensions/weight, country preparation, SmartShip credential storage and read-only `/account/balance` check. Foreign checkout and carrier contracts still require separate validation. No courier is activated by merely saving a key.
- `/admin/promotions`: current website prices, documented previous-price references, optimistic update checks, price history, and the existing volume offer. Product cards, product details, cart and checkout now read D1 prices. Struck prices require reference evidence; missing historic evidence must not be invented.
- Terms and privacy pages, footer links, checkout legal links and SAL banner. Company identity is displayed in legal pages, not the footer. Catalog structured data and sitemap now use the published D1 catalog.

## Data and isolation

Append-only migrations `0010_business_growth.sql` and `0011_price_reference_evidence.sql` add operational settings, encrypted credentials, report delivery claims, supplier evidence, daily metrics, audit events and price-reference history. No AVYRON database, storage, deployment or runtime is used.

Do not import local test data or seed files into production. Local promotional prices and test report settings are deliberately not release data.

## Secrets and activation

1. Provision a 32-byte Base64 `INTEGRATION_ENCRYPTION_KEY` as a Worker secret. Preserve a restricted recovery copy outside version control; losing this key makes encrypted D1 credentials unrecoverable. Rotation requires re-encryption, not replacing the key blindly.
2. Provider API keys can be entered in the corresponding dashboard section. AES-GCM binds each ciphertext to its provider. Keys are never returned to the browser. Worker secrets remain a fallback when no D1 credential exists.
3. Stripe also needs `STRIPE_WEBHOOK_SECRET`, provider activation and tested callbacks. Resend needs a verified sending domain and appropriately scoped API key. A send-only Resend key may fail the optional domain-list health check while still being able to send.
4. Google and Revolut inputs accept OAuth access tokens; automated OAuth refresh is not implemented. Expired tokens must be renewed. Google requires property-level read permissions; the Google connection check uses Search Console and is not proof of GA4 access.
5. Brave needs a valid Search API key and available quota. Research stays off until explicitly enabled. Enabling external services can consume the provider's quota; this release does not buy a plan or activate paid subscriptions.
6. Hourly cron checks for due monthly reports. Enable only after recipient and sender configuration. Never use the preview button as proof an e-mail was delivered.
7. No automatic social posting, social insights ingestion, SPV submission, bank transfers, AVYRON export or international checkout is enabled by this release.

## Legal review before commercial activation

Obtain the registered address, Trade Registry number and public phone from the owner and save them in Facturare. Confirm shipping tariffs/contracts, rights to media/franchises, return address and accounting retention policy. A technical release is not legal certification.

- Current SAL destination: <https://reclamatiisal.anpc.ro>.
- ANPC Order 270/2026: <https://legislatie.just.ro/Public/DetaliiDocument/310590>.
- EU ODR/SOL closure, 20 July 2025: <https://eur-lex.europa.eu/legal-content/RO/ALL/?uri=CELEX%3A32024R3228>. Do not restore an obsolete SOL banner.
- SAL bitmap provenance: public copy at <https://aquaservcj.ro/wp-content/uploads/2026/07/Picture1.png>, referenced by their SAL page. The official ANPC asset endpoint was inaccessible behind its WAF during verification. Replace with the official file if ANPC provides a revised asset; keep the 250 x 50 display requirement under review.

## Release checks

Production D1 recovery bookmark captured before migration: `0000001d-00000000-000050e7-0c866e67993468f1d97d20c2b97a2c7e`. Recovery availability follows the account's Time Travel retention. Both additive migrations were applied successfully. The encryption secret was provisioned with a local recovery file `.integration-key-recovery.production.local` (mode 0600, ignored by Git); move its contents to the organization's secure password vault and do not attach it to issues or commits.

- Replay all migrations and seed in an isolated SQLite test database; run foreign-key checks.
- TypeScript, unit/integration tests, production build and Wrangler dry-run.
- Local browser: save owner-report preferences, preview report, save test reduction, verify catalog and cart single-item/volume prices. No real orders, e-mails or supplier requests are created by UI verification.
- Inspect Git ancestry and remote head before publishing; never force-push.
- Capture D1 Time Travel recovery point before applying production migrations. Deploy only the shop Worker. Verify public routes and protected admin responses after deployment.
- Reverting Worker code is compatible with the additive schema. Do not drop tables or restore a database over live orders as a routine rollback.
