> Actualizare release 9 noiembrie: `workers_dev` rămâne activ numai pentru compatibilitatea celor două callbackuri POST de plată. Allowlist-ul aplicației respinge orice altă rută de pe hostname-ul istoric și toate preview-urile; handlerul verifică separat semnătura. Dezactivarea completă a hostname-ului se amână până când destinațiile sunt confirmate în conturile procesatorilor. Nu modifica endpointuri sau secrete de plată pentru acest rollout.

# Securitate: validare, activare graduală și revenire

Niciun pas de mai jos nu activează MFA. Folosește contul Cloudflare și Workerul Cutiuța Magică, nu alt proiect din același cont. Nu accepta upgrade-uri și nu crea baze/stocări duplicate.

## 1. Staging local izolat

1. Aplică migrațiile cu `npx wrangler d1 migrations apply DB --local --persist-to /tmp/cutiuta-security-staging-20261108`.
2. Rulează `npm run typecheck`, `npm test -- --maxWorkers=3`, `npm run lint`, `npm run build`, `npm run security:check` și `npm run cf:deploy:dry`.
3. Pregătește o copie izolată cu `node scripts/security-stage.mjs --output=/tmp/cutiuta-security-built-20261108`, apoi rulează `npx wrangler dev --config /tmp/cutiuta-security-built-20261108/server/wrangler.json --local --persist-to /tmp/cutiuta-security-staging-20261108 --port 8088`. Utilitarul schimbă explicit bindingurile în cele locale, setează `APP_ENV=local` și elimină AI, e-mail, cron și servicii remote; schimbarea URL-ului singură nu face această izolare.
4. Execută `node scripts/security-smoke.mjs --base=http://127.0.0.1:8088 --state=/tmp/cutiuta-security-staging-20261108`. Scriptul refuză producția și alte directoare. Creează numai identități/sesiuni de test în starea locală numită explicit; nu trimite e-mailuri și nu plasează comenzi.
5. Verifică desktop/mobil: login, roluri, sesiuni, Profil și acces al clientului, catalog și coș. Execută un backup local și verifică manifestul: `completed`, `skipped=[]`, fără tabele/coloane de autentificare. `partial` nu este dovadă de export complet și nu poate deveni un nou backup de bază.

Nu rula Vite HMR și rebuilduri simultan în timpul probelor HTTP finale: restartul local poate întrerupe cererile. Folosește copia izolată a buildului, separată de serverul de dezvoltare și de directorul dist regenerat de dry-run.

## 2. Plan review-only pentru hostname

`npm run security:plan -- --admin-host=app.cutiutamagica.eu --output=/tmp/cutiuta-security-plan.json`

Pentru un hostname nou, de exemplu `admin.cutiutamagica.eu`, schimbă numai argumentul. Planul păstrează Workerul, D1, R2, KV și rutele vechi și adaugă ruta propusă. Nu apelează Cloudflare și nu schimbă DNS. Adăugarea unui domeniu custom trebuie aprobată explicit și verificată înainte de schimbarea `ADMIN_HOSTNAME`.

Setări compatibile inițiale:

- `ADMIN_HOSTNAME=app.cutiutamagica.eu`, `ADMIN_HOST_MODE=compatible`.
- `ADMIN_ACCESS_MODE=off`; fără AUD fals sau identități inventate.
- `ALLOW_LEGACY_AI_RUNNER=true` până la migrarea tuturor runnerilor legitimi.
- `workers_dev=false`, `preview_urls=false` sunt pregătite pentru release, dar se verifică mai întâi consumatorii externi. Runnerii/webhook-urile trebuie să folosească domeniile oficiale. Repo-ul nu conține consumatori ai workers.dev; asta nu dovedește configurația fiecărui furnizor extern.

## 3. Pilot Access fără schimbarea loginului existent

