# Cutiuța Magică - reguli de lucru

Acest repository este produsul comercial independent Cutiuța Magică. Lovable, Claude și ceilalți agenți trebuie să respecte regulile de mai jos.

## Arhitectură

- Păstrează frontendul, Worker API, D1, R2, KV, secretele și deploymentul separate de AVYRON OS.
- AVYRON este doar o integrare opțională, asincronă, prin API/webhook autentificat. Magazinul trebuie să funcționeze complet când AVYRON este indisponibil.
- Folosește Cloudflare D1 pentru date relaționale și metadate, R2 pentru fișiere, iar KV numai pentru date efemere sau cache justificat.
- Migrațiile D1 sunt append-only. Nu modifica o migrare deja aplicată; adaugă una nouă.

## Securitate și acțiuni externe

- Nu stoca parole, API keys, refresh tokens sau service tokens în clar în D1, cod ori frontend. Folosește Cloudflare secrets sau stocarea criptată existentă.
- Orice publicare socială, unfollow, plată, anulare, ștergere, schimbare DNS ori integrare live necesită aprobarea explicită a unui administrator.
- Agenții AI pot analiza și crea drafturi; acțiunile externe rămân într-o coadă de aprobare și trebuie să fie idempotente și auditate.
- PWA nu cachează pagini administrative, răspunsuri API sau date personale. Nu persista parola ori sesiunea în localStorage.

## Livrare

- Nu face push, merge, deploy, modificări DNS sau activări cu cost fără cerere explicită în conversația curentă.
- Nu forța istoricul Git și nu elimina modificări existente. Lucrează cu schimbările Lovable/Claude deja prezente.
- Înainte de predare rulează `npm run typecheck`, `npm test`, `npm run lint`, `npm run build` și `npm run cf:deploy:dry` când mediul permite.
- Verifică desktop și mobil pentru autentificare, dashboard, catalog, coș și fluxurile modificate.
