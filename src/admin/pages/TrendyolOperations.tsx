import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
type PackageRow = {
  order_id: string;
  external_order_id: string;
  external_package_id: string;
  order_number: string;
  customer_name: string;
  status: string;
  cargo_provider: string;
  cargo_number: string;
  invoice_status: string;
  invoice_number: string;
  gross_bani: number;
  seller_discount_bani: number;
  platform_discount_bani: number;
  invoice_total_bani: number;
  campaigns_json: string;
  commission_rates_json?: string;
  review_code: string | null;
  platform_collects_cod: number;
};
type Inventory = {
  sku: string;
  name: string;
  quantity: number;
  central_available: number | null;
  sale_price_bani: number;
  list_price_bani: number;
  observed_at: string;
};
type Financial = {
  id: string;
  transaction_type: string;
  external_order_id: string | null;
  credit_bani: number;
  debit_bani: number;
  commission_bani: number | null;
  seller_revenue_bani: number | null;
};
type State = {
  seller_id: string;
  enabled: number;
  verified_at: string | null;
  last_order_sync_at: string | null;
  last_finance_sync_at: string | null;
  last_error_code: string | null;
  finance_has_more: number;
};
type Data = {
  state: State | null;
  packages: PackageRow[];
  issues: { external_order_id: string; code: string }[];
  inventory: Inventory[];
  finance: Financial[];
  canFinance: boolean;
  canSync: boolean;
  canConfigure: boolean;
};
const endpoint = "/api/v1/admin/trendyol";
const money = (n: number) =>
  (n / 100).toLocaleString("ro-RO", { style: "currency", currency: "RON" });
const time = (s: string | null) =>
  s ? new Date(s).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" }) : "Nicio sincronizare";
