import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3,
  ExternalLink,
  Facebook,
  Instagram,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { getSocialDashboard, saveSocialSnapshot } from "@/lib/social-dashboard.functions";
import type { SocialSnapshotInput } from "@/lib/social-dashboard-contracts";

const networks = [
  {
    id: "facebook",
    name: "Facebook",
    handle: "Cutiuța Magică",
    url: "https://www.facebook.com/1154774271054604",
    icon: Facebook,
  },
  {
    id: "instagram",
    name: "Instagram",
    handle: "@cutiutamagicaofficial",
    url: "https://www.instagram.com/cutiutamagicaofficial/",
    icon: Instagram,
  },
  {
    id: "tiktok",
    name: "TikTok",
    handle: "@cutiua.magic",
    url: "https://www.tiktok.com/@cutiua.magic",
    icon: Sparkles,
  },
] as const;

const card =
  "rounded-2xl border border-white/10 bg-white/[.04] p-5 shadow-[0_14px_40px_rgba(0,0,0,.08)]";
const field =
  "mt-1 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-200/70";
const number = new Intl.NumberFormat("ro-RO");
const date = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("ro-RO", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
    : "—";

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl bg-slate-950/35 px-3 py-2.5">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-white">
        {value === null ? "—" : number.format(value)}
      </dd>
    </div>
  );
}

