import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, PackageOpen, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import type { ReturnRequestPublicResult } from "@/lib/commerce-operations-contracts";

export const Route = createFileRoute("/retur")({
  component: ReturnsPage,
  head: () => ({
    meta: [
      { title: "Retur și garanție — Cutiuța Magică" },
      {
        name: "description",
        content:
          "Politica de retur, garanția legală și formularul electronic pentru comenzile Cutiuța Magică.",
      },
      { property: "og:title", content: "Retur și garanție — Cutiuța Magică" },
      { property: "og:url", content: "https://cutiutamagica.eu/retur" },
    ],
    links: [{ rel: "canonical", href: "https://cutiutamagica.eu/retur" }],
  }),
});

const fieldClass = "w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm";

function ReturnsPage() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ReturnRequestPublicResult | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/returns", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          website: form.get("website"),
          orderNumber: form.get("orderNumber"),
          customerName: form.get("customerName"),
          email: form.get("email"),
          phone: form.get("phone"),
          requestType: form.get("requestType"),
          preferredResolution: form.get("preferredResolution"),
          reason: form.get("reason"),
          details: form.get("details"),
          policyAccepted: form.get("policyAccepted") === "on",
        }),
      });
      const payload = (await response.json()) as {
        data?: ReturnRequestPublicResult;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data)
        throw new Error(
          payload.error?.message ||
            "Cererea nu a putut fi înregistrată. Verifică numărul comenzii și datele de contact.",
        );
      setResult(payload.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast.error("Cererea de retur nu a fost trimisă.", {
        description: error instanceof Error ? error.message : "Încearcă din nou.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <header className="mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <PackageOpen className="h-6 w-6 text-primary" />
        </div>
        <h1 className="font-display mt-5 text-4xl md:text-5xl">Retur și garanție</h1>
        <p className="mt-3 text-muted-foreground">
          Un flux clar, urmărit și confirmat electronic pentru retrageri, produse deteriorate sau
          neconforme.
        </p>
      </header>

      {result && (
        <section className="mx-auto mt-8 max-w-2xl rounded-lg border border-emerald-600/25 bg-emerald-500/10 p-5">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div>
              <h2 className="font-medium">Cererea {result.returnNumber} a fost înregistrată</h2>
              <p className="mt-1 text-sm text-muted-foreground">{result.message}</p>
            </div>
          </div>
        </section>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
        <section className="space-y-5">
          <Policy title="Retragere în 14 zile">
            Consumatorii pot comunica retragerea în 14 zile de la primirea produsului și îl trimit
            înapoi în cel mult 14 zile de la notificare. Costul direct al returului revine, de
            regulă, clientului.
          </Policy>
          <Policy title="Rambursare urmărită">
            Rambursarea se procesează conform legii, inclusiv costul livrării standard. Poate fi
            amânată până la recepția produsului sau furnizarea dovezii de expediere.
          </Policy>
          <Policy title="Produse personalizate">
            Produsele executate clar după specificațiile clientului pot intra în excepția legală.
            Nicio cerere nu este respinsă automat; eligibilitatea este analizată individual.
          </Policy>
          <Policy title="Garanția legală">
            Pentru consumatori se aplică garanția legală de conformitate de minimum doi ani.
            Repararea sau înlocuirea se finalizează într-un termen rezonabil, care nu poate depăși
            15 zile calendaristice de la informare, stabilit în scris.
          </Policy>
          <div className="rounded-lg border border-border bg-card p-4 text-xs leading-5 text-muted-foreground">
            DIGITAL ECO TECH SOLUTION SRL · CUI 55055976 · neplătitor de TVA. Drepturile legale ale
            consumatorului prevalează asupra oricărei formulări operaționale de pe această pagină.
          </div>
        </section>

        <form onSubmit={submit} className="rounded-lg border border-border bg-card p-5 md:p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl">Formular electronic</h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Folosește e-mailul sau telefonul din comandă pentru verificare.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Field label="Număr comandă">
              <input required name="orderNumber" className={fieldClass} placeholder="ex. CM-..." />
            </Field>
            <Field label="Nume complet">
              <input required name="customerName" autoComplete="name" className={fieldClass} />
            </Field>
            <Field label="E-mail">
              <input
                required
                name="email"
                type="email"
                autoComplete="email"
                className={fieldClass}
              />
            </Field>
            <Field label="Telefon">
              <input name="phone" autoComplete="tel" className={fieldClass} />
            </Field>
            <Field label="Tipul solicitării">
              <select name="requestType" className={fieldClass} defaultValue="withdrawal">
                <option value="withdrawal">Retragere în 14 zile</option>
                <option value="nonconformity">Produs neconform</option>
                <option value="damaged">Produs deteriorat</option>
                <option value="wrong_item">Produs greșit</option>
                <option value="other">Altă situație</option>
              </select>
            </Field>
            <Field label="Soluția preferată">
              <select name="preferredResolution" className={fieldClass} defaultValue="refund">
                <option value="refund">Rambursare</option>
                <option value="replacement">Înlocuire</option>
                <option value="repair">Reparare</option>
                <option value="price_reduction">Reducere de preț</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Motiv">
                <input
                  required
                  name="reason"
                  minLength={3}
                  maxLength={240}
                  className={fieldClass}
                  placeholder="Descriere scurtă"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Detalii">
                <textarea
                  name="details"
                  rows={5}
                  maxLength={2000}
                  className={fieldClass}
                  placeholder="Starea produsului și orice informație utilă"
                />
              </Field>
            </div>
          </div>
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="absolute h-px w-px opacity-0"
          />
          <label className="mt-4 flex items-start gap-2 text-xs leading-5">
            <input required name="policyAccepted" type="checkbox" className="mt-1" />
            <span>
              Confirm că informațiile sunt corecte și solicit înregistrarea electronică a cererii.
              Am citit condițiile de retur și garanție.
            </span>
          </label>
          <button
            disabled={submitting}
            className="wood-grain mt-5 w-full rounded-md py-3 font-medium text-[color:var(--cream)] disabled:opacity-50"
          >
            {submitting ? "Se înregistrează..." : "Trimite cererea"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Policy({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article>
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{children}</p>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-xs font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
