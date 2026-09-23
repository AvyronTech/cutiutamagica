import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
type Inventory = {
  variant: { id: string; sku: string; version: number; inventory_policy: string };
  levels: {
    locationId: string;
    name: string;
    version: number;
    onHand: number;
    reserved: number;
    safety: number;
  }[];
};
export function ProductInventory({
  productId,
  onChanged,
}: {
  productId: string;
  onChanged: () => Promise<unknown>;
}) {
  const url = `/api/v1/admin/products/${productId}/inventory`,
    [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["admin", "product-inventory", productId],
    queryFn: async () => {
      const r = await fetch(url);
      if (!r.ok) throw new Error("Stocul nu poate fi încărcat.");
      return ((await r.json()) as { data: Inventory }).data;
    },
  });
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!query.data) return;
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const r = await fetch(url, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          variantId: query.data.variant.id,
          expectedVersion: query.data.variant.version,
          policy: form.get("policy"),
          levels: query.data.levels.map((l) => ({
            locationId: l.locationId,
            version: l.version,
            onHand: Number(form.get(`${l.locationId}-onHand`)),
            safety: Number(form.get(`${l.locationId}-safety`)),
          })),
        }),
      });
      const result = (await r.json()) as { error?: { message: string } };
      if (!r.ok) throw new Error(result.error?.message || "Nu am putut salva stocul.");
      await query.refetch();
      await onChanged();
      toast.success("Stocul a fost actualizat.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-8 rounded-xl border border-slate-700 p-5 text-slate-200">
      <h2 className="text-lg font-semibold">Preț și stoc</h2>
      <a href="/admin/promotions" className="mt-2 inline-block text-sm text-amber-200 underline">
        Editează prețurile și promoțiile →
      </a>
      {query.isLoading ? (
        <p>Se încarcă stocul…</p>
      ) : query.isError ? (
        <p role="alert">Stocul nu poate fi încărcat.</p>
      ) : (
        query.data && (
          <form key={query.dataUpdatedAt} onSubmit={save} className="mt-5 space-y-4">
            <label className="block text-sm">
              Disponibilitate din stoc
              <select
                name="policy"
                defaultValue={
                  query.data.variant.inventory_policy === "untracked" ? "untracked" : "deny"
                }
                className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 p-3"
              >
                <option value="deny">Doar în limita stocului disponibil</option>
                <option value="untracked">Stoc neadministrat numeric</option>
              </select>
            </label>
            {query.data.levels.map((l) => (
              <div
                key={l.locationId}
                className="grid grid-cols-2 gap-3 border-t border-slate-700 pt-4"
              >
                <p className="col-span-2 text-sm">
                  {l.name} · {l.reserved} rezervate pentru comenzi
                </p>
                <label className="text-xs">
                  Cantitate fizică
                  <input
                    name={`${l.locationId}-onHand`}
                    type="number"
                    min={l.reserved}
                    max={1000000}
                    required
                    defaultValue={l.onHand}
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 p-3"
                  />
                </label>
                <label className="text-xs">
                  Stoc de siguranță
                  <input
                    name={`${l.locationId}-safety`}
                    type="number"
                    min={0}
                    max={1000000}
                    required
                    defaultValue={l.safety}
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 p-3"
                  />
                </label>
              </div>
            ))}
            <p className="text-xs text-slate-400">
              Disponibil = cantitate fizică − rezervări − stoc de siguranță. La epuizare, produsul
              trece automat în „Magia care urmează”.
            </p>
            <button
              disabled={busy || !query.data.levels.length}
              className="rounded-lg bg-amber-200 px-4 py-3 text-sm font-medium text-slate-950 disabled:opacity-50"
            >
              {busy ? "Se salvează…" : "Salvează stocul"}
            </button>
            <button
              type="button"
              onClick={() => void query.refetch()}
              className="ml-4 text-sm underline"
            >
              Reîncarcă
            </button>
          </form>
        )
      )}
    </section>
  );
}
