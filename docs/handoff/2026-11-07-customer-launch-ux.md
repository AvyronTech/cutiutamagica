# Cont client: organizare și acces — 7 noiembrie 2026

## Stare

Pregătire **locală**, pe `codex/seo-compatibility-audit-20261107`, peste commitul SEO local `e14759e` și baza de producție `a86494c`. Schimbările SEO anterioare sunt păstrate. Administratorul a cerut să decidă ulterior push-ul/deploy-ul; nu s-a făcut push, PR, merge, deploy sau migrare remote. Fără migrare nouă, costuri activate, schimbări de parole, roluri sau MFA pentru conturile reale.

## Experiența clientului

- `/cont` începe cu **Comenzi**. Navigarea separă Comenzi, Magic Stars, Calendar, Portofel și Profil și acces, cu o singură secțiune selectată. Linkurile din antet și hashurile vechi sunt compatibile; `securitatea-contului` deschide în continuare formularul parolei. Formularele nesalvate se păstrează între secțiuni. Secțiunea activă include hashul în calculul linkului; nu sunt marcate toate linkurile drept active.
- Comenzile au mai puține straturi vizuale, contrast corect și stare goală cu acces la catalog. O comandă anulată și neexpediată nu mai afișează concomitent „livrare în așteptare”.
- Profilul permite actualizarea **numelui afișat**. E-mailul rămâne identitatea verificată, iar parola/telefonul de conectare sunt într-un panou separat, închis implicit. Nu au fost efectuate schimbări reale de parolă în testele UI.
- Preferințele de cadouri, ziua/luna aniversării și opțiunea pentru mesajele despre stele sunt grupate în Profil. Aniversarea necompletată are selecții explicite, fără o dată presupusă de 1 ianuarie. Bonusul afișat vine din activitatea configurată.
- Soldul, activarea beneficiului, istoricul și codurile utilizabile sunt în Magic Stars. Codurile au valoare, expirare și acțiune de copiere; codurile expirate nu sunt afișate drept utilizabile.
- Calendarul explică repetarea anuală și păstrează controalele pentru mementouri. Formularele au etichete și controale de deschidere explicite.
- Portofelul respectă disponibilitatea reală a salvării cardurilor, păstrează numai date mascate și trimite către checkout/catalog. Cardul gol de abonamente este eliminat; abonamentele existente se păstrează, cu stări în română.
- **Cererile mele** apar când există istoric sau o eroare care necesită reîncercare. Istoricul propriu rămâne lizibil; invitațiile de creare nu sunt afișate cât atelierul este în pregătire. `customerLaunch.personalizationRequests=false` închide și POST-ul de pe server înainte de procesarea imaginilor sau scrierea în D1/R2. Nu este o simplă ascundere a butonului.
- Pagina clientului nu mai montează animația de intrare, mesaje contextuale, recuperarea coșului, chatul plutitor, șina decorativă sau butonul redundant de coș plutitor. Coșul din antet și subsolul comun sunt păstrate. Nu se pornește trackingul Metricool pentru ruta Cont; asta nu garantează eliminarea din memorie a unui script încărcat anterior pe altă pagină cu acord.

## Acces și date

- Datele clienților continuă să fie selectate după sesiunea verificată, nu după ID-uri trimise în URL/corp. Testele folosesc două identități separate și verifică comenzile, calendarul, cardurile și cererile.
- API-ul numelui afișat folosește sesiune activă, origine identică, corp limitat, validare 2–60 caractere, limitare de frecvență și parametri SQL legați. Nu acceptă schimbarea e-mailului, a identității sau a rolului. Confirmă că actualizarea a afectat contul activ.
- Istoricul Magic Stars nu mai serializează notele interne ale ajustărilor sau `source_id`; numele activităților publice rămân disponibile. Datele interne din D1 nu sunt șterse.
- Salvările de profil întârziate nu pot repopula cache-ul după logout sau după schimbarea contului. Activarea beneficiilor și redirecționarea către salvarea cardului verifică identitatea încă activă înainte de feedback/redirecționare.
- Loginul cu destinație `/comanda` sau `/cont#calendar` păstrează experiența clientului, nu deschide accidental formularul administratorului. Destinațiile externe, cu backslash, de tip protocol-relative sau privilegiate sunt filtrate. Opțiunea de login administrativ rămâne destinată rutelor administrative.
- Starea de vizitator are mereu acces la pagina de conectare. O integrare externă lipsă nu mai produce anunțul fals „Conturile Magic se deschid în curând”. Verificarea furnizorilor este făcută în pagina de login, fără o cerere duplicată din Cont.
- Pentru `/cont`, catalogul nu mai este citit și serializat în SSR; coșul folosește în continuare interogarea existentă din browser. SSR local verificat: 200, circa 15,9 KB, noindex și fără catalog serializat. Aceasta nu este o măsurare Core Web Vitals sau o garanție că limita Free nu mai poate fi depășită.
- Auth/admin nu mai sunt învelite într-un al doilea `<main>` al rădăcinii. PWA continuă să cacheze numai resurse statice; API-urile și paginile private nu sunt adăugate în cache.

