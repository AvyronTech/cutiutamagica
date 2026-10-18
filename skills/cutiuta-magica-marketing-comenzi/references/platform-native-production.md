# Producție nativă și utilizarea resurselor Free

## Principiu

Pornește de la plasamentul final, nu de la un vizual universal. Pentru fiecare revizie salvează o matrice `capability_snapshot` cu funcțiile observate pe cont, ruta de publicare, limitările și momentul verificării. O funcție menționată în documentație nu este disponibilă automat pentru orice tip de cont, țară sau format.

## Alocarea Metricool Free

Planul Free este un accelerator limitat, nu sistemul de evidență. La ultima verificare oficială oferă o singură marcă, maximum 20 de publicări efective pe lună, 30 de zile de analytics și câte un profil per rețea. Fiecare destinație publicată consumă separat limita. Ciornele nu consumă limita, dar o programare peste plafon nu garantează publicarea.

Înainte de fiecare programare:

1. citește contorul real și identitatea mărcii;
2. calculează costul în sloturi pentru toate destinațiile selectate;
3. rezervă sloturile pentru materialele fără funcții native indispensabile;
4. folosește Opera dedicat pentru Notes, muzică, poll, întrebare, countdown, link sticker sau alte funcții pe care Metricool nu le poate reda fidel;
5. nu folosi funcții plătite prezentate ca disponibile în Free: SmartLinks, aprobările Metricool, Post Library, Canva/Google Drive, hashtag finder, Make/Zapier ori API direct;
6. salvează aprobarea în platforma internă, nu înlocui coada de aprobare cu o funcție a planului extern.

## Previzualizare obligatorie

Pentru fiecare asset construiește un `render contract`: dimensiune, raport, durată, copertă, safe zone, blocuri text, CTA, caption și elemente native propuse. Verifică apoi previzualizarea desktop/mobil sau ecranul nativ înainte de aprobarea finală.

- Story/Reel/TikTok: master `1080×1920`, fără watermark și fără text permanent în afara zonei sigure.
- Feed Instagram: export 4:5 `1080×1350`; verifică și decuparea din grila profilului.
- Facebook feed: previzualizează imaginea și link preview; evită textul care repetă titlul cardului.
- Nu imprima un sticker, buton, bară de progres, câmp de comentariu, player sau link aparent interactiv în imagine.
- Dacă elementul nativ nu este vizibil în interfața contului, elimină-l din revizie și adaptează copy-ul.

## Funcții native

- Instagram/Facebook Story: alege un singur sticker funcțional potrivit obiectivului. Link pentru conversie, poll pentru preferință, întrebare pentru cercetare, countdown numai pentru un moment real confirmat.
- Reels: copertă separată, subtitrări, audio permis comercial și mesajele cheie în safe zone. Pentru conturile business cu acces muzical restricționat folosește Meta Sound Collection sau audio asupra căruia brandul are drepturi.
- TikTok: structură `hook → corp → închidere`, produs în primele trei secunde, 9:16, minimum 720p, sunet activ și CTA coerent cu destinația. Folosește Commercial Music Library când conținutul este comercial.
- Notes: text foarte scurt, contextual; muzică numai dacă funcția și piesa sunt disponibile legitim în acel cont.

## Calitate și probabilitate de distribuire

Nu există formulă pentru viralitate. Crește probabilitatea prin utilitate și retenție:

- arată produsul real ori gestul manivelei imediat;
- deschide o singură curiozitate și răspunde până la final;
- schimbă unghiul editorial, nu doar fundalul;
- folosește cadre generale, macro, scară reală și context de cadou;
- elimină intro-urile de logo, umplutura și promisiunile artificiale;
- testează o variabilă majoră per revizie și compară medianele pe format;
- urmărește finalizarea video, revizionările, salvările, distribuirea, taps și comenzile atribuite.

## Workers AI și modelele locale

Modelele pot propune hook-uri, variante de copy, structură video și un al doilea control semantic. Ele nu decid stocul, prețul, drepturile, politica platformei ori publicarea.

- furnizează numai snapshotul minim al catalogului și politicilor, fără date personale sau secrete;
- cere ieșire structurată și marchează modelul, versiunea, costul și proveniența;
- folosește Workers AI numai în limita gratuită configurată și oprește înainte de orice depășire plătită;
- păstrează Ollama/ComfyUI ca fallback local și Workers AI ca asistent opțional, nu ca sursă de adevăr;
- orice imagine generată conține numai fundalul; produsul original se compune ulterior ca strat protejat;
- toate rezultatele rămân ciorne și trec prin QA determinist plus aprobare umană.

## Surse oficiale de reverificat

- Metricool Free și Planner: `https://help.metricool.com/main-differences-between-free-and-paid-plans-bl0v9`
- Meta music library: `https://www.facebook.com/help/instagram/402084904469945`
- TikTok Creative Codes: `https://ads.tiktok.com/business/en-US/creative-codes`
- Workers AI pricing: `https://developers.cloudflare.com/workers-ai/platform/pricing/`

Reverifică înaintea unei schimbări de capabilitate sau plan; ultima cercetare a acestei referințe: `2026-10-17`.
