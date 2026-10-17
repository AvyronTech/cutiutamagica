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
  FileText,
  Mail,
  Package,
  PackageCheck,
  Search,
  ShoppingBag,
  ShoppingCart,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import { getAdminBusinessHub, getAdminDashboard } from "@/lib/admin.functions";

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
  const fetchBusinessHub = useServerFn(getAdminBusinessHub);
  const [now, setNow] = useState(() => new Date());
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => fetchDashboard(),
    staleTime: 30_000,
  });
  const hubQuery = useQuery({
    queryKey: ["admin", "business-hub"],
    queryFn: () => fetchBusinessHub(),
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
  const metric = (area: "shipping" | "billing" | "notifications" | "ai", label: string) =>
    hubQuery.data?.metrics[area].find((item) => item.label === label)?.value;
  const workflow = [
    {
      label: "Comenzi",
      detail: "Confirmare și pregătire",
      path: "/admin/orders",
      value: stats?.ordersOpen,
      icon: ShoppingCart,
    },
    {
      label: "Livrare",
      detail: "Comenzi fără expediere",
      path: "/admin/shipping",
      value: metric("shipping", "Fără livrare"),
      icon: Truck,
    },
    {
      label: "Facturi",
      detail: "Documente de procesat",
      path: "/admin/billing",
      value: metric("billing", "De procesat"),
      icon: FileText,
    },
    {
      label: "E-mail",
      detail: "Livrări eșuate",
      path: "/admin/email",
      value: metric("notifications", "Livrări eșuate"),
      icon: Mail,
    },
    {
      label: "Aprobări",
      detail: "Propuneri în așteptare",
      path: "/admin/ai",
      value: metric("ai", "Aprobări"),
      icon: ShieldCheck,
    },
  ];

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

      <section
        aria-label="Fluxul magazinului"
        className="rounded-2xl border border-white/10 bg-white/[.045] p-4 md:p-5"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">Fluxul magazinului</h2>
            <p className="mt-1 text-xs text-slate-300">
              De la comandă la livrare și confirmarea pe e-mail.
            </p>
          </div>
          <span className="text-[11px] text-slate-400">Indicatori din sistemul intern</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {workflow.map(({ label, detail, path, value, icon: Icon }) => (
            <Link
              key={label}
              to={path}
              className="group flex min-w-0 items-start justify-between gap-2 rounded-xl border border-white/10 bg-[#0e1a2b] p-3 transition hover:border-amber-200/30 hover:bg-[#152238] focus-visible:outline-2 focus-visible:outline-amber-200"
            >
              <div className="min-w-0">
                <Icon className="mb-3 h-4 w-4 text-amber-200" />
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-300">{detail}</p>
              </div>
              <span className="rounded-lg border border-white/10 bg-white/[.06] px-2 py-1 text-sm font-semibold tabular-nums text-white">
                {value ?? "—"}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section
        aria-label="Urmărirea livrărilor"
        className="rounded-2xl border border-cyan-300/15 bg-[#101e2d] p-4 md:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-cyan-200">
              <Truck className="h-4 w-4" />
              <h2 className="text-base font-semibold text-white">Livrări și AWB-uri</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Statusuri salvate din SmartShip pentru expedierile magazinului.
            </p>
          </div>
          <Link
            to="/admin/shipping"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-cyan-300/30 px-3 text-xs font-semibold text-cyan-200"
          >
            Tracking și cont SmartShip <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["AWB emise", data?.shipping.total],
            ["În tranzit", data?.shipping.inTransit],
            ["Livrate", data?.shipping.delivered],
            ["De verificat", data?.shipping.exceptions],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-[#0b1526] p-3">
              <p className="text-xl font-semibold tabular-nums text-white">{value ?? "—"}</p>
              <p className="mt-1 text-[11px] text-slate-400">{label}</p>
            </div>
          ))}
        </div>
        {Boolean(data?.shipping.stale) && (
          <p className="mt-3 text-xs text-amber-200">
            {data?.shipping.stale} AWB-uri active fără verificare de peste 48 de ore.
          </p>
        )}
      </section>

      <section
        aria-label="SEO și indexare"
        className="rounded-2xl border border-white/10 bg-white/[.045] p-4 md:p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-4 w-4 text-amber-200" />
          <h2 className="text-base font-semibold text-white">SEO și indexare</h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-white/10 bg-[#0e1a2b] p-3 text-sm text-white transition hover:border-amber-200/30 focus-visible:outline-2 focus-visible:outline-amber-200"
          >
            Verifică sitemapul public <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
          </a>
          <Link
            to="/admin/products"
            className="rounded-xl border border-white/10 bg-[#0e1a2b] p-3 text-sm text-white transition hover:border-amber-200/30 focus-visible:outline-2 focus-visible:outline-amber-200"
          >
            Completează SEO pentru produse <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
          </Link>
          <a
            href="/admin/ai#search-console"
            className="rounded-xl border border-white/10 bg-[#0e1a2b] p-3 text-sm text-white transition hover:border-amber-200/30 focus-visible:outline-2 focus-visible:outline-amber-200"
          >
            Verifică Search Console <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
          </a>
        </div>
      </section>

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
              {
                label: "Verifică livrările și deconturile SmartShip",
                path: "/admin/shipping",
                icon: Truck,
              },
              {
                label: "Starea tuturor integrărilor",
                path: "/admin/integrations",
                icon: ShieldCheck,
              },
              { label: "Rapoarte și statistici", path: "/admin/statistics", icon: TrendingUp },
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
