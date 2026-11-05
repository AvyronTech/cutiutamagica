import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Database,
  LockKeyhole,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminBusinessHub } from "@/lib/admin.functions";
import type { BusinessArea } from "@/lib/business-hub-contracts";

interface OperationsPageProps {
  area: BusinessArea;
  title: string;
  description: string;
  icon: LucideIcon;
  capabilities: string[];
  activationNote: string;
}

const statusLabels: Record<string, string> = {
  active: "Activ",
  degraded: "Necesită atenție",
  disabled: "Dezactivat",
  setup_required: "Configurare necesară",
  paused: "În pauză",
};

const nextSteps: Partial<Record<BusinessArea, { label: string; path: string }>> = {
  ai: { label: "Vezi aprobările", path: "/admin/marketing" },
  billing: { label: "Verifică plățile", path: "/admin/financiar" },
  shipping: { label: "Deschide comenzile", path: "/admin/orders" },
  inventory: { label: "Deschide produsele", path: "/admin/products" },
  posts: { label: "Deschide marketingul", path: "/admin/marketing" },
  customers: { label: "Vezi conversațiile", path: "/admin/chat" },
};

function displayMetric(value: number, unit?: string): string {
  if (unit === "bani") {
    return (value / 100).toLocaleString("ro-RO", {
      style: "currency",
      currency: "RON",
      maximumFractionDigits: 2,
    });
  }
  return value.toLocaleString("ro-RO");
}

export default function OperationsPage({
  area,
  title,
  description,
  icon: Icon,
  capabilities,
  activationNote,
}: OperationsPageProps) {
  const loadHub = useServerFn(getAdminBusinessHub);
  const query = useQuery({
    queryKey: ["admin", "business-hub"],
    queryFn: () => loadHub(),
    staleTime: 30_000,
  });
  const metrics = query.data?.metrics[area] ?? [];
  const systems = query.data?.systems.filter((system) => system.area === area) ?? [];

  return (
    <div className="space-y-5 md:space-y-6">
      <header className="flex flex-col gap-4 rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_95%_5%,rgba(208,170,112,.15),transparent_35%),linear-gradient(135deg,#17233a,#111c2e)] p-5 shadow-[0_20px_60px_rgba(0,0,0,.15)] sm:flex-row sm:items-center sm:justify-between md:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-200/25 bg-amber-200/10">
            <Icon className="h-5 w-5 text-amber-200" />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[.18em] text-amber-200/75">
              Centru operațional
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-white md:text-[1.75rem]">
              {title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{description}</p>
          </div>
        </div>
        {nextSteps[area] && (
          <Link
            to={nextSteps[area].path}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-amber-200/25 bg-amber-100/10 px-4 py-2.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-100/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
          >
            {nextSteps[area].label}
          </Link>
        )}
      </header>

      {query.isError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Datele nu au putut fi citite din D1. Verifică migrarea și binding-ul de producție.
        </div>
      )}

      <section aria-label="Indicatori" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`min-w-0 rounded-2xl border p-4 md:p-5 ${metric.attention ? "border-amber-300/35 bg-amber-300/10" : "border-white/10 bg-white/[.045]"}`}
          >
            <p className="break-words text-xl font-semibold tabular-nums text-white md:text-2xl">
              {query.isLoading ? "..." : displayMetric(metric.value, metric.unit)}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-300">{metric.label}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.045]">
          <div className="border-b border-[#28364d] px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Stare și conexiuni</h2>
          </div>
          <div className="divide-y divide-[#28364d]">
            {systems.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Nu există încă un conector activ pentru această secțiune.
              </div>
            ) : (
              systems.map((system) => {
                const ready = system.status === "active" || system.status === "connected";
                return (
                  <div key={system.id} className="flex items-center gap-3 px-4 py-3">
                    {ready ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <CircleDashed className="h-4 w-4 shrink-0 text-amber-400" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-100">{system.label}</p>
                      <p className="truncate text-xs text-slate-500">
                        {system.provider} · {system.detail}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-medium ${ready ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}
                    >
                      {statusLabels[system.status] ?? system.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[.045] p-5">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-300" />
            <h2 className="text-sm font-semibold text-white">Ce poți face aici</h2>
          </div>
          <div className="mt-4 space-y-3">
            {capabilities.map((capability) => (
              <div
                key={capability}
                className="flex items-start gap-2 text-xs leading-5 text-slate-300"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                {capability}
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/8 p-3">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p className="text-[11px] leading-5 text-amber-100/75">{activationNote}</p>
          </div>
        </section>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-slate-600">
        <Clock3 className="h-3 w-3" />
        Date operaționale generate{" "}
        {query.data?.generatedAt
          ? new Date(query.data.generatedAt).toLocaleString("ro-RO")
          : "la încărcare"}
        .
      </p>
    </div>
  );
}
