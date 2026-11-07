import { lazy, Suspense, type ReactNode } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, BarChart3, Link2, RefreshCw, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Workspace } from "@/admin/Workspace";
import { getAnalyticsOverview } from "@/lib/analytics.functions";
import { useWorkspaceActive } from "@/admin/workspace-activity";
import { getGrowthSettings, importTrafficMetrics } from "@/lib/growth.functions";
import {
  eventLabels,
  eventRatio,
  formatCount,
  formatDay,
  formatMoney,
  type AnalyticsDays,
  type AnalyticsTab,
} from "@/lib/analytics-report";
import { GROWTH_EVENT_NAMES, type GrowthEventName } from "@/lib/growth-events";
const Settings = lazy(() => import("./GrowthSettings"));
const SalesChart = lazy(() => import("./AnalyticsSalesChart"));
type Report = Awaited<ReturnType<typeof getAnalyticsOverview>>;
const card = "min-w-0 rounded-xl border border-slate-700/80 bg-slate-950/30 p-4 md:p-5";
const action =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 transition hover:border-amber-200/50 focus-visible:outline-2 focus-visible:outline-amber-200 disabled:opacity-50";
function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className={card}>
      <h2 className="text-base font-semibold text-white">{title}</h2>
      {description && <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <article className={card}>
      <p className="text-xs font-medium text-slate-300">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold tabular-nums text-white">{value}</p>
      {note && <p className="mt-1 text-xs leading-5 text-slate-400">{note}</p>}
    </article>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-700 p-4 text-sm leading-6 text-slate-400">
      {children}
    </p>
  );
}
const count = (r: Report, event: GrowthEventName) =>
  r.traffic.events.find((e) => e.event === event)?.count ?? 0;
