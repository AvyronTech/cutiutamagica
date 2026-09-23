import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, RefreshCw, Save, KeyRound } from "lucide-react";
import {
  getGrowthSettings,
  saveGrowthSettings,
  saveIntegrationCredential,
  verifyIntegration,
  previewOwnerReport,
  getTrafficMetrics,
  importTrafficMetrics,
} from "@/lib/growth.functions";
import type { CredentialProvider } from "@/lib/growth-contracts";

const input = "w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white";
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50";
const labels: Record<CredentialProvider, string> = {
  google_merchant: "Google Merchant · token OAuth separat",
  netopia: "NETOPIA · cheie API",
  netopia_public_key: "NETOPIA · cheie publică verificare IPN",
  revolut_merchant: "Revolut Merchant · cheie secretă (plăți)",
  revolut_merchant_webhook: "Revolut Merchant · secret webhook",
  oblio: "Oblio · secret API",
  emag: "eMAG · credențiale API",
  trendyol: "Trendyol · credențiale API",
  olx: "OLX · token acces",
  okazii: "Okazii · cheie API",
  fgo: "FGO · cheie privată API",
  smartship: "SmartShip",
  stripe: "Stripe",
  stripe_webhook: "Stripe · secret webhook",
  revolut: "Revolut Business (token OAuth)",
  resend: "Resend",
  brave: "Brave Search",
  google: "Google (token OAuth readonly)",
  meta: "Meta (token de acces)",
};
function useSettings() {
  const load = useServerFn(getGrowthSettings);
  return useQuery({ queryKey: ["admin", "growth"], queryFn: () => load(), staleTime: 30000 });
}
function download(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function CredentialPanel({ providers }: { providers: CredentialProvider[] }) {
  const query = useSettings(),
    client = useQueryClient();
  const save = useServerFn(saveIntegrationCredential),
    verify = useServerFn(verifyIntegration);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>, provider: CredentialProvider) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    try {
      await save({ data: { provider, value: String(new FormData(form).get("secret")) } });
      form.reset();
      await client.invalidateQueries({ queryKey: ["admin", "growth"] });
      await client.invalidateQueries({ queryKey: ["admin", "commerce-operations"] });
      toast.success("Cheia a fost salvată criptat");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Salvare nereușită");
    } finally {
      setBusy(false);
    }
  }
  async function check(provider: CredentialProvider) {
    setBusy(true);
    try {
      const r = await verify({ data: { provider } });
      toast[r.ok ? "success" : "info"](r.message);
      await query.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verificare nereușită");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4 border-y border-slate-700 py-5">
      <h2 className="flex items-center gap-2 font-semibold text-white">
        <KeyRound size={18} /> Conexiuni API
      </h2>
      {query.isError && <p role="alert">Setările conexiunilor nu sunt disponibile.</p>}
      {query.data && !query.data.secureStorageReady && (
        <p className="text-sm text-amber-200">
          Stocarea cheilor din dashboard necesită configurarea cheii de criptare în Cloudflare. Poți
          utiliza și secretele Worker existente.
        </p>
      )}
      {providers.map((provider) => {
        const state = query.data?.credentials.find((c) => c.provider === provider);
        return (
          <form
            key={provider}
            onSubmit={(e) => submit(e, provider)}
            className="grid items-end gap-3 sm:grid-cols-[1fr_auto_auto]"
          >
            <label className="space-y-2 text-sm text-slate-300">
              <span>
                {labels[provider]} ·{" "}
                {state?.configured
                  ? state.status === "verified"
                    ? "Acces verificat"
                    : state.status === "failed"
                      ? "Verificare nereușită"
                      : "Cheie configurată"
                  : "Neconfigurat"}
              </span>
              <input
                name="secret"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={8192}
                required
                placeholder="Introdu sau înlocuiește cheia / tokenul"
                className={input}
              />
              {state?.checkedAt && (
                <span className="block text-xs text-slate-400">
                  Verificat la {new Date(state.checkedAt).toLocaleString("ro-RO")}
                </span>
              )}
            </label>
            <button className={button} disabled={busy || !query.data?.secureStorageReady}>
              Salvează
            </button>
            <button
              type="button"
              className={button}
              disabled={busy || !state?.configured}
              onClick={() => check(provider)}
            >
              Verifică
            </button>
          </form>
        );
      })}
    </section>
  );
}

