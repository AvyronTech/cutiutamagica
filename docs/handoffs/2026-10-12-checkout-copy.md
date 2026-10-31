# Textul butonului de comandă — 12 octombrie 2026

## Scop

- Butonul final spune „Comandă și achită la livrare” pentru ramburs și „Comandă și plătește online” pentru card, pe desktop și mobil.
- Opțiunea de card este afișată numai când un procesator este efectiv disponibil. Mesajele publice despre activarea viitoare a Stripe/procesatorului au fost eliminate din checkout și din întrebările frecvente.
- Descrierea publică a plății cu cardul este neutră față de furnizor.
- Formularea butonului indică explicit plata, conform art. 8 alin. (2) din OUG 34/2014. Sursă: https://legislatie.just.ro/Public/DetaliiDocument/158913.

## Fișiere

- `src/routes/comanda.tsx`, `src/routes/index.tsx`, `src/server/services/checkout-readiness.ts`, `src/styles.css`.
- Capturi: `docs/screenshots/checkout-button-desktop-2026-10-12.png` și `docs/screenshots/checkout-button-mobile-2026-10-12.png`.
- Nu sunt migrații noi și nu este necesară o configurare externă pentru această schimbare.

## Verificare

- Fluxul local a fost inspectat pe desktop și la 390 × 844 px, cu un produs pus în coș fără trimiterea comenzii. Produsul a fost marcat temporar ca disponibil exclusiv în baza locală ignorată de Git pentru captura UI, apoi starea inițială a fost restabilită.
- `npm run typecheck`, `npm test` (231 teste), `npm run lint`, `npm run build`, `npm run cf:deploy:dry` și `git diff --check` au trecut.
- Nu s-au făcut push, deploy, plăți, comenzi reale sau activări de servicii.
