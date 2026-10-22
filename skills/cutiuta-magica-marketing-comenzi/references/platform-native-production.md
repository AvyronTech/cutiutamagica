# Producție nativă și utilizarea resurselor Free

## Principiu

Pornește de la plasamentul final, nu de la un vizual universal. Pentru fiecare revizie salvează o matrice `capability_snapshot` cu funcțiile observate pe cont, ruta de publicare, limitările și momentul verificării. O funcție menționată în documentație nu este disponibilă automat pentru orice tip de cont, țară sau format.

Snapshotul minim conține `account_id`, `placement`, `route`, `observed_at`, `available_tools`, `free_tools`, `paid_only_tools`, `mobile_only_tools`, `music_library`, `link_behavior`, `lead_capture_behavior` și `evidence`. Expiră snapshotul după 7 zile sau imediat după o schimbare de cont, sesiune ori interfață. Nu proiecta asset-ul înainte să știi ce poate reda destinația reală.

## Orchestrarea instrumentelor

Nu folosi un instrument doar pentru că există. Alege cel mai scurt lanț care adaugă valoare măsurabilă și poate fi auditat:

1. platforma internă: catalog, media, drepturi, politici, capabilități, UTM, aprobări, leaduri și audit;
2. Codex: cercetare oficială, concept, scenariu, copy, verificare semantică, accesibilitate și coordonarea QA;
3. ImageGen, ComfyUI sau Workers AI: fundaluri, idei și variante de text; niciodată regenerarea produsului;
4. editor local determinist: decupaj, compoziție, culoare, subtitrări și export fără watermark;
5. editorul nativ al platformei: muzică autorizată, stickere, poll, link, copertă și CTA disponibile pe cont;
6. Metricool: programare/analytics numai pentru formatele suportate și numai cât timp limita Free reală permite.

Dacă două instrumente fac același lucru, preferă-l pe cel care păstrează calitatea, drepturile și dovada. Nu transcodifica de mai multe ori și nu trece fișierul prin servicii intermediare fără motiv.

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
- Carusel Instagram: folosește același canvas și același profil de culoare pentru toate cadrele; verifică ordinea încărcată, coperta și tranziția dintre imagini.
- Facebook feed: previzualizează imaginea și link preview; evită textul care repetă titlul cardului.
- Nu imprima un sticker, buton, bară de progres, câmp de comentariu, player sau link aparent interactiv în imagine.
- Când imaginea nu poate conține un link funcțional, mută URL-ul în descriere și folosește „link în bio” numai după ce destinația corectă a fost verificată în profil.
- Dacă elementul nativ nu este vizibil în interfața contului, elimină-l din revizie și adaptează copy-ul.

## Funcții native

- Instagram/Facebook Story: alege un singur sticker funcțional potrivit obiectivului. Link pentru conversie, poll pentru preferință, întrebare pentru cercetare, countdown numai pentru un moment real confirmat.
- Formularele instant Meta sunt instrumente de campanie lead și pot implica promovare plătită; nu le considera formular organic gratuit. Pentru organic, folosește stickerul/linkul disponibil către formularul propriu al magazinului. Un buton de acțiune al Paginii este separat de Story și se activează numai dacă opțiunea exactă este vizibilă și destinația a fost verificată.
- Reels: copertă separată, subtitrări, audio permis comercial și mesajele cheie în safe zone. Pentru conturile business cu acces muzical restricționat folosește Meta Sound Collection sau audio asupra căruia brandul are drepturi.
- TikTok: structură `hook → corp → închidere`, produs în primele trei secunde, 9:16, minimum 720p, sunet activ și CTA coerent cu destinația. Pentru un cont Business folosește Commercial Music Library în regiunea și plasamentul reale; o piesă din biblioteca generală nu este automat autorizată comercial.
- TikTok Photo Mode: folosește o secvență foto numai dacă funcția este vizibilă pe cont și ruta păstrează ordinea, calitatea și CTA-ul aprobate.
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
- Facebook Page action button: `https://www.facebook.com/help/messenger-app/1638565256396310`
- Meta music library: `https://www.facebook.com/help/instagram/402084904469945`
- Facebook multi-photo posts: `https://www.facebook.com/help/iphone-app/187741037945488`
- TikTok Creative Codes: `https://ads.tiktok.com/business/en-US/creative-codes`
- TikTok Commercial Music Library: `https://ads.tiktok.com/resources/help/article/how-to-use-the-commercial-music-library?lang=en-GB`
- TikTok account types and website link: `https://support.tiktok.com/en/using-tiktok/growing-your-audience/switching-to-a-creator-or-business-account?lang=ro`
- TikTok photo posts: `https://support.tiktok.com/en/using-tiktok/creating-videos/tiktok-notes`
- Workers AI pricing: `https://developers.cloudflare.com/workers-ai/platform/pricing/`

Reverifică înaintea unei schimbări de capabilitate sau plan; ultima cercetare a acestei referințe: `2026-10-21`.