## Verificări și probe

- `npm run typecheck`, `npm run lint`, `npm run build`, `npm run cf:deploy:dry`, `git diff --check`: trecute. Ultimul dry-run verifică buildul de producție al corecțiilor finale și nu publică.
- Suita completă: **403 teste / 70 fișiere**, trecută. Regresiile noi verifică izolarea între doi clienți, respingerea sesiunilor anonime/expirate/blocate, CSRF, imposibilitatea folosirii cookie-ului client drept sesiune admin, modificarea propriului nume fără privilegii, input SQL păstrat ca text, lipsa notelor interne, blocarea atelierului nelansat și răspunsurile de profil sosite după logout. Și ramura de upload viitoare rămâne testată cu starea de lansare deschisă numai în teste.
- Matrice UI: **6 secțiuni × 3 lățimi (320/390/1440 px)**, fără overflow orizontal, o singură opțiune activă, zero linkuri admin în conținut și fără chat plutitor. Datele DEMO nu conțin note interne vizibile. Contrastul rândurilor de produse a fost corectat după inspecția vizuală.
- Login și reconectare DEMO prin formular, salvare nume, păstrarea preferințelor nesalvate între file, persistarea tuturor celor trei preferințe, calendar cu mementouri oprite, aniversare 31/12, activare beneficiu local, afișarea valorii/expirării codului, portofel fără furnizor, istoric de comenzi și cereri: verificate local.
- `/admin` accesat cu clientul DEMO redirecționează către loginul administrativ. API-ul de stoc nu returnează date administrative. Testul automat confirmă 401, iar verificarea UI confirmă răspunsul fără date. Logoutul elimină numele, comenzile și meniul privat; reconectarea cu `redirect=/cont#calendar` revine la Calendar. Consola filei finale proaspete: zero erori/avertismente.
- Două comenzi și o cerere veche au fost introduse direct **numai în D1 local** pentru probele vizuale. Au fost apoi eliminate; au rămas zero asemenea fixture-uri, zero sesiuni locale ale contului și `foreign_key_check` curat. Contul DEMO izolat și preferințele/beneficiul de test rămân disponibile pentru verificări ulterioare. Nu au fost trimise comenzi, plăți sau e-mailuri reale.

Probe vizuale: `/Users/niss/.codex/visualizations/2026/11/07/cutiuta-customer-launch/` — `orders-desktop.png`, `orders-mobile-320.png`, `calendar-mobile.png`, `profile-desktop.png`, `signed-out-mobile.png`, plus stările goale. Matrice: `/tmp/cutiuta-account-ui-matrix-20261107.json`. Loguri: `/tmp/cutiuta-account-{typecheck,tests,lint,build,dry,focused}-20261107.log`. Datele contului de test de producție nu sunt salvate în repository.

## Limita verificării live

Două încercări de login cu contul de test autorizat au primit „Serviciul este temporar ocupat”. În Opera, accesul la `/cont` a afișat **Cloudflare 1102 / Worker exceeded resource limits**, Ray `a56ec61259cd86b9`, la `2026-11-07 19:34:09 UTC`. Sesiunea administrativă existentă a rămas neatinsă. Nu s-a obținut o sesiune nouă de client în producție în această verificare.

Administratorul a acceptat anterior păstrarea Workers Free. Nu a fost activat un plan plătit și nu au fost reduse protecțiile parolelor. Optimizarea locală a randării nu dovedește remedierea loginului live. După aprobarea releaseului, se verifică separat autentificarea și fiecare secțiune pe versiunea publicată; până atunci nu se declară accesul live fiabil sau toate integrările externe funcționale.

Referințe: [Cloudflare — bune practici Workers](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/), [D1 — parametri legați în prepared statements](https://developers.cloudflare.com/d1/worker-api/prepared-statements/).
