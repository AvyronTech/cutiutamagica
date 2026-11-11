import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Printer, RefreshCw, Truck } from "lucide-react";
import { CredentialPanel } from "./GrowthSettings";

const base = "/api/v1/admin/marketplace-fiscal";
const orderKey = (id: string) => ["admin", "marketplace-fiscal", id];
const settingsKey = ["admin", "marketplace-fiscal-settings"];
const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-600 px-3 text-xs font-medium text-slate-100 transition-colors hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:opacity-50";
const input =
  "min-h-10 min-w-0 rounded-lg border border-slate-600 bg-slate-900 px-3 text-sm text-white focus-visible:outline-2 focus-visible:outline-cyan-300";

async function api<T>(path = "", action?: object): Promise<T> {
  const response = await fetch(
    base + path,
    action
      ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(action),
        }
      : undefined,
  );
  const data = (await response.json()) as { data: T; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || "Operația nu este disponibilă.");
  return data.data;
}

const deliveryStatus: Record<string, string> = {
  blocked: "Verificarea automată a oprit transmiterea. Verifică datele și încearcă din nou.",
  sending: "Trimitere în curs sau neconfirmată. Verifică în portal înainte de a retrimite.",
  accepted: "Cerere acceptată. Atașamentul nu este încă vizibil la verificarea API.",
  confirmed: "Factura a fost confirmată de platformă.",
  rejected: "Platforma a respins încărcarea. Verifică documentul în portal.",
  review: "Rezultatul trimiterii este incert. Verifică documentul în portal.",
};
const emagStatus: Record<number, string> = {
  0: "Anulată",
  1: "Nouă",
  2: "În procesare",
  3: "Pregătită",
  4: "Finalizată",
  5: "Returnată",
};
const issueLabels: Record<string, string> = {
  EMAG_FINANCIAL_REVIEW: "Voucher sau taxă cu reconciliere necesară",
  EMAG_CHANGED_FINANCIALS: "Valoarea comenzii s-a schimbat",
  EMAG_STOCK_BASELINE_REQUIRED: "Stoc fizic neconfirmat",
  EMAG_SKU_REVIEW: "SKU sau regim fiscal neconfirmat",
  EMAG_HISTORICAL_REVIEW: "Comandă istorică, de reconciliat",
  EMAG_TERMINAL_ORDER: "Verifică returul sau anularea",
  EMAG_HTTP_403: "Accesul API eMAG a fost refuzat",
  EMAG_HTTP_401: "Utilizatorul API eMAG a fost refuzat",
};
type OrderData = {
  canFinance: boolean;
  canSend: boolean;
  canWrite: boolean;
  invoice: { number: string; delivery: { status: string } | null } | null;
  trendyol: { external_package_id: string; cargo_number: string; cargo_provider: string }[];
  emag: {
    external_id: number;
    status: number;
    payment_status: number;
    delivery_mode: "courier" | "pickup";
    awb_id: number | null;
    awb_number: string | null;
    carrier: string | null;
    existing_invoice: number;
    review_code: string | null;
  } | null;
};

