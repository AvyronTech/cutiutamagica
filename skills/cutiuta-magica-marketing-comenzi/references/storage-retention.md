# Retenție și eficiența stocării

## Principiu

Păstrează permanent adevărul comercial și dovada minimă, nu fiecare copie mare de lucru. Retenția este guvernată de `storage.retention`, iar ștergerea este o acțiune externă distructivă: agentul poate identifica și grupa elementele eligibile, însă execuția începe numai după aprobarea reviziei exacte din Dashboard și Codex.

## Clase implicite

- upload temporar expirat: eligibil la expirarea sesiunii;
- rezultat AI respins: 7 zile;
- rezultat AI abandonat sau eșuat: 14 zile;
- rezultat AI aprobat, dar neutilizat: 90 de zile;
- copie socială publicată: 30 de zile după cea mai recentă publicare care o folosește;
- copie socială arhivată: 7 zile după arhivare;
- payload complet al unei postări publicate: 90 de zile, apoi se păstrează numai identificatorii, destinația, produsul/campania, UTM-ul, data, identificatorul extern și amprenta SHA-256.

Perioadele sunt configurabile, dar nu le scurta sub limitele validate fără o decizie explicită a administratorului.

## Active protejate

Nu propune automat ștergerea pentru:

- imaginile și clipurile originale ale produselor;
- hero, detalii, cadre 360°, audio de produs și animații active;
- documente comerciale, drepturi, conformitate, facturi și garanții;
- fotografii de recenzie publicate și fișiere de personalizare/comandă;
- backupuri, care au propria politică de retenție;
- orice fișier încă folosit de un draft, de o revizie în aprobare sau de o postare neconfirmată ca publicată.

## Flux obligatoriu

1. Scanează numai metadatele D1 și sursele cunoscute; nu șterge obiecte necunoscute doar pentru că par vechi.
2. Revalidează referințele înainte de propunere și din nou imediat înainte de execuție.
3. Creează un lot exact cu `r2Key`, sursă, clasă, dimensiune, termen și `revisionHash`.
4. Cere cvorumul critic Dashboard + Codex.
5. După aprobare, șterge idempotent obiectul R2 sau compactează payloadul D1; păstrează jurnalul, amprenta și metadatele minime.
6. Dacă sursa s-a schimbat, marchează elementul `skipped`; dacă R2/D1 eșuează, marchează `failed` și nu pretinde spațiu recuperat.

Metricile de performanță, URL-ul/ID-ul postării de pe platformă și hashul conținutului rămân disponibile pentru analiză și audit chiar după eliminarea copiei locale mari.

## Staging local Codex / iMac

- Generează exporturile intermediare în `/tmp` sau `.local-artifacts/`, nu în Git.
- După încărcarea verificată în R2 păstrează local numai manifestul, hashurile și sursa originală protejată; copiile randate urmează aceleași termene ca în R2.
- Nu folosi istoricul Git drept arhivă media și nu comite duplicate PNG/MP4 pentru fiecare destinație.
- Fișierele istorice deja urmărite se elimină numai după confirmarea existenței obiectului R2 și aprobarea listei exacte; nu rescrie istoricul Git.
