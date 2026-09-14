import type { LucideIcon } from "lucide-react";
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
      <header className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10">
          <Icon className="h-5 w-5 text-cyan-300" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white md:text-2xl">{title}</h1>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400 md:text-sm">
            {description}
          </p>
        </div>
      </header>

      {query.isError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Datele nu au putut fi citite din D1. Verifică migrarea și binding-ul de producție.
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`rounded-lg border p-4 ${metric.attention ? "border-amber-400/30 bg-amber-400/8" : "border-[#28364d] bg-[#111c2e]"}`}
          >
            <p className="text-xl font-semibold text-white md:text-2xl">
              {query.isLoading ? "..." : displayMetric(metric.value, metric.unit)}
            </p>
            <p className="mt-1 text-xs text-slate-400">{metric.label}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-lg border border-[#28364d] bg-[#111c2e]">
          <div className="border-b border-[#28364d] px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Sisteme și conectori</h2>
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

        <section className="rounded-lg border border-[#28364d] bg-[#111c2e] p-4">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-cyan-300" />
            <h2 className="text-sm font-semibold text-white">Infrastructură pregătită</h2>
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