const messages: Record<string, string> = {
  STOCK_BASELINE_REQUIRED:
    "Confirmă stocul fizic în Stocuri și aprovizionare, apoi reimportă comanda.",
  STOCK_INCREASE_REQUIRES_APPROVAL:
    "Stocul intern este mai mare. Verifică toate comenzile și aprobă explicit reaprovizionarea în Trendyol.",
  STOCK_UPDATE_AWAITING_CONFIRMATION:
    "Actualizarea a fost trimisă sau răspunsul este incert. Verifică din nou stocul; nu se retrimite automat.",
  ORDER_CATCHUP_REQUIRED:
    "Se recuperează comenzile înainte de actualizarea stocului. Reîncearcă după sincronizare.",
  SYNC_BUSY: "O sincronizare este deja în curs. Reîncearcă în două minute.",
  CONNECTOR_NOT_VERIFIED: "Salvează credențialele în Integrări și verifică API-ul.",
  SKU_MAPPING_REQUIRED: "Asociază SKU-ul exact cu o variantă activă din Produse, apoi reimportă.",
  RESOLVE_ORDER_ISSUES_FIRST: "Rezolvă alertele comenzilor înainte de publicarea stocului.",
  PHYSICAL_STOCK_RECONCILIATION_REQUIRED:
    "Starea coletului necesită reconcilierea stocului fizic. Returul nu este repus automat în vânzare.",
  FINANCIAL_RECONCILIATION_REQUIRED:
    "Comanda are documente sau încasări existente. Verifică diferențele în Facturare și Financiar.",
};
async function api(body?: object): Promise<Data | Record<string, unknown>> {
  const r = await fetch(endpoint, {
    ...(body
      ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
    signal: AbortSignal.timeout(60000),
  });
  const b = (await r.json()) as { data: Data; error?: { code: string; message?: string } };
  if (!r.ok)
    throw new Error(
      messages[b.error?.code || ""] ||
        b.error?.message ||
        "Conexiunea Trendyol nu este disponibilă.",
    );
  return b.data;
}
const button =
  "min-h-10 sm:min-h-0 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-50";
const statusName: Record<string, string> = {
  Picking: "În pregătire",
  Created: "Nou",
  Verified: "Confirmat",
  Awaiting: "În așteptare",
  Invoiced: "Facturat",
  Shipped: "Expediat",
  Delivered: "Livrat",
  Returned: "Returnat",
  Cancelled: "Anulat",
  UnPacked: "Reorganizat",
  UnSupplied: "Neaprovizionat",
  UnDelivered: "Nelivrat",
  AtCollectionPoint: "La punctul de ridicare",
};
export function TrendyolOperations() {
  const client = useQueryClient(),
    [order, setOrder] = useState(""),
    [sku, setSku] = useState("");
  const q = useQuery({
    queryKey: ["admin", "trendyol"],
    queryFn: async () => (await api()) as Data,
    staleTime: 30000,
  });
  const m = useMutation({
    mutationFn: async (body: object) => api(body),
    onSuccess: async (result) => {
      await Promise.all([
        q.refetch(),
        ...["orders", "dashboard", "inventory", "statistics", "products"].map((key) =>
          client.invalidateQueries({ queryKey: ["admin", key] }),
        ),
      ]);
      const data = result as {
        hasMore?: boolean;
        reviewCode?: string;
        results?: { reviewCode?: string }[];
        status?: string;
        initialPollQueued?: boolean;
      };
      if (data.initialPollQueued === true)
        toast.success("Automatizarea este activă. Prima verificare a fost pusă în coadă.");
      else if (data.initialPollQueued === false)
        toast.info(
          "Automatizarea este activă; prima verificare va folosi următorul trigger programat.",
        );
      else if (data.reviewCode || data.results?.some((v) => v.reviewCode))
        toast.info("Date preluate. Verifică alertele de reconciliere.");
      else
        toast.success(
          data.hasMore
            ? "Pagina a fost preluată; sincronizarea continuă."
            : data.status === "accepted"
              ? "Stoc acceptat de Trendyol; confirmarea finală urmează."
              : "Verificarea Trendyol s-a încheiat.",
        );
    },
    onError: (e) => toast.error(e.message),
  });
  const d = q.data,
    s = d?.state;
  function importOrder(e: FormEvent) {
    e.preventDefault();
    m.mutate({ action: "sync-orders", ...(order.trim() ? { orderNumber: order.trim() } : {}) });
  }
  return (
    <details
      id="trendyol"
      className="rounded-xl border border-orange-400/30 bg-slate-950/60 p-3 md:p-4"
    >
      <summary className="cursor-pointer text-sm font-semibold text-orange-200">
        Trendyol · comenzi, stoc și documente{" "}
        <span className="ml-2 text-xs font-normal text-slate-300">
          {s?.verified_at
            ? `API RO verificat · ${s.enabled ? "automat activ" : "automat oprit"}`
            : "Configurează conexiunea API"}
        </span>
      </summary>
      <div className="mt-4 space-y-4 text-sm text-slate-200">
        <p className="text-xs text-slate-300">
          Comenzile intră în registrul comun, cu reducerile lor reale. FAN Courier este gestionat de
          Trendyol; folosește eticheta platformei. Nu emite un AWB SmartShip pentru aceste comenzi.
        </p>
        {q.isPending && <p role="status">Se încarcă datele Trendyol…</p>}
        {q.isError && (
          <p role="alert">
            {q.error.message}{" "}
            <button className={button} onClick={() => q.refetch()}>
              Reîncearcă
            </button>
          </p>
        )}
        {d && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <a href="/admin/integrations" className={button}>
                Cont și credențiale
              </a>
              {d.canConfigure && (
                <>
                  <button
                    disabled={m.isPending}
                    className={button}
                    onClick={() => m.mutate({ action: "verify" })}
                  >
                    Verifică API
                  </button>
                  <button
                    disabled={m.isPending || !s?.verified_at}
                    className={button}
                    onClick={() => m.mutate({ action: "automation", enabled: !s?.enabled })}
                  >
                    {s?.enabled
                      ? "Oprește sincronizarea automată"
                      : "Activează sincronizarea automată"}
                  </button>
                </>
              )}
              <button className={button} disabled={q.isFetching} onClick={() => q.refetch()}>
                Reîncarcă datele
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Comenzi: {time(s?.last_order_sync_at || null)} · Decontare:{" "}
              {time(s?.last_finance_sync_at || null)}. Automatizarea verifică comenzile aproximativ
              la 15 minute și separă operațiile pentru limitele Free.
            </p>
            {s?.last_error_code && (
              <p role="alert" className="text-amber-200">
                {messages[s.last_error_code] || `Verificare necesară: ${s.last_error_code}`}
              </p>
            )}
            {d.canSync && (
              <form onSubmit={importOrder} className="flex flex-wrap items-end gap-2">
                <label className="min-w-0 basis-full flex-1 text-xs sm:basis-auto">
                  Număr comandă Trendyol (opțional)
                  <input
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    maxLength={100}
                    pattern="[a-zA-Z0-9_-]*"
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-white"
                    placeholder="Gol = preia comenzile noi"
                  />
                </label>
                <button className={button} disabled={m.isPending || !s?.verified_at}>
                  {m.isPending ? "Se verifică…" : "Sincronizează comenzile"}
                </button>
              </form>
            )}
            {d.issues.map((i) => (
              <div
                key={i.external_order_id}
                role="alert"
                className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-100"
              >
                <strong>Comanda {i.external_order_id}</strong> ·{" "}
                {messages[i.code] ||
                  `Necesită verificare (${i.code}). Deschide portalul Trendyol și verifică datele sursă.`}{" "}
                {d.canSync && (
                  <button
                    className={button}
                    disabled={m.isPending}
                    onClick={() =>
                      m.mutate({ action: "sync-orders", orderNumber: i.external_order_id })
                    }
                  >
                    Reimportă
                  </button>
                )}
              </div>
            ))}
            {!d.packages.length && (
              <p className="text-xs text-slate-400">
                Nicio comandă importată încă. Verifică API-ul, apoi preia comanda după numărul ei.
              </p>
            )}
            <div className="grid gap-3 lg:grid-cols-2">
              {d.packages.map((p) => (
                <article
                  key={p.external_package_id}
                  className="min-w-0 rounded-lg border border-slate-700 p-3"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong>{p.order_number}</strong>
                    <span className="text-xs text-orange-200">
                      {statusName[p.status] || "Stare de verificat"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    {p.customer_name} · Colet {p.external_package_id}
                  </p>
                  <dl className="my-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <dt>Valoare brută</dt>
                    <dd className="text-right">{money(p.gross_bani)}</dd>
                    <dt>Reducere vânzător</dt>
                    <dd className="text-right">{money(p.seller_discount_bani)}</dd>
                    <dt>Reducere platformă</dt>
                    <dd className="text-right">{money(p.platform_discount_bani)}</dd>
                    <dt className="font-semibold">Total de facturat</dt>
                    <dd className="text-right font-semibold text-white">
                      {money(p.invoice_total_bani)}
                    </dd>
                  </dl>
                  {JSON.parse(p.campaigns_json).map(
                    (c: { name: string; amount: number }, i: number) => (
                      <p key={i} className="text-xs text-slate-300">
                        Campanie: {c.name} · {money(c.amount)}
                      </p>
                    ),
                  )}
                  <p className="my-2 break-all text-xs">
                    {p.cargo_provider === "FANEX" ? "FAN Courier" : p.cargo_provider} · Cod
                    expediere {p.cargo_number || "în așteptare"}
                  </p>
                  {!!p.platform_collects_cod && (
                    <p className="mb-2 text-xs text-amber-200">
                      Ramburs colectat de platformă. Suma de pe etichetă poate diferi de valoarea de
                      facturat; încasarea se confirmă din decont, nu din etichetă.
                    </p>
                  )}
                  <p className="mb-2 text-xs text-slate-300">
                    Factură în Trendyol:{" "}
                    {p.invoice_number ||
                      (p.invoice_status === "NotInvoiced" ? "neemisă" : p.invoice_status)}
                  </p>
                  {JSON.parse(p.commission_rates_json || "[]").length > 0 && (
                    <p className="mb-2 text-xs text-slate-300">
                      Cotă comision indicată:{" "}
                      {JSON.parse(p.commission_rates_json || "[]").join(" / ")}%. Baza și valoarea
                      finală se confirmă în decont.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <a
                      className={button}
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`${endpoint}/orders/${p.order_id}/label/${p.external_package_id}`}
                    >
                      Etichetă FAN PDF
                    </a>
                    <a
                      className={button}
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`${endpoint}/orders/${p.order_id}/packing`}
                    >
                      Fișă colet / coduri
                    </a>
                    {d.canFinance && (
                      <a
                        className={button}
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`${endpoint}/orders/${p.order_id}/invoice-preview`}
                      >
                        Previzualizare factură
                      </a>
                    )}
                    <a
                      className={button}
                      href={`/admin/billing#invoice-order-${encodeURIComponent(p.order_id)}`}
                    >
                      Facturare
                    </a>
                  </div>
                </article>
              ))}
            </div>
            <section className="border-t border-slate-700 pt-3">
              <h3 className="font-semibold">Stoc și prețuri pe canal</h3>
              <p className="mt-1 text-xs text-slate-300">
                Stocul fizic se stabilește în{" "}
                <a className="underline" href="/admin/inventory">
                  Stocuri și aprovizionare
                </a>
                . Prețurile citite din Trendyol și reducerea unei comenzi rămân separate de prețul
                magazinului. Automatizarea trimite doar scăderi de stoc; majorările se aprobă aici.
              </p>
              {d.canSync && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    m.mutate({ action: "observe-inventory", sku: sku.trim() });
                  }}
                  className="my-3 flex flex-wrap items-end gap-2"
                >
                  <label className="min-w-0 basis-full flex-1 text-xs sm:basis-auto">
                    SKU produs
                    <input
                      required
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      maxLength={100}
                      pattern="[a-zA-Z0-9_-]+"
                      placeholder="CM-KITTEN"
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-white"
                    />
                  </label>
                  <button disabled={m.isPending || !s?.verified_at} className={button}>
                    Citește stocul și prețul
                  </button>
                </form>
              )}
              <div className="space-y-2">
                {d.inventory.map((i) => (
                  <div
                    key={i.sku}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 p-3 text-xs"
                  >
                    <div>
                      <strong>{i.sku}</strong> · {i.name}
                      <p className="mt-1">
                        Disponibil intern: {i.central_available ?? "necontorizat"} · Trendyol:{" "}
                        {i.quantity} · Preț: {money(i.sale_price_bani)} · Listă:{" "}
                        {money(i.list_price_bani)}
                      </p>
                      <p className="mt-1 text-slate-400">Citit: {time(i.observed_at)}</p>
                    </div>
                    {d.canSync && (
                      <button
                        className={button}
                        disabled={m.isPending || i.central_available === null}
                        onClick={() => {
                          const increase = (i.central_available ?? 0) > i.quantity;
                          if (
                            increase &&
                            !window.confirm(
                              `Confirmi stocul disponibil ${i.central_available} și majorarea cantității Trendyol de la ${i.quantity}? Comenzile vor fi reverificate înainte de trimitere.`,
                            )
                          )
                            return;
                          m.mutate({ action: "sync-stock", sku: i.sku, allowIncrease: increase });
                        }}
                      >
                        Reconciliază stocul
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
            {d.canFinance && (
              <section className="border-t border-slate-700 pt-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">Decontare financiară</h3>
                  {d.canConfigure && (
                    <button
                      disabled={m.isPending || !s?.verified_at}
                      className={button}
                      onClick={() => m.mutate({ action: "sync-finance" })}
                    >
                      {s?.finance_has_more ? "Continuă preluarea decontului" : "Verifică decontul"}
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-slate-300">
                  Vânzări, retururi și viramente confirmate prin API. Comisionul estimat din comandă
                  nu este o încasare. Facturile se emit separat, după verificarea datelor. După
                  emitere, descarcă PDF-ul din Facturare și încarcă-l în comanda din portalul
                  Trendyol; publicarea facturii nu este automată.
                </p>
                {!d.finance.length ? (
                  <p className="mt-2 text-xs text-slate-400">
                    Nicio înregistrare de decont importată. O comandă în pregătire poate să nu aibă
                    încă decontare.
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr>
                          <th className="p-2">Tip / comandă</th>
                          <th className="p-2">Credit</th>
                          <th className="p-2">Debit</th>
                          <th className="p-2">Comision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.finance.map((f) => (
                          <tr key={f.id} className="border-t border-slate-700">
                            <td className="p-2">
                              {(
                                {
                                  Sale: "Vânzare",
                                  Return: "Retur",
                                  PaymentOrder: "Virament",
                                  DeductionInvoices: "Factură rețineri",
                                  CreditNote: "Notă de credit",
                                  CommissionInvoice: "Factură comision",
                                } as Record<string, string>
                              )[f.transaction_type] || "De verificat"}{" "}
                              · {f.external_order_id || "—"}
                            </td>
                            <td className="p-2">{money(f.credit_bani)}</td>
                            <td className="p-2">{money(f.debit_bani)}</td>
                            <td className="p-2">
                              {f.commission_bani === null
                                ? "Neconfirmat"
                                : money(f.commission_bani)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
            <a
              className="inline-block text-xs text-orange-200 underline"
              href="https://partner.trendyol.com/ro/orders/shipment-packages/all"
              target="_blank"
              rel="noopener noreferrer"
            >
              Deschide comenzile în portalul oficial
            </a>
          </>
        )}
      </div>
    </details>
  );
}
