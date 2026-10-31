import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { getPersonalizationProcurement } from "@/lib/personalization-admin.functions";
import { formatPersonalizationPrice } from "@/lib/personalization";

const productionLabel = {
  received: "Primită",
  contacted: "Contactată",
  approved: "Aprobată",
  in_production: "În producție",
  shipped: "Expediată",
  cancelled: "Anulată",
} as const;

export default function PersonalizationProcurement() {
  const load = useServerFn(getPersonalizationProcurement);
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["admin", "personalization-procurement"],
    queryFn: () => load(),
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "personalization-procurement"] });
  async function assignCode(requestId: string) {
    await updateInternalCode({ action: "personalization.assign", requestId }, requestId);
  }
  async function advanceProduction(requestId: string, status: string) {
    await updateInternalCode({ action: "personalization.status", requestId, status }, requestId);
  }
  async function updateInternalCode(body: unknown, requestId: string) {
    setAssigningId(requestId);
    setError("");
    try {
      const response = await fetch("/api/v1/admin/product-identification", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Codul nu a putut fi alocat.");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Codul nu a putut fi alocat.");
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div className="space-y-6 p-4 text-slate-100 sm:p-6">
      <header className="rounded-2xl border border-violet-300/15 bg-[radial-gradient(circle_at_top_right,#6d28d933,transparent_40%),#0d1728] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
          Atelier în pregătire
        </p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Personalizează cutiuța</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Viitoarea experiență pentru melodie, finisaj și imagine pe capac. Pagina publică este încă
          în pregătire; aici urmărești numai cererile deja existente și pașii interni aferenți.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <a
            href="/personalizeaza"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-violet-300/30 px-3 py-2 text-violet-200"
          >
            Vezi pagina publică <ExternalLink className="inline h-3.5 w-3.5" />
          </a>
          <a
            href="/admin/procurement"
            className="rounded-lg border border-slate-600 px-3 py-2 text-slate-200"
          >
            Aprovizionarea modelelor
          </a>
        </div>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-400/20 bg-red-950/30 p-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}
      {query.isError && (
        <p
          role="alert"
          className="rounded-lg border border-red-400/20 bg-red-950/30 p-3 text-sm text-red-200"
        >
          Cererile nu au putut fi încărcate. Reîncearcă.
        </p>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-violet-300" /> Cereri de personalizare
          </h2>
          <button
            onClick={() => void refresh()}
            className="rounded-lg border border-slate-700 p-2 text-slate-300"
            aria-label="Reîncarcă"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        {query.isLoading ? <p className="text-sm text-slate-400">Se încarcă…</p> : null}
        {query.data?.requests.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-600 bg-[#0d1728] p-6 text-sm text-slate-300">
            Nu există cereri. Atelierul public rămâne în pregătire; nu se poate iniția aici o
            comandă sau o plată.
          </p>
        )}
        {query.data?.requests.map((request) => (
          <article
            key={request.id}
            className="grid gap-4 rounded-xl border border-slate-700/70 bg-[#0d1728] p-4 lg:grid-cols-[1fr_auto] lg:items-center"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <strong>{request.customerName}</strong>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                {request.boxModel} · {request.boxColor} · {request.melody}
                {request.engraving ? ` · „${request.engraving}”` : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {request.email} · {request.phone} · {formatPersonalizationPrice(request.totalBani)}
              </p>
              {request.internalCode ? (
                <p className="mt-1 font-mono text-xs text-cyan-200">
                  Cod intern: {request.internalCode} ·{" "}
                  {request.internalStatus
                    ? productionLabel[request.internalStatus]
                    : "Înregistrată"}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {!request.internalCode ? (
                <button
                  type="button"
                  disabled={assigningId === request.id}
                  onClick={() => void assignCode(request.id)}
                  className="flex min-h-10 items-center gap-2 rounded-lg border border-cyan-300/25 px-3 text-xs font-semibold text-cyan-200 disabled:opacity-50"
                >
                  Alocă cod intern
                </button>
              ) : null}
              {request.internalCode &&
              (request.internalStatus === "received" ||
                request.internalStatus === "contacted" ||
                (request.internalStatus === "approved" &&
                  request.procurementStatus === "received")) ? (
                <button
                  type="button"
                  disabled={assigningId === request.id}
                  onClick={() =>
                    void advanceProduction(
                      request.id,
                      request.internalStatus === "approved" ? "in_production" : "approved",
                    )
                  }
                  className="flex min-h-10 items-center gap-2 rounded-lg border border-emerald-300/25 px-3 text-xs font-semibold text-emerald-200 disabled:opacity-50"
                >
                  {request.internalStatus === "approved" ? "Începe producția" : "Aprobă producția"}
                </button>
              ) : null}
              {request.internalStatus === "approved" &&
                request.procurementStatus !== "received" && (
                  <span className="self-center text-xs text-amber-200">
                    Producția așteaptă primirea componentelor.
                  </span>
                )}
              {request.internalCode &&
                request.internalStatus === "in_production" &&
                request.procurementStatus === "received" && (
                  <button
                    type="button"
                    disabled={assigningId === request.id}
                    onClick={() => void advanceProduction(request.id, "shipped")}
                    className="flex min-h-10 items-center gap-2 rounded-lg border border-emerald-300/25 px-3 text-xs font-semibold text-emerald-200 disabled:opacity-50"
                  >
                    Marchează expediată
                  </button>
                )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
