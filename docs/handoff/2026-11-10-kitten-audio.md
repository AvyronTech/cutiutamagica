# Audio Pisicuță și Lună — 10 noiembrie 2026

## Scop și conținut

Înregistrarea furnizată de administrator este destinată exclusiv produsului `product_kitten`, SKU `CM-KITTEN`, pagina `/produs-cutiuta-muzicala-pisicuta-si-luna`.

Prelucrare locală cu FFmpeg, fără serviciu plătit sau dependență nouă în aplicație: fragment 15 s, mono PCM16/44,1 kHz, filtru trece-sus 70 Hz, amplificare liniară și fade-in 60 ms / fade-out 150 ms. Măsurarea fișierului final: −18,04 LUFS integrate, −3,20 dBTP, 1.323.044 bytes. Înregistrarea reală este păstrată; fără sunet sintetizat sau reducere agresivă a zgomotului. Copia și măsurătorile sunt în artefactele locale, nu în Git.

## Blocaj descoperit și remediere

POST-ul media din dashboard răspundea 500; logul de producție indica `TypeError`. Reproducerea în workerd/R2 local a confirmat eroarea de lungime necunoscută: filtrarea prin `TransformStream` pierde lungimea cunoscută cerută de `R2Bucket.put`.

`r2UploadStream` păstrează limita de octeți și adaugă `FixedLengthStream`, fără încărcarea întregului fișier în memoria Workerului. Lungimea declarată este validată față de limita MIME înaintea apelului; fișierele mai mari sau trunchiate sunt respinse. Autentificarea, aprobările și auditul existente sunt păstrate.

Testul de regresie folosește runtime workerd și R2 local real: încărcare și citire exactă, depășirea lungimii și trunchiere fără obiect salvat. Testele de API în Node simulează primitiva Worker absentă în Node; testul de runtime verifică implementarea reală.

Referințe primare: [R2 put și lungimea streamului](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [FixedLengthStream](https://developers.cloudflare.com/workers/runtime-apis/streams/transformstream/).

## Player și verificări

Playerul folosea o limită fixă de 12 s, care tăia finalul înregistrării. Acum utilizează durata fragmentului validat (maximum 30 s), inclusiv în CTA, progres și tracking. Înregistrarea de față este redată complet, 15 s, cu final estompat.

- Typecheck, lint, `npm run build`, build de producție, `cf:deploy:dry` și `git diff --check`: PASS. **535 teste / 90 fișiere**: PASS. CI pe sursa aplicației `06cabaf`: PASS, inclusiv security:check, npm audit și verificarea buildului de producție ([run](https://github.com/AvyronTech/cutiutamagica/actions/runs/42899773691)).
- Publicare Worker `59a52a7f-3d56-4688-a159-f194be92500a`, tag **06cabaf**, cu `--keep-vars`; schema D1 rămâne **95**. Completările ulterioare ale acestui document nu modifică runtime-ul.
- Media: `media_a6af5858b1fd47ae85feb99af5540f90`; titlu administrativ „Pisicuță și Lună — înregistrare reală”; nume public „Melodia cutiuței Pisicuță și Lună”. Încărcat, aprobat, selectat ca fișier principal și activat public prin dashboardul autentificat existent.
- API public `/api/v1/catalog/products/kitten/experience`: audio activ, durata 15 s, `audio/wav`. Fișierul public răspunde 200; cererea `Range: bytes=0-43` răspunde 206 și `Content-Range: bytes 0-43/1323044`. Copia publicată este decodabilă PCM16 mono/44,1 kHz și măsoară −18,04 LUFS / −3,20 dBTP.
- Opera desktop, 1402 px: redare observată peste 12 s și până la final (`currentTime=15`, `ended=true`, `error=null`), reluare de la început și pauză: PASS.
- Opera, viewport mobil 390×844: redare/continuare funcțională, player vizibil fără depășire orizontală (`scrollWidth=innerWidth=390`). Este o probă de viewport, nu o certificare pe dispozitive fizice iOS/Android. Override-ul temporar a fost eliminat.
- Dashboard după reîncărcare: fișier Publicat, Vizibil public bifat și configurație persistentă. Playerul administrativ a încărcat cele 15 s și a avansat la 8,42 s fără eroare; oprit după test.
- Capturi locale: `product-audio-desktop.png`, `product-audio-mobile.png`, `dashboard-audio.png` în artefactele `cutiuta-kitten-audio-20261110`.

Nu sunt necesare migrații D1. Nu au fost modificate stocuri sau prețuri și nu au fost create comenzi, facturi ori tranzacții. Înregistrarea și corecția sunt publicate; documentația și ramurile se sincronizează prin PR #102.
