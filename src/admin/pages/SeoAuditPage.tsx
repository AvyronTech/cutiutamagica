import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CheckCircle2, ExternalLink, RefreshCw, SearchCheck } from "lucide-react";
import { getSeoAudit } from "@/lib/seo-audit.functions";

const endpointChecks = [
  {
    label: "Robots",
    path: "/robots.txt",
    valid: (body: string) =>
      body.includes("Sitemap: https://cutiutamagica.eu/sitemap.xml") &&
      body.includes("Sitemap: https://cutiutamagica.eu/sitemap.txt"),
    action: "Declară indexul XML și sitemapul text în robots.txt.",
  },
  {
    label: "Index sitemapuri",
    path: "/sitemap.xml",
    valid: (body: string) =>
      body.includes("<sitemapindex") &&
      body.includes("/sitemap-core.xml") &&
      body.includes("/sitemap-products.xml") &&
      body.includes("/sitemap-guides.xml"),
    action: "Publică indexul XML cu cele trei sitemapuri.",
  },
  {
    label: "Sitemap pagini esențiale",
    path: "/sitemap-core.xml",
    valid: (body: string) =>
      body.includes("<urlset") && body.includes("https://cutiutamagica.eu/produse"),
    action: "Publică paginile esențiale în sitemapul static.",
  },
  {
    label: "Sitemap produse",
    path: "/sitemap-products.xml",
    valid: (body: string) => body.includes("<urlset") && body.includes("/produs-cutiuta-muzicala-"),
    action: "Verifică citirea catalogului D1 și cache-ul produselor publicate.",
  },
  {
    label: "Sitemap text de rezervă",
    path: "/sitemap.txt",
    valid: (body: string) =>
      body.startsWith("https://cutiutamagica.eu/\n") &&
      body.includes("https://cutiutamagica.eu/produse\n"),
    action: "Servește URL-urile canonice din același catalog public ca sitemapul XML.",
  },
  {
    label: "Sitemap ghiduri",
    path: "/sitemap-guides.xml",
    valid: (body: string) => body.includes("<urlset") && body.includes("/cadouri/"),
    action: "Include sitemapul ghidurilor în buildul publicat.",
  },
  {
    label: "llms.txt dinamic",
    path: "/llms.txt",
    valid: (body: string) =>
      body.startsWith("# Cutiuța Magică") && body.includes("## Produse publicate"),
    action: "Elimină fișierul static și servește ruta din catalogul D1.",
  },
] as const;

async function checkPublicEndpoints() {
  return Promise.all(
    endpointChecks.map(async (check) => {
      try {
        const response = await fetch(check.path, { cache: "no-store", credentials: "omit" });
        const body = await response.text();
        return { ...check, ok: response.ok && check.valid(body), status: response.status };
      } catch {
        return { ...check, ok: false, status: 0 };
      }
    }),
  );
}

