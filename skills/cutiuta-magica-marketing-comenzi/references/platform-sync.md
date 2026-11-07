# Sincronizare Codex, Cutiuța Magică și AVYRON OS

## Surse și roluri

- Skillul canonic se păstrează în repository la `skills/cutiuta-magica-marketing-comenzi` și se instalează local în Codex din aceeași sursă.
- Platforma Cutiuța Magică este sistemul de evidență pentru catalog, media, conversații, comenzi, ciorne, aprobări și metrici operaționale.
- AVYRON OS primește numai statistici agregate și pachete de date/skill aprobate prin conectorul HMAC. Nu devine o dependență și nu controlează magazinul, agentul, comenzile, conversațiile ori publicarea.
- Agenții interni pot completa ciorne sau analize, dar nu suprascriu fapte, aprobări ori revizii fără control uman.

## Modelul existent de date

Folosește entitățile existente, fără registru paralel:

- `ai_agents`, `ai_knowledge_sources`, `ai_runs` pentru identitate, surse și rulări;
- `marketing_campaigns`, `social_posts`, `social_accounts` pentru campanii și variante;
- `approval_requests` pentru orice efect extern;
- `sales_channels`, `sales_channel_profiles`, `channel_listings`, `product_channel_drafts`, `channel_publication_requests`, `integration_accounts`, `sync_jobs`, `sync_failures` și `provider_operations` pentru marketplace;
- `social_analysis_runs` și `social_unfollow_proposals` pentru igiena follow;
- `chat_conversations` și `chat_messages` pentru chatul site-ului;
- fluxul compatibil de contact/lead pentru formularele scurte, dacă există; `/api/v1/product-interest` rămâne limitat la notificare/precomandă cu e-mail și nu este un formular general de ofertă. Nu crea un tabel paralel din timpul publicării. Păstrează consimțământul, proveniența și legătura către campanie fără a copia date personale în analytics;
- `orders`, `order_items`, `order_events`, `outbox_events` și `provider_operations` pentru comenzi și confirmări;
- `traffic_daily_metrics` și metricile aprobate ale platformelor pentru evaluare;
- `avyron_sync_jobs` pentru asset-uri aprobate, `agent_exchange_items` pentru statistici și pachete de skill/date, iar `outbox_events` pentru handoff asincron, idempotent și auditat.

`campaign_json` din `social_posts` trebuie să păstreze: `campaignId`, `productId`, canal, format, obiectiv, hook, CTA, hashtags, musicBrief, asset IDs, UTM, fapte/surse, oră propusă, fus orar, motiv, versiune și `approvalRequired=true`. Pentru materiale native păstrează și `capabilitySnapshot`, `renderContract`, `nativeElements`, `audioRightsEvidence`, `productLockEvidence` și, când există captare de lead, `leadDestination` fără datele persoanei.

Leadul provenit din Story păstrează minimum `source_platform`, `account_id`, `campaign_id`, `revision_id`, `product_id`, UTM, `consent_version`, `consent_at` și pagina de intrare. Numele și e-mailul rămân în registrul operațional protejat, nu în `social_posts`, metrici, prompturi AI ori payloadul AVYRON. Deduplică prin fluxul existent și păstrează atribuirea primei și ultimei interacțiuni.

Pentru marketplace păstrează separat snapshotul catalogului, hashul, categoria/atributele canalului, ID-urile externe, versiunea adapterului, batch/cursor, stock bufferul și rezultatul reconcilierii. `orders(channel_id, external_order_id)` este cheia de deduplicare; nu crea un registru paralel de comenzi.

## Stări și aprobări

Conținutul urmează `draft → review → approved → scheduled → publishing → published`. Conexiunile `setup_required`, lipsa ID-ului extern sau lipsa dovezii opresc execuția. O aprobare este valabilă numai pentru revizia, asset-ul, contul și ora indicate; o modificare materială revine în `review`.

Pentru reacții, note, distribuiri, moderare și unfollow, creează propuneri în coada de aprobare. Aprobarea unui conținut nu aprobă automat engagementul sau distribuirea în grupuri.

## AVYRON OS

Sincronizarea este un handoff, nu o bază comună scrisă simultan. Trimite numai:

- identificator proiect/campanie și perioadă;
- număr de ciorne, aprobări, publicări confirmate și eșecuri;
- reach, clickuri, conversații calificate, comenzi atribuite și venit confirmat, când există proveniență;
- agregate de funnel precum accesări Story, clickuri către formular, trimiteri valide și rata de conversie, fără nume, e-mail sau alte date personale;
- lecții agregate aprobate, fără conversații private brute și fără adrese de livrare.

