import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Save } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  getPersonalizationSources,
  savePersonalizationTemuSource,
} from "@/lib/personalization-admin.functions";
import { personalizationBoxModels } from "@/lib/personalization";

const field = "min-h-11 rounded-lg border border-slate-600 bg-slate-950 px-3 text-slate-100";
const sourceStatus = { draft: "Ciornă", verified: "Verificată", inactive: "Inactivă" };

export function PersonalizationSourceSetup() {
  const load = useServerFn(getPersonalizationSources);
  const save = useServerFn(savePersonalizationTemuSource);
  const client = useQueryClient();
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["admin", "personalization-sources"],
    queryFn: () => load(),
    staleTime: 60_000,
  });
  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof save>[0]) => save(data),
    onSuccess: async () => {
      setError("");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin", "personalization-sources"] }),
        client.invalidateQueries({ queryKey: ["admin", "personalization-procurement-queue"] }),
        client.invalidateQueries({ queryKey: ["admin", "personalization-procurement"] }),
      ]);
    },
    onError: (cause) =>
      setError(cause instanceof Error ? cause.message : "Sursa nu a putut fi salvată."),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    mutation.mutate({
      data: {
        boxModel: String(values.get("boxModel")) as "classic" | "panorama" | "keepsake",
        sourceUrl: String(values.get("sourceUrl")),
        listingTitle: String(values.get("listingTitle")),
        variantLabel: String(values.get("variantLabel")),
        priceText: String(values.get("priceText")),
        externalListingId: String(values.get("externalListingId")),
      },
    });
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-[#0d1728] p-4 text-slate-100 sm:p-6">
      <h2 className="text-lg font-semibold text-white">Surse pentru viitorul atelier</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        Configurarea sursei se face aici, în Aprovizionare. Fluxul existent acceptă numai linkuri
        Temu verificate manual. Salvarea în D1 poate pregăti cererile existente pentru comandă, dar
        nu plasează o comandă și nu efectuează o plată.
      </p>
      <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-2 text-xs text-slate-300">
          Model
          <select name="boxModel" className={field}>
            {personalizationBoxModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-xs text-slate-300 md:col-span-2">
          Linkul sursei Temu
          <input
            required
            name="sourceUrl"
            type="url"
            placeholder="https://www.temu.com/..."
            className={field}
          />
        </label>
        <label className="grid gap-2 text-xs text-slate-300">
          Titlul anunțului
          <input required name="listingTitle" className={field} />
        </label>
        <label className="grid gap-2 text-xs text-slate-300">
          Varianta exactă
          <input name="variantLabel" className={field} />
        </label>
        <label className="grid gap-2 text-xs text-slate-300">
          Preț observat
          <input name="priceText" className={field} />
        </label>
        <label className="grid gap-2 text-xs text-slate-300">
          ID extern · opțional
          <input name="externalListingId" className={field} />
        </label>
        <button
          disabled={mutation.isPending}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-lg bg-violet-300 px-4 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {mutation.isPending ? "Se salvează…" : "Salvează sursa"}
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-4 text-sm text-rose-200">
          {error}
        </p>
      )}
      {query.isError && (
        <p role="alert" className="mt-4 text-sm text-rose-200">
          Sursele existente nu au putut fi citite.
        </p>
      )}
      {query.data && (
        <div className="mt-5 space-y-2">
          <h3 className="text-sm font-semibold text-white">Surse înregistrate</h3>
          {query.data.sources.length === 0 && (
            <p className="text-xs text-slate-400">Nicio sursă înregistrată.</p>
          )}
          {query.data.sources.map((source) => (
            <div
              key={source.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 p-3 text-xs text-slate-300"
            >
              <span>
                {personalizationBoxModels.find((model) => model.id === source.boxModel)?.label ??
                  source.boxModel}{" "}
                · {source.listingTitle} · {sourceStatus[source.status]}
              </span>
              <a
                href={source.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-cyan-200 underline"
              >
                Deschide sursa <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
