import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { type CheckoutSettings } from "@/lib/checkout-settings";
import { CredentialPanel } from "./GrowthSettings";
import { ProviderSetupGuide } from "./ProviderSetupGuide";
const labels = {
  stripe: "Stripe",
  revolut_pay: "Revolut Pay · Merchant",
};
const visiblePaymentProviders = ["stripe", "revolut_pay"] as const;
type Snapshot = {
  settings: CheckoutSettings;
  version: number;
  environment: string;
  configured: Record<string, boolean>;
  adapterReady: Record<string, boolean>;
  options: Array<{ id: string }>;
  paymentReview: Array<{
    id: string;
    orderNumber: string;
    provider: string;
    status: string;
    amountBani: number;
    currency: string;
    failureCode: string | null;
    createdAt: string;
  }>;
};
const input = "mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-white";
export function CheckoutConnections() {
  const [busy, setBusy] = useState(false);
  const url = "/api/v1/admin/checkout-settings";
  const query = useQuery({
    queryKey: ["admin", "checkout-settings"],
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Setările nu pot fi încărcate.");
      return ((await response.json()) as { data: Snapshot }).data;
    },
  });
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.data) return;
    const f = new FormData(event.currentTarget),
      settings = { ...query.data.settings };
    for (const p of visiblePaymentProviders)
      settings[p] = {
        enabled: f.get(`${p}-enabled`) === "on",
        environment: f.get(`${p}-environment`) as "sandbox" | "production",
        acceptanceTestReference: String(f.get(`${p}-test`) ?? ""),
      };
    setBusy(true);
    try {
      const r = await fetch(url, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ settings, expectedVersion: query.data.version }),
      });
      const payload = (await r.json()) as { error?: { message: string } };
      if (!r.ok) throw new Error(payload.error?.message ?? "Salvarea nu a reușit.");
      await query.refetch();
      toast.success("Setările checkoutului au fost salvate.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[.04] p-5 text-slate-200 md:p-6">
      <h2 className="text-xl font-semibold text-white">Încasări cu cardul</h2>
      <p className="text-sm text-slate-400">
        Cheile sunt criptate. Cumpărătorii văd doar metodele activate și verificate. Mediul
        aplicației: {query.data?.environment ?? "…"}. Datele cardurilor se introduc exclusiv la
        procesator.
      </p>
      <CredentialPanel
        providers={["stripe", "stripe_webhook", "revolut_merchant", "revolut_merchant_webhook"]}
      />
      <ProviderSetupGuide provider="stripe" />
      <ProviderSetupGuide provider="revolut_merchant" />
      {query.isError && (
        <p role="alert">
          Setările nu pot fi încărcate.{" "}
          <button onClick={() => void query.refetch()} className="underline">
            Reîncearcă
          </button>
        </p>
      )}
      {Boolean(query.data?.paymentReview.length) && (
        <div className="overflow-x-auto rounded-lg border border-slate-700 p-4">
          <h3 className="font-semibold">Plăți în curs sau de verificat</h3>
          <p className="my-2 text-xs text-slate-400">
            O inițiere fără răspuns nu se repetă la Revolut. Verifică referința comenzii în
            Merchant; confirmarea semnată reconciliază plata. Nu marca manual o comandă ca plătită
            pe baza revenirii cumpărătorului.
          </p>
          <table className="w-full text-left text-xs">
            <thead>
              <tr>
                <th className="py-2">Comandă</th>
                <th>Procesator</th>
                <th>Total</th>
                <th>Stare</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.paymentReview.map((p) => (
                <tr key={p.id} className="border-t border-slate-800">
                  <td className="py-2 pr-3">{p.orderNumber}</td>
                  <td className="pr-3">{p.provider}</td>
                  <td className="pr-3">
                    {(p.amountBani / 100).toFixed(2)} {p.currency}
                  </td>
                  <td>
                    {p.failureCode
                      ? "Necesită verificare"
                      : p.status === "created"
                        ? "Se inițiază"
                        : "Așteaptă confirmarea"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {query.data && (
        <form key={query.data.version} onSubmit={save} className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {visiblePaymentProviders.map((p) => (
              <fieldset key={p} className="rounded-lg border border-slate-700 p-4 space-y-3">
                <legend className="px-1 font-semibold">{labels[p]}</legend>
                <p className="text-xs text-slate-400">
                  Adaptor pregătit · testul real în sandbox rămâne obligatoriu
                </p>
                <p className="text-xs">
                  Chei:{" "}
                  {query.data!.configured[p]
                    ? "completate pentru mediul curent"
                    : "necesită completare / verificare"}
                </p>
                <label className="block text-sm">
                  Mediu
                  <select
                    name={`${p}-environment`}
                    defaultValue={query.data!.settings[p].environment}
                    className={input}
                  >
                    <option value="sandbox">Sandbox · test</option>
                    <option value="production">Producție</option>
                  </select>
                </label>
                <label className="block text-sm">
                  Referință test reușit
                  <input
                    name={`${p}-test`}
                    maxLength={120}
                    defaultValue={query.data!.settings[p].acceptanceTestReference}
                    placeholder="ID test: plată, revenire, webhook verificat"
                    className={input}
                  />
                </label>
                <label className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    name={`${p}-enabled`}
                    defaultChecked={query.data!.settings[p].enabled}
                    disabled={!query.data!.adapterReady[p]}
                  />
                  Activez metoda în checkout după verificare
                </label>
                <p className="break-all text-xs text-slate-400">
                  Webhook: {p === "stripe" ? "/api/v1/webhooks/stripe" : "/api/v1/webhooks/revolut"}
                </p>
              </fieldset>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Activarea cere cheile mediului curent și o plată completă de test. Facturile se
            configurează separat în Facturare, iar livrarea în Curierat.
          </p>
          <button
            disabled={busy}
            className="rounded-lg bg-amber-200 px-4 py-2 text-sm text-slate-950"
          >
            {busy ? "Se salvează…" : "Salvează metodele de plată"}
          </button>
        </form>
      )}
    </section>
  );
}

export function OblioSetup() {
  const [busy, setBusy] = useState(false);
  const url = "/api/v1/admin/checkout-settings";
  const query = useQuery({
    queryKey: ["admin", "checkout-settings"],
    queryFn: async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Setările Oblio nu pot fi încărcate.");
      return ((await response.json()) as { data: Snapshot }).data;
    },
  });
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.data) return;
    const form = new FormData(event.currentTarget);
    const settings: CheckoutSettings = {
      ...query.data.settings,
      invoiceProvider: form.get("invoiceProvider") as CheckoutSettings["invoiceProvider"],
      oblioEmail: String(form.get("oblioEmail") ?? "").trim(),
    };
    setBusy(true);
    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ settings, expectedVersion: query.data.version }),
      });
      const payload = (await response.json()) as { error?: { message: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Salvarea nu a reușit.");
      await query.refetch();
      toast.success("Setările Oblio au fost salvate.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Salvarea nu a reușit.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[.045] p-5">
      <h2 className="text-base font-semibold text-white">Conexiunea Oblio</h2>
      <p className="mt-1 text-xs leading-5 text-slate-300">
        Cheia se păstrează criptat. CUI-ul vine din profilul juridic verificat, iar seria din
        registrul de facturi.
      </p>
      <CredentialPanel providers={["oblio"]} />
      {query.isError && (
        <p role="alert" className="mt-3 text-sm text-rose-200">
          Setările Oblio nu au putut fi încărcate.
        </p>
      )}
      {query.data && (
        <form key={query.data.version} onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-200">
            Furnizor de facturare
            <select
              name="invoiceProvider"
              defaultValue={query.data.settings.invoiceProvider}
              className={input}
            >
              <option value="none">Neconfigurat</option>
              <option value="oblio">Oblio</option>
            </select>
          </label>
          <label className="text-sm text-slate-200">
            E-mail cont Oblio
            <input
              type="email"
              name="oblioEmail"
              defaultValue={query.data.settings.oblioEmail}
              className={input}
            />
          </label>
          <button
            disabled={busy}
            className="w-fit rounded-xl bg-amber-200 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            {busy ? "Se salvează…" : "Salvează conexiunea"}
          </button>
        </form>
      )}
    </section>
  );
}