export default function GrowthSettings({
  section,
  embedded = false,
  showCredentials = true,
}: {
  section: "owner_reports" | "traffic" | "finance" | "supplier_research";
  embedded?: boolean;
  showCredentials?: boolean;
}) {
  const query = useSettings(),
    client = useQueryClient(),
    save = useServerFn(saveGrowthSettings),
    preview = useServerFn(previewOwnerReport);
  const mutation = useMutation({
    mutationFn: save,
    onSuccess: () => {
      toast.success("Setări salvate");
      client.invalidateQueries({ queryKey: ["admin", "growth"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const [report, setReport] = useState<Awaited<ReturnType<typeof preview>> | null>(null);
  if (query.isError)
    return (
      <p role="alert">
        Setările nu au putut fi încărcate.{" "}
        <button onClick={() => query.refetch()}>Reîncearcă</button>
      </p>
    );
  if (!query.data) return <p role="status">Se încarcă setările...</p>;
  const data = query.data;
  const title = {
    owner_reports: "E-mail și rapoarte proprietari",
    traffic: "Trafic și audiență",
    finance: "Conexiuni financiare",
    supplier_research: "Cercetare furnizori",
  }[section];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (k: string) => String(form.get(k) || "");
    const checked = (k: string) => form.get(k) === "on";
    if (section === "owner_reports")
      mutation.mutate({
        data: {
          section,
          value: {
            enabled: checked("enabled"),
            recipients: text("recipients")
              .split(/[\s,;]+/)
              .filter(Boolean),
            day: Number(text("day")),
            hour: Number(text("hour")),
            sales: checked("sales"),
            products: checked("products"),
            traffic: checked("traffic"),
          },
        },
      });
    if (section === "traffic")
      mutation.mutate({
        data: {
          section,
          value: {
            gaPropertyId: text("gaPropertyId"),
            gscProperty: text("gscProperty"),
            facebookPageId: text("facebookPageId"),
            instagramAccountId: text("instagramAccountId"),
            tiktokAccountId: text("tiktokAccountId"),
          },
        },
      });
    if (section === "finance")
      mutation.mutate({
        data: {
          section,
          value: {
            currencies: ["RON", "EUR"],
            revolutAccount: text("revolutAccount"),
            stripeAccount: text("stripeAccount"),
            fgoSeries: text("fgoSeries"),
            spvClientId: text("spvClientId"),
            avyronSummaryEnabled: false,
          },
        },
      });
    if (section === "supplier_research")
      mutation.mutate({
        data: {
          section,
          value: {
            enabled: checked("enabled"),
            maxDailyRuns: Number(text("maxDailyRuns")),
            refreshDays: Number(text("refreshDays")),
          },
        },
      });
  }
  const field = (
    name: string,
    label: string,
    value: string | number,
    type = "text",
    min?: number,
    max?: number,
  ) => (
    <label key={name} className="space-y-2 text-sm text-slate-300">
      <span>{label}</span>
      <input className={input} name={name} defaultValue={value} type={type} min={min} max={max} />
    </label>
  );
  const toggle = (name: string, label: string, checked: boolean) => (
    <label key={name} className="flex items-center gap-3 text-sm text-slate-300">
      <input type="checkbox" name={name} defaultChecked={checked} />
      {label}
    </label>
  );
  return (
    <section className="space-y-6">
      {embedded ? (
        <h2 className="text-xl font-semibold text-white">{title}</h2>
      ) : (
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
      )}
      <form key={section} onSubmit={submit} className="grid max-w-3xl gap-5">
        {section === "owner_reports" && (
          <>
            {field(
              "recipients",
              "E-mailuri proprietari (conturi super admin), separate prin virgulă",
              data.reports.recipients.join(", "),
            )}
            <div className="grid grid-cols-2 gap-4">
              {field("day", "Ziua lunii", data.reports.day, "number", 1, 28)}
              {field("hour", "Ora în România", data.reports.hour, "number", 0, 23)}
            </div>
            {toggle("enabled", "Trimite lunar raportul lunii precedente", data.reports.enabled)}
            {toggle("sales", "Comenzi și încasări, separat RON / EUR", data.reports.sales)}
            {toggle("products", "Top produse", data.reports.products)}
            {toggle("traffic", "Trafic importat din surse conectate", data.reports.traffic)}
            <p className="text-xs text-slate-400">
              Rapoarte operaționale fără date personale ale clienților. Perioadele tranzacțiilor
              sunt calculate în UTC. Trimiterile necesită domeniul Resend verificat.
            </p>
          </>
        )}
        {section === "traffic" && (
          <>
            {field("gaPropertyId", "Google Analytics 4 · Property ID", data.traffic.gaPropertyId)}
            {field(
              "gscProperty",
              "Search Console · sc-domain:cutiutamagica.eu",
              data.traffic.gscProperty,
            )}
            {field("facebookPageId", "Facebook · Page ID", data.traffic.facebookPageId)}
            {field(
              "instagramAccountId",
              "Instagram · Business Account ID",
              data.traffic.instagramAccountId,
            )}
            {field("tiktokAccountId", "TikTok · Account ID", data.traffic.tiktokAccountId)}
            <p className="text-xs text-slate-400">
              Google: import la cerere cu token readonly valid. Conturile sociale sunt pregătite
              pentru conectare; colectarea necesită aprobările și permisiunile fiecărei platforme.
            </p>
          </>
        )}
        {section === "finance" && (
          <>
            {field(
              "revolutAccount",
              "Referință cont Revolut (fără date sensibile)",
              data.finance.revolutAccount,
            )}
            {field("stripeAccount", "Stripe · Account ID", data.finance.stripeAccount)}
            {field(
              "fgoSeries",
              "Referință serie FGO (seria operațională se gestionează în Facturare)",
              data.finance.fgoSeries,
            )}
            {field("spvClientId", "ANAF SPV · Client ID", data.finance.spvClientId)}
            <p className="text-sm text-slate-400">
              Monede: RON și EUR. FGO se gestionează în Facturare. SPV/e-Factura necesită autorizare
              ANAF și certificat. Tokenurile OAuth expiră și trebuie reînnoite. Transmiterea către
              AVYRON este dezactivată; sinteza poate fi exportată local.
            </p>
          </>
        )}
        {section === "supplier_research" && (
          <>
            {toggle("enabled", "Activează agentul de cercetare asistată", data.research.enabled)}
            {field(
              "maxDailyRuns",
              "Maximum cercetări / zi",
              data.research.maxDailyRuns,
              "number",
              1,
              100,
            )}
            {field(
              "refreshDays",
              "Reutilizează rezultatele timp de (zile)",
              data.research.refreshDays,
              "number",
              1,
              90,
            )}
            <p className="text-sm text-slate-400">
              O căutare verificabilă per produs, top 5 după relevanța textului. Prețurile din
              fragmentele indexate sunt orientative; transportul, TVA, cantitatea minimă și
              drepturile de revânzare se verifică la furnizor.
            </p>
          </>
        )}
        <button className={`${button} justify-self-start`} disabled={mutation.isPending}>
          <Save size={16} />
          Salvează setările
        </button>
      </form>
      {showCredentials && (
        <CredentialPanel
          providers={
            section === "owner_reports"
              ? ["resend"]
              : section === "traffic"
                ? ["google", "meta"]
                : section === "finance"
                  ? ["stripe", "stripe_webhook", "revolut"]
                  : ["brave"]
          }
        />
      )}
      {(section === "owner_reports" || section === "finance") && (
        <div className="space-y-4">
          <button
            className={button}
            onClick={async () => {
              try {
                setReport(await preview());
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Previzualizare nereușită");
              }
            }}
          >
            Previzualizează raportul
          </button>
          {report && (
            <>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-950 p-4 text-xs text-slate-200">
                {JSON.stringify(report, null, 2)}
              </pre>
              <button
                className={button}
                onClick={() => download(report, `cutiuta-magica-${report.month}.json`)}
              >
                <Download size={16} />
                Exportă sinteza
              </button>
            </>
          )}
        </div>
      )}
      {section === "traffic" && <TrafficResults />}
    </section>
  );
}
function TrafficResults() {
  const load = useServerFn(getTrafficMetrics),
    sync = useServerFn(importTrafficMetrics);
  const query = useQuery({ queryKey: ["admin", "traffic"], queryFn: () => load() });
  const mutation = useMutation({
    mutationFn: sync,
    onSuccess: () => {
      query.refetch();
      toast.success("Date importate");
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {(["ga4", "gsc"] as const).map((source) => (
          <button
            key={source}
            className={button}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ data: { source } })}
          >
            <RefreshCw size={16} />
            Importă {source.toUpperCase()}
          </button>
        ))}
      </div>
      {query.isError ? (
        <p role="alert">Statisticile nu au putut fi încărcate.</p>
      ) : !query.data?.length ? (
        <p className="text-slate-400">Nu există date importate pentru ultimele 30 de zile.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {query.data.map((row, i) => (
            <article key={i} className="rounded-lg border border-slate-700 p-4">
              <p className="text-xs text-slate-400">
                {String(row.source)} · {String(row.metric)}
              </p>
              <p className="my-2 text-2xl text-white">
                {Number(row.value).toLocaleString("ro-RO")}
              </p>
              <p className="text-xs text-slate-400">
                {String(row.first_day)} – {String(row.last_day)}
                <br />
                Actualizat: {String(row.updated_at)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
