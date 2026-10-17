import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Cloud,
  Database,
  Fingerprint,
  Globe2,
  Link2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";

type AgentState = {
  build: {
    version: string;
    hash: string;
    byteSize: number;
    includedPaths: string[];
    controlPlane: string;
  };
  agent: { name: string; status: string; approval_policy: string } | null;
  relatedAgents: Array<{
    code: string;
    name: string;
    purpose: string;
    approval_policy: string;
    status: string;
    updated_at: string;
  }>;
  settings: {
    enabled: boolean;
    mode: "draft_approval" | "paused";
    controlPlane: string;
    publication: { requiresApproval: boolean; requiresVerifiedConnector: boolean };
    contentPlaybook: {
      version: string;
      feedDaily: boolean;
      storyDaily: boolean;
      storyFramesMin: number;
      storyFramesMax: number;
      reelEveryDays: number;
      tiktokEveryDays: number;
      requireSpecificProductLink: boolean;
      requireNativeVariants: boolean;
      requireOriginalProductLayer: boolean;
      requireNativePreview: boolean;
      requireCapabilitySnapshot: boolean;
      noveltyWindowPosts: number;
      measurementWindowsHours: number[];
    };
    freeResources: {
      metricoolPublishedPostsPerMonth: number;
      metricoolAnalyticsHistoryDays: number;
      workersAiNeuronsPerDay: number;
      workersAiPaidOverageAllowed: boolean;
    };
    marketplaces: {
      syncOrder: string[];
      emag: { mode: string; version: string; status: string };
      trendyol: { mode: string; productVersion: string; orderVersion: string; status: string };
      okazii: { mode: string; status: string };
      vinted: { mode: string; status: string };
    };
    workersAi: {
      enabled: boolean;
      role: string;
      binding: string;
      personalDataAllowed: boolean;
      autoPublish: boolean;
    };
    connectorContract: {
      metricoolBrandId: string;
      ownerEmail: string;
      website: string;
      facebookPageId: string;
      instagramHandle: string;
      tiktokHandle: string;
      gscProperty: string;
      timezone: string;
    };
    monitoring: {
      enabled: boolean;
      intervalMinutes: number;
      staleAfterHours: number;
    };
    avyron: {
      enabled: boolean;
      control: string;
      shareAggregatedStats: boolean;
      shareSkillPackage: boolean;
      acceptDataProposals: boolean;
      acceptSkillProposals: boolean;
      allowPersonalData: boolean;
      allowOrders: boolean;
      allowPublishing: boolean;
    };
  };
  settingsVersion: number;
  socialAccounts: Array<{
    id: string;
    provider: string;
    account_type: string;
    label: string;
    status: string;
  }>;
  flowStats: {
    social: Record<string, number | null>;
    approvals: Record<string, number | null>;
    agentRuns: Record<string, number | null>;
    catalog: Record<string, number | null>;
    orders: Record<string, number | null>;
  };
  monitoring: {
    expected: AgentState["settings"]["connectorContract"];
    accountConnections: Array<{
      provider: string;
      label: string;
      auth_method: string;
      status: string;
      last_verified_at: string | null;
      updated_at: string;
    }>;
    gsc: {
      credential: { checked_at: string | null; check_status: string } | null;
      latestImport: {
        property_id: string;
        last_imported_at: string;
        latest_day: string;
        clicks: number;
        impressions: number;
      } | null;
    };
  };
  avyronTarget: { status: string; auth_mode: string; last_error_message?: string | null } | null;
  exchanges: Array<{
    id: string;
    direction: string;
    exchange_type: string;
    status: string;
    payload_hash: string;
    created_at: string;
    last_error?: string | null;
    reviewPayload?: unknown;
  }>;
};

type EditableSettings = {
  enabled: boolean;
  mode: "draft_approval" | "paused";
  monitoring: AgentState["settings"]["monitoring"];
  avyron: {
    enabled: boolean;
    shareAggregatedStats: boolean;
    shareSkillPackage: boolean;
    acceptDataProposals: boolean;
    acceptSkillProposals: boolean;
  };
};

