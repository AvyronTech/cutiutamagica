# Handoff: acces client, catalog și chat

## Scop

- Butonul „Înapoi acasă” din pagina contului este în fluxul paginii, fără suprapunere peste text.
- Pagina `/auth` are un singur formular client: e-mail sau telefon și parolă, cod pe e-mail pentru crearea contului/recuperare, opțiune de sesiune extinsă, afișarea parolei, Google și Apple când sunt configurate. Accesul echipei rămâne pe `/admin`, cu verificările existente de rol.
- Acțiunea principală din hero duce la `/produse`; hero-ul catalogului indică modurile de alegere, acțiunile redundante au fost eliminate, iar ghidul de cadouri este lângă „Magia care urmează”.
- Chatul păstrează conversația doar pe durata filei, recunoaște sesiuni expirate și permite reluarea fără blocarea formularului. Răspunsurile AI folosesc fluxul autonom existent în Worker, cu preluare de către echipă pentru situațiile care cer om.

## Fișiere și date

- Interfață: `src/routes/{__root,auth,cont,index,produse}.tsx`, `src/components/site/ChatWidget.tsx`, `src/styles.css`.
- API: `src/server/review-accounts.ts`, `src/server/customer-password.ts`, `src/server/integrations/provider-runtime.ts`.
- Teste: `src/server/reviews.test.ts`.
- Configurare: `.env.example`, `package.json`, `package-lock.json` (biblioteca `jose` pentru verificarea semnăturii Apple).
- Migrare append-only: `0076_customer_password_phone_apple.sql` adaugă telefonul unic și identitățile Apple. Migrarea a fost aplicată doar în D1 local.

## Verificări

- `npm run typecheck`, `npm test` (56 fișiere, 300 teste), `npm run lint`, `npm run build` și `npm run cf:deploy:dry`: trecute. După corecția cookie-ului Apple, testul specific și typecheck/lint au trecut din nou.
- Browser local: desktop și mobil pentru `/cont?mod=creare`, `/auth`, `/produse`; butonul înapoi nu suprapune textul, formularul este utilizabil și hero-ul catalogului este lizibil. Interfața chatului s-a deschis și a afișat opțiunile AI și consimțământul. Nu s-a efectuat un apel live la modelul AI în verificarea vizuală.
- Local: `GET /admin` fără sesiune redirecționează la autentificarea echipei; conectarea cu date client invalide răspunde 401.

## Configurare externă rămasă

- La o lansare autorizată: aplicarea migrației D1 în producție înaintea codului; verificarea transportului e-mail și a setărilor Google existente; configurarea Apple Service ID, domeniului și callbackului HTTPS, apoi a celor patru secrete Apple enumerate în `.env.example`. Butonul Apple rămâne ascuns până atunci.
- Nu s-a făcut push, pull request, deploy, migrare remote sau activare de furnizor.