export function OrderFiscalActions({ id, channel }: { id: string; channel: string }) {
  const queryClient = useQueryClient();
  const [awbId, setAwbId] = useState("");
  const path = "/orders/" + encodeURIComponent(id);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: orderKey(id),
    queryFn: () => api<OrderData>(path),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: (action: object) => api("", action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: orderKey(id) }),
  });
  if (isPending)
    return (
      <p className="mb-4 text-xs text-slate-400" role="status">
        Verificăm documentele comenzii…
      </p>
    );
  if (isError || !data)
    return (
      <button type="button" className={button + " mb-4"} onClick={() => void refetch()}>
        Verifică din nou documentele comenzii
      </button>
    );
  const { invoice, emag, trendyol } = data;
  const marketplace = channel === "trendyol" || Boolean(emag);
  if (!data.canFinance && !marketplace) return null;
  return (
    <section
      aria-label="Documente și expediere marketplace"
      className="mb-4 space-y-3 rounded-xl border border-slate-700 bg-slate-900 p-3"
    >
      {data.canFinance && (
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-white">
            <FileText className="size-4 text-cyan-300" aria-hidden="true" /> Factură
          </div>
          {invoice ? (
            <>
              <p className="mb-2 text-xs text-slate-300">
                Oblio · <strong>{invoice.number}</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  className={button}
                  href={base + path + "/invoice"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Printer className="size-4" aria-hidden="true" /> Deschide și imprimă PDF
                </a>
                {marketplace &&
                  data.canSend &&
                  (!invoice.delivery || invoice.delivery.status === "blocked") &&
                  !emag?.existing_invoice && (
                    <button
                      type="button"
                      className={button}
                      disabled={mutation.isPending || !!emag?.review_code}
                      onClick={() => {
                        const destination = emag ? "eMAG" : "Trendyol";
                        if (
                          window.confirm(
                            `Trimiți factura ${invoice.number} către ${destination} pentru această comandă?`,
                          )
                        )
                          mutation.mutate({ action: "send-invoice", orderId: id });
                      }}
                    >
                      Trimite factura în {emag ? "eMAG" : "Trendyol"}
                    </button>
                  )}
              </div>
              {invoice.delivery && (
                <p className="mt-2 text-xs text-slate-300" role="status">
                  {deliveryStatus[invoice.delivery.status] ?? "Verifică documentul în portal."}
                </p>
              )}
            </>
          ) : emag?.existing_invoice ? (
            <p className="text-xs text-slate-300">
              Factura există deja în eMAG. Deschide documentul din comanda din portal.
            </p>
          ) : marketplace && data.canSend && !emag?.review_code ? (
            <button
              type="button"
              className={button}
              disabled={mutation.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    "Emiți în Oblio factura fiscală pentru această comandă? Dacă transmiterea automată este activă, factura va fi trimisă în marketplace.",
                  )
                )
                  mutation.mutate({ action: "issue-invoice", orderId: id });
              }}
            >
              Emite factura în Oblio
            </button>
          ) : (
            <a className={button} href={"/admin/billing#invoice-order-" + encodeURIComponent(id)}>
              Deschide facturarea
            </a>
          )}
        </div>
      )}
      {channel === "trendyol" && (
        <div>
          <p className="mb-2 text-xs text-slate-300">
            Trendyol generează eticheta. FAN Courier ridică pachetul.
          </p>
          <div className="flex flex-wrap gap-2">
            {trendyol.map((pkg) => (
              <a
                className={button}
                key={pkg.external_package_id}
                target="_blank"
                rel="noopener noreferrer"
                href={`/api/v1/admin/trendyol/orders/${encodeURIComponent(id)}/label/${encodeURIComponent(pkg.external_package_id)}`}
              >
                <Truck className="size-4" aria-hidden="true" /> Etichetă FAN · {pkg.cargo_number}
              </a>
            ))}
          </div>
        </div>
      )}
      {emag && (
        <div>
          <p className="mb-2 text-xs text-slate-300">
            eMAG #{emag.external_id} · {emagStatus[emag.status]} ·{" "}
            {emag.delivery_mode === "pickup" ? "Ridicare" : "Curier"}
            {" · "}
            {emag.payment_status ? "Plată confirmată de eMAG" : "Plată neconfirmată în eMAG"}
          </p>
          {emag.review_code && (
            <p className="mb-2 text-xs text-amber-200">
              {issueLabels[emag.review_code] || "Comanda necesită verificare."}
            </p>
          )}
          {emag.awb_id ? (
            <a
              className={button}
              href={base + path + "/emag-label"}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Printer className="size-4" aria-hidden="true" /> Etichetă eMAG{" "}
              {emag.awb_number ? "· " + emag.awb_number : ""}
            </a>
          ) : (
            data.canWrite && (
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  mutation.mutate({ action: "link-emag-awb", orderId: id, awbId });
                }}
              >
                <label className="grid min-w-0 gap-1 text-xs text-slate-300">
                  ID-ul AWB din API eMAG
                  <input
                    className={input + " w-48 max-w-full"}
                    inputMode="numeric"
                    pattern="[0-9]{1,10}"
                    required
                    value={awbId}
                    onChange={(event) => setAwbId(event.target.value)}
                  />
                </label>
                <button className={button} disabled={mutation.isPending}>
                  Asociază eticheta
                </button>
                <p className="basis-full text-xs text-slate-400">
                  Pentru o etichetă disponibilă doar în portal, folosește documentul de acolo.
                </p>
              </form>
            )
          )}
        </div>
      )}
      {mutation.error && (
        <p role="alert" className="text-xs text-amber-200">
          {mutation.error.message}
        </p>
      )}
    </section>
  );
}

type Settings = {
  emag: {
    enabled: number;
    verified_at: string | null;
    last_sync_at: string | null;
    last_error_code: string | null;
  } | null;
  settings: { provider: "trendyol" | "emag"; enabled_at: string | null }[];
  issues: { external_id: number; code: string }[];
  canConfigure: boolean;
  canConfigureInvoices: boolean;
  canImport: boolean;
};