const statusLabels: Record<string, string> = {
  active: "Activ",
  setup_required: "Necesită conectare",
  disabled: "Dezactivat",
  paused: "În pauză",
  pending_approval: "În aprobare",
  approved: "Aprobat, neexpediat",
  queued: "În coadă",
  processing: "În curs",
  sent: "Trimis",
  received: "Primit",
  rejected: "Respins",
  failed: "Eșuat",
  expired: "Expirat",
  revoked: "Revocat",
  degraded: "Degradat",
  verified: "Verificat",
  unverified: "Neverificat",
};

function count(value: number | null | undefined): number {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function formatMoment(value: string | null | undefined): string {
  return value
    ? new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )
    : "fără verificare";
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init.headers } : init?.headers,
  });
  const body = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: { message?: string; code?: string };
  };
  if (!response.ok)
    throw new Error(body.error?.message || body.error?.code || "Operație nereușită.");
  return body.data as T;
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#28364d] bg-[#0d1727] p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-cyan-400"
      />
      <span>
        <span className="block text-sm font-medium text-slate-100">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
    </label>
  );
}

export default function MarketingOrdersAgentControl() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", "marketing-orders-agent"],
    queryFn: () => api<AgentState>("/api/v1/admin/marketing-agent"),
    staleTime: 20_000,
    refetchInterval: 60_000,
  });
  const [form, setForm] = useState<EditableSettings | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!query.data) return;
    setForm({
      enabled: query.data.settings.enabled,
      mode: query.data.settings.mode,
      monitoring: query.data.settings.monitoring,
      avyron: {
        enabled: query.data.settings.avyron.enabled,
        shareAggregatedStats: query.data.settings.avyron.shareAggregatedStats,
        shareSkillPackage: query.data.settings.avyron.shareSkillPackage,
        acceptDataProposals: query.data.settings.avyron.acceptDataProposals,
        acceptSkillProposals: query.data.settings.avyron.acceptSkillProposals,
      },
    });
  }, [query.data]);

  const save = useMutation({
    mutationFn: (value: EditableSettings) =>
      api<{ settingsVersion: number }>("/api/v1/admin/marketing-agent", {
        method: "PATCH",
        body: JSON.stringify({ ...value, expectedVersion: query.data?.settingsVersion }),
      }),
    onSuccess: async () => {
      setNotice("Politica agentului a fost salvată și jurnalizată.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "marketing-orders-agent"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "business-hub"] });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "Salvarea a eșuat."),
  });

  const propose = useMutation({
    mutationFn: (type: "stats_snapshot" | "skill_package") =>
      api<{ exchangeId: string }>("/api/v1/admin/marketing-agent/exports", {
        method: "POST",
        body: JSON.stringify({ type, idempotencyKey: crypto.randomUUID() }),
      }),
    onSuccess: async () => {
      setNotice("Pachetul a fost creat ca propunere. Nu a fost trimis către AVYRON.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "marketing-orders-agent"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "business-hub"] });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "Propunerea a eșuat."),
  });

  const decide = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approved" | "rejected" }) =>
      api<{ status: string }>(`/api/v1/admin/marketing-agent/exchanges/${id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision }),
      }),
    onSuccess: async (result) => {
      setNotice(
        result.status === "queued"
          ? "Schimbul aprobat a intrat în coada securizată AVYRON."
          : "Decizia a fost salvată; nu s-a executat nicio publicare socială.",
      );
      await queryClient.invalidateQueries({ queryKey: ["admin", "marketing-orders-agent"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "business-hub"] });
    },
    onError: (error) => setNotice(error instanceof Error ? error.message : "Decizia a eșuat."),
  });

  const dispatch = useMutation({
    mutationFn: (id: string) =>
      api<{ status: string }>(`/api/v1/admin/marketing-agent/exchanges/${id}/dispatch`, {
        method: "POST",
      }),
    onSuccess: async () => {
      setNotice("Schimbul aprobat a intrat în coada securizată AVYRON.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "marketing-orders-agent"] });
    },
    onError: (error) =>
      setNotice(error instanceof Error ? error.message : "Expedierea nu este disponibilă."),
  });

  if (query.isLoading || !form) {
    return <p className="text-sm text-slate-400">Se încarcă centrul de control al agentului…</p>;
  }
  if (query.isError || !query.data) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
        Centrul de control este disponibil numai proprietarilor după migrarea D1 0034.
      </div>
    );
  }

  const data = query.data;
  const activeSocial = data.socialAccounts.filter((account) => account.status === "active").length;
  const flow = [
    {
      label: "Catalog comandabil",
      value: count(data.flowStats.catalog.active),
      detail: "produse active",
      icon: Database,
    },
    {
      label: "Rulări agent",
      value: count(data.flowStats.agentRuns.completed),
      detail: `${count(data.flowStats.agentRuns.failed)} eșuate`,
      icon: Bot,
    },
    {
      label: "Aprobări",
      value: count(data.flowStats.approvals.pending),
      detail: "în așteptare",
      icon: ShieldCheck,
    },
    {
      label: "Conținut publicat",
      value: count(data.flowStats.social.published),
      detail: `${count(data.flowStats.social.planned)} planificate`,
      icon: Globe2,
    },
    {
      label: "Comenzi deschise",
      value: count(data.flowStats.orders.open),
      detail: `${count(data.flowStats.orders.total)} total`,
      icon: ShoppingCart,
    },
  ];

  return (
    <section className="space-y-4 rounded-xl border border-cyan-400/20 bg-[#0b1524] p-4 shadow-[0_20px_80px_rgba(0,0,0,.22)] md:p-5">
      <div className="flex flex-col gap-3 border-b border-[#28364d] pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-cyan-300">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="text-base font-semibold text-white">
              Marketing + Marketplace Agent · control Codex
            </h2>
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            Agentul pregătește în Codex ciorne și propuneri. Cutiuța Magică rămâne autoritatea, iar
            AVYRON poate primi numai statistici agregate și pachete aprobate.
          </p>
        </div>
        <span className="w-fit rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
          {statusLabels[data.agent?.status ?? "setup_required"]}
        </span>
      </div>

      {notice && (
        <div className="flex items-start gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/8 p-3 text-xs text-cyan-100">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-[#28364d] bg-[#111c2e] p-4">
          <Cloud className="h-4 w-4 text-cyan-300" />
          <p className="mt-3 text-sm font-medium text-white">Inclus în buildul Cloudflare</p>
          <p className="mt-1 text-xs text-slate-500">Versiunea {data.build.version}</p>
          <p className="text-xs text-slate-500">
            {data.build.includedPaths.length} documente guvernate
          </p>
        </div>
        <div className="rounded-lg border border-[#28364d] bg-[#111c2e] p-4">
          <Fingerprint className="h-4 w-4 text-violet-300" />
          <p className="mt-3 text-sm font-medium text-white">Amprentă verificabilă</p>
          <p className="mt-1 break-all font-mono text-[10px] leading-4 text-slate-500">
            {data.build.hash}
          </p>
        </div>
        <div className="rounded-lg border border-[#28364d] bg-[#111c2e] p-4">
          <Activity className="h-4 w-4 text-emerald-300" />
          <p className="mt-3 text-sm font-medium text-white">Conectori sociali</p>
          <p className="mt-1 text-xs text-slate-500">
            {activeSocial}/{data.socialAccounts.length} activi · accesul live nu este încă acordat
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[#28364d] bg-[#0d1727] p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Flux operațional monitorizat</h3>
            <p className="mt-1 text-[11px] text-slate-500">
              Catalog → agent → aprobare → publicare confirmată → comandă. Configurarea singură nu
              este tratată drept conexiune activă.
            </p>
          </div>
          <span className="text-[10px] text-cyan-300">
            verificare la {form.monitoring.intervalMinutes} min · prag{" "}
            {form.monitoring.staleAfterHours} h
          </span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {flow.map((step) => (
            <article
              key={step.label}
              className="rounded-lg border border-[#28364d] bg-[#111c2e] p-3"
            >
              <step.icon className="h-4 w-4 text-cyan-300" />
              <p className="mt-3 text-xl font-semibold text-white">{step.value}</p>
              <p className="text-xs font-medium text-slate-200">{step.label}</p>
              <p className="mt-0.5 text-[10px] text-slate-500">{step.detail}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-[#28364d] bg-[#111c2e] p-4">
          <h3 className="text-sm font-semibold text-white">Politica operațională</h3>
          <Toggle
            checked={form.enabled}
            onChange={(enabled) =>
              setForm({ ...form, enabled, mode: enabled ? form.mode : "paused" })
            }
            label="Agent disponibil pentru ciorne și răspunsuri propuse"
            description="Activarea nu permite publicare, unfollow, mesaje sau comenzi fără regulile de aprobare."
          />
          <Toggle
            checked={form.monitoring.enabled}
            onChange={(enabled) =>
              setForm({ ...form, monitoring: { ...form.monitoring, enabled } })
            }
            label="Monitorizare automată a fluxului"
            description="Semnalează conexiuni neverificate și date expirate; nu publică și nu trimite date extern."
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-400">
              Interval monitorizare (minute)
              <input
                type="number"
                min={15}
                max={1440}
                value={form.monitoring.intervalMinutes}
                disabled={!form.monitoring.enabled}
                onChange={(event) =>
                  setForm({
                    ...form,
                    monitoring: {
                      ...form.monitoring,
                      intervalMinutes: Number(event.target.value),
                    },
                  })
                }
                className="mt-1.5 w-full rounded-lg border border-[#33445f] bg-[#0d1727] px-3 py-2 text-sm text-white disabled:opacity-50"
              />
            </label>
            <label className="text-xs text-slate-400">
              Alertă după (ore)
              <input
                type="number"
                min={1}
                max={168}
                value={form.monitoring.staleAfterHours}
                disabled={!form.monitoring.enabled}
                onChange={(event) =>
                  setForm({
                    ...form,
                    monitoring: {
                      ...form.monitoring,
                      staleAfterHours: Number(event.target.value),
                    },
                  })
                }
                className="mt-1.5 w-full rounded-lg border border-[#33445f] bg-[#0d1727] px-3 py-2 text-sm text-white disabled:opacity-50"
              />
            </label>
          </div>
          <label className="block text-xs text-slate-400">
            Mod de lucru
            <select
              value={form.mode}
              disabled={!form.enabled}
              onChange={(event) =>
                setForm({ ...form, mode: event.target.value as EditableSettings["mode"] })
              }
              className="mt-1.5 w-full rounded-lg border border-[#33445f] bg-[#0d1727] px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
            >
              <option value="draft_approval">Ciorne + aprobare umană</option>
              <option value="paused">Pauză operațională</option>
            </select>
          </label>
          <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/8 p-3">
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <p className="text-[11px] leading-5 text-amber-100/75">
              Aprobarea și conectorul verificat rămân obligatorii chiar când agentul este activ.
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-[#28364d] bg-[#111c2e] p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-white">Schimb controlat cu AVYRON OS</h3>
            <span className="text-[10px] text-slate-500">
              {statusLabels[data.avyronTarget?.status ?? "disabled"]}
            </span>
          </div>
          <Toggle
            checked={form.avyron.enabled}
            onChange={(enabled) => setForm({ ...form, avyron: { ...form.avyron, enabled } })}
            label="Permite canalul AVYRON"
            description="Canal asincron HMAC; nu acordă control operațional."
          />
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["shareAggregatedStats", "Statistici agregate"],
                ["shareSkillPackage", "Pachet skill"],
                ["acceptDataProposals", "Propuneri de date"],
                ["acceptSkillProposals", "Propuneri de skill"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={form.avyron[key]}
                  disabled={!form.avyron.enabled}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      avyron: { ...form.avyron, [key]: event.target.checked },
                    })
                  }
                  className="h-4 w-4 accent-cyan-400"
                />
                {label}
              </label>
            ))}
          </div>
          <p className="text-[11px] leading-5 text-slate-500">
            Date personale, comenzi, conversații și drepturi de publicare: blocate structural.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[#28364d] bg-[#111c2e] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Playbook de conținut și conversie</h3>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              Reguli incluse în build, aplicate tuturor ciornelor create de agent.
            </p>
          </div>
          <span className="w-fit rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 font-mono text-[10px] text-violet-200">
            v{data.settings.contentPlaybook.version}
          </span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border border-[#28364d] bg-[#0d1727] p-3">
            <p className="text-xs font-medium text-slate-200">Feed + Story zilnic</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">
              Story în {data.settings.contentPlaybook.storyFramesMin}–
              {data.settings.contentPlaybook.storyFramesMax} cadre, fiecare cu text propriu.
            </p>
          </div>
          <div className="rounded-md border border-[#28364d] bg-[#0d1727] p-3">
            <p className="text-xs font-medium text-slate-200">Video la 3 zile</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">
              Reel și TikTok native, fără watermark și cu subtitrări.
            </p>
          </div>
          <div className="rounded-md border border-[#28364d] bg-[#0d1727] p-3">
            <p className="text-xs font-medium text-slate-200">Produs protejat</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">
              Fundalul se poate adapta; produsul original nu se recreează.
            </p>
          </div>
          <div className="rounded-md border border-[#28364d] bg-[#0d1727] p-3">
            <p className="text-xs font-medium text-slate-200">Măsurare etapizată</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">
              Verificări la {data.settings.contentPlaybook.measurementWindowsHours.join(" / ")} ore.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-emerald-200/80">
          <span className="rounded-full bg-emerald-400/8 px-2 py-1">Link specific produsului</span>
          <span className="rounded-full bg-emerald-400/8 px-2 py-1">Variante native</span>
          <span className="rounded-full bg-emerald-400/8 px-2 py-1">Previzualizare nativă</span>
          <span className="rounded-full bg-emerald-400/8 px-2 py-1">Descrieri complete</span>
          <span className="rounded-full bg-emerald-400/8 px-2 py-1">
            Conversii înainte de impresii
          </span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-[#28364d] bg-[#111c2e] p-4">
          <h3 className="text-sm font-semibold text-white">Marketplace-uri guvernate</h3>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Ordinea sincronizării: {data.settings.marketplaces.syncOrder.join(" → ")}. Activarea
            cere identitatea sellerului, conector oficial și aprobare.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              [
                "eMAG",
                `API ${data.settings.marketplaces.emag.version}`,
                data.settings.marketplaces.emag.status,
              ],
              [
                "Trendyol",
                `Product ${data.settings.marketplaces.trendyol.productVersion} · Order ${data.settings.marketplaces.trendyol.orderVersion}`,
                data.settings.marketplaces.trendyol.status,
              ],
              ["Okazii", "XML + comenzi manuale", data.settings.marketplaces.okazii.status],
              ["Vinted", "neeligibil comercial RO", data.settings.marketplaces.vinted.status],
            ].map(([label, detail, status]) => (
              <article key={label} className="rounded-md border border-[#28364d] bg-[#0d1727] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-slate-200">{label}</p>
                  <span className="text-[9px] text-slate-500">
                    {statusLabels[status] ?? status}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-slate-500">{detail}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-[#28364d] bg-[#111c2e] p-4">
          <h3 className="text-sm font-semibold text-white">Buget Free și asistență AI</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <article className="rounded-md border border-[#28364d] bg-[#0d1727] p-3">
              <p className="text-xs font-medium text-slate-200">Metricool Free</p>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                {data.settings.freeResources.metricoolPublishedPostsPerMonth} publicări/lună ·{" "}
                {data.settings.freeResources.metricoolAnalyticsHistoryDays} zile analytics.
              </p>
            </article>
            <article className="rounded-md border border-[#28364d] bg-[#0d1727] p-3">
              <p className="text-xs font-medium text-slate-200">Workers AI</p>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                {data.settings.freeResources.workersAiNeuronsPerDay.toLocaleString("ro-RO")}{" "}
                neuroni/zi; depășirea plătită este blocată. Stare:{" "}
                {data.settings.workersAi.enabled ? "activ" : "neactivat"}.
              </p>
            </article>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">
            Modelele pot propune și verifica ciorne, fără date personale și fără publicare directă.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-[#28364d] bg-[#111c2e]">
        <div className="flex items-center justify-between border-b border-[#28364d] px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Agenți interni sincronizați</h3>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Folosesc același playbook; orchestratorul păstrează controlul campaniei și
              aprobărilor.
            </p>
          </div>
          <span className="text-[10px] text-slate-500">{data.relatedAgents.length} agenți</span>
        </div>
        <div className="grid gap-px bg-[#28364d] md:grid-cols-3">
          {data.relatedAgents.map((relatedAgent) => (
            <div key={relatedAgent.code} className="bg-[#111c2e] p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-slate-200">{relatedAgent.name}</p>
                <span className="shrink-0 rounded-full bg-slate-700/50 px-2 py-0.5 text-[9px] text-slate-300">
                  {statusLabels[relatedAgent.status] ?? relatedAgent.status}
                </span>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-slate-500">{relatedAgent.purpose}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[#28364d] bg-[#111c2e]">
        <div className="flex items-center justify-between border-b border-[#28364d] px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Conectori și prospețimea datelor</h3>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Metricool {data.monitoring.expected.metricoolBrandId} ·{" "}
              {data.monitoring.expected.ownerEmail} · TikTok @
              {data.monitoring.expected.tiktokHandle}
            </p>
          </div>
          <Link2 className="h-4 w-4 text-cyan-300" />
        </div>
        <div className="grid gap-3 p-4 lg:grid-cols-2">
          <article
            id="search-console"
            className="rounded-lg border border-[#28364d] bg-[#0d1727] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-white">Google Search Console</p>
                <p className="mt-1 font-mono text-[10px] text-cyan-200">
                  {data.monitoring.expected.gscProperty}
                </p>
              </div>
              <span className="rounded-full bg-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                {statusLabels[data.monitoring.gsc.credential?.check_status ?? "unverified"]}
              </span>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-slate-500">
              Ultimul import intern:{" "}
              {formatMoment(data.monitoring.gsc.latestImport?.last_imported_at)}
              {data.monitoring.gsc.latestImport
                ? ` · zi ${data.monitoring.gsc.latestImport.latest_day} · ${count(data.monitoring.gsc.latestImport.clicks)} clickuri · ${count(data.monitoring.gsc.latestImport.impressions)} afișări`
                : ""}
            </p>
          </article>
          {data.monitoring.accountConnections.length === 0 ? (
            <article className="rounded-lg border border-amber-400/20 bg-amber-400/8 p-4 text-xs leading-5 text-amber-100/80">
              Inventarul intern nu are încă referințe de conectare. Migrarea 0054 le adaugă drept
              „necesită conectare”; activarea cere verificare live repetabilă.
            </article>
          ) : (
            data.monitoring.accountConnections.map((connection) => (
              <article
                key={`${connection.provider}:${connection.label}`}
                className="rounded-lg border border-[#28364d] bg-[#0d1727] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-white">{connection.label}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {connection.provider} · {connection.auth_method}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                    {statusLabels[connection.status] ?? connection.status}
                  </span>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  Ultima verificare: {formatMoment(connection.last_verified_at)}
                </p>
              </article>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate(form)}
          className="rounded-lg bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
        >
          {save.isPending ? "Se salvează…" : "Salvează politica"}
        </button>
        <button
          type="button"
          disabled={!data.settings.avyron.shareAggregatedStats || propose.isPending}
          onClick={() => propose.mutate("stats_snapshot")}
          className="rounded-lg border border-[#3b4d69] px-4 py-2 text-xs font-medium text-slate-200 hover:border-cyan-400/50 disabled:opacity-40"
        >
          Propune export statistici
        </button>
        <button
          type="button"
          disabled={!data.settings.avyron.shareSkillPackage || propose.isPending}
          onClick={() => propose.mutate("skill_package")}
          className="rounded-lg border border-[#3b4d69] px-4 py-2 text-xs font-medium text-slate-200 hover:border-cyan-400/50 disabled:opacity-40"
        >
          Propune export skill
        </button>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="rounded-lg border border-[#3b4d69] p-2 text-slate-400 hover:text-white"
          aria-label="Reîncarcă starea agentului"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="rounded-lg border border-[#28364d] bg-[#111c2e]">
        <div className="flex items-center justify-between border-b border-[#28364d] px-4 py-3">
          <h3 className="text-sm font-semibold text-white">Schimburi și aprobări AVYRON</h3>
          <span className="text-[10px] text-slate-500">ultimele {data.exchanges.length}</span>
        </div>
        <div className="divide-y divide-[#28364d]">
          {data.exchanges.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-slate-500">Niciun schimb propus.</p>
          ) : (
            data.exchanges.map((exchange) => (
              <div
                key={exchange.id}
                className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-200">
                    {exchange.direction === "outbound" ? "Cutiuța → AVYRON" : "AVYRON → Cutiuța"} ·{" "}
                    {exchange.exchange_type}
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[10px] text-slate-600">
                    {exchange.payload_hash}
                  </p>
                  {exchange.direction === "inbound" && exchange.reviewPayload != null && (
                    <details className="mt-2 text-[11px] text-slate-400">
                      <summary className="cursor-pointer text-cyan-300">
                        Verifică propunerea înainte de aprobare
                      </summary>
                      <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-[#08111f] p-3 font-mono text-[10px] leading-4 text-slate-300">
                        {JSON.stringify(exchange.reviewPayload, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                <span className="w-fit rounded-full bg-slate-700/50 px-2 py-1 text-[10px] text-slate-300">
                  {statusLabels[exchange.status] ?? exchange.status}
                </span>
                {exchange.status === "pending_approval" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: exchange.id, decision: "approved" })}
                      className="rounded-md border border-emerald-400/30 px-2.5 py-1 text-[11px] text-emerald-300"
                    >
                      Aprobă
                    </button>
                    <button
                      type="button"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: exchange.id, decision: "rejected" })}
                      className="rounded-md border border-red-400/30 px-2.5 py-1 text-[11px] text-red-300"
                    >
                      Respinge
                    </button>
                  </div>
                )}
                {exchange.direction === "outbound" &&
                  ["approved", "failed"].includes(exchange.status) && (
                    <button
                      type="button"
                      disabled={dispatch.isPending}
                      onClick={() => dispatch.mutate(exchange.id)}
                      className="rounded-md border border-cyan-400/30 px-2.5 py-1 text-[11px] text-cyan-300"
                    >
                      Trimite aprobat
                    </button>
                  )}
              </div>
            ))
          )}
        </div>
      </div>

      {data.socialAccounts.every((account) => account.status !== "active") && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/8 p-3 text-xs text-amber-100/80">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          Pentru publicare viitoare vor fi necesare accesuri oficiale Meta și TikTok. Contul Google
          nu înlocuiește aceste autorizări.
        </div>
      )}
    </section>
  );
}
