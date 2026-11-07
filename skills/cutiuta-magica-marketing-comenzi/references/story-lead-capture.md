# Story complet și captarea leadului

## Narațiunea Story-ului

Un Story zilnic este o secvență de 3–5 cadre, nu un singur poster redimensionat:

1. `hook`: o întrebare sau o emoție legată de ocazie;
2. `produs`: cutiuța reală, numele și un detaliu verificat;
3. `dovadă`: mecanism, manivelă, dimensiune ori utilizare susținută de catalog;
4. `interacțiune`: poll sau întrebare numai dacă ajută cercetarea și nu cere date personale;
5. `conversie`: un CTA și o destinație.

Scrie micro-copy separat pentru fiecare cadru: titlu scurt, maximum o propoziție de susținere și, pe ultimul cadru, CTA-ul. Textul trebuie să fie complet și inteligibil fără sunet, dar să nu acopere produsul. Captionul Story-ului și stickerul fac parte din aceeași revizie aprobabilă.

## Alegerea CTA-ului

Folosește un singur CTA per secvență:

- `Vezi cutiuța` către pagina produsului;
- `Cere detalii` către conversația nativă, dacă inboxul este monitorizat;
- `Cere o ofertă` către formularul propriu al magazinului;
- `Comandă` numai când pagina de produs/checkout este funcțională și produsul cumpărabil.

Nu desena butoane în imagine. Adaugă stickerul, linkul ori butonul din editorul nativ și confirmă în preview că este apăsabil. Dacă funcția nu apare pe cont, schimbă CTA-ul și copy-ul; nu publica un control fals.

## Formularul scurt

Pentru conținut organic, formularul preferat este o pagină proprie, rapidă și mobilă, deschisă prin link sticker ori linkul verificat din profil. Nu prezenta Meta Instant Forms sau alte lead forms publicitare drept funcții organice gratuite.

Formularul minim conține:

- nume;
- e-mail;
- produsul/campania preselectată din link, fără a cere utilizatorului să o scrie din nou;
- mesaj opțional foarte scurt;
- consimțământ explicit, neprebifat, cu link spre politica de confidențialitate.

Nu cere telefon, adresă sau date de comandă în această etapă decât dacă persoana trece explicit la comandă. Validează server-side, aplică rate limiting și protecția anti-abuz disponibilă. Nu pune date personale în UTM, URL, analytics, capturi ori loguri.

Folosește un endpoint existent numai dacă schema lui acceptă exact câmpurile, scopul și consimțământul acestui formular. `/api/v1/product-interest` este pentru notificare/precomandă cu e-mail și nu trebuie reutilizat ca formular general de ofertă. Dacă nu există un contract compatibil, salvează propunerea de implementare și folosește temporar pagina produsului ori conversația nativă; nu publica un Story către un formular inexistent.

Când fluxul compatibil există, scrie o singură înregistrare idempotentă. Salvează `source_platform`, `account_id`, `campaign_id`, `revision_id`, `product_id`, `utm_source`, `utm_medium`, `utm_campaign`, `consent_version`, `consent_at` și pagina de intrare. Deduplică după e-mail normalizat și conversația deschisă, fără a pierde atribuirea. Nu inventa un endpoint din timpul publicării și nu trimite date către AVYRON; integrarea AVYRON primește numai statistici agregate sau schimburi aprobate.

După trimitere, confirmă primirea fără a promite un termen neverificat. Orice e-mail de confirmare folosește fluxul tranzacțional existent, idempotent, și nu este declarat livrat fără dovadă.

## Capabilități și alternative Free

- Instagram Story: folosește link sticker numai dacă este vizibil în composer; textul scris pe imagine nu este link.
- Facebook Story: folosește linkul/stickerul numai dacă ruta și contul îl oferă; altfel trimite spre butonul verificat al Paginii ori spre Messenger.
- Facebook Page: un action button poate trimite la formular sau contact, dar este o setare a Paginii, nu un element al fiecărui Story. Modificarea lui este acțiune externă și cere aprobare.
- TikTok: folosește linkul din profil numai dacă acel câmp este disponibil și indică destinația corectă; captionul nu devine automat clicabil.
- Lead ads/Instant Forms: tratează-le ca publicitate cu buget și aprobare separată. Nu porni campanii, trialuri sau costuri din fluxul organic.

## QA și măsurare

Înainte de aprobare verifică: produsul cumpărabil, URL 200, destinația exactă, formularul la 390 px, politica de confidențialitate, consimțământul, mesajele de eroare/succes, deduplicarea, UTM, safe zones, lizibilitatea și preview-ul stickerului. Nu publica Story-ul dacă formularul sau destinația nu a fost testată.

Măsoară separat `story_reach`, `completion_rate`, `sticker_taps`, `landing_views`, `form_starts`, `valid_submissions`, `qualified_conversations` și `orders_attributed`. Optimizează o singură variabilă majoră per test: hook, ordine, CTA, destinație sau numărul de câmpuri.
