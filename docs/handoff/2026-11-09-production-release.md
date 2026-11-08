# Release Cutiuța Magică — 9 noiembrie 2026

## Scop și probe

Publicarea consolidată autorizată include auditul de securitate/calitate, lotul anterior de securitate, storefrontul și compatibilitatea callbackurilor de plată: PR #94. Auditul detaliat rămâne în `docs/audits/CUTIUTA_MAGICA_SECURITY_AUDIT.md`; stările sale sunt explicit datate, nu reprezintă certificare.

- D1 producție: migrațiile aditive 0092–0094 aplicate; schema 94. Bookmark Time Travel în evidența locală privată. Fără schimbări de produse, prețuri, stocuri ori suspendări de conturi.
- Stripe live: verificarea existentă a contului a trecut la 2026-11-08T23:16:07.441Z: contul configurat corespunde, țara RO, `charges_enabled=true`. Rambursul rămâne disponibil. Revolut Merchant este neconfigurat și dezactivat; nu este declarat operațional.
- Nu s-au creat comenzi, plăți, rambursări, facturi sau AWB reale. Simulările verifică sume server, monedă, semnături, duplicate și ordine de evenimente. Verificarea contului Stripe nu dovedește singură o plată reală cap-coadă.
- Hostul Worker istoric permite numai cele două callbackuri POST de plată, cu semnătura validată în handler. Restul rutelor, metodele GET și preview-urile sunt blocate. Dezactivarea completă a hostului așteaptă confirmarea destinațiilor în conturile procesatorilor; nu se întrerup integrări legitime.
- MFA și Access nu au fost activate. Nu s-au modificat abonamente, secrete financiare sau politici cu risc de blocare.

## GSC și SEO

Evidență nouă: `docs/seo/2026-11-09-release-gsc.json`. Cele 7 produse, cele 2 ghiduri rămase, homepage și catalog (11 inspecții individuale noi) sunt pe Google și indexate. Inventarul complet 38/38 inspectat în 8 noiembrie rămâne evidență separată, datată. Cele 4 sitemaps au Succes. Raportul agregat Pagini este rămas la 23 octombrie; excluderile observate sunt faviconul și o căutare cu parametri, nu pagini de produse. Nu s-au solicitat indexări inutile pentru pagini deja indexate și nu s-au inventat recenzii.

Fără acțiuni manuale ori probleme de securitate GSC; HTTPS fără probleme în ultimele 90 de zile. Product și Merchant fără probleme critice; validările transport/retur/audiență au reușit. Indexarea nu garantează poziții sau trafic.

## Corecția limitei Free

Primul deploy a încărcat codul, asseturile și rutele, dar actualizarea cronurilor a eșuat cu 10072: limita contului Free. Corecția păstrează un singur cron existent la minutul 00 și utilizează coada existentă pentru mentenanță: backup la minimum +900 s și securitate la minimum +1.800 s. Un mesaj per invocare izolează bugetul D1; eșecurile se reîncearcă. Nu creează infrastructură duplicată și nu activează servicii plătite. Instrucțiunile de rollout/rollback sunt actualizate în `docs/security/ROLLOUT.md`.

## Limite și lucru păstrat

Persistă riscurile documentate în audit: validare juridică/WCAG cu tehnologii asistive, antivirus, CSP strictă, exercițiu complet DR, reconcilierea financiară completă și limitele CPU Free. Nu se declară eliminate prin deploy.

Celelalte worktree-uri au fost inventariate. Ciornele marketing/furnizori și experimentele cu migrații vechi rămân intacte; nu sunt un lot de aplicație gata de lansare. PR #93 este preluat semantic în PR #94, nu se integrează de două ori.

Versiunea finală Worker, CI și probele publice sunt consemnate după finalizarea deployului.