Pachetul de skill poate conține instrucțiunile versionate, referințele operaționale, hashul și lista fișierelor incluse, dar numai după aprobare. O propunere de date sau skill primită de la AVYRON rămâne `pending_approval`; nu se aplică automat și nu poate modifica politica agentului. Platforma Cutiuța Magică și superadminii săi sunt singurul control plane.

Folosește endpoint separat pentru schimbul de agent față de sincronizarea media. Blochează structural datele personale, comenzile, conversațiile și capabilitățile de publicare din payloadurile AVYRON.

Semnează payload-ul, folosește `Idempotency-Key`, timeout și retry limitat. La rezultat `uncertain`, verifică jobul înainte de repetare. Dacă AVYRON este indisponibil, magazinul continuă normal și evenimentul rămâne în coadă.

## Starea realistă a conectorilor

Configurația sau existența unei tabele nu dovedește că Meta, TikTok, WhatsApp, e-mail ori AVYRON sunt conectate. Înaintea primei rulări live verifică separat: contul oficial, scope-urile, mediul, secretul server-side, capabilitatea exactă, o citire de test și o acțiune sandbox/preview când platforma o permite.

Pentru profilul Metricool Cutiuța Magică, contractul de identitate așteptat este: brand `7230540`, proprietar `cutiutamagicaofficial@gmail.com`, website `https://cutiutamagica.eu`, Facebook Page `1154774271054604`, Instagram `cutiutamagicaofficial`, TikTok `cutiua.magic` și fus `Europe/Bucharest`. O nepotrivire oprește rularea și nu se corectează automat. Verificarea prin pluginul Codex dovedește accesul acelui conector, dar nu marchează automat drept activ conectorul backend al platformei interne.

Publicarea hibridă folosește Metricool drept rută principală pentru rețelele conectate și profilul Opera dedicat Cutiuța Magică drept rută nativă controlată pentru profilul Facebook autorizat, funcții native ori epuizarea limitei planului. Browserul nu este considerat disponibil doar pentru că utilizatorul este autentificat local: fila/profilul trebuie expus sesiunii Codex, identitatea contului trebuie verificată în UI și rezultatul publicării trebuie confirmat prin URL sau dovadă vizibilă. Nu comuta automat între identități Google/Meta și nu folosi profilul AVYRON ca fallback.

Metricool Web folosește hashul public al trackerului numai în frontend și numai după consimțământul pentru categoria `Experiență`. Detectarea site-ului în Metricool și apariția primei vizite confirmate sunt dovezi separate de existența codului; până atunci conectorul intern rămâne `setup_required`.

Google Search Console este acceptat numai pentru proprietatea de domeniu `sc-domain:cutiutamagica.eu`. Orice proprietate AVYRON sau alt domeniu este respinsă pentru acest agent.

## Marketplace și asistență AI

- eMAG și Trendyol folosesc numai API-urile oficiale, secret references și joburi idempotente. Trendyol V1 este interzis după retragerea din `2026-10-15`.
- Okazii poate folosi un feed XML numai după validarea categoriilor și a formatului din cont; importul comenzilor rămâne manual până la un API oficial verificat.
- Vinted rămâne dezactivat pentru vânzarea comercială a produselor noi în România. Existența unui cont autentificat nu înseamnă eligibilitate.
- sincronizarea rulează `orders → inventory → prices → catalog → reconcile`; o eroare de mapare blochează entitatea, nu întregul catalog.
- comenzile și listările marketplace nu sunt trimise către AVYRON; numai agregatele aprobate pot fi exportate.

Workers AI poate face o a doua propunere sau verificare de consistență prin bindingul Cloudflare, în limita gratuită configurată. Nu primește date personale, secrete, conversații brute ori imagini neaprobate. Rezultatul păstrează modelul și costul estimat, rămâne `draft` și nu poate apela direct conectorii externi. Ollama și ComfyUI locale rămân alternative controlate; indisponibilitatea oricărui model nu blochează magazinul.

Telefonul Android poate fi folosit ulterior doar ca executor supravegheat pentru funcții fără API. Necesită profil dedicat, ecran blocat, conturi de business, permisiuni minime, jurnal de acțiuni și oprire la challenge/CAPTCHA/2FA. Nu automatiza prin coordonate fragile și nu încerca să ocolești protecțiile platformei.
