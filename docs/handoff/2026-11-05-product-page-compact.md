# Fișe de produs compacte și transport la prima comandă — 5 noiembrie 2026

## Schimbări

Componente comune pentru cele șapte produse publice, cu teme, texte, imagini și melodii proprii. Eticheta categoriei deasupra titlului și blocul duplicat „Detalii care contează” sunt eliminate. Prețul este compact, audiția este sub zona de comandă, iar „Idei de dăruit” și distribuirea sunt pliabile. Livrarea folosește un card scurt. Recomandările nu au săgeți; curg continuu, cu pauză, glisare manuală și respectarea preferinței de mișcare redusă. Chatul nu este montat pe paginile de produs și este încărcat separat pe celelalte pagini.

Galeria păstrează fotografia principală 12 secunde și celelalte 5 secunde. Pauză la interacțiune, zoom/360, pagină ascunsă sau galerie în afara ecranului; temporizatoarele și observatorii sunt curățați la navigare. Imaginile au dimensiuni stabile, iar încărcarea audiției rezervă spațiu pentru a limita deplasările.

## Transport gratuit real, nu doar mesaj

Migrarea append-only 0090 adaugă `first_order_shipping_redemptions`, legată de cont și comandă. Beneficiul este disponibil numai unui client autentificat și activ, cu aceeași adresă în checkout și fără o comandă deja înregistrată pe cont/client/e-mail. Istoricul de invitat este luat în calcul. Revendicarea și verificarea sunt în aceeași tranzacție cu comanda; cererile concurente nu pot obține două beneficii. Identitatea trimisă în JSON nu acordă acces. Quote-ul și alegerea unui Easybox/curier live rămân obligatorii când configurația le cere.

O comandă cu plată în curs este deja înregistrată: reluarea aceleiași comenzi păstrează beneficiul; o comandă nouă folosește tariful normal. Beneficiul nu este transferabil la alt e-mail. Checkoutul, opțiunile de curier și pagina Livrare reflectă aceeași regulă. Nu s-a făcut nicio comandă, plată sau expediere reală pentru verificare.

## Cont de test și compatibilitate

Contul normal solicitat explicit de administrator a fost provisionat cu hash și sare, fără credențiale în clar în repository/D1/frontend și fără drepturi administrative. Nu se publică adresa/parola în documentație. Verificarea live a descoperit eroarea autentificării cu parolă. Derivarea încearcă Node crypto și folosește implementarea portabilă PBKDF2 din @noble/hashes când runtime-ul de producție limitează și API-ul Node. Formatul și cele 210.000 de iterații existente sunt păstrate; nu se schimbă parolele sau hashurile existente. Regresia simulează explicit eroarea nativă de producție și verifică vectorul independent. Nu s-au redus regulile generale și nu s-au schimbat conturi administrative/MFA. Loginul live se verifică pe versiunea publicată, separat de testele locale.

## Verificări

- Suita locală: 367 teste, 64 fișiere. Regresiile noi verifică hashuri existente, limita SubtleCrypto, sări diferite, beneficiul unic și replay-ul, identitatea neautentificată/alt e-mail, istoricul de invitat, concurența și necesitatea quote-ului Easybox.
- Toate cele șapte produse la 390 și 1440 px: fără overflow, primul element al descrierii este H1, fără highlights duplicate/chat/săgeți, panouri închise implicit. Winter, Harry Potter și Sunshine verificate și la 320 px.
- Galerie: la 0 și 10,1 s fotografia principală, la 12,9 s a doua, la 18 s a treia. Recomandările au parcurs circa 48 px în 2,5 s. Preț: aproximativ 45 px pe mobil / 53 px desktop; livrare aproximativ 85 px pe mobil.
- Checkout local autentificat: transport inclus; schimbarea e-mailului la alt client readuce tariful de 25 RON, iar restabilirea adresei contului readuce beneficiul. Fără trimiterea comenzii.
- Reper de performanță înainte de release, Chrome izolat la 390 px, fără limitare CPU/rețea, cache HTTP ocolit: LCP 1.677 ms și CLS 0,0847. Nu există date CrUX pentru acea pagină; rezultatul este de laborator, nu probă din utilizare reală. Măsurarea finală se face după publicare.
- Capturi și matrice UI: `/Users/niss/.codex/visualizations/2026/11/05/cutiuta-product-compact/`. Verificările TypeScript/lint/build/dry run și CI se consemnează separat în logurile releaseului. Schema și versiunea servite se confirmă în Cloudflare/health.

Referințe de implementare: [Node crypto în Workers](https://developers.cloudflare.com/workers/runtime-apis/nodejs/crypto/), [limita WebCrypto PBKDF2](https://github.com/cloudflare/workerd/issues/1346), [carusele și Web Vitals](https://web.dev/articles/carousel-best-practices).

## Verificare publică PR #84

Merge `5512cba`, Worker `a1fde78d-439b-4135-8b65-125e38a2cefe` la 100%, schema 90 și verificare FK fără erori. Auditul live: 38 URL-uri, 7 produse, 5 oferte Merchant, 35 imagini și zero probleme. Traseu rece de 25,5 secunde pe mobil: LCP 1.996 ms, CLS 0,08, fără date CrUX. Nu se solicită configurația chatului pe produs. Verificarea live a autentificării a necesitat fallbackul PBKDF2 portabil, deoarece limita nativă poate exista și în implementarea Node de producție.
