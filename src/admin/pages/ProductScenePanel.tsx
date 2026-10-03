import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { sceneKeys, type ProductScene } from "@/lib/product-themes";
const labels = {
  library: "Bibliotecă magică",
  winter: "Iarnă",
  sunshine: "Raze de soare",
  garden: "Grădină",
  autumn: "Toamnă",
  forest: "Pădure",
  starlight: "Lumină de stele",
  ocean: "Ocean",
  galaxy: "Galaxie",
};
export function ProductScenePanel({ productId }: { productId: string }) {
  const url = `/api/v1/admin/products/${productId}/scene`,
    [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["admin", "scene", productId],
    queryFn: async () => {
      const r = await fetch(url);
      if (!r.ok) throw new Error("Scena nu poate fi încărcată.");
      return ((await r.json()) as { data: ProductScene & { version: number } }).data;
    },
  });
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const r = await fetch(url, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scene: f.get("scene"),
          accent: f.get("accent"),
          occasion: f.get("occasion"),
          expectedVersion: query.data?.version,
        }),
      });
      const body = (await r.json()) as { error?: { message: string } };
      if (!r.ok) throw new Error(body.error?.message);
      await query.refetch();
      toast.success("Universul cutiuței a fost salvat.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const input = "mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-white";
  return (
    <section className="mt-8 rounded-xl border border-slate-700 p-5 text-slate-200">
      <h2 className="text-lg font-semibold">Universul paginii de produs</h2>
      <p className="mt-2 text-sm text-slate-400">
        Decor, culoare și emoția cadoului. Fotografiile și descrierile rămân cele din catalog.
      </p>
      {query.isError && <p role="alert">Scena nu poate fi încărcată.</p>}
      {query.data && (
        <form key={query.dataUpdatedAt} onSubmit={save} className="mt-4 space-y-4">
          <label className="block text-sm">
            Scenă
            <select name="scene" defaultValue={query.data.scene} className={input}>
              {sceneKeys.map((s) => (
                <option key={s} value={s}>
                  {labels[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Culoare de accent
            <input
              name="accent"
              type="color"
              defaultValue={query.data.accent}
              className="ml-4 h-10 w-20"
            />
          </label>
          <label className="block text-sm">
            Gândul din deschiderea paginii
            <input
              name="occasion"
              maxLength={180}
              defaultValue={query.data.occasion}
              className={input}
            />
          </label>
          <button disabled={busy} className="rounded-lg bg-amber-200 px-4 py-3 text-slate-950">
            {busy ? "Se salvează…" : "Salvează universul"}
          </button>
        </form>
      )}
    </section>
  );
}