1. Păstrează o sesiune Cloudflare owner independentă și înregistrează versiunea/configurația Workerului curent. Nu adăuga un cont privilegiat de urgență în aplicație și nu crea un URL de bypass.
2. Creează o aplicație self-hosted de pilot **numai** pe `app.cutiutamagica.eu/api/v1/admin/security/access-check`, cu lista explicită de owners selectați și un furnizor de identitate deja verificat. Nu adăuga Everyone, un wildcard de domeniu e-mail sau Bypass. Nu folosi aplicațiile Access ale altor proiecte.
3. Citește AUD-ul real și setează `ACCESS_TEAM_DOMAIN=https://cutiuta-magica.cloudflareaccess.com` și `ACCESS_APPLICATION_AUD=<AUD real>` în mediul pilot. `ADMIN_ACCESS_MODE` poate rămâne `off` pentru rutele existente. Endpointul nou verifică independent JWT-ul și asocierea cu sesiunea admin, fără să returneze tokenul.
4. Intră în aplicația pilot cu un owner real și verifică butonul din Securitate și acces. Un răspuns 200 cu `verified=true, accountMatched=true` este proba necesară. Un e-mail diferit, JWT expirat, issuer/AUD greșit sau service token pe ruta umană trebuie respins.
5. Abia după probă, extinde aplicația Access la hostname-ul intern. Creează separat politici pentru owners, angajați și colaboratori pe baza identităților reale; RBAC al magazinului rămâne autoritatea pentru operațiuni. Nu presupune existența grupurilor IdP/SCIM.
6. Activează `ADMIN_ACCESS_MODE=pilot` și `ACCESS_PILOT_HOSTS=app.cutiutamagica.eu`, testează utilizatorii selectați și integrările. Închiderea tuturor adreselor alternative și verificarea funcțiilor private de pe hosturile vechi precedă `enforce`.
7. `enforce` verifică și apelurile private pe domeniile vechi/API, inclusiv server functions; clienții publici și funcțiile publice rămân separate. Nu aplica Access global pe `cutiutamagica.eu/_serverFn/*`.

Crearea sau extinderea politicilor nu este efectuată de utilitarul de plan. Orice activare cu risc de blocare cere rezultatele pilotului și o decizie administrativă asupra configurației concrete.

## 4. Servicii și runneri

- Pentru o aplicație Access separată pe calea runnerilor, configurează AUD-ul ei real în `ACCESS_SERVICE_APPLICATION_AUD`; AUD-ul uman rămâne în `ACCESS_APPLICATION_AUD`. Un JWT de la altă aplicație/Worker este respins. Fallback-ul către AUD-ul uman este numai pentru topologia cu aceeași aplicație Access.
- Creează un token Access individual, scop `Service auth`, numai pentru `/api/v1/integrations/ai-studio/runner/*`. Fără identitate umană/rol owner și fără politică Bypass.
- În Securitate și acces, emite o identitate de runner cu ID propriu și Client ID Access real. Secretul HMAC este afișat o singură dată; păstrează-l în managerul de secrete al runnerului, nu în Git/D1 în clar/loguri.
- Configurează local `AI_STUDIO_RUNNER_ID`, `AI_STUDIO_RUNNER_SECRET`, `AI_STUDIO_SIGNATURE_VERSION=2`, `AI_STUDIO_BASE_URL=https://app.cutiutamagica.eu`, `CF_ACCESS_CLIENT_ID` și `CF_ACCESS_CLIENT_SECRET`. Numai valori reale; fără generare/pornire de modele plătite.
- Verifică heartbeat, claim/result și un asset aprobat. `common_name` al JWT-ului trebuie să corespundă Client ID-ului asociat runnerului; HMAC v2 include ID-ul runnerului. Nu se publică automat rezultate.
- Rotește cu versiunea curentă și grace limitată (implicit 60 minute, maximum 24 h); actualizează runnerul, confirmă heartbeat-ul, apoi verifică respingerea cheii vechi după grace. Legătura Access poate fi actualizată la rotație. Revocarea anulează și fallback-ul legacy pentru acel ID.
- Numai după migrarea tuturor runnerilor schimbă `ALLOW_LEGACY_AI_RUNNER=false`. Eliminarea unui secret comun din Cloudflare este separată de dezactivarea acceptării lui în cod.

AVYRON rămâne un conector opțional cu HMAC și propuneri/aprobări; căderea lui nu trebuie să oprească magazinul. Un agent conectat prin browser folosește aprobările operaționale existente, nu primește automat identitate owner de serviciu.

## 5. WAF, CSP și antispam

Fișierul `waf-free-plan.json` este **neactivat**. Bugetul planului folosit este de maximum 5 reguli custom și 1 regulă rate limit; verifică ocuparea curentă înainte de activare. Validează parametrii în planul actual și testează expresiile în pilot înainte de activare. Regula de rate limiting nu trebuie să blocheze checkout, OAuth, webhooks, catalog sau crawlere. Nu introduce filtrare generală după țară, User-Agent sau termeni SQL din căutările legitime.