export default function SocialNetworks() {
  const client = useQueryClient();
  const load = useServerFn(getSocialDashboard);
  const save = useServerFn(saveSocialSnapshot);
  const [showImport, setShowImport] = useState(false);
  const query = useQuery({
    queryKey: ["admin", "social-dashboard"],
    queryFn: () => load(),
    staleTime: 60_000,
  });
  const mutation = useMutation({
    mutationFn: (input: SocialSnapshotInput) => save({ data: input }),
    onSuccess: async (result) => {
      await client.invalidateQueries({ queryKey: ["admin", "social-dashboard"] });
      toast.success(result.imported ? "Cifrele au fost salvate" : "Acest raport este deja salvat");
      if (result.imported) setShowImport(false);
    },
    onError: (error) => toast.error(error.message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const optionalCount = (name: string) => {
      const raw = String(values.get(name) ?? "").trim();
      return raw === "" ? null : Number(raw);
    };
    const followers = optionalCount("followers");
    mutation.mutate({
      network: String(values.get("network")) as SocialSnapshotInput["network"],
      periodStart: String(values.get("periodStart")),
      periodEnd: String(values.get("periodEnd")),
      followersObservedOn:
        followers === null ? null : String(values.get("followersObservedOn") || ""),
      followers,
      posts: optionalCount("posts"),
      views: optionalCount("views"),
      interactions: optionalCount("interactions"),
      reels: optionalCount("reels"),
    });
  }

  const postCounts = Object.fromEntries(
    (query.data?.postCounts ?? []).map(({ status, count }) => [status, count]),
  );
  return (
    <div className="space-y-6 pb-10">
      <header className="rounded-[1.5rem] border border-amber-200/20 bg-[radial-gradient(circle_at_88%_0%,rgba(240,192,108,.19),transparent_39%),linear-gradient(135deg,#18243a,#111b2b)] p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-200/80">
              Prezență socială
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              Rețele sociale
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Conturile oficiale, rezultatele din Metricool și postările pregătite pentru aprobare,
              într-un singur loc.
            </p>
          </div>
          <a
            href="https://app.metricool.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-200 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-100"
          >
            Deschide Metricool <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 text-xs text-slate-200">
          <span className="rounded-full border border-white/15 px-3 py-1.5">
            Brand 7230540 · Cutiuța Magică
          </span>
          <span className="rounded-full border border-white/15 px-3 py-1.5">
            Plan Free · 20 postări/lună
          </span>
          <span className="rounded-full border border-white/15 px-3 py-1.5">Europe/Bucharest</span>
        </div>
      </header>

      {query.isError ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-100"
        >
          Datele sociale nu pot fi încărcate. Verifică dacă migrația 0071 este aplicată și încearcă
          din nou.
        </div>
      ) : null}
      {!query.data && !query.isError ? (
        <p role="status" className="text-sm text-slate-300">
          Se încarcă rețelele sociale…
        </p>
      ) : null}

      {query.data ? (
        <>
          <section aria-labelledby="results-title">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="results-title" className="text-lg font-semibold text-white">
                  Rezultate pe rețea
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Ultimul raport verificat și salvat în magazin pentru fiecare rețea.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImport((visible) => !visible)}
                className="rounded-xl border border-amber-200/30 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-200/10"
              >
                {showImport ? "Închide formularul" : "Actualizează cifrele"}
              </button>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              {networks.map((network) => {
                const snapshot = query.data.snapshots.find((item) => item.network === network.id);
                const accounts = query.data.accounts.filter(
                  (item) => item.provider === network.id && item.accountType !== "profile",
                );
                const Icon = network.icon;
                return (
                  <article key={network.id} className={card}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-200/10 text-amber-100">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <h3 className="font-semibold text-white">{network.name}</h3>
                          <p className="text-xs text-slate-400">{network.handle}</p>
                        </div>
                      </div>
                      <a
                        href={network.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Deschide ${network.name}`}
                        className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    {snapshot ? (
                      <>
                        <dl className="mt-5 grid grid-cols-2 gap-2">
                          <Metric label="Urmăritori" value={snapshot.followers} />
                          <Metric label="Vizualizări" value={snapshot.views} />
                          <Metric label="Interacțiuni" value={snapshot.interactions} />
                          <Metric
                            label={network.id === "tiktok" ? "Videoclipuri" : "Postări"}
                            value={snapshot.posts}
                          />
                          {snapshot.reels !== null ? (
                            <Metric label="Reels" value={snapshot.reels} />
                          ) : null}
                        </dl>
                        <p className="mt-4 text-xs leading-5 text-slate-400">
                          Raport Metricool: {date(snapshot.periodStart)} –{" "}
                          {date(snapshot.periodEnd)}. Urmăritori observați la{" "}
                          {date(snapshot.followersObservedOn)}. Salvat în panou la{" "}
                          {date(snapshot.importedAt)}.
                        </p>
                      </>
                    ) : (
                      <p className="mt-5 rounded-xl border border-dashed border-white/15 p-4 text-sm text-slate-400">
                        Niciun raport salvat. Deschide Metricool și adaugă cifrele verificate.
                      </p>
                    )}
                    <p className="mt-4 border-t border-white/10 pt-3 text-xs text-slate-400">
                      Publicare din magazin:{" "}
                      {accounts.some((account) => account.status === "active")
                        ? "înregistrat ca activ; verifică destinația înainte de publicare"
                        : "conector neconfirmat"}
                      . Contul din Metricool nu activează automat publicarea de aici.
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          {showImport ? (
            <section className={card} aria-labelledby="import-title">
              <div className="flex items-center gap-2 text-amber-100">
                <TrendingUp className="h-5 w-5" />
                <h2 id="import-title" className="text-lg font-semibold">
                  Adaugă raportul Metricool
                </h2>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Transcrie numai cifrele afișate pentru brandul Cutiuța Magică. Lasă gol ce nu este
                disponibil; câmpul gol nu înseamnă zero. Un raport identic este recunoscut automat.
              </p>
              <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-3">
                <label className="text-sm text-slate-300">
                  Rețea
                  <select name="network" className={field}>
                    {networks.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-slate-300">
                  De la
                  <input name="periodStart" type="date" required className={field} />
                </label>
                <label className="text-sm text-slate-300">
                  Până la
                  <input name="periodEnd" type="date" required className={field} />
                </label>
                {(
                  [
                    ["followers", "Urmăritori"],
                    ["followersObservedOn", "Data urmăritorilor"],
                    ["posts", "Postări / videoclipuri"],
                    ["views", "Vizualizări"],
                    ["interactions", "Interacțiuni"],
                    ["reels", "Reels"],
                  ] as const
                ).map(([name, label]) => (
                  <label key={name} className="text-sm text-slate-300">
                    {label}
                    <input
                      name={name}
                      type={name === "followersObservedOn" ? "date" : "number"}
                      min={name === "followersObservedOn" ? undefined : 0}
                      step="1"
                      className={field}
                    />
                  </label>
                ))}
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-200 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-100 disabled:opacity-50"
                  >
                    {mutation.isPending ? "Se salvează…" : "Salvează raportul"}
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          <section className="grid gap-4 lg:grid-cols-2">
            <div className={card}>
              <div className="flex items-center gap-2 text-amber-100">
                <Send className="h-5 w-5" />
                <h2 className="font-semibold">Postări și aprobări</h2>
              </div>
              <p className="mt-3 text-sm text-slate-300">
                {number.format(postCounts.draft ?? 0)} drafturi ·{" "}
                {number.format(postCounts.review ?? 0)} în revizie ·{" "}
                {number.format(postCounts.approved ?? 0)} aprobate ·{" "}
                {number.format(postCounts.scheduled ?? 0)} programate în baza magazinului.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/admin/posts"
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/10"
                >
                  Vezi postările
                </Link>
                <Link
                  to="/admin/marketing"
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/10"
                >
                  Marketing
                </Link>
                <Link
                  to="/admin/ai"
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/10"
                >
                  Agent Codex
                </Link>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Publicarea cere aprobare și un conector verificat pentru destinația exactă.
              </p>
            </div>
            <div className={card}>
              <div className="flex items-center gap-2 text-amber-100">
                <ShieldCheck className="h-5 w-5" />
                <h2 className="font-semibold">Conectări și setări</h2>
              </div>
              <p className="mt-3 text-sm text-slate-300">
                Metricool în magazin:{" "}
                {query.data.metricool.status === "active"
                  ? "înregistrat în panou; accesul API rămâne de verificat"
                  : "fără conexiune API verificată"}
                . Planul Free permite folosirea aplicației Metricool; importul automat în panou
                necesită acces API dintr-un plan care îl include.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  to="/admin/accounts"
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/10"
                >
                  Conturi
                </Link>
                <Link
                  to="/admin/integrations"
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/10"
                >
                  Integrări
                </Link>
                <Link
                  to="/admin/traffic"
                  className="rounded-lg border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/10"
                >
                  Trafic magazin
                </Link>
              </div>
            </div>
          </section>
        </>
      ) : null}
      <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
        <BarChart3 className="mt-0.5 h-4 w-4 shrink-0" />
        Cifrele salvate sunt rapoarte periodice Metricool, nu date în timp real. Consultă Metricool
        pentru consumul actual al limitei Free și rezultatele cele mai recente.
      </p>
    </div>
  );
}
