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
- `social_analysis_runs` și `social_unfollow_proposals` pentru igiena follow;
- `chat_conversations` și `chat_messages` pentru chatul site-ului;
- `orders`, `order_items`, `order_events`, `outbox_events` și `provider_operations` pentru comenzi și confirmări;
- `traffic_daily_metrics` și metricile aprobate ale platformelor pentru evaluare;
- `avyron_sync_jobs` pentru asset-uri aprobate, `agent_exchange_items` pentru statistici și pachete de skill/date, iar `outbox_events` pentru handoff asincron, idempotent și auditat.

`campaign_json` din `social_posts` trebuie să păstreze: `campaignId`, `productId`, canal, format, obiectiv, hook, CTA, hashtags, musicBrief, asset IDs, UTM, fapte/surse, oră propusă, fus orar, motiv, versiune și `approvalRequired=true`.

## Stări și aprobări

Conținutul urmează `draft → review → approved → scheduled → publishing → published`. Conexiunile `setup_required`, lipsa ID-ului extern sau lipsa dovezii opresc execuția. O aprobare este valabilă numai pentru revizia, asset-ul, contul și ora indicate; o modificare materială revine în `review`.

Pentru reacții, note, distribuiri, moderare și unfollow, creează propuneri în coada de aprobare. Aprobarea unui conținut nu aprobă automat engagementul sau distribuirea în grupuri.

## AVYRON OS

Sincronizarea este un handoff, nu o bază comună scrisă simultan. Trimite numai:

- identificator proiect/campanie și perioadă;
- număr de ciorne, aprobări, publicări confirmate și eșecuri;
- reach, clickuri, conversații calificate, comenzi atribuite și venit confirmat, când există proveniență;
- lecții agregate aprobate, fără conversații private brute și fără adrese de livrare.

Pachetul de skill poate conține instrucțiunile versionate, referințele operaționale, hashul și lista fișierelor incluse, dar numai după aprobare. O propunere de date sau skill primită de la AVYRON rămâne `pending_approval`; nu se aplică automat și nu poate modifica politica agentului. Platforma Cutiuța Magică și superadminii săi sunt singurul control plane.

Folosește endpoint separat pentru schimbul de agent față de sincronizarea media. Blochează structural datele personale, comenzile, conversațiile și capabilitățile de publicare din payloadurile AVYRON.

Semnează payload-ul, folosește `Idempotency-Key`, timeout și retry limitat. La rezultat `uncertain`, verifică jobul înainte de repetare. Dacă AVYRON este indisponibil, magazinul continuă normal și evenimentul rămâne în coadă.

## Starea realistă a conectorilor

Configurația sau existența unei tabele nu dovedește că Meta, TikTok, WhatsApp, e-mail ori AVYRON sunt conectate. Înaintea primei rulări live verifică separat: contul oficial, scope-urile, mediul, secretul server-side, capabilitatea exactă, o citire de test și o acțiune sandbox/preview când platforma o permite.

Telefonul Android poate fi folosit ulterior doar ca executor supravegheat pentru funcții fără API. Necesită profil dedicat, ecran blocat, conturi de business, permisiuni minime, jurnal de acțiuni și oprire la challenge/CAPTCHA/2FA. Nu automatiza prin coordonate fragile și nu încerca să ocolești protecțiile platformei.
