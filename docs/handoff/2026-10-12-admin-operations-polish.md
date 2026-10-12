# Cutiuța Magică — dashboard administrativ și Agent Codex, 12 octombrie 2026

## Scop

- Dashboardul pune în prim-plan comenzile, produsele, chatul clienților, agentul, livrarea, facturarea, e-mailul și aprobările. Chatul este imediat sub Produse. Navigarea și suprafețele administrative au fost simplificate pentru desktop și mobil.
- Studioul Agent Codex creează lucrări din catalogul local, le salvează în D1, păstrează fișierele generate în R2 privat și oferă aprobare sau respingere din dashboard. Decizia este auditată și nu publică automat conținutul. Modelele locale și conectorul runner sunt afișate ca neconfigurate până la un heartbeat autentic și actual.
- Pagina financiară configurează Stripe și Revolut Pay; Facturare configurează Oblio folosind CUI-ul verificat și seria activă din registrul fiscal intern. Configurările vechi sunt păstrate în date pentru compatibilitate, dar nu mai sunt oferite ca opțiuni principale. YouTube și Pinterest nu mai sunt afișate în administrare.
- La o comandă nouă, fluxul pune în coada tranzacțională confirmarea clientului și notificarea proprietarului, inclusiv pentru checkout fără cont. Destinația implicită a proprietarului este `cutiutamagicaofficial@gmail.com`, configurabilă în Centrul e-mail. Livrarea efectivă rămâne dependentă de transportul e-mail configurat și de verificarea domeniului.

## Fișiere și migrare

- Migrare D1 append-only: `cloudflare/d1/migrations/0056_local_ai_content_studio.sql` (profiluri de model, lucrări, fișiere, protecție nonce și metadate). Nu rescrie migrațiile existente.
- Agent și API: `src/server/api/admin-ai-studio.ts`, `src/server/api/router.ts`, `src/admin/pages/AiContentStudio.tsx`, `src/routes/_authenticated/admin/ai.tsx`, `scripts/ai-studio-runner.mjs`, `docs/AI_CONTENT_STUDIO.md`, `src/server/ai-content-studio.test.ts`.
- Dashboard și navigare: `src/admin/Layout.tsx`, `Dashboard.tsx`, `OperationsPage.tsx`, `Integrations.tsx`, `Settings.tsx`, `src/styles.css` și titlurile rutelor administrative modificate.
- Comerț: `Billing.tsx`, `CheckoutConnections.tsx`, `SalesConnections.tsx`, `src/routes/_authenticated/admin/financiar.tsx`, `src/server/services/commerce-operations.service.ts`.
- Capturi: `admin-dashboard-desktop.jpg` și `admin-agent-mobile.jpg` în acest director.

## Verificări

- D1 local: migrațiile până la 0056 și seedul au trecut; nu s-a aplicat nicio migrare remote.
- Teste: 41 fișiere, 227 teste trecute, inclusiv heartbeat semnat, prevenirea replayului și aprobarea cu audit fără publicare.
- Browser autentificat local: dashboard la 1440 px; dashboard, comenzi, produse, chat, Agent Codex, facturare, livrare, financiar, e-mail, integrări și marketing la 390 px. Fără scroll orizontal în ecranele verificate și fără erori în consola paginilor capturate. Sesiunea de probă a fost creată numai în D1 local.
- `npm run typecheck`, `npm run lint` și `npm run build`: trecute. Buildul afișează avertismentele existente pentru pachete mari și logul Wrangler inaccesibil în sandbox; codul de ieșire este 0.
- `npm run cf:deploy:dry`: trecut; buildul de producție și verificarea bindingurilor au trecut, iar Wrangler s-a oprit la `--dry-run` fără deploy.
- `npm run cf:types:check`: trecut.

## Configurări și probe rămase

- Pentru generare reală: instalarea locală Ollama/ComfyUI, secretul HMAC al runnerului în Worker, modelul și runnerul pornite, apoi o lucrare completă verificată în dashboard. Codul și fluxul de aprobare sunt pregătite; generarea reală nu este confirmată în acest mediu.
- Pentru plăți: chei Stripe/Revolut Merchant, secrete webhook, o plată completă în sandbox pentru fiecare, reconcilierea statusului și abia apoi activarea metodei. Nu există plăți live efectuate.
- Pentru Oblio: cont, cheie, profil legal verificat și serie activă, apoi emitere de probă controlată în sandbox/mediul disponibil. Nu s-a emis factură reală.
- Pentru e-mail: verificarea transportului Cloudflare Email Sending sau Resend și a rutării către inboxul oficial, urmată de o comandă de probă pentru client fără cont și unul înregistrat, cu confirmarea livrării în provider și în jurnalul intern. Testele locale dovedesc construcția/idempotenta mesajului, nu livrarea externă.
- Pentru livrare: credențiale SmartShip și o comandă de probă cu ofertă validă, AWB și actualizarea statusului. Nu s-a creat AWB live.

## Livrare

Ramura locală `codex/admin-operations-polish` pornește de la `codex/storefront-cinematic-polish`, care include deja migrarea 0055 și polishul magazinului. Modificările din checkoutul original nu au fost atinse. Nu s-au făcut push, merge, deploy, schimbări DNS ori activări cu cost. Pentru integrare este necesară întâi reconcilierea cu ramura de referință `codex/cutiuta-cloudflare-final` și verificarea migrațiilor mediului țintă.
