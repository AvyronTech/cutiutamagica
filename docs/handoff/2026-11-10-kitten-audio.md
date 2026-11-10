# Audio Pisicuță și Lună — 10 noiembrie 2026

## Scop și conținut

Înregistrarea furnizată de administrator este destinată exclusiv produsului `product_kitten`, SKU `CM-KITTEN`, pagina `/produs-cutiuta-muzicala-pisicuta-si-luna`.

Prelucrare locală cu FFmpeg, fără serviciu plătit sau dependență nouă în aplicație: fragment 15 s, mono PCM16/44,1 kHz, filtru trece-sus 70 Hz, amplificare liniară și fade-in 60 ms / fade-out 150 ms. Măsurarea fișierului final: −18,04 LUFS integrate, −3,20 dBTP, 1.323.044 bytes. Înregistrarea reală este păstrată; fără sunet sintetizat sau reducere agresivă a zgomotului. Copia și măsurătorile sunt în artefactele locale, nu în Git.

## Blocaj descoperit și remediere

POST-ul media din dashboard răspundea 500; logul de producție indica `TypeError`. Reproducerea în workerd/R2 local a confirmat eroarea de lungime necunoscută: filtrarea prin `TransformStream` pierde lungimea cunoscută cerută de `R2Bucket.put`.

`r2UploadStream` păstrează limita de octeți și adaugă `FixedLengthStream`, fără încărcarea întregului fișier în memoria Workerului. Lungimea declarată este validată față de limita MIME înaintea apelului; fișierele mai mari sau trunchiate sunt respinse. Autentificarea, aprobările și auditul existente sunt păstrate.

Testul de regresie folosește runtime workerd și R2 local real: încărcare și citire exactă, depășirea lungimii și trunchiere fără obiect salvat. Testele de API în Node simulează primitiva Worker absentă în Node; testul de runtime verifică implementarea reală.

Referințe primare: [R2 put și lungimea streamului](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/), [FixedLengthStream](https://developers.cloudflare.com/workers/runtime-apis/streams/transformstream/).

## Livrare

Validarea completă, publicarea corecției, identificatorul media și probele de redare se completează după verificarea live. Nu sunt necesare migrații D1, schimbări de stoc/preț sau tranzacții.
