import { SalesConnections } from "./SalesConnections";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Plug,
  RefreshCw,
  ShoppingBag,
  Truck,
} from "lucide-react";
import type { AdminChannelMetric } from "@/lib/admin-contracts";
import { getAdminIntegrations, getCommerceOperations } from "@/lib/admin.functions";

const PORTALS: Record<string, string> = {
  website: "https://cutiutamagica.eu",
  emag: "https://marketplace.emag.ro",
  olx: "https://www.olx.ro",
  facebook: "https://business.facebook.com",
  instagram: "https://business.facebook.com",
  tiktok: "https://business.tiktok.com",
  pinterest: "https://business.pinterest.com",
  whatsapp: "https://business.whatsapp.com",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Activ",
  connected: "Conectat",
  ready_for_test: "Pregătit pentru test",
  setup_required: "Necesită configurare",
  degraded: "Atenție",
  disabled: "Dezactivat",
  revoked: "Revocat",
};

const OPERATIONAL_PROVIDERS: Record<
  string,
  {
    label: string;
    route: "/admin/billing" | "/admin/shipping" | "/admin/financiar" | "/admin/email";
  }
> = {
  fgo: { label: "FGO", route: "/admin/billing" },
  smartship: { label: "SmartShip", route: "/admin/shipping" },
  stripe: { label: "Stripe", route: "/admin/financiar" },
  resend: { label: "Resend", route: "/admin/email" },
};

function StatusPill({ status }: { status: string }) {
  const ready = status === "active" || status === "connected";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium ${
        ready
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-300"
      }`}
    >
      {ready ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function ChannelCard({ channel }: { channel: AdminChannelMetric }) {
  return (
    <article className="glass-card rounded-xl p-4 md:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{channel.name}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {channel.connectionMode} · {channel.type}
          </p>
        </div>
        <StatusPill status={channel.status} />
      </div>
      <dl className="grid grid-cols-3 gap-2 rounded-lg bg-[#0F172A]/60 p-2 text-center">
        <div>
          <dt className="text-[10px] text-slate-500">Comenzi</dt>
          <dd className="text-sm font-semibold text-white">{channel.validOrdersCount}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-slate-500">Listări</dt>
          <dd className="text-sm font-semibold text-white">{channel.activeListings}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-slate-500">Erori sync</dt>
          <dd
            className={
              channel.openSyncFailures > 0
                ? "text-sm font-semibold text-red-300"
                : "text-sm font-semibold text-white"
            }
          >
            {channel.openSyncFailures}
          </dd>
        </div>
      </dl>
      {PORTALS[channel.code] && (
        <a
          href={PORTALS[channel.code]}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-[#334155] py-2 text-xs font-medium text-slate-300 hover:text-white"
        >
          Deschide portalul <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </article>
  );
}

export default function Integrations() {
  const fetchIntegrations = useServerFn(getAdminIntegrations);
  const fetchOperations = useServerFn(getCommerceOperations);
  const integrationsQuery = useQuery({
    queryKey: ["admin", "integrations"],
    queryFn: () => fetchIntegrations(),
    staleTime: 60_000,
  });
  const operationsQuery = useQuery({
    queryKey: ["admin", "commerce-operations"],
    queryFn: () => fetchOperations(),
    staleTime: 30_000,
  });
  const data = integrationsQuery.data;
  const operationalProviders = (operationsQuery.data?.providers ?? []).filter(
    (provider) => provider.environment === "production",
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white md:text-2xl">Integrări omnichannel</h1>
          <p className="mt-1 text-xs text-slate-400 md:text-sm">
            Starea reală a canalelor, conturilor API și metodelor de livrare.
          </p>
        </div>
        <button
          type="button"
          onClick={() => Promise.all([integrationsQuery.refetch(), operationsQuery.refetch()])}
          disabled={integrationsQuery.isFetching || operationsQuery.isFetching}
          className="flex items-center justify-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-3 py-2 text-xs text-slate-200 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${integrationsQuery.isFetching || operationsQuery.isFetching ? "animate-spin" : ""}`}
          />{" "}
          Verifică starea
        </button>
      </div>

      <SalesConnections />
      {integrationsQuery.isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Starea integrărilor nu a putut fi citită din D1.
        </div>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
          <Plug className="h-5 w-5 text-cyan-300" /> Servicii operaționale
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {operationalProviders.map((provider) => {
            const meta = OPERATIONAL_PROVIDERS[provider.provider] ?? {
              label: provider.provider,
              route: "/admin/integrations" as const,
            };
            const effectiveStatus = provider.secretConfigured
              ? provider.status === "degraded"
                ? "degraded"
                : provider.status === "active"
                  ? "active"
                  : "ready_for_test"
              : "setup_required";
            return (
              <article key={provider.id} className="glass-card rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{meta.label}</h3>
                    <p className="mt-1 text-xs text-slate-500">{provider.capability}</p>
                  </div>
                  <StatusPill status={effectiveStatus} />
                </div>
                <dl className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Cheie</dt>
                    <dd
                      className={provider.secretConfigured ? "text-emerald-300" : "text-amber-300"}
                    >
                      {provider.secretConfigured ? "Configurată" : "Lipsește"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Ultima verificare</dt>
                    <dd className="text-right text-slate-300">
                      {provider.lastHealthcheckAt
                        ? new Date(provider.lastHealthcheckAt).toLocaleString("ro-RO")
                        : "Niciuna"}
                    </dd>
                  </div>
                </dl>
                {provider.lastError && (
                  <p className="mt-3 text-xs text-red-300">{provider.lastError}</p>
                )}
                <Link
                  to={meta.route}
                  className="mt-4 flex items-center justify-center rounded-lg border border-[#334155] py-2 text-xs font-medium text-slate-300 hover:text-white"
                >
                  Configurează
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
          <ShoppingBag className="h-5 w-5 text-purple-400" /> Canale de vânzare
        </h2>
        {integrationsQuery.isLoading ? (
          <p className="py-10 text-center text-sm text-slate-500">Se încarcă...</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(data?.channels ?? []).map((channel) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
          <Plug className="h-5 w-5 text-amber-400" /> Conturi API
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(data?.accounts ?? []).map((account) => (
            <div key={account.id} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{account.label}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {account.provider} · {account.environment}
                  </p>
                </div>
                <StatusPill status={account.status} />
              </div>
              {account.lastErrorMessage && (
                <p className="mt-3 text-xs text-red-300">
                  {account.lastErrorCode}: {account.lastErrorMessage}
                </p>
              )}
              {!account.lastSuccessAt && (
                <p className="mt-3 text-xs text-slate-500">
                  Nu a existat încă nicio sincronizare reușită.
                </p>
              )}
            </div>
          ))}
          {!integrationsQuery.isLoading && (data?.accounts.length ?? 0) === 0 && (
            <p className="text-sm text-slate-500">Nu sunt definite conturi API.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-white">
          <Truck className="h-5 w-5 text-emerald-400" /> Curierat
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {(data?.shippingMethods ?? []).map((method) => (
            <div key={method.id} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{method.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {method.provider} · {method.type}
                  </p>
                </div>
                <StatusPill status={method.status} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-slate-500">
        OLX rămâne pe import manual până la acces oficial. eMAG și feed-urile sociale au modelele
        pregătite, dar sunt marcate corect drept neconfigurate până la adăugarea secretelor și
        validarea în sandbox.
      </p>
    </div>
  );
}
