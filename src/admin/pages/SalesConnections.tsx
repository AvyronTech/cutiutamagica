import { CheckoutConnections } from "./CheckoutConnections";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  salesChannelCodes,
  salesChannelDefinitions,
  type SalesChannelCode,
} from "@/lib/sales-channels";
import { CredentialPanel } from "./GrowthSettings";
type Profile = {
  code: SalesChannelCode;
  accountUrl: string;
  sellerId: string;
  dataSourceId: string;
  version: number;
};
const input = "mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-white";
export function SalesConnections() {
  const url = "/api/v1/admin/sales-channels",
    [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["admin", "sales-profiles"],
    queryFn: async () => {
      const r = await fetch(url);
      if (!r.ok) throw new Error("Conturile nu pot fi încărcate.");
      return ((await r.json()) as { data: Profile[] }).data;
    },
  });
  async function save(e: FormEvent<HTMLFormElement>, code: SalesChannelCode, version: number) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const r = await fetch(url, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          expectedVersion: version,
          accountUrl: f.get("url"),
          sellerId: f.get("seller"),
          dataSourceId: f.get("dataSource") || "",
        }),
      });
      const b = (await r.json()) as { error?: { message: string } };
      if (!r.ok) throw new Error(b.error?.message);
      await query.refetch();
      toast.success("Datele contului au fost salvate. Conexiunea rămâne de verificat.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-5 rounded-xl border border-slate-700 p-5 text-slate-200">
      <h2 className="text-xl font-semibold">Conturile Cutiuța Magică</h2>
      <p className="text-sm text-slate-400">
        Introdu conturile existente sau deschide platforma pentru înregistrarea firmei. Salvarea
        unui link ori a unei chei nu înseamnă conectare verificată.
      </p>
      {query.isError && <p role="alert">Conturile nu pot fi încărcate.</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {query.data &&
          salesChannelCodes.map((code) => {
            const def = salesChannelDefinitions[code],
              p = query.data.find((p) => p.code === code);
            return (
              <details key={code} className="rounded-lg border border-slate-700 p-4">
                <summary className="cursor-pointer">
                  {def.name} · {p?.accountUrl ? "Date completate" : "Necesită configurare"}
                </summary>
                <p className="my-3 text-xs text-slate-400">{def.help}</p>
                <form
                  key={p?.version ?? 0}
                  onSubmit={(e) => save(e, code, p?.version ?? 0)}
                  className="space-y-3"
                >
                  <label className="block text-sm">
                    Link cont / magazin
                    <input
                      name="url"
                      type="url"
                      defaultValue={p?.accountUrl ?? ""}
                      className={input}
                    />
                  </label>
                  <label className="block text-sm">
                    ID seller / cont
                    <input
                      name="seller"
                      maxLength={100}
                      pattern="[a-zA-Z0-9_-]*"
                      defaultValue={p?.sellerId ?? ""}
                      className={input}
                    />
                  </label>
                  {code === "google_merchant" && (
                    <label className="block text-sm">
                      ID sursă de date
                      <input
                        name="dataSource"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        defaultValue={p?.dataSourceId ?? ""}
                        className={input}
                      />
                    </label>
                  )}
                  <button
                    disabled={busy}
                    className="rounded-lg bg-amber-200 px-3 py-2 text-sm text-slate-950"
                  >
                    Salvează contul
                  </button>
                  <a
                    href={def.portal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 text-sm text-amber-200 underline"
                  >
                    Conectează-te / creează cont ↗
                  </a>
                </form>
              </details>
            );
          })}
      </div>
      <div className="rounded-lg bg-slate-900 p-4 text-sm">
        <h3 className="font-semibold">Google Merchant · catalog actualizat automat</h3>
        <a
          href="/api/v1/catalog/google.xml"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block break-all text-amber-200 underline"
        >
          https://cutiutamagica.eu/api/v1/catalog/google.xml
        </a>
        <p className="mt-2 text-slate-400">
          Folosește adresa după publicarea acestei versiuni. Produsele fără preț sau fotografie
          aprobată sunt excluse. Completează identificatorii producătorului, livrarea și politicile
          în Merchant Center; aprobarea Google este separată.
        </p>
      </div>
      <CredentialPanel providers={["google_merchant", "emag", "trendyol", "olx", "okazii"]} />
      <div className="border-t border-slate-700 pt-5">
        <h3 className="text-lg">Facturare, curierat și plăți</h3>
        <div className="my-4 flex flex-wrap gap-4 text-sm text-amber-200">
          <a href="/admin/billing" className="underline">
            FGO · facturare
          </a>
          <a href="/admin/shipping" className="underline">
            SmartShip · curierat
          </a>
          <a href="/admin/financiar" className="underline">
            Finanțe și conturi
          </a>
        </div>
        <CheckoutConnections />
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <a
            href="https://dashboard.stripe.com/settings"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-200 underline"
          >
            Configurează firma și contul de încasare în Stripe ↗
          </a>
          <a
            href="https://admin.netopia-payments.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-200 underline"
          >
            Configurare NETOPIA ↗
          </a>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Datele cardului firmei se introduc doar în portalul securizat al furnizorului care le
          solicită. Acest dashboard nu colectează numărul cardului sau CVV.
        </p>
      </div>
    </section>
  );
}