export default function SeoAuditPage() {
  const load = useServerFn(getSeoAudit);
  const query = useQuery({
    queryKey: ["admin", "seo-audit"],
    queryFn: () => load(),
    staleTime: 60_000,
  });
  const technicalQuery = useQuery({
    queryKey: ["admin", "seo-endpoints"],
    queryFn: checkPublicEndpoints,
    staleTime: 60_000,
    enabled: typeof window !== "undefined",
  });
  const audit = query.data;
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 text-slate-100 sm:px-6">
      <header className="rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-slate-900 to-slate-950 p-5 sm:p-7">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
          <SearchCheck size={16} /> Vizibilitate organică
        </p>
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">SEO și indexare</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
          Auditul citește catalogul publicat și ghidurile existente. Arată lipsurile pe care le
          putem corecta în magazin; indexarea efectivă se confirmă în Google Search Console.
        </p>
        <button
          type="button"
          onClick={() => {
            void query.refetch();
            void technicalQuery.refetch();
          }}
          disabled={query.isFetching || technicalQuery.isFetching}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-cyan-300/40 px-4 text-sm font-medium text-cyan-200 hover:bg-cyan-300/10 disabled:opacity-50"
        >
          <RefreshCw size={16} /> Reverifică
        </button>
      </header>

      {query.isPending ? (
        <p role="status" className="text-sm text-slate-300">
          Se verifică produsele și ghidurile…
        </p>
      ) : null}
      {query.isError ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-400/30 bg-rose-950/30 p-4 text-sm text-rose-200"
        >
          Auditul nu a putut citi catalogul. Reîncearcă după verificarea conexiunii D1.
        </p>
      ) : null}
      {audit ? (
        <>
          <section aria-label="Rezumat audit" className="grid gap-3 sm:grid-cols-4">
            {[
              ["Produse publicate", audit.productCount],
              ["Ghiduri", audit.guideCount],
              ["Probleme critice", audit.criticalCount],
              ["Îmbunătățiri", audit.improvementCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
              </div>
            ))}
          </section>
          <section
            aria-labelledby="seo-findings"
            className="rounded-xl border border-slate-700 bg-slate-900/60 p-5"
          >
            <h2 id="seo-findings" className="text-lg font-semibold">
              Corecții recomandate
            </h2>
            {audit.findings.length ? (
              <ul className="mt-4 space-y-3">
                {audit.findings.map((finding, index) => (
                  <li
                    key={`${finding.title}-${index}`}
                    className="rounded-lg border border-slate-700 bg-slate-950/50 p-4"
                  >
                    <div className="flex items-start gap-3">
                      {finding.severity === "critical" ? (
                        <AlertCircle className="mt-0.5 shrink-0 text-rose-300" size={18} />
                      ) : (
                        <AlertCircle className="mt-0.5 shrink-0 text-amber-300" size={18} />
                      )}
                      <div>
                        <h3 className="font-medium text-white">{finding.title}</h3>
                        <p className="mt-1 text-sm text-slate-300">{finding.detail}</p>
                        <p className="mt-2 text-sm text-cyan-200">{finding.action}</p>
                        {finding.path ? (
                          <a
                            href={finding.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs text-slate-400 underline underline-offset-2"
                          >
                            Vezi pagina publică <ExternalLink size={13} />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 flex items-center gap-2 text-sm text-emerald-200">
                <CheckCircle2 size={17} /> Nu s-au găsit lipsuri în câmpurile auditate.
              </p>
            )}
          </section>
        </>
      ) : null}
      <section
        aria-labelledby="seo-endpoints"
        className="rounded-xl border border-slate-700 bg-slate-900/60 p-5"
      >
        <h2 id="seo-endpoints" className="text-lg font-semibold">
          Verificări tehnice și externe
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Răspunsurile sunt citite acum de pe acest domeniu. Un cod 200 și un conținut valid nu
          confirmă că Google le-a preluat.
        </p>
        {technicalQuery.isPending ? (
          <p role="status" className="mt-4 text-sm text-slate-300">
            Se citesc fișierele publice…
          </p>
        ) : null}
        <ul className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {(
            technicalQuery.data ??
            endpointChecks.map((check) => ({ ...check, ok: false, status: null }))
          ).map((check) => (
            <li key={check.path} className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
              <p
                className={`flex items-center gap-2 font-medium ${check.status == null ? "text-slate-300" : check.ok ? "text-emerald-200" : "text-rose-200"}`}
              >
                {check.status == null
                  ? "Neverificat"
                  : check.ok
                    ? "Valid"
                    : check.status === 0
                      ? "Problemă · fără răspuns"
                      : `Problemă · HTTP ${check.status}`}
              </p>
              <a
                href={check.path}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 text-cyan-200 underline underline-offset-2"
              >
                {check.label} <ExternalLink size={14} />
              </a>
              {check.status != null && !check.ok ? (
                <p className="text-xs leading-5 text-rose-200">{check.action}</p>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-300">
          În{" "}
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-200 underline underline-offset-2"
          >
            Search Console
          </a>{" "}
          verifică „Sitemaps”, „Indexarea paginilor” și inspecția URL pentru paginile importante. Un
          sitemap acceptat nu garantează indexarea.
        </p>
      </section>
    </div>
  );
}
