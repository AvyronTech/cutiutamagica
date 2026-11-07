# Resend, Magic Rewards și Search Console — 17 octombrie 2026

## Stare verificată

- Domeniul `cutiutamagica.eu` este verificat în echipa Resend `cutiutamagicaofficial` (regiunea `eu-west-1`).
- În Cloudflare există TXT `resend._domainkey`, CNAME `rsend`, CNAME `send` și TXT `_dmarc` cu `p=none`. Înregistrările MX și SPF existente nu au fost modificate.
- Cheia Resend `Cutiuta Magica store - transactional` are numai drept de trimitere și este restrânsă la domeniul magazinului. Cheia este salvată în seiful criptat al magazinului; nu este inclusă în repository.
- Segmentul Resend `Cutiuța Magică · abonați confirmați` (`daefa4d4-59fc-445f-b6ec-217a75af9c14`) este creat și are zero contacte. Segmentul `General` existent a rămas neatins.
- Un e-mail de test către contul de administrator al magazinului a fost acceptat de API și afișat ca `Delivered` în Resend. Transportul principal a fost readus la Cloudflare Email Sending după test.
- În Search Console, proprietatea `sc-domain:cutiutamagica.eu` este accesibilă. Pagina de start este indexată, iar testul live o consideră disponibilă pentru Google. Sitemapul a fost retrimis o singură dată; raportul continua să afișeze „Nu s-a putut prelua” imediat după retrimitere. Site-ul livrează public XML valid cu 38 URL-uri și HTTP 200, inclusiv pentru Googlebot.
- Jurnalul de securitate Cloudflare filtrat pe `/sitemap.xml` arată blocări pentru PetalBot și GPTBot prin regula „Manage AI bots”; în eșantionul ultimelor 24 de ore nu apare o blocare Googlebot pe această rută. Aceste evenimente nu explică singure eroarea Search Console.

## Comportament după publicarea codului și a migrației 0067

- Clienții își activează separat din cont rezumatul Magic Rewards. Implicit este oprit; adresele de clienți nu intră automat în newsletter.
- Cronul orar trimite cel mult un rezumat per client și zi de activitate, folosind numai Resend. O trimitere incertă sau eșuată rămâne în registru pentru analiză, fără retransmitere automată.
- Limite interne: 20 rezumate pe zi, 500 pe lună; 80 mesaje Resend totale pe zi și 2.400 pe lună pentru această funcție. Transportul Resend se oprește înainte de 95 mesaje zilnice sau 2.900 lunare în registrul aplicației. Limitele furnizorului au prioritate.
- Verificarea cheii cu drept de trimitere folosește un test reușit după ultima salvare a cheii, deoarece cheia nu poate lista domeniile. Butonul „Test Resend” funcționează indiferent de transportul principal ales.

## Campanii de marketing

Lista de marketing are în prezent zero abonați confirmați. Nu importa automat clienți, parteneri sau membrii Magic Rewards. Înainte de prima campanie sunt necesare formularul de abonare cu confirmare, dezabonarea funcțională, sincronizarea doar a contactelor confirmate, un draft aprobat de administrator și verificarea consumului din planul Resend Free (1.000 contacte de marketing). Nicio campanie nu a fost trimisă.

## Search Console: următoarea verificare

Verifică în raportul Sitemapuri dacă Google a preluat `https://cutiutamagica.eu/sitemap.xml` după procesare. Dacă eroarea persistă, consultă data ultimei încercări și jurnalul Cloudflare pentru cererile Googlebot către sitemap. O retrimitere confirmă primirea cererii de către Search Console; nu dovedește preluarea sau indexarea tuturor adreselor.

Importul datelor Search Console în panoul intern cere separat un token Google cu acces numai pentru citire la această proprietate, păstrat în seiful magazinului. Accesul în interfața Search Console din Opera nu oferă automat acest token aplicației.
