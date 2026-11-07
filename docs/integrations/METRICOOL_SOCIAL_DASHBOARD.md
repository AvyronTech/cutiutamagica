# Rețele sociale în panoul Cutiuța Magică

## Contul verificat

- Metricool: brand `7230540`, proprietar `cutiutamagicaofficial@gmail.com`, fus orar `Europe/Bucharest`.
- Facebook: pagina `1154774271054604`; Instagram: `@cutiutamagicaofficial`; TikTok: `@cutiua.magic`.
- Planul Free permite 20 de postări pe lună și 30 de zile de analiză. API-ul Metricool pentru o sincronizare server la server este disponibil pe planurile Advanced/Custom, nu pe Free. Conectorul Metricool din Codex și sesiunea Opera nu sunt credențiale ale Workerului.

## Funcționare

`/admin/social` arată rețelele oficiale, ultimele rapoarte salvate, statusul conexiunilor din magazin și numărul postărilor pe stări. Include legături spre Metricool, conturile oficiale, postări, marketing, Agent Codex, conturi și integrări. Drepturile sunt `marketing.read` pentru citire și `marketing.write` pentru adăugarea unui raport.

Migrarea append-only `0071_social_analytics_snapshots.sql` păstrează un istoric al rapoartelor pe rețea, interval, cifre, sursă, hash, administrator și dată. Cifrele lipsă rămân `NULL`, nu zero. Importul repetat cu același conținut este idempotent; fiecare cerere de import intră în jurnalul `business_activity`. Nu se stochează chei sau tokenuri.

Punctul de plecare a fost citit din Metricool prin conectorul MCP al contului oficial la 19 octombrie 2026 pentru intervalul 20 septembrie–18 octombrie 2026. Rezultatele sunt 227/739/85 urmăritori, 3/4/4 postări sau videoclipuri, 691/665/2870 vizualizări și 43/23/23 interacțiuni pentru Facebook/Instagram/TikTok. Urmăritorii sunt ultima observație disponibilă pe fiecare rețea: 18 octombrie pentru Facebook, 17 octombrie pentru Instagram și TikTok. Sunt rapoarte datate, nu statistici live.

Pentru actualizare pe Free, administratorul deschide Metricool, verifică brandul, intervalul și cifrele, apoi folosește „Actualizează cifrele” în panou. Pentru automatizare ulterioară, este necesar un plan cu API, o cheie cu permisiuni minime păstrată în seiful criptat și verificarea identității/destinațiilor înainte de activare. Publicarea socială continuă să ceară aprobările și conectorul oficial prevăzute de politica agentului.

Surse: [Metricool API](https://help.metricool.com/basic-guide-for-api-integration-r97af), [planuri și acces API](https://help.metricool.com/plans-add-ons-and-api-access-explained-xux1u), [MCP versus API](https://help.metricool.com/mcp-vs-api-access-what-is-the-difference-5y3ib).
