import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Banknote, PackageCheck, Repeat, ShoppingBag, Users } from "lucide-react";
import { getAdminStatistics } from "@/lib/admin.functions";

const COLORS = ["#7C3AED", "#F59E0B", "#10B981", "#3B82F6", "#E1306C", "#06B6D4"];

function money(value: number): string {
  return value.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function monthLabel(value: string): string {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Intl.DateTimeFormat("ro-RO", { month: "short", year: "2-digit" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-56 items-center justify-center text-center text-sm text-slate-500">
      {children}
    </div>
  );
}

export default function Statistics() {
  const fetchStatistics = useServerFn(getAdminStatistics);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "statistics"],
    queryFn: () => fetchStatistics(),
    staleTime: 60_000,
  });

  const summary = data?.summary;
  const monthly = (data?.monthly ?? []).map((entry) => ({
    ...entry,
    label: monthLabel(entry.month),
  }));
  const channels = (data?.channels ?? []).filter((channel) => channel.validOrdersCount > 0);
  const deliveries = data?.deliveries ?? [];
  const topProducts = data?.topProducts ?? [];
  const kpis = [
    {
      label: "Venit net",
      value: summary ? `${money(summary.netRevenue)} RON` : "-",
      icon: Banknote,
      color: "text-purple-400",
    },
    {
      label: "Comenzi",
      value: String(summary?.ordersTotal ?? 0),
      icon: ShoppingBag,
      color: "text-amber-400",
    },
    {
      label: "Clienți unici",
      value: String(summary?.customersUnique ?? 0),
      icon: Users,
      color: "text-emerald-400",
    },
    {
      label: "Rată retur",
      value: `${(summary?.returnRate ?? 0).toLocaleString("ro-RO", { maximumFractionDigits: 1 })}%`,
      icon: Repeat,
      color: "text-cyan-400",
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white md:text-2xl">Statistici comerciale</h1>
        <p className="mt-1 text-xs text-slate-400 md:text-sm">
          Indicatori calculați exclusiv din comenzi, plăți și produse D1.
        </p>
      </div>

      {isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Statisticile nu au putut fi încărcate.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="glass-card rounded-xl p-3 md:p-5">
              <Icon className={`mb-3 h-5 w-5 ${kpi.color}`} />
              <p className="text-lg font-bold text-white md:text-2xl">
                {isLoading ? "..." : kpi.value}
              </p>
              <p className="mt-1 text-xs text-slate-400 md:text-sm">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="glass-card rounded-xl p-4 md:p-5">
          <h2 className="mb-4 text-base font-semibold text-white">Venit lunar</h2>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "#1E293B",
                    border: "1px solid #334155",
                    borderRadius: 8,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Venit RON"
                  stroke="#A78BFA"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart>Graficul va apărea după primele comenzi reale.</EmptyChart>
          )}
        </section>

        <section className="glass-card rounded-xl p-4 md:p-5">
          <h2 className="mb-4 text-base font-semibold text-white">Comenzi pe canal</h2>
          {channels.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={channels}
                  dataKey="validOrdersCount"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                >
                  {channels.map((channel, index) => (
                    <Cell key={channel.id} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#1E293B",
                    border: "1px solid #334155",
                    borderRadius: 8,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart>Nu există încă distribuție pe canale.</EmptyChart>
          )}
          <div className="space-y-2">
            {channels.map((channel, index) => (
              <div key={channel.id} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: COLORS[index % COLORS.length] }}
                  />
                  {channel.name}
                </span>
                <span className="text-slate-400">
                  {channel.validOrdersCount} · {money(channel.revenue)} RON
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="glass-card rounded-xl p-4 md:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
            <PackageCheck className="h-4 w-4 text-emerald-400" /> Produse performante
          </h2>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 border-b border-[#334155]/50 pb-3 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {index + 1}. {product.name}
                    </p>
                    <p className="text-xs text-slate-500">{product.units} bucăți</p>
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold text-white">
                    {money(product.revenue)} RON
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyChart>Topul se va calcula din liniile de comandă.</EmptyChart>
          )}
        </section>

        <section className="glass-card rounded-xl p-4 md:p-5">
          <h2 className="mb-4 text-base font-semibold text-white">Metode de livrare</h2>
          {deliveries.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={deliveries} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" stroke="#94A3B8" width={110} fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: "#1E293B",
                    border: "1px solid #334155",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="orders" name="Comenzi" fill="#22D3EE" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart>Livrările vor apărea după alocarea expedițiilor.</EmptyChart>
          )}
        </section>
      </div>

      <section className="glass-card rounded-xl p-4 text-xs text-slate-400 md:p-5">
        Costul și profitul nu sunt estimate până când costurile produselor sunt completate. Venitul
        plătit este momentan {money(summary?.paidRevenue ?? 0)} RON, reducerile{" "}
        {money(summary?.discounts ?? 0)} RON, iar rambursările {money(summary?.refunds ?? 0)} RON.
      </section>
    </div>
  );
}
