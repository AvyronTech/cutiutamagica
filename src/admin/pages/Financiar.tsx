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
import { getAdminStatistics } from "@/lib/admin.functions";

function money(value: number): string {
  return value.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Financiar() {
  const fetchStatistics = useServerFn(getAdminStatistics);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "statistics"],
    queryFn: () => fetchStatistics(),
    staleTime: 60_000,
  });
  const summary = data?.summary;
  const monthly = data?.monthly ?? [];
  const products = data?.topProducts ?? [];
  const knownProfit =
    summary?.estimatedCost == null ? null : summary.netRevenue - summary.estimatedCost;
  const cards = [
    {
      label: "Venit net comandat",
      value: summary?.netRevenue ?? 0,
      icon: Banknote,
      color: "text-purple-400",
    },
    {
      label: "Venit încasat",
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
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white md:text-2xl">Financiar</h1>
        <p className="mt-1 text-xs text-slate-400 md:text-sm">
          Valori operaționale din D1. Acest ecran nu înlocuiește contabilitatea sau raportarea
          fiscală.
        </p>
      </div>

      {isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Datele financiare nu au putut fi încărcate.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="glass-card rounded-xl p-3 md:p-5">
              <Icon className={`mb-3 h-5 w-5 ${card.color}`} />
              <p className="text-lg font-bold text-white md:text-2xl">
                {isLoading ? "..." : money(card.value)}{" "}
                <span className="text-xs text-slate-500">RON</span>
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
                : `Profit operațional estimat: ${money(knownProfit)} RON`}
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
        <h2 className="mb-4 text-base font-semibold text-white">Evoluție lunară</h2>
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
              <Line dataKey="revenue" name="Venit RON" stroke="#A78BFA" strokeWidth={2} />
              <Line dataKey="refunds" name="Rambursări RON" stroke="#F87171" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-56 items-center justify-center text-sm text-slate-500">
            Nu există încă tranzacții de afișat.
          </div>
        )}
      </section>

      <section className="glass-card rounded-xl p-4 md:p-5">
        <h2 className="mb-4 text-base font-semibold text-white">Rezultat pe produs</h2>
        {products.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="text-slate-500">
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
                    <td className="py-3 text-right">{money(product.revenue)} RON</td>
                    <td className="py-3 text-right">
                      {product.knownCost == null ? "Necunoscut" : `${money(product.knownCost)} RON`}
                    </td>
                    <td className="py-3 text-right">
                      {product.knownCost == null
                        ? "-"
                        : `${money(product.revenue - product.knownCost)} RON`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-slate-500">
            Nu există încă vânzări pe produse.
          </p>
        )}
      </section>
    </div>
  );
}
