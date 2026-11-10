# Politica de confidențialitate — 11 noiembrie 2026

## Scop și modificări

Revizie solicitată de administrator: operatorul aproape de final, fără adresa sediului social și fără mențiunea „neplătitor de TVA”. Identitatea publică vine în continuare din proiecția minimă D1 (`legal_name`, CUI, Registrul Comerțului, e-mail, telefon dacă este completat). Nu modificăm datele interne ale firmei sau documentele fiscale.

- `src/routes/politica-de-confidentialitate.tsx`: 11 secțiuni, cuprins HTML, scop/date/temei pe activitate, surse directe/marketplace, destinatari condiționați de utilizarea efectivă, cookie-uri și buton către preferințele existente, retenție, drepturi, securitate, AI/personalizare, transferuri, operator și legislație.
- `src/components/site/LegalPage.tsx`: dată de revizuire și cuprins opționale, secțiuni cu ancore și etichete. Termenii păstrează layoutul anterior; mențiunea TVA a fost eliminată din identitatea comună a ambelor pagini juridice.
- `src/styles.css`: stiluri limitate la politica de confidențialitate; fonturile locale existente Inter și Cormorant Garamond, text lizibil, cuprins lateral desktop/compact mobil, focus vizibil. Fără fonturi externe, dependențe, animații sau instrumente de tracking noi.

Corectate afirmațiile istorice: conectare nu exclusiv Google; sesiune client de 1 zi/30 zile conform alegerii, OAuth aproximativ 10 minute; Metricool este pixel de navigare, nu script injectat; mascarea AI nu garantează anonimizarea; atelierul public este în pregătire. Butonul cookie folosește mecanismul existent, fără schimbarea acordului la simpla deschidere.

## Surse primare verificate

- GDPR, art. 5–6, 12–22, 32, 44–49: https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX%3A32016R0679
- Legea 190/2018: https://legislatie.just.ro/Public/DetaliiDocumentAfis/203151
- Legea 506/2004, art. 4 și 12: https://legislatie.just.ro/Public/DetaliiDocument/56973
- Legea contabilității 82/1991, art. 25 (5 ani, de la 1 iulie a anului următor exercițiului): https://legislatie.just.ro/Public/DetaliiDocumentAfis/269533
- ANSPDCP — drepturi/cereri/plângeri: https://www.dataprotection.ro/?page=Plangeri_pagina_principala și https://www.dataprotection.ro/index.jsp?lang=ro&page=Transmiterea_plangerilor_catre_ANSPDCP

## Limite și validare juridică

Revizia aliniază informarea cu funcțiile citite în cod și identitatea publică verificată; nu este certificare de conformitate. Rămân necesare verificarea contractuală a persoanelor împuternicite/subprocesatorilor și a transferurilor efective, inventarul și calendarul operațional complet de retenție/ștergere și verificarea obligațiilor de identificare comercială de către operator/consilierul juridic. Nu inventăm DPO, certificări, termene tehnice de ștergere sau disponibilitatea unei integrări. Adresa sediului rămâne nepublicată, conform cererii explicite; cerințele legale privind identitatea comerciantului trebuie validate separat, fără republicarea automată a adresei.

## Verificări și livrare

Typecheck, teste, lint, build, dry-run și UI desktop/mobil se consemnează în receipt-ul PR-ului după executare, împreună cu commitul, versiunea Worker și verificările publice. Capturi și rezultate: `/Users/niss/.codex/artifacts/cutiuta-privacy-20261111/`.

Fără migrare, configurare de plăți, comenzi, modificări de preț/stoc, conturi/MFA sau servicii plătite. Runtime-ul anterior `33d9342` poate fi republicat pentru rollback fără inversarea unei migrări.
