import { getAnalyticsOverview } from "@/lib/analytics.functions";
import type { AnalyticsDays } from "@/lib/analytics-report";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Banknote, BadgeDollarSign, CircleDollarSign, Receipt, RotateCcw } from "lucide-react";

function money(value: number): string {
  return value.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Financiar({
  days,
  currency,
  onChange,
}: {
  days: AnalyticsDays;
  currency: string;
  onChange: (value: { days: AnalyticsDays; currency: string }) => void;
}) {
  const fetchStatistics = useServerFn(getAnalyticsOverview);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "analytics", days],
    queryFn: () => fetchStatistics({ data: { days } }),
    staleTime: 60_000,
  });
  if (isError && !data)
    return (
      <section className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-5">
        <h1 className="text-xl font-semibold text-white">Financiar</h1>
        <p role="alert" className="mt-3 text-sm text-rose-100">
          Datele financiare nu au putut fi încărcate.
        </p>
        <button
          type="button"
          className="mt-3 rounded-lg border border-slate-500 px-3 py-2 text-sm text-white"
          onClick={() => refetch()}
        >
          Reîncearcă
        </button>
      </section>
    );
  const selected = data?.commerce.money.find((r) => r.currency === currency);
  const summary = selected
    ? {
        netRevenue: selected.ordered,
        paidRevenue: selected.collected,
        discounts: selected.discounts,
        refunds: selected.refunded,
        estimatedCost: selected.knownCost,
      }
    : undefined;
  const monthly = (data?.commerce.daily ?? [])
    .filter((r) => r.currency === currency)
    .map((r) => ({
      month: new Date(`${r.day}T12:00:00Z`).toLocaleDateString("ro-RO", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      }),
      revenue: r.ordered,
    }));
  const products = (data?.commerce.products ?? [])
    .filter((r) => r.currency === currency)
    .map((r) => ({ ...r, revenue: r.value }));
  const knownProfit =
    summary?.estimatedCost == null ? null : summary.netRevenue - summary.estimatedCost;
  const cards = [
    {
      label: "Valoarea netă a comenzilor",
      value: summary?.netRevenue ?? 0,
      icon: Banknote,
      color: "text-purple-400",
    },
    {
      label: "Încasări nete",
      value: summary?.paidRevenue ?? 0,
      icon: CircleDollarSign,
      color: "text-emerald-400",
    },
    {
      label: "Reduceri",
      value: summary?.discounts ?? 0,
      icon: BadgeDollarSign,
      color: "text-amber-400",
    },
    { label: "Rambursări", value: summary?.refunds ?? 0, icon: RotateCcw, color: "text-red-400" },
  ];

  return (
    <div className="space-y-3 md:space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white md:text-2xl">Financiar</h1>
        <p className="mt-1 text-xs text-slate-400 md:text-sm">
          Valori operaționale din D1. Acest ecran nu înlocuiește contabilitatea sau raportarea
          fiscală.
        </p>
      </div>

      {isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Actualizarea nu a reușit. Afișăm ultimul raport încărcat.
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-sm text-slate-300">
        <label>
          Perioada raportului
          <select
            aria-label="Perioada raportului financiar"
            className="ml-2 rounded-lg border border-slate-600 bg-slate-900 p-2 text-white"
            value={days}
            onChange={(e) => onChange({ days: Number(e.target.value) as AnalyticsDays, currency })}
          >
            {[7, 30, 90].map((d) => (
              <option key={d} value={d}>
                {d} zile
              </option>
            ))}
          </select>
        </label>
        <label>
          Monedă
          <select
            aria-label="Moneda raportului financiar"
            className="ml-2 rounded-lg border border-slate-600 bg-slate-900 p-2 text-white"
            value={currency}
            onChange={(e) => onChange({ days, currency: e.target.value })}
          >
            {[
              ...new Set(["RON", "EUR", ...(data?.commerce.money.map((r) => r.currency) ?? [])]),
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <a
          className="ml-auto text-cyan-200 underline"
          href={`/admin/statistics?tab=sales&days=${days}`}
        >
          Vezi statisticile și traficul ↗
        </a>
      </div>
      <p className="text-xs leading-5 text-slate-400">
        Aceleași date ca în Statistici și trafic. Perioada este în UTC, după data comenzii;
        încasările scad rambursările, iar comenzile provizorii cu card neplătit sunt excluse.
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="glass-card rounded-xl p-3 md:p-5">
              <Icon className={`mb-3 h-5 w-5 ${card.color}`} />
              <p className="text-lg font-bold text-white md:text-2xl">
                {isLoading ? "…" : money(card.value)}{" "}
                <span className="text-xs text-slate-400">{currency}</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">{card.label}</p>
            </div>
          );
        })}
      </div>

      <section
        className={`rounded-xl border p-4 md:p-5 ${
          knownProfit == null
            ? "border-amber-500/30 bg-amber-500/10"
            : "border-emerald-500/30 bg-emerald-500/10"
        }`}
      >
        <div className="flex items-start gap-3">
          <Receipt
            className={
              knownProfit == null
                ? "mt-0.5 h-5 w-5 text-amber-400"
                : "mt-0.5 h-5 w-5 text-emerald-400"
            }
          />
          <div>
            <h2 className="text-sm font-semibold text-white">
              {knownProfit == null
                ? "Profitul nu poate fi calculat încă"
                : `Profit operațional estimat: ${money(knownProfit)} ${currency}`}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {knownProfit == null
                ? "Completează costul fiecărei variante și costurile comenzilor înainte de a afișa marja. Nu folosim valori presupuse."
                : "Estimarea folosește costurile salvate pe comenzi și exclude comenzile anulate."}
            </p>
          </div>
        </div>
      </section>

      <section className="glass-card rounded-xl p-4 md:p-5">
        <h2 className="mb-4 text-base font-semibold text-white">Evoluția comenzilor</h2>
        {monthly.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
              <YAxis stroke="#94A3B8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#1E293B",
                  border: "1px solid #334155",
                  borderRadius: 8,
                }}
              />
              <Line
                dataKey="revenue"
                name={`Valoarea comenzilor · ${currency}`}
                isAnimationActive={false}
                stroke="#A78BFA"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-56 items-center justify-center text-sm text-slate-400">
            Nu există comenzi în perioada și moneda selectate.
          </div>
        )}
      </section>

      <section className="glass-card rounded-xl p-4 md:p-5">
        <h2 className="mb-4 text-base font-semibold text-white">Rezultat pe produs</h2>
        {products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="text-slate-400">
                <tr className="border-b border-[#334155]">
                  <th className="pb-2 font-medium">Produs</th>
                  <th className="pb-2 text-right font-medium">Bucăți</th>
                  <th className="pb-2 text-right font-medium">Venit</th>
                  <th className="pb-2 text-right font-medium">Cost cunoscut</th>
                  <th className="pb-2 text-right font-medium">Rezultat</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-[#334155]/40 text-slate-300 last:border-0"
                  >
                    <td className="py-3 font-medium text-slate-200">{product.name}</td>
                    <td className="py-3 text-right">{product.units}</td>
                    <td className="py-3 text-right">
                      {money(product.revenue)} {currency}
                    </td>
                    <td className="py-3 text-right">
                      {product.knownCost == null
                        ? "Necunoscut"
                        : `${money(product.knownCost)} ${currency}`}
                    </td>
                    <td className="py-3 text-right">
                      {product.knownCost == null
                        ? "-"
                        : `${money(product.revenue - product.knownCost)} ${currency}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-slate-400">
            Nu există încă vânzări pe produse.
          </p>
        )}
      </section>
    </div>
  );
}
