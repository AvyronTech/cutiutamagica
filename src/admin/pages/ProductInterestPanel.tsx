import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
type Request = { id: string; email: string; kind: string; status: string; created_at: string };
export function ProductInterestPanel({ productId }: { productId: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const url = `/api/v1/admin/products/${productId}/interest`;
  const query = useQuery({
    queryKey: ["admin", "interest", productId],
    queryFn: async () => {
      const r = await fetch(url);
      if (!r.ok) throw new Error("Nu am putut încărca solicitările.");
      return ((await r.json()) as { data: Request[] }).data;
    },
  });
  async function update(id: string, status: string) {
    setBusy(id);
    try {
      const r = await fetch(url, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!r.ok) throw new Error("Nu am putut salva statusul.");
      await query.refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="mt-8 rounded-xl border border-slate-700 p-5">
      <h2 className="text-lg font-semibold text-white">Interes și cereri de precomandă</h2>
      <p className="mt-1 text-xs text-slate-400">
        Solicitări fără plată. Contactează clientul după verificarea disponibilității. Sunt afișate
        cele mai recente 200.
      </p>
      {query.isLoading ? (
        <p className="mt-4 text-slate-400">Se încarcă…</p>
      ) : query.isError ? (
        <p role="alert" className="mt-4 text-red-300">
          Solicitările nu pot fi încărcate.
        </p>
      ) : !query.data?.length ? (
        <p className="mt-4 text-sm text-slate-400">
          Nu există încă solicitări pentru această cutiuță.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-slate-700">
          {query.data.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="break-all text-white">{r.email}</p>
                <p className="text-xs text-slate-400">
                  {r.kind === "preorder" ? "Precomandă" : "Notificare disponibilitate"} ·{" "}
                  {new Date(r.created_at).toLocaleDateString("ro-RO")}
                </p>
              </div>
              <select
                aria-label={`Status solicitare ${r.email}`}
                value={r.status}
                disabled={busy === r.id}
                onChange={(e) => void update(r.id, e.target.value)}
                className="rounded border border-slate-600 bg-slate-900 p-2 text-white"
              >
                <option value="new">Nouă</option>
                <option value="contacted">Contactat</option>
                <option value="closed">Închisă</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