CSP activă păstrează acum `object-src 'none'; base-uri 'self'; frame-ancestors 'self'`. O CSP strictă viitoare cere nonce compatibil cu SSR/hydration, lista reală Stripe/OAuth/Turnstile, probe report-only și apoi trecere graduală. Nu publica o politică strictă neverificată care blochează scripturile existente.

Rate limiting aplicație este atomic înainte de KDF; filtrele de origine, validarea datelor și prepared statements rămân necesare și cu WAF. Widgetul Turnstile este o etapă opțională după alegerea/configurarea cheilor și verificarea accesibilității; nu este declarat implementat prin simpla existență a unui binding.

## 6. Vault, date și backup

- Migrările 0092 și 0093 sunt aditive; aplică-le înaintea codului care folosește noile tabele/coloane. Nu relua migrarea istorică de suspendare a conturilor.
- R2 trebuie să rămână privat. Arhivele vechi v1 pot conține material de autentificare; păstrează accesul restrictiv și decide separat retenția/înlocuirea lor, fără ștergeri automate introduse de acest lot.
- Exportul v2 este un export al aplicației, nu un dump complet: exclude credențiale/vault/sesiuni, redactează coloane de tokenuri, limitează 5.000 rânduri/tabel și aplică retenția câte un fișier expirat/rulare pentru bugetul Free. Recuperarea D1 completă: Time Travel/export administrativ; R2 media și secretele sunt protejate separat.
- Cron: operațiunile existente la minutul 00; verificarea backupului la 15; mentenanța securității la 30. Ora aleasă pentru backup rămâne în Europe/Bucharest. Separarea evită cumularea interogărilor backupului cu celelalte operațiuni în aceeași invocare.
- Pentru rotație master **cu cheia veche disponibilă în managerul securizat**, exportă numai coloanele criptate și metadatele necesare. Pregătește inventarul JSON cu `table`, `id`, `ciphertext`, `iv`; pentru service identities adaugă `version` reală și `field` pentru cheia precedentă.
- Rulează offline `node scripts/rotate-vault.mjs --input=<inventar criptat> --output=<plan privat.sql>` cu `CUTIUTA_VAULT_OLD_KEY` și `CUTIUTA_VAULT_NEW_KEY` furnizate securizat prin mediu. Nicio cheie în argumente sau istoric shell. Utilitarul validează AAD și produce numai update-uri CAS criptate, fișier 0600, fără aplicare remote.
- Păstrează cheia curentă și fallback-ul `INTEGRATION_ENCRYPTION_PREVIOUS_KEY` în tranziție; verifică fiecare rând și concurența înainte de retragerea celei vechi. Dacă cheia veche nu este disponibilă, **nu începe rotația master**; Cloudflare nu afișează înapoi valoarea unui secret. Stabilește mai întâi recuperarea din managerul securizat sau reprovisionarea controlată a credențialelor. Nu ghici chei.
- Scanarea sursei curente și npm audit rulează în CI; nu pretinde că o scanare de patternuri verifică fiecare secret din întreg istoricul Git sau scanează malware.

## 7. MFA/passkeys: numai proiectare

Nu există în acest lot un buton de activare, endpoint de înrolare sau un flag nou care obligă administratorii la MFA. Cerință viitoare, numai după autorizare separată: challenge scurt și de unică folosință, RP ID pe hostname-ul verificat, verificarea originii și a utilizatorului, credențiale WebAuthn public-key, recuperare și revocare auditate, UX cu passkey într-un gest și sesiunea existentă păstrată controlat. Nu se stochează secrete TOTP sau coduri de recuperare în clar și nu se forțează acum această migrare.

## 8. Release și rollback

Înainte de release: revizie exactă/CI, migrații/integritate D1, inventar webhook/runner/URL alternativ, sesiune owner și cale Cloudflare independentă de recuperare. Deploy-ul codului compatibil cu Access off este distinct de activarea Access/WAF/DNS. Înregistrează noul Worker și probele live; un dry-run nu este deploy.

La problemă: oprește doar etapa nouă, revino la `ADMIN_ACCESS_MODE=off` și restrânge/retrage numai aplicația/politica Access nou creată dacă aceasta blochează loginul. Revino la versiunea Worker înregistrată; păstrează migrațiile aditive. Nu șterge utilizatori, nu suspenda conturi și nu dezactiva autentificarea magazinului. După emiterea cookie-urilor `__Host-`, un rollback la codul istoric poate cere o nouă autentificare deoarece acesta citește numai cookie-ul vechi; comunicați această limită înainte de activare. Rotația master/vault are o procedură separată de rollback și nu se combină cu primul release de sesiuni/Access.
