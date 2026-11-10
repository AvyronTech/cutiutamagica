# Galerie produs și recuperarea modulelor — 11 noiembrie 2026

## Eroare reprodusă

Pe pagina Sunshine, întreruperea încărcării modulului `ProductLightbox` reproduce exact ecranul global „Ceva nu a mers”, cu `Failed to fetch dynamically imported module`. Un asset dintr-un build anterior (`ProductLightbox-DgM6p-cC.js`) răspunde 404, în timp ce assetul versiunii inițial publicate răspundea 200. Aceasta confirmă posibilitatea erorii în file rămase deschise după deploy; fără acces la dispozitivul clientului, nu afirmăm că este singura cauză a sesiunii raportate.

Blocarea de rețea folosită pentru reproducere este locală browserului de test și a fost eliminată imediat. Nicio configurație de rețea sau securitate a magazinului nu a fost schimbată.

## Remedieri

- Galeria critică este importată împreună cu pagina produsului: deschiderea fotografiei nu mai depinde de un import separat la click. Controlul așteaptă inițializarea clientului și indică starea ocupată până atunci.
- Galeria utilizează mecanismul modal Radix deja instalat: focus în interior, Escape, închidere și revenirea focusului la fotografia inițială, cu restaurarea scrollului.
- Selecția este validată când indexul nu mai corespunde listei; o galerie goală folosește fotografia principală. Schimbarea produsului închide galeria și resetează selecția. Gesturile swipe nu blochează următorul tap sau activarea de la tastatură.
- `FeatureBoundary` limitează erorile secțiunilor opționale la secțiunea lor: prezentarea interactivă, chatul, filele administrative și graficul de vânzări. Există acțiune de recuperare; chatul oferă contactul prin e-mail. Galeria are o vizualizare simplă de rezervă pentru o eventuală eroare de randare.
- Recuperarea globală reîncarcă documentul la cererea utilizatorului, în loc să repete același import eșuat păstrat în memoria browserului. Nu există reload automat sau buclă care să întrerupă checkoutul.

## Verificare și livrare

Build, typecheck, lint și suita existentă de 549 teste sunt verificate; starea finală CI/dry-run și probele desktop/mobil sunt consemnate în receipt-ul PR-ului de galerie. Probele de interacțiune se execută în browser pe preview-ul compilat și din nou pe producție, inclusiv defectarea intenționată a unei secțiuni opționale. Aceste probe sunt distincte de testele unitare Node.

UI locală folosește date de test, nu modifică produsele de producție. Nu sunt necesare migrări D1, modificări de autentificare, prețuri, stoc, e-mailuri sau tranzacții. Înregistrările audio existente sunt păstrate.

Referințe primare: [Vite — erori la încărcarea modulelor după deploy](https://vite.dev/guide/build#load-error-handling), [React — izolarea erorilor de randare](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary).
