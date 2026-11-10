# Consolidare audio și release — 10 noiembrie 2026

## Conținut publicat

Cele cinci înregistrări furnizate de administrator sunt încărcate în R2, aprobate și activate în D1, în fișele produselor și în Test Drive-ul public. Nu depind de fișiere locale sau de un upload Git. Deploy-ul Workerului păstrează bucketul și configurațiile existente.

| Produs | Fragment | LUFS integrate | Vârf real |
| --- | --- | --- | --- |
| Pisicuță și Lună | 15 s | −18,04 | −3,20 dBTP |
| Halloween | 15 s | −17,99 | −2,90 dBTP |
| Intro Harry Potter WB | 15 s | −18,28 | −1,49 dBTP |
| Winter Is Coming | 15 s | −18,77 | −1,77 dBTP |
| You Are My Sunshine | 15 s | −18,31 | −1,80 dBTP |

[Manifestul verificat](published-audio.json) conține identificatorii media, duratele și starea publică. Formatul compatibil cu selectorul existent este WAV PCM16 mono/44,1 kHz, 1.323.044 bytes per fragment. Playerul păstrează `preload="none"` și suportul Range; fiecare fișier a răspuns 200, iar cererile de interval 206.

Procesarea păstrează înălțimea și ritmul original, cu fade-uri scurte, normalizare și reducere moderată a zgomotului unde a fost solicitată. Sunshine exclude zgomotele mai puternice de la capete și utilizează repararea conservatoare a impulsurilor. Zgomotele care se suprapun peste armonicele melodiei nu pot fi declarate complet eliminate. Nu este o înregistrare sintetizată sau o certificare a drepturilor asupra compoziției.

Etichetele audio generice au fost înlocuite în configurațiile publice cu titlurile din fișele produselor: La Vie en Rose, This Is Halloween, Hedwig's Theme, Game of Thrones - Main Theme și You Are My Sunshine. Aceste etichete sunt folosite și în coș/checkout; numele produsului Intro Harry Potter WB rămâne neschimbat.

Fiecare player a fost verificat în Opera: redare completă până la 15 s, pauză/reluare și fișier persistent în dashboard după reload. Viewporturile de 390 px nu au depășiri orizontale; probele sunt de viewport, nu pe dispozitive fizice iOS/Android. Capturile și copiile prelucrate rămân în artefactele locale `cutiuta-*-audio-20261110`.

## Cod și verificări de release

Corecția uploadului R2 cu `FixedLengthStream` și sincronizarea playerului cu durata reală sunt integrate prin PR #102. PR #103 a adăugat manifestul și documentația peste runtime-ul validat `06cabaf`. Probele ulterioare au identificat o tratare incorectă a refuzurilor asincrone de autentificare în dispatcherul media: accesul era refuzat, dar răspunsul ajungea 500 în loc de 401/403. Dispatcherul așteaptă acum operațiile în blocul try/catch; politica de autentificare și permisiunile sunt păstrate. Cele 14 regresii acoperă listarea, uploadul, editarea și previzualizările GET/HEAD pentru utilizatori anonimi sau fără permisiuni și confirmă că D1/R2 nu sunt accesate după refuz.

Preflight curent: 535 teste în 90 de fișiere, typecheck, lint, build și security:check trecute; zero constatări la verificarea sursei și zero vulnerabilități npm. Migrări D1 restante: zero (schema 95). Dry-run: PASS. Verificarea D1: zero încălcări FK și quick_check OK pentru media/configurațiile audio. Auditul SEO live: 38 URL-uri, zero probleme în criteriile verificate. CI și probele de după republicare sunt consemnate în receipt-ul [PR #103](https://github.com/AvyronTech/cutiutamagica/pull/103). Publicarea folosește `--keep-vars`; nu schimbă planul Free, autentificarea, stocurile, prețurile sau fluxurile financiare.

## Reconcilierea spațiilor de lucru

Au fost inventariate 14 worktrees. `main` și ramura de referință erau aliniate la `2393071` înaintea consolidării, fără PR-uri deschise sau modificări locale în checkout-ul de release.

Corecțiile storefrontului din `19cbf5a` sunt deja prezente: fișierele de consimțământ, recenzii, recuperarea cererilor și auditul SEO comparate sunt identice cu ramura de referință. Monitorizarea marketing există deja în runtime; vechea componentă Metricool a fost înlocuită de trackerul cu consimțământ comun.

Au fost păstrate separat ciorne istorice de marketing/skill-uri și un flux furnizori neterminat în alte worktrees. Fluxul furnizori include endpointuri și migrări vechi care intră în conflict cu istoricul aplicat și nu face parte din lotul audio. Nu a fost publicat automat și nu au fost suprascrise acele spații. Nu sunt schimbări suplimentare ale lotului audio rămase neintegrate.

URL-ul alternativ workers.dev respinge cererile nepermise cu 421 (`HOST_NOT_ALLOWED`), conform politicii existente; acesta este un refuz intenționat, nu o eroare de autorizare. Receipt-ul PR-ului corecției media consemnează validarea și versiunea finală republicată.
