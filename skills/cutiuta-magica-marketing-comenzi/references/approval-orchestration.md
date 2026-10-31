# Aprobări din Dashboard și Codex

Platforma internă este registrul canonic. O confirmare scrisă în conversație nu este singură dovadă executabilă: Codex trebuie să înregistreze decizia prin endpointul administrativ autentificat, iar răspunsul API trebuie verificat.

## Contract

- Surse distincte: `admin_dashboard` și `codex_conversation`.
- Fiecare cerere are `approval_code`, `revision_ref` și un snapshot imuabil al acțiunii.
- Risc `low`, `medium` sau `high`: minimum o sursă permisă, dacă politica operației nu cere mai mult.
- Risc `critical`: minimum două aprobări și obligatoriu ambele surse.
- O respingere închide cererea. O aprobare expirată, respinsă sau pentru altă revizie nu poate fi reutilizată.
- Aprobarea și execuția sunt pași diferiți. `autoExecute` rămâne `false`.

## Înregistrarea unei decizii Codex

1. Citește cererea curentă din `GET /api/v1/admin/marketing-agent` și verifică sumarul, destinația, codul, revizia, expirarea și snapshotul.
2. Acceptă numai o formulare care identifică explicit codul și revizia, de exemplu: `Aprob codul ABCD1234 pentru revizia 73d9c2`.
3. Revalidează identitatea adminului și starea cererii imediat înainte de scriere.
4. Înregistrează o singură dată prin `POST /api/v1/admin/marketing-agent/approvals/{id}/decision`:

```json
{
  "source": "codex_conversation",
  "decision": "approved",
  "approvalCode": "ABCD1234",
  "revisionRef": "73d9c2",
  "evidenceReference": "codex-thread:<thread-id>:<turn-id>",
  "idempotencyKey": "<uuid>"
}
```

5. Raportează `pending` când mai lipsește o sursă și `approved` numai după cvorum. Nu confunda niciuna dintre stări cu publicarea.

Dashboardul folosește același endpoint cu `source=admin_dashboard`. Chiar dacă același administrator operează ambele suprafețe, chitanțele rămân independente și auditabile. Nu marca manual sursa Codex din Dashboard.

## Acțiuni critice

Tratează ca `critical` cel puțin: publicare sau programare socială, profil Facebook personal, trimitere de mesaje, creare comandă ramburs, sincronizare marketplace cu efect extern, modificare de stoc/preț, unfollow, ștergere/moderare distructivă, export cu date sensibile, aplicarea unui skill primit extern și activarea unui conector live.

## Automatizare permisă

Sunt automate: expirarea cererilor, deduplicarea prin cheia de idempotency, numărarea cvorumului, afișarea surselor lipsă, jurnalul de audit și alertele. Nu sunt automate: aprobarea, publicarea, expedierea, sincronizarea comercială sau reluarea unei acțiuni cu rezultat incert.
