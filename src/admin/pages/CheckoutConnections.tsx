import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { paymentProviders, type CheckoutSettings } from "@/lib/checkout-settings";
import { CredentialPanel } from "./GrowthSettings";
const labels = {
  stripe: "Stripe",
  revolut_pay: "Revolut Pay · Merchant",
  netopia: "NETOPIA Payments",
};
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
    for (const p of paymentProviders)
      settings[p] = {
        enabled: f.get(`${p}-enabled`) === "on",
        environment: f.get(`${p}-environment`) as "sandbox" | "production",
        acceptanceTestReference: String(f.get(`${p}-test`) ?? ""),
      };
    for (const field of [
      "netopiaPosSignature",
      "netopiaActiveKey",
      "oblioEmail",
      "invoiceSeries",
      "invoiceTaxId",
    ] as const)
      settings[field] = String(f.get(field) ?? "");
    settings.invoiceProvider = f.get("invoiceProvider") as CheckoutSettings["invoiceProvider"];
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
    <section className="space-y-5 rounded-xl border border-slate-700 p-5 text-slate-200">
      <h2 className="text-xl font-semibold">Plăți și facturare · configurare internă</h2>
      <p className="text-sm text-slate-400">
        Cheile sunt criptate. Cumpărătorii văd doar metodele activate și verificate. Mediul
        aplicației: {query.data?.environment ?? "…"}. Datele cardurilor se introduc exclusiv la
        procesator.
      </p>
      <CredentialPanel
        providers={[
          "stripe",
          "stripe_webhook",
          "revolut_merchant",
          "revolut_merchant_webhook",
          "netopia",
          "netopia_public_key",
          "fgo",
          "oblio",
          "smartship",
        ]}
      />
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
          <div className="grid gap-4 lg:grid-cols-3">
            {paymentProviders.map((p) => (
              <fieldset key={p} className="rounded-lg border border-slate-700 p-4 space-y-3">
                <legend className="px-1 font-semibold">{labels[p]}</legend>
                <p className="text-xs text-slate-400">
                  {query.data!.adapterReady[p]
                    ? "Adaptor implementat · testul real în sandbox rămâne obligatoriu"
                    : "Configurare pregătită · adaptorul hosted checkout/IPN trebuie finalizat și validat cu NETOPIA"}
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
                  Webhook:{" "}
                  {p === "stripe"
                    ? "/api/v1/webhooks/stripe"
                    : p === "revolut_pay"
                      ? "/api/v1/webhooks/revolut"
                      : "în așteptarea adaptorului IPN"}
                </p>
              </fieldset>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              NETOPIA · POS Signature
              <input
                name="netopiaPosSignature"
                defaultValue={query.data.settings.netopiaPosSignature}
                className={input}
              />
            </label>
            <label className="text-sm">
              NETOPIA · Active key ID
              <input
                name="netopiaActiveKey"
                defaultValue={query.data.settings.netopiaActiveKey}
                className={input}
              />
            </label>
            <label className="text-sm">
              Furnizor facturare
              <select
                name="invoiceProvider"
                defaultValue={query.data.settings.invoiceProvider}
                className={input}
              >
                <option value="none">Neconfigurat</option>
                <option value="fgo">FGO</option>
                <option value="oblio">Oblio · pregătire integrare</option>
              </select>
            </label>
            <label className="text-sm">
              Oblio · email cont
              <input
                type="email"
                name="oblioEmail"
                defaultValue={query.data.settings.oblioEmail}
                className={input}
              />
            </label>
            <label className="text-sm">
              CIF emitent
              <input
                name="invoiceTaxId"
                maxLength={30}
                defaultValue={query.data.settings.invoiceTaxId}
                className={input}
              />
            </label>
            <label className="text-sm">
              Serie facturi
              <input
                name="invoiceSeries"
                maxLength={30}
                defaultValue={query.data.settings.invoiceSeries}
                className={input}
              />
            </label>
          </div>
          <p className="text-xs text-slate-400">
            Salvarea pregătește integrarea; nu emite facturi, nu creează conturi și nu inițiază
            plăți. FGO are fluxul de emitere în Facturare; Oblio necesită adaptorul de emitere.
            Adresa expeditorului, greutatea, dimensiunile și pragul gratuității sunt în{" "}
            <a className="underline" href="/admin/shipping">
              Curierat · SmartShip
            </a>
            .
          </p>
          <button
            disabled={busy}
            className="rounded-lg bg-amber-200 px-4 py-2 text-sm text-slate-950"
          >
            {busy ? "Se salvează…" : "Salvează configurarea"}
          </button>
        </form>
      )}
    </section>
  );
}
