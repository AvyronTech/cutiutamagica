import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, PackageCheck, RefreshCw } from "lucide-react";
import { useState } from "react";
import {
  getPersonalizationProcurementQueue,
  updatePersonalizationProcurement,
} from "@/lib/personalization-admin.functions";

const statusLabel = {
  awaiting_source: "Așteaptă sursă",
  ready_to_order: "Pregătită de comandă",
  ordered: "Comandată",
  received: "Primită",
  cancelled: "Anulată",
} as const;

export function PersonalizationProcurementQueue() {
  const load = useServerFn(getPersonalizationProcurementQueue);
  const update = useServerFn(updatePersonalizationProcurement);
  const client = useQueryClient();
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["admin", "personalization-procurement-queue"],
    queryFn: () => load(),
  });
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ["admin", "personalization-procurement-queue"] }),
      client.invalidateQueries({ queryKey: ["admin", "personalization-procurement"] }),
    ]);
  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof update>[0]) => update(data),
    onSuccess: () => {
      setError("");
      void refresh();
    },
    onError: (cause) =>
      setError(cause instanceof Error ? cause.message : "Starea nu a putut fi salvată."),
  });

  return (
    <section className="space-y-3 rounded-xl border border-slate-700 bg-[#0d1728] p-4 text-slate-100 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Cererile care au nevoie de componente</h2>
          <p className="mt-1 text-xs text-slate-400">
            Marcarea stării consemnează un pas intern; nu plasează o comandă la furnizor.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          aria-label="Reîncarcă aprovizionarea"
          className="rounded-lg border border-slate-600 p-2 text-slate-200"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-rose-200">
          {error}
        </p>
      )}
      {query.isError && (
        <p role="alert" className="text-sm text-rose-200">
          Cererile nu au putut fi încărcate.
        </p>
      )}
      {query.isPending && (
        <p role="status" className="text-sm text-slate-300">
          Se încarcă…
        </p>
      )}
      {query.data?.requests.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-600 p-4 text-sm text-slate-300">
          Nu există cereri de aprovizionat.
        </p>
      )}
      {query.data?.requests.map((request) => (
        <article
          key={request.id}
          className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-700 p-4"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              {request.internalCode ?? `Cerere ${request.id.slice(0, 8)}`} · {request.boxModel}
            </p>
            <p className="mt-1 text-xs text-slate-300">{statusLabel[request.procurementStatus]}</p>
            {request.listingTitle && (
              <p className="mt-1 text-xs text-slate-400">
                {request.listingTitle}
                {request.variantLabel ? ` · ${request.variantLabel}` : ""}
                {request.priceText ? ` · ${request.priceText}` : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {request.sourceUrl && (
              <a
                href={request.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-cyan-300/25 px-3 text-xs font-semibold text-cyan-200"
              >
                Deschide sursa <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            {request.procurementStatus === "ready_to_order" && (
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({ data: { requestId: request.id, status: "ordered" } })
                }
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-amber-300 px-3 text-xs font-semibold text-slate-950 disabled:opacity-50"
              >
                Marchează comandată <PackageCheck className="h-3.5 w-3.5" />
              </button>
            )}
            {request.procurementStatus === "ordered" && (
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({ data: { requestId: request.id, status: "received" } })
                }
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-300 px-3 text-xs font-semibold text-slate-950 disabled:opacity-50"
              >
                Marchează primită <PackageCheck className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
