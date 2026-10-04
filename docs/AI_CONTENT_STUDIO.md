# Studio AI local Cutiuța Magică

## Scop

Studioul folosește două proiecte oficiale, gratuite și open-source, cu roluri separate:

- [Ollama](https://github.com/ollama/ollama) rulează local Qwen3 pentru strategie, texte și output structurat;
- [ComfyUI](https://github.com/Comfy-Org/ComfyUI) rulează workflow-urile aprobate pentru imagini și video;
- [Qwen3](https://github.com/QwenLM/Qwen3), [Qwen Image](https://github.com/QwenLM/Qwen-Image) și [Wan 2.2](https://github.com/Wan-Video/Wan2.2) sunt sursele oficiale ale modelelor recomandate.

Un singur LLM nu este prezentat fals drept generator universal. Qwen3 orchestrează și redactează, iar ComfyUI execută modelele media. Codex și skillul `cutiuta-magica-marketing-comenzi` definesc adevărul produselor, regulile editoriale și limitele de aprobare.

## Flux sigur

1. Un administrator sau `Manager Codex Social` creează o lucrare în `/admin/ai`.
2. Workerul salvează în D1 numai brief-ul și un snapshot filtrat: catalog, politici și media publică, aprobată și cu drepturi validate.
3. Runnerul de pe iMac revendică lucrarea prin cereri HMAC semnate.
4. Ollama ori ComfyUI procesează local. Endpointurile locale nu sunt publicate pe internet.
5. Imaginile și videourile sunt încărcate privat în R2, cu SHA-256 verificat.
6. Rezultatul intră în `approval_requests`; nu devine media publică și nu este publicat social automat.

Datele clienților, tokenurile, parolele, datele de plată și secretele administratorilor nu intră în contextul modelului.

## Configurare ulterioară, după verificarea hardware-ului

Nu instala modele înainte să verifici memoria disponibilă și spațiul liber. Modelele video pot cere resurse considerabile.

Se configurează același secret, fără a-l salva în repository sau D1:

- secret Worker: `AI_STUDIO_RUNNER_HMAC_SECRET`;
- variabilă locală iMac: `AI_STUDIO_RUNNER_SECRET`.

Variabile locale acceptate:

| Variabilă                  | Implicit                 | Rol                                      |
| -------------------------- | ------------------------ | ---------------------------------------- |
| `AI_STUDIO_BASE_URL`       | `http://127.0.0.1:3000`  | Worker/local preview                     |
| `AI_STUDIO_RUNNER_ID`      | `cutiuta-imac`           | Identitatea dispozitivului               |
| `OLLAMA_URL`               | `http://127.0.0.1:11434` | API local Ollama                         |
| `OLLAMA_MODEL`             | `qwen3:8b`               | Model text                               |
| `COMFYUI_URL`              | `http://127.0.0.1:8188`  | API local ComfyUI                        |
| `AI_STUDIO_IMAGE_WORKFLOW` | neconfigurat             | Workflow API JSON aprobat pentru imagine |
| `AI_STUDIO_VIDEO_WORKFLOW` | neconfigurat             | Workflow API JSON aprobat pentru video   |

Pornire: `npm run ai:runner`.

Workflow-urile media trebuie să conțină markerii `__PROMPT__` și `__SOURCE_IMAGE_NAME__` și să compună fotografia originală ca strat final protejat. Runnerul refuză un workflow fără acești markeri. Nu sunt instalate automat custom nodes sau API nodes plătite. Pentru execuție complet locală, ComfyUI se pornește cu API nodes externe dezactivate.

## Limitări intenționate

- Migrarea configurează profilurile ca `setup_required`; devin `active` numai după heartbeat real.
- Repository-ul nu include greutățile modelelor.
- Nu există auto-publicare, auto-like, auto-message sau acces la comenzi prin runner.
- Aprobarea unei lucrări nu este echivalentă cu publicarea ei; integrarea socială are propriul control separat.
