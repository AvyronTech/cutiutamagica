# Spații administrative unificate — 5 noiembrie 2026

## Scop și implementare

Ramură `codex/admin-unified-workflows-20261105`, bază `d79c113` (PR #87). Nu adaugă migrații, furnizori sau costuri.

- Identificare, etichetare și coduri QR: `/admin/products/identification`, file `products` și `orders`. Aceleași formulare de identificare, recepție, loturi, etichete și QR comandă. Selectarea comenzii este explicită; o comandă absentă nu produce QR pentru altă comandă.
- Rețele sociale și postări: `/admin/social`, file `accounts`, `posts`, `relationships`. Rezultatele conturilor conduc la ciorna pentru contul exact; platforma derivă din cont. Serverul refuză un cont lipsă, personal sau incompatibil cu platforma. Modificările ciornelor invalidează și rezultatele/numărătorile sociale și notificările. Marketing păstrează strategii, campanii și costuri, cu legătură către editorul comun.
- Stocuri și aprovizionare: `/admin/inventory`, file `stock` și `supply`. Produsul selectat se păstrează între stoc, cercetarea furnizorilor și recepție/etichete. Setările și bugetul furnizorilor se află în aceeași filă, într-un panou pliabil.
- Personalizări se numește „Cutiuțe Personalizate”. Promoții, Newsletter și E-mail și rapoarte sunt în Operațiuni.
- Adresele vechi `/admin/qr-generator`, `/admin/posts` și `/admin/suppliers` redirecționează cu înlocuirea intrării din istoric către fila comună, păstrând contextul valid. Legăturile notificărilor și Dropshipping folosesc destinația canonică.

Componentele se încarcă la prima vizitare; ulterior rămân montate pentru păstrarea formularelor. Interogările din file ascunse sunt oprite. Formularul stocului se reinițializează numai când versiunile datelor se schimbă, nu la simpla reîmprospătare a cache-ului. Filele au relații ARIA, navigare cu săgeți/Home/End, un singur H1 și focus vizibil. Fundalul meniului mobil a fost corectat.

## Fișiere

`src/admin/Workspace.tsx`, `workspace-activity.ts`, `pages/UnifiedWorkspaces.tsx`, paginile integrate Inventory/ProductInventory, ProductIdentification/QRGenerator, SocialNetworks/MarketingCenter, SupplierResearch/GrowthSettings, Layout, Dropshipping și PersonalizationProcurement. Rutele admin corespunzătoare, `admin-workspaces.ts`, `admin-notification-link.ts`, `social-destination.ts`, `operations.functions.ts`, `social-dashboard.functions.ts` și testele rutelor/destinațiilor.

## Verificări

- 378 teste / 66 fișiere trecute, inclusiv 7 regresii pentru rute vechi, contexte și destinația socială.
- UI local autentificat, date izolate: stoc → aprovizionare → identificare păstrează produsul; căutarea și politica de stoc nesalvată se păstrează între file. Formatul etichetei se păstrează după QR și revenire cu Home.
- Facebook/Instagram conduc la contul exact și platforma corectă; criteriile nesalvate rămân după schimbarea filei. Fără trimitere externă sau aprobare reală.
- Toate cele trei rute vechi verificate în browser, inclusiv produs și cont. Comanda QR inexistentă afișează eroare explicită. Nu existau comenzi în fixture, deci generarea unui QR de comandă reală nu a fost repetată.
- Desktop și 390/320 px: fără overflow orizontal. Meniul mobil are fundal opac și Operațiuni conține secțiunile solicitate.
- Capturi: `/Users/niss/.codex/visualizations/2026/11/05/cutiuta-unified-workspaces/` (`identification-desktop.png`, `social-desktop.png`, `social-mobile.png`, `inventory-mobile-320.png`).
- Typecheck, lint, build și `cf:deploy:dry` trecute. Verificarea buildului de producție confirmă mediul și destinația magazinului. `git diff --check` curat. CI verifică și commitul exact al PR-ului înainte de merge.

## Limite păstrate

Cheia Brave este amânată de administrator; interfața indică configurarea necesară. Ciorna nu înseamnă publicare: aprobarea și conectorul verificat rămân obligatorii. Workers Free rămâne neschimbat; întreruperile CPU 1102 constatate anterior nu sunt rezolvate de reorganizarea UI. Conturile administrative, MFA, stocurile, comenzile și bugetele nu sunt modificate de această livrare.
