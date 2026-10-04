import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, PackageCheck, RefreshCw, Save, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  getPersonalizationProcurement,
  savePersonalizationTemuSource,
  updatePersonalizationProcurement,
} from "@/lib/personalization-admin.functions";
import { formatPersonalizationPrice, personalizationBoxModels } from "@/lib/personalization";

const statusLabel = {
  awaiting_source: "Așteaptă sursă",
  ready_to_order: "Pregătită de comandă",
  ordered: "Comandată",
  received: "Primită",
  cancelled: "Anulată",
} as const;

export default function PersonalizationProcurement() {
  const load = useServerFn(getPersonalizationProcurement);
  const saveSource = useServerFn(savePersonalizationTemuSource);
  const updateStatus = useServerFn(updatePersonalizationProcurement);
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["admin", "personalization-procurement"],
    queryFn: () => load(),
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "personalization-procurement"] });
  const sourceMutation = useMutation({
    mutationFn: (data: Parameters<typeof saveSource>[0]) => saveSource(data),
    onSuccess: () => {
      setError("");
      void refresh();
    },
    onError: (cause) =>
      setError(cause instanceof Error ? cause.message : "Sursa nu a putut fi salvată."),
  });
  const statusMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateStatus>[0]) => updateStatus(data),
    onSuccess: () => {
      setError("");
      void refresh();
    },
    onError: (cause) =>
      setError(cause instanceof Error ? cause.message : "Starea nu a putut fi salvată."),
  });

  const submitSource = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    sourceMutation.mutate({
      data: {
        boxModel: String(form.get("boxModel")) as "classic" | "panorama" | "keepsake",
        sourceUrl: String(form.get("sourceUrl")),
        listingTitle: String(form.get("listingTitle")),
        variantLabel: String(form.get("variantLabel")),
        priceText: String(form.get("priceText")),
        externalListingId: String(form.get("externalListingId")),
      },
    });
  };

  return (
    <div className="space-y-6 p-4 text-slate-100 sm:p-6">
      <header className="rounded-2xl border border-violet-300/15 bg-[radial-gradient(circle_at_top_right,#6d28d933,transparent_40%),#0d1728] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
          Atelier sincronizat
        </p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Personalizări și aprovizionare</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Leagă fiecare model de un anunț Temu verificat. Deschiderea și plata rămân acțiuni
          explicite ale administratorului, iar fiecare schimbare este auditată.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-700/70 bg-[#0d1728] p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-300" />
          <h2 className="text-lg font-semibold">Sursă Temu verificată</h2>
        </div>
        <form onSubmit={submitSource} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-2 text-xs text-slate-300">
            Model
            <select
              name="boxModel"
              className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3"
            >
              {personalizationBoxModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-xs text-slate-300 md:col-span-2">
            Link Temu
            <input
              required
              name="sourceUrl"
              type="url"
              placeholder="https://www.temu.com/..."
              className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3"
            />
          </label>
          <label className="grid gap-2 text-xs text-slate-300">
            Titlul anunțului
            <input
              required
              name="listingTitle"
              className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3"
            />
          </label>
          <label className="grid gap-2 text-xs text-slate-300">
            Varianta exactă
            <input
              name="variantLabel"
              className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3"
            />
          </label>
          <label className="grid gap-2 text-xs text-slate-300">
            Preț observat
            <input
              name="priceText"
              placeholder="ex. 42,90 lei"
              className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3"
            />
          </label>
          <label className="grid gap-2 text-xs text-slate-300">
            ID extern · opțional
            <input
              name="externalListingId"
              className="min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3"
            />
          </label>
          <button
            disabled={sourceMutation.isPending}
            className="flex min-h-11 items-center justify-center gap-2 self-end rounded-lg bg-violet-300 px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Salvează și sincronizează
          </button>
        </form>
        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-400/20 bg-red-950/30 p-3 text-sm text-red-200"
          >
            {error}
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Cereri de aprovizionat</h2>
          <button
            onClick={() => void refresh()}
            className="rounded-lg border border-slate-700 p-2 text-slate-300"
            aria-label="Reîncarcă"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        {query.isLoading ? <p className="text-sm text-slate-400">Se încarcă…</p> : null}
        {query.data?.requests.map((request) => (
          <article
            key={request.id}
            className="grid gap-4 rounded-xl border border-slate-700/70 bg-[#0d1728] p-4 lg:grid-cols-[1fr_auto] lg:items-center"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <strong>{request.customerName}</strong>
                <span className="rounded-full border border-violet-300/20 bg-violet-300/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
                  {statusLabel[request.procurementStatus]}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-400">
                {request.boxModel} · {request.boxColor} · {request.melody}
                {request.engraving ? ` · „${request.engraving}”` : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {request.email} · {request.phone} · {formatPersonalizationPrice(request.totalBani)}
              </p>
              {request.listingTitle ? (
                <p className="mt-3 text-xs text-emerald-300">
                  Sursă: {request.listingTitle}
                  {request.variantLabel ? ` · ${request.variantLabel}` : ""}
                  {request.priceText ? ` · ${request.priceText}` : ""}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {request.sourceUrl ? (
                <a
                  href={request.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-10 items-center gap-2 rounded-lg border border-cyan-300/25 px-3 text-xs font-semibold text-cyan-200"
                >
                  Deschide în Temu <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : null}
              {request.procurementStatus === "ready_to_order" ? (
                <button
                  onClick={() =>
                    statusMutation.mutate({ data: { requestId: request.id, status: "ordered" } })
                  }
                  className="flex min-h-10 items-center gap-2 rounded-lg bg-amber-300 px-3 text-xs font-semibold text-slate-950"
                >
                  Marchează comandată <PackageCheck className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {request.procurementStatus === "ordered" ? (
                <button
                  onClick={() =>
                    statusMutation.mutate({ data: { requestId: request.id, status: "received" } })
                  }
                  className="flex min-h-10 items-center gap-2 rounded-lg bg-emerald-300 px-3 text-xs font-semibold text-slate-950"
                >
                  Marchează primită <PackageCheck className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