function MoneyCards({ report }: { report: Report }) {
  return report.commerce.money.length ? (
    <div className="space-y-3">
      {report.commerce.money.map((row) => (
        <div key={row.currency} className="grid gap-3 sm:grid-cols-2">
          <Metric
            label={`Valoarea netă a comenzilor · ${row.currency}`}
            value={formatMoney(row.ordered, row.currency)}
            note="Comenzi neanulate, după rambursări; include transportul."
          />
          <Metric
            label={`Încasări nete · ${row.currency}`}
            value={formatMoney(row.collected, row.currency)}
            note="Sume încasate minus rambursări, pentru comenzile din perioadă."
          />
        </div>
      ))}
    </div>
  ) : (
    <Empty>
      Nu există comenzi în această perioadă. Încasările și valorile se vor afișa separat pentru
      fiecare monedă.
    </Empty>
  );
}
const pipeline = [
  ["openOrders", "Comenzi de procesat", "/admin/orders"],
  ["failedPayments", "Plăți eșuate de verificat", "/admin/orders"],
  ["openReturns", "Retururi în lucru", "/admin/returns"],
  ["syncFailures", "Erori de sincronizare deschise", "/admin/integrations"],
  ["approvals", "Aprobări în așteptare", "/admin/ai"],
  ["socialReview", "Postări de revizuit", "/admin/social?tab=posts"],
  ["failedEvents", "Operații automate cu eroare", "/admin/integrations"],
  ["subscribers", "Abonați activi la newsletter", "/admin/newsletter"],
] as const;
function Overview({ report }: { report: Report }) {
  const s = report.commerce.summary;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Comenzi neanulate" value={formatCount(s.orders)} />
        <Metric label="Clienți cu comenzi" value={formatCount(s.customers)} />
        <Metric
          label="Afișări în magazin"
          value={formatCount(count(report, "page_view"))}
          note="Acțiuni înregistrate, nu vizitatori unici."
        />
        <Metric label="Adăugări în coș" value={formatCount(count(report, "add_to_cart"))} />
      </div>
      <MoneyCards report={report} />
      <Panel
        title="De urmărit acum"
        description="Starea curentă a fluxurilor, indiferent de perioada raportului. Deschide indicatorul pentru următorul pas."
      >
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {pipeline.map(([key, label, href]) => (
            <a
              key={key}
              href={href}
              className="rounded-lg border border-slate-700 p-3 transition hover:border-amber-200/50"
            >
              <span className="text-xl font-semibold tabular-nums text-white">
                {formatCount(Number(report.commerce.operations[key] ?? 0))}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-300">{label} ↗</span>
            </a>
          ))}
        </div>
      </Panel>
      <Panel
        title="Stoc disponibil acum"
        description="Doar produsele cu urmărirea stocului activă. Produsele fără urmărire nu sunt considerate epuizate."
      >
        {Number(report.commerce.inventory.tracked ?? 0) > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["tracked", "Produse urmărite"],
              ["physical", "Bucăți fizice"],
              ["reserved", "Bucăți rezervate"],
              ["safety", "Stoc de siguranță"],
              ["available", "Bucăți disponibile"],
              ["low", "Produse cu stoc redus"],
              ["empty", "Produse epuizate"],
            ].map(([key, label]) => (
              <div key={key}>
                <p className="text-lg font-semibold tabular-nums text-white">
                  {formatCount(Number(report.commerce.inventory[key] ?? 0))}
                </p>
                <p className="text-xs text-slate-400">{label}</p>
              </div>
            ))}
          </div>
        ) : (
          <Empty>
            Urmărirea cantitativă a stocului nu este activă. Disponibilitatea produselor se
            gestionează în Stocuri și aprovizionare.
          </Empty>
        )}
        <a className={`${action} mt-4`} href="/admin/inventory">
          Deschide stocurile și aprovizionarea ↗
        </a>
      </Panel>
    </div>
  );
}
function Sales({ report }: { report: Report }) {
  const c = report.commerce;
  return (
    <div className="space-y-4">
      <MoneyCards report={report} />
      <Panel
        title="Evoluția comenzilor"
        description="Valoarea netă a comenzilor neanulate, grupată după data comenzii. Monedele rămân separate."
      >
        {c.daily.length ? (
          c.money
            .filter((m) => m.orders > 0)
            .map((m) => {
              const rows = [];
              for (
                let day = new Date(`${c.period.startDay}T12:00:00Z`);
                day.toISOString().slice(0, 10) <= c.period.endDay;
                day.setUTCDate(day.getUTCDate() + 1)
              ) {
                const key = day.toISOString().slice(0, 10);
                rows.push({
                  label: formatDay(key).replace(/\s\d{4}$/, ""),
                  value:
                    c.daily.find((r) => r.day === key && r.currency === m.currency)?.ordered ?? 0,
                });
              }
              return (
                <div key={m.currency}>
                  <h3 className="mt-3 text-sm text-amber-100">{m.currency}</h3>
                  <Suspense fallback={<p role="status">Se încarcă graficul…</p>}>
                    <SalesChart rows={rows} currency={m.currency} />
                  </Suspense>
                </div>
              );
            })
        ) : (
          <Empty>Graficul apare după primele comenzi din perioada aleasă.</Empty>
        )}
      </Panel>
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Canale de vânzare"
          description="Comenzile și valoarea lor netă, pe canal și monedă."
        >
          {c.channels.length ? (
            <ul className="space-y-3">
              {c.channels.map((r) => (
                <li
                  key={`${r.id}:${r.currency}`}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 pb-3"
                >
                  <span className="text-sm text-slate-200">
                    {r.name}
                    <small className="block text-xs text-slate-400">
                      {formatCount(r.orders)} {r.orders === 1 ? "comandă" : "comenzi"}
                    </small>
                  </span>
                  <strong className="text-sm text-white">
                    {formatMoney(r.ordered, r.currency)}
                  </strong>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nu există comenzi de repartizat pe canale.</Empty>
          )}
        </Panel>
        <Panel
          title="Produsele cele mai comandate"
          description="Cantități și valoarea liniilor de comandă; transportul și rambursările generale nu sunt repartizate produselor."
        >
          {c.products.length ? (
            <ol className="space-y-3">
              {c.products.map((r, i) => (
                <li
                  key={`${r.id}:${r.currency}`}
                  className="flex items-start justify-between gap-3 border-b border-slate-700 pb-3"
                >
                  <span className="min-w-0 text-sm text-slate-200">
                    {i + 1}. {r.name}
                    <small className="block text-xs text-slate-400">
                      {formatCount(r.units)} {r.units === 1 ? "bucată" : "bucăți"}
                    </small>
                  </span>
                  <strong className="shrink-0 text-sm text-white">
                    {formatMoney(r.value, r.currency)}
                  </strong>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>Topul se calculează după primele produse comandate.</Empty>
          )}
        </Panel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Anulări și retururi">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <strong className="text-xl text-white">{formatCount(c.summary.cancelled)}</strong>
              <p className="text-sm text-slate-400">Comenzi anulate</p>
            </div>
            <div>
              <strong className="text-xl text-white">{formatCount(c.summary.returned)}</strong>
              <p className="text-sm text-slate-400">Comenzi marcate returnate</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            Starea actuală a comenzilor plasate în perioada selectată. Cererile de retur în curs
            sunt în Sinteză.
          </p>
        </Panel>
        <Panel title="Livrarea comenzilor">
          {c.delivery.length ? (
            <ul className="space-y-2">
              {c.delivery.map((r) => (
                <li key={r.name} className="flex justify-between gap-3 text-sm">
                  <span className="text-slate-300">{r.name}</span>
                  <strong className="text-white">{formatCount(r.orders)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nu există comenzi cu o livrare de raportat.</Empty>
          )}
        </Panel>
      </div>
      <details className={card}>
        <summary className="cursor-pointer text-sm font-semibold text-white">
          Reduceri, rambursări și transport
        </summary>
        <div className="mt-3 space-y-3">
          {c.money.map((r) => (
            <p key={r.currency} className="text-sm leading-6 text-slate-300">
              {r.currency} · Reduceri {formatMoney(r.discounts, r.currency)} · Rambursări{" "}
              {formatMoney(r.refunded, r.currency)} · Transport comandat{" "}
              {formatMoney(r.shipping, r.currency)}
            </p>
          ))}
          <p className="text-xs leading-5 text-slate-400">
            Comenzile provizorii cu card neplătit și ciornele sunt excluse. Valoarea comenzilor și
            încasările nu reprezintă profit. Costurile incomplete nu sunt estimate.
          </p>
        </div>
      </details>
    </div>
  );
}
function Traffic({ report }: { report: Report }) {
  const steps = ["page_view", "product_view", "add_to_cart", "checkout_start", "purchase"] as const;
  return (
    <div className="space-y-4">
      <Panel
        title="Drumul către comandă"
        description="Acțiuni înregistrate în magazin în perioada aleasă. Pot include reveniri, administratori și teste; nu reprezintă persoane unice sau o rată de conversie pe vizitatori."
      >
        <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {steps.map((event, i) => (
            <li key={event} className="rounded-lg border border-slate-700 p-3">
              <p className="text-xs text-amber-100">
                {i + 1}.{" "}
                {event === "purchase" ? "Comenzi înregistrate pe site" : eventLabels[event]}
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {formatCount(
                  event === "purchase"
                    ? report.commerce.summary.websiteOrders
                    : count(report, event),
                )}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs leading-5 text-slate-400">
          Ultimul pas folosește comenzile înregistrate pe site, nu evenimentele trimise de browser.
          Poate diferi de totalul comercial: alte canale, perioade de confirmare sau urmărire
          incompletă. Nu calculăm abandonul din simpla diferență a acestor numere.
        </p>
      </Panel>
      <GoogleResults report={report} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Interes pentru produse și cadouri">
          <dl className="space-y-3">
            {GROWTH_EVENT_NAMES.filter((e) => !steps.includes(e as (typeof steps)[number])).map(
              (event) => (
                <div
                  key={event}
                  className="flex justify-between gap-4 border-b border-slate-700/60 pb-2 text-sm"
                >
                  <dt className="text-slate-300">{eventLabels[event]}</dt>
                  <dd className="font-semibold tabular-nums text-white">
                    {formatCount(count(report, event))}
                  </dd>
                </div>
              ),
            )}
          </dl>
        </Panel>
        <Panel
          title="Pagini cu activitate"
          description="Primele 10 pagini după afișările înregistrate în magazin."
        >
          {report.traffic.pages.length ? (
            <ol className="space-y-3">
              {report.traffic.pages.map((p) => (
                <li key={p.path} className="flex items-start justify-between gap-3">
                  <span className="min-w-0 break-words text-sm text-slate-300">{p.path}</span>
                  <strong className="text-sm text-white">{formatCount(p.views)}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>Încă nu există afișări înregistrate în această perioadă.</Empty>
          )}
        </Panel>
      </div>
    </div>
  );
}
function GoogleResults({ report }: { report: Report }) {
  return (
    <Panel
      title="Vizibilitate în Google"
      description="Search Console măsoară căutările, iar Google Analytics măsoară sesiunile urmărite. Importurile au întârziere și nu se adună cu evenimentele magazinului."
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {(["gsc", "ga4"] as const).map((source) => {
          const rows = report.traffic.imported.filter((r) => r.source === source);
          const get = (metric: string) => rows.find((r) => r.metric === metric);
          const clicks = get("clicks"),
            impressions = get("impressions");
          const ctr =
            clicks &&
            impressions &&
            clicks.first_day === impressions.first_day &&
            clicks.last_day === impressions.last_day
              ? eventRatio(clicks.value, impressions.value)
              : null;
          return (
            <article key={source} className="min-w-0 rounded-lg border border-slate-700 p-4">
              <h3 className="text-sm font-semibold text-white">
                {source === "gsc" ? "Google Search Console" : "Google Analytics 4"}
              </h3>
              <p className="mt-1 break-all text-xs text-slate-400">
                {report.properties[source] || "Proprietate neconfigurată"}
              </p>
              {rows.length ? (
                <>
                  <dl className="mt-4 grid grid-cols-2 gap-3">
                    {rows.map((r) => (
                      <div key={r.metric}>
                        <dt className="text-xs text-slate-300">
                          {(
                            {
                              clicks: "Clicuri",
                              impressions: "Afișări în căutare",
                              sessions: "Sesiuni",
                              page_views: "Afișări de pagină",
                            } as Record<string, string>
                          )[r.metric] ?? "Indicator importat"}
                        </dt>
                        <dd className="mt-1 text-xl text-white">{formatCount(r.value)}</dd>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {formatDay(r.first_day)} – {formatDay(r.last_day)}
                        </p>
                      </div>
                    ))}
                  </dl>
                  {ctr !== null && (
                    <p className="mt-3 text-sm text-slate-300">
                      Rata de clic în căutare:{" "}
                      {ctr.toLocaleString("ro-RO", { maximumFractionDigits: 2 })}%
                    </p>
                  )}
                  <p className="mt-3 text-xs text-slate-400">
                    Ultimul import:{" "}
                    {new Date(
                      rows
                        .map((r) => r.updated_at)
                        .sort()
                        .at(-1)!,
                    ).toLocaleString("ro-RO")}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Niciun import disponibil pentru proprietatea și perioada selectate. Lipsa datelor
                  nu înseamnă zero trafic.
                </p>
              )}
              <a
                className={`${action} mt-4`}
                href={`/admin/statistics?tab=sources&days=${report.days}`}
              >
                {rows.length ? "Gestionează sursa" : "Configurează sau importă datele"} ↗
              </a>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}
function Sources({ report }: { report?: Report }) {
  const client = useQueryClient();
  const active = useWorkspaceActive();
  const loadSettings = useServerFn(getGrowthSettings);
  const settings = useQuery({
    queryKey: ["admin", "growth"],
    queryFn: () => loadSettings(),
    staleTime: 30000,
    enabled: active,
  });
  const googleReady = Boolean(
    settings.data?.credentials.find((c) => c.provider === "google")?.configured,
  );
  const sync = useServerFn(importTrafficMetrics);
  const mutation = useMutation({
    mutationFn: sync,
    onSuccess: async () => {
      await Promise.all([client.invalidateQueries({ queryKey: ["admin", "traffic"] })]);
      toast.success("Importul a fost finalizat. Rapoartele au fost actualizate.");
    },
    onError: () =>
      toast.error("Importul nu a reușit. Verifică accesul Google și proprietatea salvată."),
  });
  return (
    <div className="space-y-4">
      <Panel
        title="Actualizează datele din Google"
        description="Importă după salvarea proprietății și a accesului Google. O sesiune deschisă în browser nu conectează automat rapoartele."
      >
        <div className="flex flex-wrap gap-3">
          {(["gsc", "ga4"] as const).map((source) => (
            <button
              key={source}
              type="button"
              disabled={mutation.isPending || !report?.properties[source] || !googleReady}
              className={action}
              onClick={() => mutation.mutate({ data: { source } })}
            >
              <RefreshCw size={15} />
              {mutation.isPending && mutation.variables?.data.source === source
                ? "Se importă…"
                : `Importă din ${source === "gsc" ? "Search Console" : "Google Analytics"}`}
            </button>
          ))}
        </div>
        {!googleReady && (
          <p className="mt-3 text-sm text-amber-200">
            Importul necesită o proprietate salvată și acces Google configurat mai jos.
          </p>
        )}
        {mutation.isError && (
          <p role="alert" className="mt-3 text-sm text-rose-200">
            Importul nu a reușit. Datele ultimului import reușit sunt păstrate. Verifică
            proprietatea și tokenul Google cu acces de citire.
          </p>
        )}
        <p className="mt-3 text-xs leading-5 text-slate-400">
          Importul disponibil preia datele recente, până acum trei zile. Pentru 90 de zile sunt
          necesare importuri istorice; intervalul efectiv este afișat lângă fiecare indicator.
        </p>
      </Panel>
      <Settings section="traffic" embedded />
      <Panel title="Alte surse și rapoarte">
        <div className="flex flex-wrap gap-2">
          <a className={action} href="/admin/social">
            Rezultate sociale ↗
          </a>
          <a className={action} href="/admin/seo">
            Audit SEO ↗
          </a>
          <a className={action} href="/admin/email">
            E-mail și rapoarte ↗
          </a>
          <a className={action} href={`/admin/financiar?days=${report?.days ?? 30}`}>
            Financiar ↗
          </a>
        </div>
      </Panel>
    </div>
  );
}
export default function Statistics({
  search,
  onChange,
}: {
  search: { tab: AnalyticsTab; days: AnalyticsDays };
  onChange: (search: { tab: AnalyticsTab; days: AnalyticsDays }) => void;
}) {
  const load = useServerFn(getAnalyticsOverview);
  const query = useQuery({
    queryKey: ["admin", "analytics", search.days],
    queryFn: () => load({ data: { days: search.days } }),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
  const r = query.data;
  const content = (children: ReactNode) =>
    query.isPending ? (
      <p role="status" className={card}>
        Se încarcă raportul…
      </p>
    ) : r ? (
      children
    ) : (
      <div role="alert" className={card}>
        <p>Raportul nu a putut fi încărcat.</p>
        <button type="button" className={`${action} mt-3`} onClick={() => query.refetch()}>
          Reîncearcă
        </button>
      </div>
    );
  return (
    <Workspace
      compactTabs
      title="Statistici și trafic"
      description="Vizibilitate, comenzi și încasări, într-un singur loc."
      active={search.tab}
      onSelect={(tab) => onChange({ ...search, tab: tab as AnalyticsTab })}
      toolbar={
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <label className="text-xs text-slate-300">
              Perioada raportului
              <select
                className="mt-1 block min-h-10 rounded-lg border border-slate-600 bg-slate-900 px-3 text-sm text-white"
                value={search.days}
                onChange={(e) =>
                  onChange({ ...search, days: Number(e.target.value) as AnalyticsDays })
                }
              >
                {[7, 30, 90].map((d) => (
                  <option key={d} value={d}>
                    Ultimele {d} {d === 7 ? "" : "de "}zile
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs text-slate-400">
                {r
                  ? `${formatDay(r.traffic.startDay)} – ${formatDay(r.traffic.endDay)} · UTC`
                  : "Perioadă comună pentru vânzări și trafic"}
              </p>
              <button
                type="button"
                className={action}
                disabled={query.isFetching}
                onClick={() => query.refetch()}
              >
                <RefreshCw size={15} className={query.isFetching ? "animate-spin" : ""} />
                {query.isFetching ? "Se actualizează…" : "Actualizează raportul"}
              </button>
            </div>
          </div>
          {r && (
            <p role="status" className="text-xs text-slate-400">
              Actualizat: {new Date(r.generatedAt).toLocaleString("ro-RO")}.
            </p>
          )}
          {query.isError && r && (
            <p role="alert" className="text-sm text-amber-200">
              Actualizarea nu a reușit. Afișăm ultimul raport încărcat; poți reîncerca.
            </p>
          )}
        </div>
      }
      tabs={[
        {
          id: "overview",
          label: "Sinteză",
          description: "Indicatori esențiali · următorii pași",
          icon: BarChart3,
          content: content(r && <Overview report={r} />),
        },
        {
          id: "sales",
          label: "Vânzări și produse",
          description: "Comenzi · încasări · livrări",
          icon: ShoppingBag,
          content: content(r && <Sales report={r} />),
        },
        {
          id: "traffic",
          label: "Trafic și conversii",
          description: "Google · interes · comenzi",
          icon: Activity,
          content: content(r && <Traffic report={r} />),
        },
        {
          id: "sources",
          label: "Surse și conexiuni",
          description: "Configurare · importuri · rapoarte",
          icon: Link2,
          content: <Sources report={r} />,
        },
      ]}
    />
  );
}
