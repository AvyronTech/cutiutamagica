import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Package,
  PackageCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import { getAdminDashboard } from "@/lib/admin.functions";

const channelColors: Record<string, string> = {
  website: "bg-violet-400",
  emag: "bg-amber-400",
  vinted: "bg-teal-400",
  olx: "bg-emerald-400",
  okazii: "bg-rose-400",
  google_merchant: "bg-blue-400",
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bună dimineața";
  if (hour < 18) return "Bună ziua";
  return "Bună seara";
}

function formatDate(now: Date) {
  return new Intl.DateTimeFormat("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
}

export default function Dashboard() {
  const fetchDashboard = useServerFn(getAdminDashboard);
  const [now, setNow] = useState(() => new Date());
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => fetchDashboard(),
    staleTime: 30_000,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const stats = data?.stats;
  const attention = [
    {
      label: "Comenzi de procesat",
      value: stats?.ordersOpen ?? 0,
      hint: "Confirmă, pregătește și predă curierului",
      path: "/admin/orders",
      icon: ShoppingCart,
      tone: "text-blue-300 bg-blue-400/10 border-blue-400/20",
    },
    {
      label: "Produse incomplete",
      value: stats?.productsIncomplete ?? 0,
      hint: "Completează imagini, SEO și informații",
      path: "/admin/products",
      icon: Package,
      tone: "text-amber-300 bg-amber-400/10 border-amber-400/20",
    },
    {
      label: "Sincronizări cu probleme",
      value: stats?.syncFailuresOpen ?? 0,
      hint: "Verifică legăturile cu platformele",
      path: "/admin/integrations",
      icon: AlertTriangle,
      tone: "text-rose-300 bg-rose-400/10 border-rose-400/20",
    },
  ];
  const channels = data?.channels ?? [];
  const totalChannelOrders = channels.reduce((sum, channel) => sum + channel.validOrdersCount, 0);

  return (
    <div className="space-y-5 md:space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-purple-400/20 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,.18),transparent_35%),linear-gradient(135deg,#131d31,#0d1727)] p-5 md:p-7">
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-purple-300">
              <Sparkles className="h-4 w-4" /> Centrul Cutiuței Magice
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              Prezentare generală
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              {greeting()}. Aici vezi ce merită atenție acum și continui rapid fiecare flux al
              magazinului.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <CalendarDays className="h-4 w-4 text-purple-300" /> {formatDate(now)}
            </span>
            <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <Clock3 className="h-4 w-4 text-cyan-300" />
              {now.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </section>

      {isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Datele operaționale nu au putut fi încărcate. Verifică autentificarea și conexiunea D1.
        </div>
      )}

      <section aria-label="Indicatori esențiali" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: "Venituri · 30 zile",
            value: stats ? `${stats.revenue30d.toLocaleString("ro-RO")} lei` : "—",
            note: stats ? `${stats.ordersCount30d} comenzi` : "Se încarcă",
            icon: Wallet,
            color: "from-violet-500 to-fuchsia-600",
          },
          {
            label: "Comenzi deschise",
            value: stats ? String(stats.ordersOpen) : "—",
            note: `${stats?.fulfillmentOpen ?? 0} în livrare`,
            icon: Truck,
            color: "from-blue-500 to-cyan-500",
          },
          {
            label: "Produse publicate",
            value: stats ? String(stats.productsActive) : "—",
            note: `${stats?.productsTotal ?? 0} în catalog`,
            icon: ShoppingBag,
            color: "from-emerald-500 to-teal-500",
          },
          {
            label: "Plăți de verificat",
            value: stats ? String(stats.paymentsFailed) : "—",
            note: stats?.paymentsFailed ? "Necesită atenție" : "Totul este în regulă",
            icon: stats?.paymentsFailed ? AlertTriangle : CheckCircle2,
            color: stats?.paymentsFailed
              ? "from-rose-500 to-orange-500"
              : "from-slate-500 to-slate-600",
          },
        ].map(({ label, value, note, icon: Icon, color }) => (
          <article key={label} className="glass-card rounded-xl p-4 md:p-5">
            <div
              className={`mb-4 grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${color}`}
            >
              <Icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-xl font-bold text-white md:text-2xl">{isLoading ? "…" : value}</p>
            <p className="mt-1 text-xs font-medium text-slate-300">{label}</p>
            <p className="mt-1 text-[11px] text-slate-500">{note}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <section className="glass-card rounded-2xl p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Necesită atenție</h2>
              <p className="mt-1 text-xs text-slate-500">Priorități calculate din datele reale.</p>
            </div>
            <Link
              to="/admin/notifications"
              className="text-xs font-medium text-purple-300 hover:text-purple-200"
            >
              Toate alertele
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {attention.map(({ label, value, hint, path, icon: Icon, tone }) => (
              <Link
                key={label}
                to={path}
                className={`group rounded-xl border p-4 transition hover:-translate-y-0.5 ${tone}`}
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5" />
                  <span className="text-2xl font-bold text-white">{isLoading ? "…" : value}</span>
                </div>
                <p className="mt-4 text-sm font-semibold text-white">{label}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-400">{hint}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold">
                  Deschide <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-2xl p-4 md:p-5">
          <h2 className="text-base font-semibold text-white">Acțiuni rapide</h2>
          <p className="mt-1 text-xs text-slate-500">Continuă un flux fără pași în plus.</p>
          <div className="mt-4 grid gap-2">
            {[
              { label: "Adaugă o comandă", path: "/admin/orders", icon: ShoppingCart },
              { label: "Adaugă un produs", path: "/admin/products", icon: PackageCheck },
              { label: "Deschide Social Media Agent", path: "/admin/ai", icon: Bot },
              { label: "Vezi situația financiară", path: "/admin/financiar", icon: TrendingUp },
            ].map(({ label, path, icon: Icon }) => (
              <Link
                key={label}
                to={path}
                className="group flex items-center justify-between rounded-lg border border-[#2b3950] bg-[#0d1727] px-3 py-2.5 text-xs font-medium text-slate-300 transition hover:border-purple-400/40 hover:text-white"
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-purple-300" /> {label}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-purple-300" />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <section className="glass-card rounded-2xl p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Comenzi recente</h2>
              <p className="mt-1 text-xs text-slate-500">Ultimele intrări din toate canalele.</p>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs font-medium text-purple-300 hover:text-purple-200"
            >
              Vezi toate
            </Link>
          </div>
          <div className="space-y-1.5">
            {(data?.recentOrders ?? []).slice(0, 6).map((order) => (
              <Link
                key={order.id}
                to="/admin/orders"
                className="flex items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2.5 transition hover:border-[#334155] hover:bg-[#0f1929]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">
                      {order.customer}
                    </span>
                    <span className="rounded bg-purple-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-purple-200">
                      {order.platform}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {order.orderNumber} · {order.products}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold text-white">
                    {order.total.toLocaleString("ro-RO")} {order.currency}
                  </p>
                  <p className="text-[10px] text-slate-500">{order.status}</p>
                </div>
              </Link>
            ))}
            {!isLoading && !(data?.recentOrders.length ?? 0) && (
              <div className="py-10 text-center text-sm text-slate-500">
                Nu există încă nicio comandă.
              </div>
            )}
          </div>
        </section>

        <section className="glass-card rounded-2xl p-4 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Canale de vânzare</h2>
              <p className="mt-1 text-xs text-slate-500">Comenzi și stare de conectare.</p>
            </div>
            <Link
              to="/admin/platforms"
              className="text-xs font-medium text-purple-300 hover:text-purple-200"
            >
              Administrează
            </Link>
          </div>
          <div className="space-y-3">
            {channels.slice(0, 7).map((channel) => {
              const share = totalChannelOrders
                ? Math.round((channel.validOrdersCount / totalChannelOrders) * 100)
                : 0;
              return (
                <div key={channel.id}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span
                        className={`h-2 w-2 rounded-full ${channelColors[channel.code] ?? "bg-slate-500"}`}
                      />
                      {channel.name}
                    </span>
                    <span className="text-slate-500">
                      {channel.validOrdersCount} ·{" "}
                      {channel.status === "active" ? "activ" : "de configurat"}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#0d1727]">
                    <div
                      className={`h-full rounded-full ${channelColors[channel.code] ?? "bg-slate-500"}`}
                      style={{ width: `${Math.max(share, channel.validOrdersCount ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
