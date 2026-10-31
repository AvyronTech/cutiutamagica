import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Search } from "lucide-react";
import {
  getGrowthSettings,
  getSupplierResearch,
  runSupplierResearch,
} from "@/lib/growth.functions";

export default function SupplierResearch({ productId }: { productId: string }) {
  const load = useServerFn(getSupplierResearch),
    run = useServerFn(runSupplierResearch),
    loadSettings = useServerFn(getGrowthSettings);
  const settings = useQuery({
    queryKey: ["admin", "growth"],
    queryFn: () => loadSettings(),
    staleTime: 30_000,
  });
  const query = useQuery({
    queryKey: ["admin", "suppliers", productId],
    queryFn: () => load({ data: { productId } }),
  });
  const mutation = useMutation({
    mutationFn: () => run({ data: { productId } }),
    onSuccess: (r) => {
      toast[r.count ? "success" : "info"](
        r.count
          ? `${r.count} surse relevante găsite`
          : "Căutarea s-a încheiat fără surse eligibile",
      );
      query.refetch();
    },
    onError: (e) => {
      toast.error(e.message);
      query.refetch();
    },
  });
  const brave = settings.data?.credentials.find((item) => item.provider === "brave");
  const ready = Boolean(settings.data?.research.enabled && brave?.configured);
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl text-white">Relevanță și aprovizionare</h2>
        <button
          disabled={mutation.isPending || !ready}
          onClick={() => mutation.mutate()}
          className="flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
        >
          <Search size={16} />
          {mutation.isPending ? "Se caută surse..." : "Caută top 5 furnizori"}
        </button>
      </div>
      <p className="text-sm text-slate-400">
        Surse sugerate pentru verificare înainte de import. Clasamentul compară denumirea și
        descrierea; nu certifică autenticitatea produsului sau reputația vânzătorului.
      </p>
      {settings.isError ? (
        <p role="alert" className="text-sm text-rose-200">
          Starea conexiunii Brave Search nu a putut fi citită.
        </p>
      ) : !settings.isPending && !ready ? (
        <p
          role="status"
          className="rounded-lg border border-amber-300/25 bg-amber-300/5 p-3 text-sm text-amber-100"
        >
          {!brave?.configured
            ? "Căutarea este în așteptare: cheia Brave Search lipsește. Configureaz-o securizat în Aprovizionare, apoi revino la produs."
            : "Căutarea este dezactivată în Aprovizionare. Activează cercetarea și salvează setările înainte de a căuta."}
        </p>
      ) : null}
      <a href="/admin/suppliers" className="text-sm text-cyan-300 underline">
        Configurează Brave Search și bugetul de căutare
      </a>
      {query.isError ? (
        <p role="alert">Sursele nu au putut fi încărcate.</p>
      ) : query.isPending ? (
        <p role="status">Se încarcă...</p>
      ) : (
        <>
          {query.data.runs[0] && (
            <p className="text-xs text-slate-400">
              Ultima încercare: {String(query.data.runs[0].created_at)} ·{" "}
              {String(query.data.runs[0].status)} {String(query.data.runs[0].error ?? "")}
            </p>
          )}
          {!query.data.suggestions.length && (
            <p className="py-8 text-slate-400">
              Nu există încă oferte relevante. Configurează căutarea și pornește cercetarea pentru
              acest produs.
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {query.data.suggestions.map((s) => (
              <article
                key={String(s.id)}
                className="space-y-3 rounded-lg border border-slate-700 p-5"
              >
                <p className="text-xs text-cyan-300">
                  #{String(s.rank)} · {String(s.marketplace)} · Relevanță {String(s.relevance)}%
                </p>
                <h3 className="font-medium text-white">{String(s.title)}</h3>
                <p className="text-sm text-slate-300">
                  {String(s.price_text ?? "Preț indisponibil; solicită ofertă")}
                  {s.price_text ? " · preț indexat, neconfirmat" : ""}
                </p>
                <p className="text-xs leading-5 text-slate-400">{String(s.evidence)}</p>
                <p className="text-xs text-slate-400">Sursă consultată: {String(s.checked_at)}</p>
                <a
                  className="inline-flex items-center gap-2 text-sm text-cyan-300"
                  href={String(s.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Vezi oferta <ExternalLink size={14} />
                </a>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
