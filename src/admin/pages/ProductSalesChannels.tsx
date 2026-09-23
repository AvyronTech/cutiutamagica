import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { salesChannelDefinitions, type SalesChannelCode } from "@/lib/sales-channels";
type Channel = {
  code: SalesChannelCode;
  title: string;
  description: string;
  listingUrl: string;
  status: string;
  version: number;
  publishedAt: string | null;
  needsUpdate: boolean;
};
type Data = {
  catalogHash: string;
  product: {
    name: string;
    price: number | null;
    availability: string;
    url: string;
    imageUrl: string;
    sku: string;
  };
  channels: Channel[];
};
const input = "mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-white";
export function ProductSalesChannels({ productId }: { productId: string }) {
  const url = `/api/v1/admin/products/${productId}/sales-channels`,
    [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["admin", "product-channels", productId],
    queryFn: async () => {
      const r = await fetch(url);
      const result = (await r.json()) as { data: Data; error?: { message: string } };
      if (!r.ok) throw new Error(result.error?.message);
      return result.data;
    },
    refetchOnWindowFocus: true,
  });
  async function save(e: FormEvent<HTMLFormElement>, channel: Channel) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      action = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ?? "save";
    setBusy(true);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: channel.code,
          expectedVersion: channel.version,
          action,
          title: f.get("title"),
          description: f.get("description"),
          listingUrl: f.get("listingUrl"),
          catalogHash: query.data?.catalogHash,
        }),
      });
      const result = (await r.json()) as { error?: { message: string } };
      if (!r.ok) throw new Error(result.error?.message);
      await query.refetch();
      toast.success(
        action === "prepare"
          ? "Anunț pregătit. Publică din portal, apoi înregistrează linkul."
          : action === "confirm_manual"
            ? "Publicare manuală înregistrată."
            : "Anunț salvat.",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-8 rounded-xl border border-slate-700 p-5 text-slate-200">
      <h2 className="text-lg font-semibold">Cutiuța pe fiecare canal</h2>
      <p className="my-3 text-sm text-slate-400">
        Textele provin din catalogul central și pot fi adaptate separat. Publicarea automată
        necesită conectarea contului și validarea cerințelor platformei. Confirmarea manuală
        reprezintă declarația administratorului.
      </p>
      <a href="/admin/integrations" className="text-sm text-amber-200 underline">
        Conturi și conexiuni →
      </a>
      {query.isError && (
        <p role="alert" className="mt-3">
          {query.error.message}
        </p>
      )}
      {query.data && (
        <>
          <p className="my-4 text-sm">
            Preț central: {query.data.product.price ?? "Nesetat"} lei ·{" "}
            {query.data.product.availability === "available"
              ? "Disponibil"
              : "Indisponibil pentru comandă"}
          </p>
          {query.data.channels.map((c) => (
            <details key={c.code} className="border-t border-slate-700 py-4">
              <summary className="cursor-pointer">
                {salesChannelDefinitions[c.code].name}{" "}
                <span className="ml-2 text-xs text-amber-200">
                  {c.needsUpdate
                    ? "Catalog modificat · verifică republicarea"
                    : c.status === "published_manual"
                      ? "Publicat · confirmare manuală"
                      : c.status === "awaiting_publication"
                        ? "Pregătit · așteaptă publicarea"
                        : "Ciornă"}
                </span>
              </summary>
              <p className="my-3 text-xs text-slate-400">{salesChannelDefinitions[c.code].help}</p>
              <form key={c.version} onSubmit={(e) => save(e, c)} className="space-y-3">
                <label className="block text-sm">
                  Titlu pentru canal
                  <input
                    name="title"
                    defaultValue={c.title}
                    required
                    maxLength={200}
                    className={input}
                  />
                </label>
                <label className="block text-sm">
                  Descriere pentru canal
                  <textarea
                    name="description"
                    rows={4}
                    defaultValue={c.description}
                    required
                    maxLength={8000}
                    className={input}
                  />
                </label>
                <label className="block text-sm">
                  Link anunț publicat
                  <input
                    name="listingUrl"
                    type="url"
                    defaultValue={c.listingUrl}
                    maxLength={500}
                    className={input}
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    disabled={busy}
                    value="save"
                    className="rounded-lg border border-slate-600 px-3 py-2 text-sm"
                  >
                    Salvează ciorna
                  </button>
                  <button
                    disabled={busy}
                    value="prepare"
                    className="rounded-lg bg-amber-200 px-3 py-2 text-sm text-slate-950"
                  >
                    {c.publishedAt ? "Pregătește republicarea" : "Pregătește publicarea"}
                  </button>
                  <button
                    disabled={busy}
                    value="confirm_manual"
                    className="rounded-lg border border-slate-600 px-3 py-2 text-sm"
                  >
                    Confirmă publicarea manuală
                  </button>
                  <a
                    href={salesChannelDefinitions[c.code].portal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 text-sm text-amber-200 underline"
                  >
                    Deschide platforma ↗
                  </a>
                  <button
                    type="button"
                    onClick={async (e) => {
                      const f = new FormData(e.currentTarget.form!);
                      try {
                        await navigator.clipboard.writeText(
                          `${f.get("title")}\n\n${f.get("description")}\n\n${query.data?.product.price ?? "Preț de stabilit"} lei\n${query.data?.product.url}`,
                        );
                        toast.success("Text copiat.");
                      } catch {
                        toast.error("Selectează și copiază textul din câmpuri.");
                      }
                    }}
                    className="px-3 py-2 text-sm underline"
                  >
                    Copiază anunțul
                  </button>
                </div>
              </form>
            </details>
          ))}
        </>
      )}
    </section>
  );
}
