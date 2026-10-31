# Continuitatea proiectului Cutiuța Magică

Acest fișier este punctul de intrare pentru Codex, Lovable, Claude și alți agenți. Regulile obligatorii sunt în [AGENTS.md](../AGENTS.md); aici sunt harta proiectului și rutina de predare. Informațiile datate sunt un instantaneu, nu dovada stării live.

## Surse de adevăr

| Întrebare                             | Sursa de verificat                                                                                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Ce are voie să facă agentul?          | `AGENTS.md` și instrucțiunile utilizatorului din conversația curentă                                                                |
| Ce există în cod?                     | Ramura și commitul curent, `src/`, `cloudflare/`, `package.json`, teste                                                             |
| Ce s-a lucrat recent?                 | Primele intrări datate din `docs/AGENT_HANDOFF.md`; verifică apoi codul                                                             |
| Cum sunt separate sistemele?          | `docs/architecture/CLOUDFLARE_COMMERCE.md`                                                                                          |
| Ce înseamnă termenii din UI și API?   | `docs/PROJECT_GLOSSARY.md`                                                                                                          |
| Ce asset AVYRON poate fi folosit?     | `docs/brand/AVYRON_LOGO_USAGE.md`; masterul din album rămâne de identificat                                                         |
| Ce este publicat sau configurat live? | Dashboardul furnizorului și endpointurile publice verificate la momentul lucrului; un draft sau un test local nu confirmă producția |

## Hartă tehnică

- TanStack Start/React livrează SSR, frontend și API într-un Worker Cloudflare dedicat magazinului. D1 păstrează date relaționale, R2 media, KV numai cache/date efemere, iar Queue operații asincrone.
- AVYRON OS este o integrare opțională prin API/webhook autentificat. Nu este baza de date, control plane sau condiție de funcționare a magazinului.
- Rutele publice și client sunt în `src/routes/`; UI comun în `src/components/site/`; API, servicii și repository în `src/server/`; migrațiile append-only în `cloudflare/d1/migrations/`.
- Prețurile, stocul, eligibilitatea livrării și starea plății sunt calculate/verificate pe server. Interfața poate explica rezultatul, dar nu devine sursă de adevăr.

## Înainte de o schimbare

1. Citește `AGENTS.md`, acest fișier și ultima intrare relevantă din `docs/AGENT_HANDOFF.md`.
2. Identifică repository-ul/worktree-ul, ramura, commitul de bază, `git status` și diferența față de `origin/codex/cutiuta-cloudflare-final`. Păstrează lucrul nepublicat al altor agenți; folosește ramură/worktree separat dacă există risc de conflict.
3. Verifică în cod, D1 local și, numai când e necesar, în sursa live. Nu deduce disponibilitatea unei integrări dintr-un buton, secret configurat sau ecran de admin.
4. Notează contractele afectate: API, DB, frontend, accesibilitate, SEO, performanță, audit și idempotentă. Migrațiile D1 noi sunt append-only.

## Înainte de predare

1. Rulează `npm run typecheck`, `npm test`, `npm run lint`, `npm run build`, `npm run cf:deploy:dry` și `git diff --check` când mediul permite.
2. Verifică desktop și mobil pentru fluxurile modificate. Pentru checkout folosește date sintetice și oprește-te înainte de plasarea comenzii sau efectuarea plății, cu excepția unei aprobări explicite pentru testul exact.
3. Adaugă în capul `docs/AGENT_HANDOFF.md`: scop, ramură/bază/commit, fișiere, migrații, verificări cu rezultat, capturi desktop/mobil, ce a fost verificat live, ce lipsește și orice aprobare/configurare externă rămasă.
4. Predă prin PR către `codex/cutiuta-cloudflare-final` numai după cererea explicită de push/PR. Merge, deploy, migrarea remote, DNS, activarea unui furnizor și plățile reale sunt decizii separate, cu aprobare explicită în conversația curentă.

## Stare de reluare

- Actualizare locală 31 octombrie: `codex/landing-section-order-20261031` mută cardul „Despre noi” între social și contact, pune Magic Drop imediat sub calendar și reduce calendarul la un mesaj, canalele opționale, un exemplu și CTA. Verificările locale și capturile desktop/mobil au trecut; detaliile sunt în primul handoff. Această intrare nu atestă publicarea.

