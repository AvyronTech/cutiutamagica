import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, CircleAlert, PackageCheck, RefreshCw, Truck } from "lucide-react";
import { toast } from "sonner";
import {
  getAdminShippingInsights,
  getAdminSmartShipAccountOverview,
  refreshAdminSmartShipTracking,
} from "@/lib/admin.functions";

const statusLabels: Record<string, string> = {
  label_created: "AWB emis",
  picked_up: "Ridicat",
  in_transit: "În tranzit",
  delivered: "Livrat",
  exception: "Necesită verificare",
  returned: "Returnat",
  cancelled: "Anulat",
};

const money = (amount: number, currency = "RON") =>
  new Intl.NumberFormat("ro-RO", { style: "currency", currency }).format(amount);

const localDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("ro-RO", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Europe/Bucharest",
      }).format(date);
};

export default function ShippingInsightsPanel() {
  const client = useQueryClient();
  const loadInsights = useServerFn(getAdminShippingInsights);
  const loadAccount = useServerFn(getAdminSmartShipAccountOverview);
  const refreshTracking = useServerFn(refreshAdminSmartShipTracking);
  const [accountRequested, setAccountRequested] = useState(false);
  const insights = useQuery({
    queryKey: ["admin", "shipping-insights"],
    queryFn: () => loadInsights(),
    staleTime: 30_000,
  });
  const account = useQuery({
    queryKey: ["admin", "smartship-account-overview"],
    queryFn: () => loadAccount(),
    enabled: accountRequested,
    staleTime: 60_000,
    retry: false,
  });
  const refresh = useMutation({
    mutationFn: (shipmentId: string) => refreshTracking({ data: { shipmentId } }),
    onSuccess: (result) => {
      toast.success(`AWB actualizat: ${statusLabels[result.status] ?? result.status}`);
      void client.invalidateQueries({ queryKey: ["admin", "shipping-insights"] });
      void client.invalidateQueries({ queryKey: ["admin", "dashboard"] });
      void client.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (error) =>
      toast.error("Trackingul nu a putut fi actualizat", {
        description: error.message,
      }),
  });
  const summary = insights.data?.summary;
  const cards = [
    ["AWB-uri", summary?.total, Truck],
    ["În tranzit", summary?.inTransit, RefreshCw],
    ["Livrate", summary?.delivered, PackageCheck],
    ["De verificat", summary?.exceptions, CircleAlert],
    ["Fără verificare >48 h", summary?.stale, CircleAlert],
  ] as const;

  return (
    <section
      aria-label="Tracking și statistici SmartShip"
      className="space-y-5 rounded-2xl border border-cyan-300/20 bg-[#111c2e] p-4 md:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-cyan-300">
            Livrări conectate
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Tracking și statistici SmartShip
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
            Datele expedierilor din magazin; statusul fiecărui AWB se verifică la cerere direct la
            SmartShip.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void insights.refetch()}
          disabled={insights.isFetching}
          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-3 text-xs font-semibold text-slate-200 disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reîncarcă datele
        </button>
      </div>
      {insights.isError && (
        <p role="alert" className="text-sm text-rose-200">
          Statisticile livrărilor nu sunt disponibile. Reîncearcă.
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {cards.map(([label, value, Icon]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-[#0b1526] p-3">
            <Icon className="h-4 w-4 text-cyan-300" />
            <p className="mt-3 text-xl font-semibold tabular-nums text-white">{value ?? "—"}</p>
            <p className="mt-1 text-[11px] text-slate-400">{label}</p>
          </div>
        ))}
      </div>
      {summary && (
        <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
          <p>
            Etichete emise: <strong className="text-white">{summary.labels}</strong>
          </p>
          <p>
            Anulate: <strong className="text-white">{summary.cancelled}</strong>
          </p>
          <p>
            De la prima stare în tranzit la livrare:{" "}
            <strong className="text-white">
              {summary.averageDeliveryHours == null ? "—" : `${summary.averageDeliveryHours} ore`}
            </strong>
          </p>
          <p>
            Oferte SmartShip · 30 zile: <strong className="text-white">{summary.quotes30d}</strong>
          </p>
          <p>
            Oferte selectate · 30 zile:{" "}
            <strong className="text-white">{summary.selectedQuotes30d}</strong>
          </p>
          <p>
            Preț mediu ofertat · 30 zile:{" "}
            <strong className="text-white">
              {summary.averageQuoteRon == null ? "—" : money(summary.averageQuoteRon)}
            </strong>
          </p>
        </div>
      )}
      {Boolean(insights.data?.couriers.length) && (
        <div>
          <h3 className="text-xs font-semibold text-white">Curieri utilizați</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {insights.data!.couriers.map((courier) => (
              <span
                key={courier.name}
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300"
              >
                {courier.name} · {courier.count}
              </span>
            ))}
          </div>
        </div>
      )}
      <div>
        <h3 className="mb-3 text-xs font-semibold text-white">Expedieri recente</h3>
        {insights.data?.shipments.length ? (
          <div className="space-y-2">
            {insights.data.shipments.map((shipment) => (
              <article
                key={shipment.id}
                className="rounded-xl border border-white/10 bg-[#0b1526] p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all text-sm font-semibold text-white">
                      {shipment.orderNumber} · {shipment.awb}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {shipment.courier} · {statusLabels[shipment.status] ?? shipment.status}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Actualizat: {localDateTime(shipment.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={refresh.isPending}
                      onClick={() => refresh.mutate(shipment.id)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-cyan-300/30 px-3 text-xs font-semibold text-cyan-200 disabled:opacity-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Verifică AWB
                    </button>
                    {shipment.trackingUrl && (
                      <a
                        href={shipment.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-white/15 px-3 text-xs text-slate-200"
                      >
                        Tracking public <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
                {shipment.events.length > 0 && (
                  <details className="mt-3 border-t border-white/10 pt-2 text-xs text-slate-300">
                    <summary className="cursor-pointer font-medium text-cyan-200">
                      Istoric tracking · {shipment.events.length} evenimente recente
                    </summary>
                    <ol className="mt-2 space-y-2">
                      {shipment.events.map((event, index) => (
                        <li key={`${event.occurredAt}-${index}`}>
                          <span className="text-slate-500">{event.occurredAt}</span> ·{" "}
                          {event.description}
                          {event.location ? ` · ${event.location}` : ""}
                        </li>
                      ))}
                    </ol>
                  </details>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-slate-400">
            Nu există încă AWB-uri SmartShip emise pentru comenzile magazinului.
          </p>
        )}
      </div>
      <div className="border-t border-white/10 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Contul SmartShip</h3>
            <p className="mt-1 text-xs text-slate-400">
              Sold, expedieri și deconturi, citite direct din contul conectat.
            </p>
          </div>
          <button
            type="button"
            disabled={account.isFetching}
            onClick={() => {
              setAccountRequested(true);
              if (accountRequested) void account.refetch();
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-3 text-xs font-semibold text-slate-200 disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Verifică datele contului
          </button>
        </div>
        {account.isError && (
          <p role="alert" className="mt-3 text-xs text-rose-200">
            Datele contului nu au putut fi citite din SmartShip.
          </p>
        )}
        {account.data && (
          <div className="mt-3 space-y-3">
            {account.data.errors.length > 0 && (
              <p className="text-xs text-amber-200">
                Unele secțiuni nu au răspuns: {account.data.errors.join(", ")}.
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-4">
              <AccountMetric
                label="Disponibil pentru expediere"
                value={
                  account.data.balance
                    ? money(
                        account.data.balance.availableForShipping,
                        account.data.balance.currency,
                      )
                    : "Indisponibil"
                }
              />
              <AccountMetric
                label="AWB-uri în cont"
                value={
                  account.data.shipments ? String(account.data.shipments.total) : "Indisponibil"
                }
              />
              <AccountMetric
                label="Deconturi ramburs"
                value={account.data.payouts ? String(account.data.payouts.total) : "Indisponibil"}
              />
              <AccountMetric
                label="Facturi SmartShip"
                value={account.data.invoices ? String(account.data.invoices.total) : "Indisponibil"}
              />
            </div>
            {account.data.shipments?.recent.length ? (
              <div className="text-xs text-slate-300">
                <p className="mb-1 font-semibold text-white">
                  Ultimele AWB-uri din contul SmartShip
                </p>
                {account.data.shipments.recent.map((awb) => (
                  <p key={awb.awb} className="break-all">
                    {awb.awb} · {awb.courier} ·{" "}
                    {statusLabels[
                      (
                        {
                          0: "label_created",
                          1: "in_transit",
                          2: "delivered",
                          5: "exception",
                          6: "returned",
                          10: "cancelled",
                        } as Record<number, string>
                      )[awb.status]
                    ] ?? "Status necunoscut"}
                    {awb.orderId ? ` · ${awb.orderId}` : ""}
                  </p>
                ))}
              </div>
            ) : null}
            {account.data.balance && (
              <p className="text-xs text-slate-400">
                Sold: {money(account.data.balance.amount, account.data.balance.currency)} · limită
                de credit: {money(account.data.balance.creditLimit, account.data.balance.currency)}
              </p>
            )}
            {account.data.payouts?.recent.length ? (
              <div className="text-xs text-slate-300">
                <p className="mb-1 font-semibold text-white">Ultimele deconturi</p>
                {account.data.payouts.recent.map((payout) => (
                  <p key={payout.number}>
                    {payout.number} · {payout.date} · {money(payout.amount)} · {payout.awbCount} AWB
                  </p>
                ))}
              </div>
            ) : null}
            {account.data.invoices?.recent.length ? (
              <div className="text-xs text-slate-300">
                <p className="mb-1 font-semibold text-white">Ultimele facturi SmartShip</p>
                {account.data.invoices.recent.map((invoice) => (
                  <p key={invoice.number}>
                    {invoice.number} · {invoice.date} · {money(invoice.amount, invoice.currency)}
                    {invoice.pdfUrl && (
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-cyan-200 underline"
                      >
                        Descarcă PDF
                      </a>
                    )}
                  </p>
                ))}
              </div>
            ) : null}
            <p className="text-[11px] text-slate-500">
              Verificat la {localDateTime(account.data.checkedAt)} · fără emitere de AWB sau comandă
              de ridicare.
            </p>
          </div>
        )}
      </div>
      <Link
        to="/admin/orders"
        className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-200"
      >
        Deschide comenzile și etichetele AWB <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </section>
  );
}

function AccountMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b1526] p-3">
      <p className="text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{label}</p>
    </div>
  );
}
