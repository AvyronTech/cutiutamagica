import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, FileText, Loader2, ReceiptText, Save } from "lucide-react";
import { toast } from "sonner";
import {
  getCommerceOperations,
  issueFgoInvoice,
  saveInvoiceSeries,
  saveLegalEntity,
} from "@/lib/admin.functions";
import { CredentialPanel } from "@/admin/pages/GrowthSettings";

const inputClass =
  "w-full rounded-lg border border-[#334155] bg-[#0b1526] px-3 py-2.5 text-sm text-slate-100 focus:border-cyan-400/60 focus:outline-none";
const money = (value: number, currency: string) =>
  new Intl.NumberFormat("ro-RO", { style: "currency", currency }).format(value);

export default function Billing() {
  const client = useQueryClient();
  const load = useServerFn(getCommerceOperations);
  const saveEntity = useServerFn(saveLegalEntity);
  const saveSeries = useServerFn(saveInvoiceSeries);
  const issueInvoice = useServerFn(issueFgoInvoice);
  const query = useQuery({
    queryKey: ["admin", "commerce-operations"],
    queryFn: () => load(),
    staleTime: 15_000,
  });
  const refresh = () => client.invalidateQueries({ queryKey: ["admin", "commerce-operations"] });
  const entityMutation = useMutation({
    mutationFn: (data: Parameters<typeof saveEntity>[0]) => saveEntity(data),
    onSuccess: () => {
      toast.success("Datele firmei au fost salvate");
      refresh();
    },
    onError: showError,
  });
  const seriesMutation = useMutation({
    mutationFn: (data: Parameters<typeof saveSeries>[0]) => saveSeries(data),
    onSuccess: () => {
      toast.success("Seria a fost actualizată");
      refresh();
    },
    onError: showError,
  });
  const invoiceMutation = useMutation({
    mutationFn: (orderId: string) => issueInvoice({ data: { orderId } }),
    onSuccess: () => {
      toast.success("Factura a fost emisă prin FGO");
      refresh();
    },
    onError: showError,
  });

  if (query.isLoading || !query.data)
    return <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />;
  const data = query.data;
  const entity = data.legalEntity;
  const fgo = data.providers.find(
    (provider) => provider.provider === "fgo" && provider.environment === "production",
  );
  const activeSeries = data.invoiceSeries.find((series) => series.documentType === "invoice");
  const ready =
    entity.status === "verified" &&
    activeSeries?.status === "active" &&
    Boolean(fgo?.secretConfigured);

  function submitEntity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    entityMutation.mutate({
      data: {
        registrationNumber: String(form.get("registrationNumber") ?? ""),
        registeredAddress: String(form.get("registeredAddress") ?? ""),
        publicEmail: String(form.get("publicEmail") ?? ""),
        publicPhone: String(form.get("publicPhone") ?? ""),
        bankName: String(form.get("bankName") ?? ""),
        ibanMasked: String(form.get("ibanMasked") ?? ""),
        markVerified: form.get("markVerified") === "on",
      },
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white">Facturare FGO</h1>
        <p className="mt-1 text-sm text-slate-400">
          Emiterea reală este permisă numai după validarea firmei, activarea seriei și configurarea
          secretului FGO.
        </p>
      </header>
      <CredentialPanel providers={["fgo"]} />
      <div
        className={`flex gap-3 rounded-lg border p-4 text-sm ${ready ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-amber-400/30 bg-amber-400/10 text-amber-100"}`}
      >
        {ready ? (
          <CheckCircle2 className="h-5 w-5 shrink-0" />
        ) : (
          <AlertTriangle className="h-5 w-5 shrink-0" />
        )}
        <span>
          {ready
            ? "Fluxul de emitere FGO este pregătit."
            : `Blocaje: ${entity.status !== "verified" ? "profil juridic neverificat; " : ""}${activeSeries?.status !== "active" ? "serie inactivă; " : ""}${!fgo?.secretConfigured ? "secret FGO lipsă." : ""}`}
        </span>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <form
          onSubmit={submitEntity}
          className="rounded-lg border border-[#28364d] bg-[#111c2e] p-5"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <FileText className="h-4 w-4 text-cyan-300" /> Entitate juridică
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ReadOnly label="Denumire" value={entity.legalName} />
            <ReadOnly label="CUI" value={entity.taxId} />
            <ReadOnly label="Regim TVA" value="Neplătitor de TVA" />
            <Field label="Nr. Registrul Comerțului">
              <input
                name="registrationNumber"
                defaultValue={entity.registrationNumber ?? ""}
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Sediu social">
                <input
                  name="registeredAddress"
                  defaultValue={entity.registeredAddress ?? ""}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="E-mail public">
              <input
                name="publicEmail"
                type="email"
                defaultValue={entity.publicEmail ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Telefon public">
              <input
                name="publicPhone"
                defaultValue={entity.publicPhone ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Bancă">
              <input name="bankName" defaultValue={entity.bankName ?? ""} className={inputClass} />
            </Field>
            <Field label="IBAN mascat">
              <input
                name="ibanMasked"
                defaultValue={entity.ibanMasked ?? ""}
                placeholder="RO•• ••••"
                className={inputClass}
              />
            </Field>
          </div>
          <label className="mt-4 flex items-start gap-2 text-xs text-slate-300">
            <input
              name="markVerified"
              type="checkbox"
              defaultChecked={entity.status === "verified"}
              className="mt-1"
            />
            <span>
              Confirm că datele au fost verificate în actele firmei și de persoana responsabilă.
            </span>
          </label>
          <button
            disabled={entityMutation.isPending}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-[#07111f] disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Salvează profilul
          </button>
        </form>

        <section className="rounded-lg border border-[#28364d] bg-[#111c2e] p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <ReceiptText className="h-4 w-4 text-cyan-300" /> Serii documente
          </h2>
          <div className="mt-4 space-y-3">
            {data.invoiceSeries.map((series) => (
              <SeriesEditor
                key={series.id}
                series={series}
                busy={seriesMutation.isPending}
                onSave={(prefix, status) =>
                  seriesMutation.mutate({ data: { seriesId: series.id, prefix, status } })
                }
              />
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Numerotarea este rezervată tranzacțional în D1. Documentul extern și răspunsul FGO sunt
            jurnalizate fără a stoca cheia API.
          </p>
        </section>
      </div>

      <section className="rounded-lg border border-[#28364d] bg-[#111c2e]">
        <div className="border-b border-[#28364d] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Comenzi fără factură</h2>
        </div>
        <div className="divide-y divide-[#28364d]">
          {data.pendingInvoiceOrders.length ? (
            data.pendingInvoiceOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {order.orderNumber} · {order.customerName}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {money(order.total, order.currency)} ·{" "}
                    {new Date(order.placedAt).toLocaleString("ro-RO")}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!ready || invoiceMutation.isPending}
                  onClick={() => invoiceMutation.mutate(order.id)}
                  className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Emite prin FGO
                </button>
              </div>
            ))
          ) : (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              Nu există comenzi eligibile.
            </p>
          )}
        </div>
      </section>
      <section className="rounded-lg border border-[#28364d] bg-[#111c2e]">
        <div className="border-b border-[#28364d] px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Arhivă facturi</h2>
        </div>
        <div className="divide-y divide-[#28364d]">
          {data.invoices.length ? (
            data.invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {invoice.invoiceNumber || "Factură în lucru"} ·{" "}
                    {invoice.orderNumber || "fără comandă"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {money(invoice.total, invoice.currency)} · {invoice.status}
                    {invoice.issuedAt
                      ? ` · ${new Date(invoice.issuedAt).toLocaleString("ro-RO")}`
                      : ""}
                  </p>
                </div>
                {invoice.documentId ? (
                  <a
                    href={`/api/v1/admin/documents/${invoice.documentId}/content`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-[#334155] px-3 py-2 text-center text-xs text-slate-200"
                  >
                    Deschide PDF arhivat
                  </a>
                ) : (
                  <span className="text-xs text-amber-300">PDF local indisponibil</span>
                )}
              </div>
            ))
          ) : (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Nu există facturi emise.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function SeriesEditor({
  series,
  busy,
  onSave,
}: {
  series: { prefix: string; nextNumber: number; status: string; code: string };
  busy: boolean;
  onSave: (prefix: string, status: "draft" | "active" | "closed") => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSave(
          String(form.get("prefix")),
          String(form.get("status")) as "draft" | "active" | "closed",
        );
      }}
      className="grid grid-cols-[1fr_110px_auto] gap-2"
    >
      <input
        name="prefix"
        defaultValue={series.prefix}
        aria-label={`Prefix ${series.code}`}
        className={inputClass}
      />
      <select name="status" defaultValue={series.status} className={inputClass}>
        <option value="draft">Ciornă</option>
        <option value="active">Activă</option>
        <option value="closed">Închisă</option>
      </select>
      <button
        disabled={busy}
        className="rounded-lg border border-[#334155] px-3 text-xs text-slate-200"
      >
        Salvează
      </button>
      <p className="col-span-3 text-[11px] text-slate-500">
        Următorul număr intern: {series.nextNumber}
      </p>
    </form>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5 text-xs text-slate-400">
      <span>{label}</span>
      {children}
    </label>
  );
}
function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-200">{value}</p>
    </div>
  );
}
function showError(error: Error) {
  toast.error("Operația nu a reușit", { description: error.message });
}