export function MarketplaceFiscalOperations() {
  const client = useQueryClient();
  const [externalId, setExternalId] = useState("");
  const query = useQuery({ queryKey: settingsKey, queryFn: () => api<Settings>(), retry: false });
  const mutation = useMutation({
    mutationFn: (action: object) => api("", action),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: settingsKey }),
        client.invalidateQueries({ queryKey: ["admin", "orders"] }),
        client.invalidateQueries({ queryKey: ["admin", "marketplace-fiscal"] }),
      ]);
    },
  });
  const d = query.data;
  if (!d) return null;
  return (
    <details className="rounded-xl border border-slate-700 bg-slate-900 p-3 sm:p-4">
      <summary className="cursor-pointer text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-cyan-300">
        eMAG și facturi marketplace
      </summary>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-700 p-3">
          <h3 className="text-sm font-semibold text-white">Comenzi eMAG RO · 3P</h3>
          <p className="my-2 text-xs text-slate-300">
            {d.emag?.verified_at
              ? d.emag.enabled
                ? "Sincronizare automată activă"
                : "Acces API verificat"
              : "Verifică utilizatorul API și adresa IP autorizată din portalul eMAG."}
          </p>
          {d.emag?.last_sync_at && (
            <p className="mb-2 text-xs text-slate-400">
              Ultima citire: {new Date(d.emag.last_sync_at).toLocaleString("ro-RO")}
            </p>
          )}
          {d.emag?.last_error_code && (
            <p className="mb-2 text-xs text-amber-200">
              {issueLabels[d.emag.last_error_code] ?? "Ultima sincronizare necesită verificare."}
            </p>
          )}
          {d.canConfigure && (
            <details className="mb-3 text-xs text-slate-300">
              <summary className="cursor-pointer font-medium text-cyan-200">
                Configurare credențiale eMAG
              </summary>
              <p className="my-2">
                Introdu obiectul JSON cu câmpurile username și password ale utilizatorului autorizat
                pentru API-ul eMAG RO.
              </p>
              <CredentialPanel providers={["emag"]} hideVerify />
            </details>
          )}
          <div className="flex flex-wrap gap-2">
            {d.canConfigure && (
              <button
                className={button}
                type="button"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ action: "verify-emag" })}
              >
                <RefreshCw className="size-4" aria-hidden="true" /> Verifică API eMAG
              </button>
            )}
            {d.canConfigure && d.emag?.verified_at && (
              <button
                className={button}
                type="button"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({ action: "emag-automation", enabled: !d.emag?.enabled })
                }
              >
                {d.emag.enabled ? "Oprește importul orar" : "Activează importul orar"}
              </button>
            )}
          </div>
          {d.canImport && d.emag?.verified_at && (
            <form
              className="mt-2 flex flex-wrap items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate({ action: "sync-emag", externalId });
              }}
            >
              <label className="grid gap-1 text-xs text-slate-300">
                ID comandă eMAG
                <input
                  className={input + " w-44"}
                  inputMode="numeric"
                  pattern="[0-9]{1,10}"
                  required
                  value={externalId}
                  onChange={(event) => setExternalId(event.target.value)}
                />
              </label>
              <button className={button} disabled={mutation.isPending}>
                Sincronizează comanda
              </button>
            </form>
          )}
        </section>
        <section className="rounded-lg border border-slate-700 p-3">
          <h3 className="text-sm font-semibold text-white">Transmitere facturi Oblio</h3>
          <p className="my-2 text-xs text-slate-300">
            Automatizarea transmite facturile emise după activare. Facturile anterioare pot fi
            trimise individual din comandă.
          </p>
          <div className="space-y-2">
            {(["trendyol", "emag"] as const).map((provider) => {
              const enabled = !!d.settings.find((s) => s.provider === provider)?.enabled_at;
              const name = provider === "trendyol" ? "Trendyol" : "eMAG 3P";
              return (
                <div className="flex flex-wrap items-center justify-between gap-2" key={provider}>
                  <span className="text-xs text-slate-300">
                    <strong className="text-white">{name}</strong> ·{" "}
                    {enabled ? "Automat" : "Manual"}
                  </span>
                  {d.canConfigureInvoices && (
                    <button
                      className={button}
                      type="button"
                      disabled={mutation.isPending}
                      onClick={() => {
                        if (
                          enabled ||
                          window.confirm(
                            `Activezi transmiterea facturilor Oblio noi către ${name}?`,
                          )
                        )
                          mutation.mutate({
                            action: "invoice-automation",
                            provider,
                            enabled: !enabled,
                          });
                      }}
                    >
                      {enabled ? "Oprește automatizarea" : "Activează automatizarea"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
      {d.issues.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-amber-200">
          {d.issues.map((issue) => (
            <li key={issue.external_id}>
              eMAG #{issue.external_id} ·{" "}
              {issueLabels[issue.code] ?? "Sincronizarea necesită verificare."}
            </li>
          ))}
        </ul>
      )}
      {mutation.isSuccess && (
        <p className="mt-2 text-xs text-emerald-300" role="status">
          Operația a fost confirmată.
        </p>
      )}
      {mutation.error && (
        <p className="mt-2 text-xs text-amber-200" role="alert">
          {mutation.error.message}
        </p>
      )}
    </details>
  );
}
