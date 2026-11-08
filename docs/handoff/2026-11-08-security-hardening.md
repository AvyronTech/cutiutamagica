# Securitate — implementare și pregătire, 8 noiembrie 2026

## Scop și limite de livrare

Auditul celor 15 activități și remedieri compatibile pe ramura `codex/security-hardening-20261108`, din `dc0006e`. [Audit și constatări](../security/2026-11-08-audit.md), [procedură de staging/activare/rollback](../security/ROLLOUT.md), [plan WAF neactivat](../security/waf-free-plan.json).

**Producția nu a fost modificată de acest lot. MFA și passkeys sunt numai în pregătire.** Nu au fost schimbate parolele/stările conturilor existente, DNS, abonamente, aplicațiile Access ale altor proiecte, sau furnizorii de plăți/e-mail/AI. Migrațiile append-only **0092 și 0093** au fost aplicate numai în staging local, schema 93. Producția observată rămâne sursa `2ade5f0`, Worker `8d51b7d8`, 100%; GSC/SEO din releaseul anterior nu sunt reconfigurate de acest lot.

## Implementare

- Modulul `src/server/security/`: politică configurabilă, validare JWT Access cu issuer/audience/alg/exp/iat, verificare e-mail/identitate serviciu, guard hostname/origine/encoding, sesiuni proprii, identități runner, rate limiting atomic, evenimente, mentenanță și metadate de log reduse.
- Autentificare și host routing: cookie-uri `__Host-` pe HTTPS cu compatibilitate pentru cele vechi, timeout idle la sesiunile admin noi, limitare înainte de KDF, acces interactiv prin permisiune explicită, permisiuni pe pagini și navigare/landing comun. Clienții și serviciile nu primesc implicit acces admin. Setările interne cer autoritatea de administrare a echipei.
- Securitate și acces în dashboard: sesiuni reale, rotație/revocare/altele/toate, test de identitate Access pregătit, identități automate cu cheie afișată o singură dată, jurnal și autentificări fără IP/e-mail/token. În Profil și acces al clientului: logout de pe toate dispozitivele proprii.
- Runner Studio AI: HMAC v2 legat de ID, chei individuale AES-GCM și rotație/revocare, opțiune de token Access, URL media aprobat și limită/tip, fără redirect-uri cu credențiale. Legacy rămâne o cale de migrare, numai dacă secretul real există. Configurarea efectivă se verifică separat.
- Backup: export v2 fără credențiale/secrete/tokenuri, excluderi PII tranzitive prin FK, SQL din schema validată în grupuri de maximum 5 tabele, limita de interogări Free, stări parțiale explicite și baseline numai pentru export complet. Nu se șterg arhive v1 automat. Cron backup și mentenanță securitate separate de operațiunile existente.
- Loguri: identificator de request generat intern și propagat, date de eroare limitate în punctele corectate, captură SSR izolată pe cerere. SW exclude explicit cont/checkout/admin/API și răspunsuri private/no-store.
- Tooling fără cost: `security-check.mjs`, `security-plan.mjs`, `security-stage.mjs`, `security-smoke.mjs`, `rotate-vault.mjs`; quality gates în CI. Niciunul nu activează automat Access/WAF/DNS sau servicii plătite.

## Verificări și probe

- `npm run typecheck`, `npm run lint`, `npm run build`, `npm run cf:deploy:dry`, `npm run cf:types:check`: trecute. Dry-run înseamnă numai compilare/verificare, fără publicare.
- `npm test -- --maxWorkers=3`: **82 fișiere, 451 teste trecute**. Include 35 teste ale modulului de securitate: JWT real semnat, audiențe uman/serviciu diferite, RBAC, IDOR, sesiuni, Origin/CORS, runner și export.
- Probe HTTP pe copia izolată a Workerului: **19/19 trecute**. Acoperă refuz anonim/rol service interactiv, acces staff/consultant numai la sesiuni proprii, refuzul configurației financiare către staff, Origin/CORS, validare strictă, revocare/rotație, logout global client și separarea altui client.
- Export efectiv pe Worker local, schema 93: **completed, 194 tabele, fără eroare**. Cererea de test POST fără date trebuie trimisă fără JSON brut `{}`: RPC TanStack așteaptă serializarea proprie atunci când primește un body JSON.
- `npm audit --audit-level=moderate`: **0 vulnerabilități în întregul arbore**, inclusiv dev; override limitat pentru minimatch 11.0.1. `security:check`: 102 funcții server inventariate, zero constatări. `git diff --check`: curat.
- Opera desktop și mobil 320 px: login admin/client, sesiuni și rotație, navigare și dashboard staff fără linkuri nepermise, Profil și acces client, logout pe toate dispozitivele, catalog și coș gol. Nu s-au plasat comenzi, efectuat plăți ori trimis e-mailuri. Limitele CPU de producție nu sunt validate prin aceste probe locale.

Capturi persistente ale mediului local: [securitate desktop](../security/evidence/admin-security-desktop.png), [securitate mobil](../security/evidence/admin-security-mobile.png), [staff desktop](../security/evidence/staff-dashboard-desktop.png), [staff mobil](../security/evidence/staff-dashboard-mobile.png). Nu conțin valori de chei/parole.

Verificarea vizuală finală a fost reluată după deblocarea Macului: [profil client desktop](../security/evidence/customer-profile-desktop.png), [profil client mobil](../security/evidence/customer-profile-mobile.png), [sesiuni proprii staff](../security/evidence/staff-security-desktop.png). Butonul de logout global folosește text închis pe fond deschis; la 320 px lățimea paginii și a viewportului sunt ambele 320 px. Staff are numai fila de sesiuni proprii, fără servicii/jurnal; „Închide celelalte sesiuni” a fost verificat pe identitățile locale de test. Viewportul Opera a fost resetat după test. Conturile de producție nu au fost accesate/modificate prin aceste probe.

Livrare pentru review: [PR draft #93](https://github.com/AvyronTech/cutiutamagica/pull/93), cod `ee96d09`, [Quality gates trecute](https://github.com/AvyronTech/cutiutamagica/actions/runs/42524149015). Actualizarea ulterioară adaugă numai capturi și documentație. Fără merge sau deploy.

## Configurare externă rămasă

1. Pilot Access pe endpointul dedicat, identități reale, AUD și verificare semnată e-mail–cont; abia apoi politici interne și enforcement. Nu configura grupuri/identități presupuse.
2. Închiderea live workers.dev/preview și orice hostname nou după verificarea consumatorilor externi. Aceste schimbări sunt pregătite în configurație, nu sunt deja active în producție.
3. Emiterea/configurarea efectivă a runnerilor și tokenurilor de serviciu; verificarea numelor de secrete sau a bindingurilor nu dovedește funcționarea serviciilor/LLM-urilor.
4. Validarea și activarea etapizată a planului WAF Free. CSP strictă și Turnstile suplimentar necesită propriile probe; baseline compatibil este implementat.
5. Rotația reală a secretelor furnizorilor/master, recuperarea completă și arhivele istorice au proceduri separate; nu sunt mutate/șterse implicit de acest lot.

Rămân limitele Workers Free, inclusiv CPU. Pentru rollback, păstrează versiunea exactă a Workerului și o sesiune Cloudflare owner independentă. Niciun bypass de autentificare sau cont privilegiat nou nu a fost creat în producție.
