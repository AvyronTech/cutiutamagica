# E-mail tranzacțional — audit și pregătire, 31 octombrie 2026

## Stare verificată

- D1 de producție are o cheie `resend` criptată, marcată `verified` la 17 octombrie. Valoarea cheii nu a fost citită ori afișată.
- Transportul principal din D1 este încă `cloudflare_email`. Jurnalul are trei refuzuri `E_RECIPIENT_NOT_ALLOWED`; un mesaj de comandă a fost apoi acceptat de Resend (HTTP 200) la 22 octombrie. Acceptarea API nu dovedește livrarea finală în inbox.
- DNS public are cheia DKIM `resend._domainkey`, CNAME `rsend` și DMARC `p=none`. Nu am schimbat DNS. Comanda read-only `wrangler email sending list` a primit `Authentication error 10000`; tokenul actual nu poate verifica starea Cloudflare Email Sending.
- Nu am trimis e-mailuri reale, plasat comenzi, migrat D1 remote ori publicat Workerul în acest audit.

## Fluxuri pregătite

| Eveniment | Destinatar | Mesaj | Condiție |
| --- | --- | --- | --- |
| Comandă acceptată | Client | Confirmare din șablon | Card: numai după plata capturată și verificată; alte metode: după înregistrare |
| Comandă acceptată | Echipă | Produse, total, plată, livrare, date pentru procesare | Aceeași condiție; destinatarul este configurat în Centru e-mail |
| Comandă expediată în admin | Client | Actualizare din șablon | Tranziție reală la `Expediată`; plățile cu cardul trebuie să fie capturate |
| Cerere de retur | Client | Confirmare din șablon | După salvarea cererii |
| Cerere de retur | Echipă | Notificare din șablon și legătură cu panoul intern | După salvarea cererii |
| Cod de conectare | Client | Cod cu valabilitate 10 minute | La solicitare, cu limitare de rată |
| Magic Rewards/recomandări | Client cu opțiunea corespunzătoare | Mesaje existente | Pragurile și consimțământul existente se păstrează |
| Raport lunar | Proprietar | Rezumat existent | Setarea și validarea proprietarului existente se păstrează |

Mesajele noi de expediere și retur merg prin Queue. Fiecare categorie are cheie de idempotentă; rezultatele incerte nu trec automat la al doilea furnizor și sunt vizibile în jurnalul administrativ pentru reconciliere. Resend este ales automat de migrarea 0084 numai dacă rămâne transportul Cloudflare, cheia Resend este marcată verificată și jurnalul consemnează refuzul de destinatari. Șabloanele existente sunt copiate fără a pierde editările administratorului.

## Pași rămași pentru funcționare live

1. Revizuiește PR-ul, aplică migrarea 0084 în D1 de producție și publică exact Workerul validat. Acestea cer aprobarea explicită prevăzută de `AGENTS.md`; nu au fost executate.
2. În Centru e-mail, verifică destinatarul staff, adresele expeditorilor și răspunsul, apoi trimite teste separate către contul administratorului pentru `orders`, `returns` și Resend. Confirmă în Resend atât acceptarea, cât și starea `Delivered`, plus răspunsul la adresa Reply-To.
3. Testează cu date sintetice o comandă ramburs și un checkout card numai într-un mediu de test; la card confirmă că e-mailurile apar doar după webhookul semnat. Testează o cerere de retur și tranziția `Expediată`, fără a trimite către clienți reali.
4. Adaugă webhookuri semnate Resend pentru `delivered`, `bounced` și `complained` înainte de a prezenta istoricul din panou ca livrare finală. În prezent jurnalul arată acceptarea furnizorului, nu starea din inbox.
5. Pentru un volum mai mare decât planul gratuit, aprobă separat schimbarea planului și a limitelor. Limita internă actuală oprește Resend înainte de 95 mesaje/zi și 2.900/lună.

## Risc rămas

O cădere a Workerului după acceptarea de către furnizor și înainte de scrierea jurnalului poate lăsa rezultatul nedeterminat; idempotency key de la Resend ajută în fereastra furnizorului, dar nu este o dovadă permanentă de livrare. Reconcilierea prin webhook/ID extern și un outbox tranzacțional pentru toate declanșatoarele sunt următorii pași pentru garanții mai puternice. Când Queue nu acceptă un mesaj nou, codul încearcă trimiterea în contextul cererii; dacă și această încercare eșuează, eroarea rămâne în log, fără o reîncercare durabilă separată.