- Release 31 octombrie: PR #56, integrat la `13a15c9`, reordonează subsolul comun, grupează contactul și comenzile, mută invitația spre catalog mai jos, termină cu identitatea magazinului și elimină Messenger din „Contactează-ne”. Workerul rulează versiunea `f88feb30-e9ec-4be4-a8a4-81eceee1eb68` la 100%; pagina principală și health au fost verificate live. Detalii în primul handoff.

- Release 31 octombrie: PR #54, integrat la `3dbf6f5`, compactează fișele tuturor celor zece produse, limitează distribuirea la cinci canale plus distribuirea nativă, schimbă CTA-ul din fișa produsului în „Comandă acum”, separă „Dincolo de capac” de FAQ și înlocuiește eticheta generică de vârstă cu formulări tematice. Workerul rulează versiunea `c9fcbacb-5a8c-499b-aefb-47ff7a5b7621` la 100%. Pagina „Winter Is Coming” și health au fost verificate live; detaliile și limitele sunt în primul handoff. Indexarea Google nu este atestată de această verificare.

- Corecție production 31 octombrie, după release: la cererea administratorului, migrarea 0086 a reactivat exact cele două conturi `owner` suspendate de 0085. D1 este la schema 86, ambele conturi sunt `active`, parolele/rolurile/MFA nu au fost modificate, iar health răspunde 200 cu schema 86. Nu reintroduce suspendarea și nu planifica MFA pentru acest magazin fără o cerere nouă și explicită. Detaliile sunt în primul handoff.

- Release production 31 octombrie: PR #50 (`80a0b75`) și PR #51 (`314f2ea`) sunt integrate în `codex/cutiuta-cloudflare-final`. Migrațiile 0084–0085 sunt aplicate în D1 production, schema este 85, iar Workerul `cutiuta-magica-store` rulează versiunea `54c424a2-5b89-42c6-9853-7f3480fa8515`, distribuită 100%. Resend este transportul principal, cinci șabloane e-mail sunt active, doi `owner` cu parolă schimbată rămân activi, iar două conturi inițiale sunt suspendate. `foreign_key_check` este curat. Toate cele 38 de URL-uri din sitemapurile copil răspund 200 și `/api/v1/health` confirmă mediul `production`/schema 85. Auditul mobil final al unui produs are 56 verificări trecute, zero eșuate. Detaliile și limitele sunt în handofful releaseului din `docs/AGENT_HANDOFF.md`.
- Blocaje rămase: GSC trebuie să proceseze din nou sitemapul și să confirme indexarea; nu există dovadă nouă de livrare a e-mailului în inbox. Cheia Brave Search a fost amânată de utilizator, iar runnerul AI local necesită secretul HMAC și modelele locale. Constatările P1/P2 de securitate sunt în `docs/SECURITY_AUDIT_2026-10-31.md`. Intrările „Actualizare locală” de mai jos descriu starea anterioară releaseului.

- Actualizare locală 31 octombrie: release-ul include migrarea 0085 pentru suspendarea controlată a conturilor admin cu credențiale inițiale și actualizări ale dependențelor Zod/Seroval/Undici. Auditul de producție al pachetelor este zero după actualizare; constatările P1/P2 din auditul de securitate rămân deschise. Starea publicată se verifică separat de această pregătire.

- Actualizare locală 31 octombrie: fluxurile e-mail au fost extinse pentru notificarea staff la comandă/retur și client la expediere; migrarea 0084 pregătește Resend ca transport principal când sunt prezente cheia verificată și refuzul Cloudflare. Sunt doar schimbări locale. Verificările de cod trec, dar livrarea finală în inbox și release-ul nu sunt confirmate. Vezi `docs/EMAIL_DELIVERY_2026-10-31.md` și primul handoff.

- Actualizare locală 31 octombrie: `codex/admin-dashboard-ux-20261031` include schimbările SEO locale anterioare și reorganizează fișa produsului, auditul SEO, cercetarea furnizorilor și administrarea personalizării. Cheia Brave Search rămâne neconfigurată la cererea utilizatorului; interfața arată blocajul și nu pornește căutarea. Ecranele administrative nu au fost încă inspectate vizual prin sesiune autentificată. Vezi intrarea „administrare produs, SEO și personalizare” din `docs/AGENT_HANDOFF.md`.

- Actualizare locală 31 octombrie: auditul AI a confirmat că asistentul public Workers AI a trimis istoric șapte răspunsuri, iar studioul local Ollama/ComfyUI este încă `setup_required`, fără heartbeat, lucrări ori secretul HMAC. Runnerul local are diagnostic `--check` și consum D1 redus; nu există integrare automată cu sesiunea Codex. Detalii și pași de configurare: `docs/AI_CLOUDFLARE_RESOURCE_AUDIT_2026-10-31.md`.

