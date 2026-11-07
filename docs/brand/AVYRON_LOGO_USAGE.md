# AVYRON — utilizarea logoului între proiecte

Statut: **provizoriu până la identificarea albumului master**. Acest fișier nu pretinde că imaginile din repository reprezintă toate variantele aprobate. La primirea albumului, consemnează aici sursa, proprietarul, versiunile light/dark, spațiul de protecție, dimensiunile minime și eventualele interdicții specifice.

## Ce este verificat în acest repository

- `src/assets/avyron-logo.jpg` este o imagine promoțională lată „POWERED BY / AVYRON / DESCOPERĂ-NE”, 1774 × 485 px, fundal întunecat (SHA-256 începe cu `e37cde22`). `src/components/site/Footer.tsx` o folosește acum ca legătură secundară către `https://avyron.ro`.
- `src/assets/avyron-logo.png` este o altă compoziție pe fundal alb, 1536 × 1024 px, cu simbol pătrat, text „AVYRON” și descriptor „DIGITAL PRODUCTS” (SHA-256 începe cu `ed74d91d`). Nu presupune că este masterul curent.
- În proiectul AVYRON există și un simbol pătrat de 128 × 128 px. Asseturile diferă ca format și context; alegerea variantei trebuie făcută după verificarea albumului oficial.

## Reguli de siguranță până la confirmarea albumului

1. Folosește un fișier original aprobat, fără redesenare, generare AI, recolorare, deformare, decupare a simbolului sau recreare a literelor. Păstrează proporțiile.
2. Alege numai o variantă verificată pentru fundalul respectiv și păstrează contrastul și lizibilitatea pe desktop și mobil. Nu extrage automat logoul dintr-un banner „Powered by” ca marcă principală.
3. Pentru fiecare proiect nou, verifică plasarea unei semnături/credit AVYRON folosind masterul aprobat și regulile contractuale ale proiectului. Într-un proiect al altui brand, AVYRON rămâne secundar; nu înlocuiește identitatea clientului și nu introduce dependențe tehnice de AVYRON OS.
4. Pentru linkuri și imagini: text alternativ care descrie „AVYRON”, destinație verificată, `rel="noopener noreferrer"` la deschiderea unei file noi și dimensiuni explicite pentru a evita salturile de layout.
5. Înainte de reutilizare pe un proiect nou, verifică dreptul de folosire, contextul, assetul master și randarea pe fundalurile acelui proiect. Documentează fișierul exact și revizia.

## De completat din album

- Locația/ID-ul albumului și fișierul master aprobat: **neconfirmate**.
- Paleta exactă, codurile de culoare și regulile light/dark: **neconfirmate**.
- Spațiul minim, mărimea minimă, variantele monocrome și interdicțiile editoriale: **neconfirmate**.

Nu promova regulile provizorii ca manual oficial de brand. Actualizează acest fișier și nota de memorie a contului după inspectarea albumului, apoi revizuiește eventualele folosiri existente.
