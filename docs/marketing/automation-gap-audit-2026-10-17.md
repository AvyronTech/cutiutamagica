# Audit flux marketing, comenzi și marketplace — 17 octombrie 2026

Acest document separă cerințele, funcțiile existente în produs și acțiunile externe confirmate. Un fișier, o configurare, o sesiune autentificată sau o ciornă nu reprezintă publicare ori sincronizare live.

## Situația reală

| Cerință                                        | Stare verificabilă în produs                                                         | Problemă de flux / sincronizare                                                                       | Acțiune necesară                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Feed și Story zilnic, Reel/TikTok la trei zile | Playbook, ciorne și active există; nu există dovadă de execuție zilnică neîntreruptă | Heartbeatul verifică, dar aprobarea, conectorul și limita Free pot opri publicarea                    | Materializare zilnică, aprobare exactă, publicare prin conector verificat și confirmare URL         |
| Facebook Page și profil Facebook               | Sunt destinații distincte; profilul personal nu este acoperit de aprobarea paginii   | Rutarea Metricool nu publică pe profilul personal                                                     | Variantă personală, aprobare separată și publicare nativă în Opera verificat                        |
| Muzică, Notes, link sticker, poll, întrebări   | Sunt definite ca propuneri native                                                    | Metricool nu redă fidel toate funcțiile; un element desenat nu este interactiv                        | Aplicare nativă numai când funcția este vizibilă în cont, urmată de preview                         |
| Reacții, grupuri, moderare și unfollow         | Există reguli și tabele de propuneri                                                 | Nu există mandat pentru execuție autonomă în masă                                                     | Lot separat, revalidare, aprobare și dovadă per efect extern                                        |
| Conversații și comenzi ramburs                 | Schema și playbookul există                                                          | Nu este demonstrat un conector live unificat pentru toate inboxurile și confirmările                  | Conector oficial, deduplicare, colectarea completă a datelor, aprobare și confirmare tranzacțională |
| Metricool Free                                 | Bugetul este modelat, identitatea așteptată este fixată                              | O valoare configurată nu este contor lunar real; limita se poate schimba                              | Citirea contorului live înainte de programare; rutare nativă după epuizare                          |
| GSC `sc-domain:cutiutamagica.eu`               | Proprietatea așteptată și importul sunt monitorizate                                 | Cont Google autentificat în browser nu dovedește credential backend ori import proaspăt               | Credential readonly verificat și import datat în platforma internă                                  |
| eMAG                                           | Contractul API și ordinea sincronizării sunt documentate                             | Identitatea sellerului, secretul și maparea produselor nu sunt confirmate live                        | Configurare oficială, dry-run, aprobare, apoi orders → inventory → prices → catalog → reconcile     |
| Trendyol                                       | Sunt fixate API Product V2 și Order V2                                               | Lipsesc seller ID, chei și mapări confirmate                                                          | Configurare oficială și test idempotent înainte de activare                                         |
| Okazii                                         | Feed XML + comenzi manuale este modelul sigur curent                                 | Formatul și categoriile contului nu sunt validate live                                                | Validare în cont și aprobare înaintea încărcării feedului                                           |
| Vinted                                         | Este dezactivat prin politică                                                        | Contul standard nu justifică vânzare comercială, iar eligibilitatea Pro RO nu este confirmată         | Rămâne dezactivat până la schimbarea oficială a eligibilității                                      |
| Workers AI                                     | Bindingul `AI` există în build, iar rolul de draft și a doua verificare este definit | Agentul îl păstrează dezactivat prin setare; activarea nu este implicită și nu include date personale | Activare separată, limită Free, prompturi versionate și eval înainte de folosire                    |
| AVYRON OS                                      | Schimb asincron de statistici și skill este izolat                                   | Nu este control plane și nu poate primi clienți, comenzi sau drepturi de publicare                    | Numai exporturi agregate/pachete aprobate prin HMAC și coadă                                        |
| Telefon Samsung                                | Nu există integrare verificată                                                       | Automatizarea prin dispozitiv ar fi fragilă și ar putea ocoli controalele platformelor                | Nu se folosește fără design, autorizare și test separat                                             |

## Remedieri introduse în această revizie

- două surse auditabile de aprobare: `admin_dashboard` și `codex_conversation`;
- cod unic, revizie exactă și snapshot imuabil pentru fiecare cerere;
- chitanțe append-only și chei de idempotency;
- cvorum 2 din 2 pentru publicare socială și celelalte acțiuni externe critice;
- respingerea este terminală, iar expirarea cererilor vechi este automată;
- Dashboardul arată sursele, cvorumul, codul, revizia și comanda exactă pentru Codex;
- aprobarea și execuția externă rămân pași separați (`autoExecute=false`);
- fluxul vechi de aprobare a unui draft social înregistrează acum dovada Dashboard și așteaptă Codex când cvorumul nu este complet.

## Automatizări sigure active după aplicarea migrației

Monitorizarea orară poate expira cereri depășite, semnala conectori neverificați, date GSC vechi și operațiuni eșuate, fără apel extern. Pachetul de skill versionat include politica multisursă. Dashboardul poate înregistra decizia sa; Codex poate înregistra decizia conversației numai prin endpoint administrativ autentificat și cu referință de evidență.

## Ce nu se automatizează fără o etapă separată

Nu se aprobă și nu se execută automat publicări, mesaje, comenzi, modificări de stoc/preț, sincronizări marketplace, unfollow, moderare distructivă, aplicarea unui skill extern sau activarea unui conector. Nicio reluare nu este permisă când rezultatul extern este incert; întâi se verifică destinația.