- Actualizare locală 31 octombrie: ramura `codex/seo-indexing-20261031` pregătește un index `sitemap.xml` static, sitemapuri copil pentru pagini esențiale, produse din D1 și ghiduri, plus sitemap text de rezervă. GSC încă raportează eroare generică pentru vechiul XML, în timp ce textul și ghidurile sunt citite cu succes. Produsul „Winter Is Coming” este confirmat în index prin inspecție individuală; pentru „You Are My Sunshine” și `/cadouri/pentru-mama` Google a confirmat doar solicitările de indexare. Schimbarea de cod nu este publicată. Vezi [handofful auditului](handoff/2026-10-31-seo-indexing-audit.md).

- La 29 octombrie, PR #48 pentru reconcilierea programărilor sociale a fost integrat la `c08fac5`, migrațiile 0082–0083 au fost aplicate în D1 production, iar Workerul a fost publicat la versiunea `0c6e0af0-ab0c-4a11-a5fa-4f1de059db52`. Remote, schema era 83, snapshotul Metricool păstra 6/20 și zero programări viitoare, exact cinci rânduri necesitau reaprobare în `review`, iar `foreign_key_check` era curat. Un conector Metricool configurat sau o sesiune Opera nu devin automat conector backend verificat; remedierea nu publică social și nu validează drepturile media.

- PR #43 a integrat intro-ul cinematic, SEO/indexarea, contul și Portofelul în `codex/cutiuta-cloudflare-final` la `e55c7dc`; PR #45 a adăugat cache pentru sitemapul catalogului la `3aa0bea`, PR #46 a adăugat sitemapul text la `c2de006`, iar PR #48 a adăugat reconcilierea programărilor sociale la `c08fac5`. Workerul `cutiuta-magica-store` a fost la versiunea `0c6e0af0-ab0c-4a11-a5fa-4f1de059db52` pe 29 octombrie. Probele sunt în handoffurile dedicate și în cel mai nou handoff din `docs/AGENT_HANDOFF.md`. Verifică din nou versiunea live înainte de o nouă lansare.
- În Search Console, `/sitemap.txt` are `Succes` și 38 pagini descoperite, iar `/sitemap-guides.xml` are `Succes` și 23, pe 26 octombrie. `/sitemap.xml` a fost retrimis după noul deploy; testul live Google a confirmat preluarea reușită, dar raportul încă afișa „Nu s-a putut prelua”, tip `Necunoscut`, 0 pagini. XML-ul și textul au aceeași listă de 38 URL-uri, confirmată live. Urmărește procesarea XML și raportul de indexare; descoperirea nu înseamnă indexare.
- Raportul de indexare actualizat la 23 octombrie arăta 7 URL-uri indexate, inclusiv un vechi URL HTTP al paginii de start care acum redirecționează permanent la HTTPS. Rapoartele pentru acțiuni manuale și probleme de securitate nu indicau probleme la 26 octombrie.
- Inspecția live din 26 octombrie a confirmat că pagina publică `/produs-cutiuta-muzicala-winter-is-coming` poate fi indexată și are elemente valide pentru produs, înregistrare comercială și breadcrumb. Indexul încă o marca necunoscută; solicitarea de indexare a fost confirmată și pusă în coada Google. Aceasta nu înseamnă că pagina este deja indexată.
- Eroarea exactă de salvare a parolei după Google rămâne de identificat între aplicație și managerul de parole al browserului. Testul local Google → parolă → conectare trece, dar nu reproduce dispozitivul utilizatorului.
- Plata cu cardul și salvarea cardului au fluxuri de cod și teste; o tranzacție live completă, cu întoarcere, webhook și reconciliere, nu a fost executată în acest release.

## Cum se păstrează sincronizarea

Documentația din repo merge cu codul prin Git/PR și este vizibilă pentru agenții care citesc repository-ul. Nota din memoria Codex disponibilă în acest mediu este un rezumat și un indicator către repo, nu o copie autoritară a codului sau un canal automat către ChatGPT, Lovable ori Claude. La fiecare schimbare semnificativă, actualizează handofful și glosarul/fișa de brand dacă termenii sau regulile se schimbă; după merge, verifică revizia publicată separat. Nu promite sincronizare între conturi sau agenți fără o integrare verificată.
