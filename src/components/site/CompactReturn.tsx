import { useId, useState } from "react";
import { CheckCircle2, ArrowRight, PackageOpen, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import type { ReturnRequestPublicResult } from "@/lib/commerce-operations-contracts";

export function CompactReturn() {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const [type, setType] = useState("withdrawal");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ReturnRequestPublicResult | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v1/returns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          website: form.get("website"),
          orderNumber: form.get("orderNumber"),
          customerName: form.get("customerName"),
          email: form.get("email"),
          phone: "",
          requestType: type,
          preferredResolution: form.get("resolution"),
          reason:
            form.get("reason") ||
            (type === "withdrawal" ? "Solicit retragerea din contract" : "Solicitare de asistență"),
          details: form.get("details"),
          policyAccepted: form.get("policyAccepted") === "on",
        }),
      });
      const body = (await response.json()) as {
        data?: ReturnRequestPublicResult;
        error?: { message?: string };
      };
      if (!response.ok || !body.data)
        throw new Error(body.error?.message || "Verifică datele comenzii și încearcă din nou.");
      setResult(body.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cererea nu a fost trimisă.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      data-world="atelier"
      id="ajutor"
      className="landing-return-entry"
      aria-label="Retur și ajutor cu o comandă"
    >
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button type="button" className="return-trigger">
            <PackageOpen size={19} aria-hidden />
            Formular de retur
            <ArrowRight size={16} aria-hidden />
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="return-dialog-overlay" />
          <Dialog.Content className="return-dialog">
            <Dialog.Title className="return-dialog-title">Formular de retur</Dialog.Title>
            <Dialog.Description className="return-dialog-description">
              Suntem aproape și după ce ajunge magia. Spune-ne cu ce te putem ajuta.
            </Dialog.Description>
            <Link to="/retur" className="scene-link return-policy-link">
              Condiții de retur și garanție <ArrowRight size={14} aria-hidden />
            </Link>
            <Dialog.Close className="return-dialog-close" aria-label="Închide formularul de retur">
              <X size={19} aria-hidden />
            </Dialog.Close>
            {result ? (
              <div role="status" className="return-result">
                <CheckCircle2 />
                <h3>Cererea {result.returnNumber} a fost înregistrată.</h3>
                <p>{result.message}</p>
              </div>
            ) : (
              <form
                onSubmit={submit}
                onChange={(event) => {
                  const form = new FormData(event.currentTarget);
                  const fields = Object.fromEntries(
                    Array.from(form.entries(), ([key, value]) => [key, String(value)]),
                  );
                  setDraft((previous) => ({
                    ...previous,
                    ...fields,
                    ...(step === 2
                      ? { policyAccepted: form.get("policyAccepted") === "on" ? "on" : "" }
                      : {}),
                  }));
                }}
                className="return-form"
              >
                <p className="scene-eyebrow" aria-live="polite">
                  Pasul {step} din 2 · {step === 1 ? "Comanda ta" : "Cum te putem ajuta"}
                </p>
                <fieldset hidden={step !== 1}>
                  <legend className="sr-only">Datele comenzii</legend>
                  <label htmlFor={`${id}-order`}>Număr comandă</label>
                  <input
                    id={`${id}-order`}
                    className="magic-input"
                    required
                    name="orderNumber"
                    defaultValue={draft.orderNumber ?? ""}
                    placeholder="CM-…"
                    minLength={5}
                    maxLength={80}
                  />
                  <label htmlFor={`${id}-name`}>Nume complet</label>
                  <input
                    id={`${id}-name`}
                    required
                    className="magic-input"
                    name="customerName"
                    defaultValue={draft.customerName ?? ""}
                    autoComplete="name"
                    minLength={2}
                    maxLength={120}
                  />
                  <label htmlFor={`${id}-email`}>E-mailul din comandă</label>
                  <input
                    id={`${id}-email`}
                    required
                    className="magic-input"
                    type="email"
                    name="email"
                    defaultValue={draft.email ?? ""}
                    autoComplete="email"
                    maxLength={254}
                  />
                </fieldset>
                {step === 2 && (
                  <fieldset>
                    <legend className="sr-only">Solicitarea ta</legend>
                    <label htmlFor={`${id}-type`}>Cu ce te ajutăm?</label>
                    <select
                      id={`${id}-type`}
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="magic-input"
                    >
                      <option value="withdrawal">Doresc să returnez produsul</option>
                      <option value="damaged">Produsul a ajuns deteriorat</option>
                      <option value="nonconformity">Produsul nu funcționează corect</option>
                      <option value="wrong_item">Am primit alt produs</option>
                    </select>
                    <label htmlFor={`${id}-resolution`}>Soluția preferată</label>
                    <select
                      id={`${id}-resolution`}
                      name="resolution"
                      defaultValue={draft.resolution ?? "refund"}
                      className="magic-input"
                    >
                      <option value="refund">Rambursare</option>
                      <option value="replacement">Înlocuire</option>
                      <option value="repair">Reparare</option>
                    </select>
                    <label htmlFor={`${id}-reason`}>
                      Descriere scurtă {type === "withdrawal" && "(opțional)"}
                    </label>
                    <input
                      id={`${id}-reason`}
                      name="reason"
                      defaultValue={draft.reason ?? ""}
                      className="magic-input"
                      required={type !== "withdrawal"}
                      minLength={3}
                      maxLength={240}
                    />
                    <label htmlFor={`${id}-details`}>Alte detalii (opțional)</label>
                    <textarea
                      id={`${id}-details`}
                      name="details"
                      defaultValue={draft.details ?? ""}
                      className="magic-input"
                      rows={2}
                      maxLength={2000}
                    />
                    <label className="return-consent">
                      <input
                        required
                        type="checkbox"
                        name="policyAccepted"
                        defaultChecked={draft.policyAccepted === "on"}
                      />
                      Confirm datele și solicit înregistrarea cererii. Am citit condițiile de retur
                      și garanție.
                    </label>
                  </fieldset>
                )}
                <input
                  name="website"
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                />
                {error && (
                  <p role="alert" className="text-red-300 text-sm">
                    {error}
                  </p>
                )}
                <div className="flex gap-3">
                  {step === 2 && (
                    <button type="button" className="scene-link" onClick={() => setStep(1)}>
                      Înapoi
                    </button>
                  )}
                  <button disabled={busy} className="magic-button">
                    {busy ? "Se înregistrează…" : step === 1 ? "Continuă" : "Trimite cererea"}
                    <ArrowRight size={15} />
                  </button>
                </div>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
