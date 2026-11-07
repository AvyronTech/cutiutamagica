# Operare și predare

## Cercetare și evaluare

- Identifică produsul exact, variantele, producătorul și cel puțin o ofertă datată. Păstrează URL-ul sursei și separă observațiile de faptele confirmate. Rezultatele unui motor de căutare nu verifică furnizorul. Compară și furnizori direcți, distribuitori UE și surse B2B; nu limita orice categorie la Temu.
- Confirmă în scris expedierea directă, stocul, termenul, urmărirea, costul în RON pe aceeași bază fiscală, perioada ofertei, returul și responsabilitatea pentru colete. Nu converti automat un preț în valută fără curs datat. Calculează contribuția estimată după cost, transport, comisioane și rezerva comercială; nu o numi profit contabil sau cerere demonstrată.
- Categoria, documentația și drepturile se verifică pentru articolul real. Nu inventa certificări, EAN-uri, licențe, recenzii, materiale, stoc sau expediere din România. Furnizorul expediază; comerciantul rămâne responsabil pentru oferta făcută clientului.
- Salvează fișa prin dashboard. Căutarea Brave folosește cheia existentă; dacă lipsește, continuă cercetarea prin instrumentele web și Opera, apoi introdu manual sursele. Nu cumpăra un abonament și nu reutiliza o cheie a altui proiect.

## Texte, imagini și resurse

- Pregătește câte un titlu, descriere, categorie, atribute și imagine pentru website/eMAG/Trendyol/Okazii. Stilul trebuie să fie factual și potrivit categoriei, nu obligatoriu vocabular de cutiuțe muzicale.
- Workers AI oferă Llama 3.2 3B pentru prima ciornă și Llama 3.1 8B FP8 Fast pentru revizie. Selectarea este explicită, fără fallback automat plătit; maximum opt lucrări/zi în acest modul, un apel concurent, 800 tokenuri de ieșire. Rezultatele identice pe aceeași revizie sunt reutilizate. Limita locală nu este contorul global Cloudflare.
- Generarea backend este permisă numai când `DROPSHIPPING_AI_PLAN=free` a fost configurat după verificarea planului Workers Free, care oprește depășirea alocării gratuite. Nu seta valoarea pe un cont Paid pe baza unei simple cote locale; pe Paid, consumul altor Workers poate epuiza gratuitatea. Nu schimba planul din acest flux.
- Înainte de delegare către Ollama/ComfyUI rulează `npm run ai:runner -- --check` și verifică heartbeatul recent în `/admin/ai`. Disponibilitatea Codex nu pornește automat un runner sau un proces autonom pe Mac.
- Dashboardul acceptă o fotografie locală JPEG/PNG/WebP/AVIF și compune PNG-uri private în R2. Nu folosește URL-uri externe ca server-side image proxy. Pentru export fără mărire artificială, sursa trebuie să aibă rezoluția suficientă. Verifică fundalul original, cropul, textul și produsul înainte de selectarea imaginii.
- Preseturi de lucru: website/eMAG/Okazii 1200×1200; Trendyol 1200×1800. Nu le prezenta ca standarde universale certificate. Cerințele se reconfirmă în categoria sellerului, cu dată și dovadă în fișă. [eMAG](https://marketplace.emag.ro/infocenter/emag-academy/cum-se-adauga-un-produs/standardul-pentru-imaginea-principala-a-produselor/), [Trendyol](https://developers.trendyol.com/), [Okazii](https://ajutor.okazii.ro/magazine-okazii-ro/import-produse.html).

## Publicare asistată și actualizare

1. Deschide contul oficial în Opera. Citește sellerul, țara, categoria, articolul și ruta exactă. Oprește operația la identitate ambiguă, challenge sau lipsă de acces; nu ocoli protecțiile. Materialele și previzualizarea trebuie pregătite înaintea aprobării finale.
2. Verifică lista de lipsuri calculată de server. Leagă imaginea canalului de fișă, confirmă oferta încă valabilă și aprobă revizia exactă din dashboard. Aprobarea expiră după 24 ore; schimbarea fișei o invalidează. Website cere un produs din catalogul central compatibil; pentru produse generale, folosește marketplace și notează explicit că pagina proprie încă nu există.
3. Descarcă pachetul pentru Codex și imaginile private. Acesta conține copy, date comerciale, cont, cerințe și identificatorul aprobării. Un JSON exportat nu este payload API sau feed acceptat de platformă. Nu trimite comenzile/clienții în pachet.
4. Înregistrează „Începe execuția” numai după preflight și înainte de efectul extern. Copiază `operationId`. Încarcă în portal prin UI/conector, completează categoria și atributele și verifică previzualizarea. Acțiunea exactă trebuie acoperită de aprobarea validă; actualizarea nu înseamnă aprobare de preț, stoc ori alt produs în afara snapshotului.
5. Citește produsul publicat și salvează URL-ul public, sellerul observat, data și dovada vizuală. Confirmarea din dashboard este `published_manual`, declarația operatorului; nu pretinde verificare API automată. Retine screenshotul în afara repository-ului public.
6. La eroare certă, salvează `failed` și motivul. La întrerupere, timeout sau confirmare neclară, salvează `uncertain`. După 15 minute o execuție rămasă fără rezultat devine incertă când fișa este recitită. Nu repeta până nu inspectezi destinația și reconciliezi cu URL confirmat sau dovada că operația nu există.
7. Pentru actualizare, salvează noua ofertă și revizie, compară cu URL-ul precedent, pregătește diferența, obține aprobarea nouă și execută aceeași secvență. Publicarea precedentă rămâne vizibilă ca istoric; versiunea modificată nu este automat sincronizată.

## Comenzi și revizie comercială

Folosește `/admin/orders`, `/admin/inventory`, `/admin/returns` și conectorii existenți pentru comenzi, stoc și retururi. Acest modul nu cumpără automat de la furnizor și nu inventează un stoc local. Un produs general nou nu poate fi introdus în schema actuală cu `product_type=music_box`; extinderea catalogului și checkoutului este o schimbare separată, documentată ca blocaj pentru website.

La final raportează separat: oportunități salvate, surse observate/verificate, ciorne, imagini, aprobări, execuții confirmate manual, eșecuri, rezultate incerte și configurări lipsă. Nu marca tot fluxul „sincronizat” dintr-un singur export sau ID extern.
