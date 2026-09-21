import type { FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getPromotionsAdmin,
  saveProductPrice,
  saveVolumePromotion,
} from "@/lib/promotions.functions";
const field = "w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-white";
const button =
  "rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50";
export default function Promotions() {
  const load = useServerFn(getPromotionsAdmin),
    save = useServerFn(saveProductPrice),
    volume = useServerFn(saveVolumePromotion);
  const query = useQuery({ queryKey: ["admin", "promotions"], queryFn: () => load() });
  const onSuccess = () => {
    query.refetch();
    toast.success("Prețurile și oferta au fost salvate");
  };
  const onError = (e: Error) => toast.error(e.message);
  const mutation = useMutation({ mutationFn: save, onSuccess, onError });
  const volumeMutation = useMutation({ mutationFn: volume, onSuccess, onError });
  if (query.isError)
    return (
      <p role="alert">
        Promoțiile nu au putut fi încărcate.{" "}
        <button onClick={() => query.refetch()}>Reîncearcă</button>
      </p>
    );
  if (!query.data) return <p role="status">Se încarcă promoțiile...</p>;
  const promotion = query.data.promotion;
  function update(event: FormEvent<HTMLFormElement>, row: Record<string, string | number | null>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reference = String(form.get("reference") || "");
    mutation.mutate({
      data: {
        id: String(row.id),
        previousPriceBani: Number(row.price_bani),
        price: Number(form.get("price")),
        referencePrice: reference ? Number(reference) : null,
        evidence: String(form.get("evidence") || ""),
        confirmed: form.get("confirmed") === "on",
      },
    });
  }
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-white">Promoții și prețuri</h1>
        <p className="mt-2 text-sm text-slate-400">
          Prețuri folosite în catalog, coș și comandă. Reducerile individuale se combină cu oferta
          de volum numai dacă aceasta oferă un preț mai mic.
        </p>
      </header>
      {promotion && (
        <form
          className="grid max-w-2xl gap-4 border-y border-slate-700 py-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            volumeMutation.mutate({
              data: {
                active: f.get("active") === "on",
                unitPrice: Number(f.get("unitPrice")),
                minQuantity: Number(f.get("minQuantity")),
              },
            });
          }}
        >
          <h2 className="font-semibold text-white sm:col-span-2">Ofertă de volum</h2>
          <label className="text-sm text-slate-300">
            Preț / cutiuță (RON)
            <input
              name="unitPrice"
              type="number"
              min="0.01"
              step="0.01"
              required
              defaultValue={promotion.value / 100}
              className={field}
            />
          </label>
          <label className="text-sm text-slate-300">
            Minimum cutiuțe în coș
            <input
              name="minQuantity"
              type="number"
              min="2"
              max="40"
              required
              defaultValue={Number(promotion.min_quantity)}
              className={field}
            />
          </label>
          <label className="flex gap-2 text-sm text-slate-300">
            <input type="checkbox" name="active" defaultChecked={promotion.status === "active"} />
            Ofertă activă
          </label>
          <button disabled={volumeMutation.isPending} className={button}>
            Salvează oferta
          </button>
        </form>
      )}
      <p className="text-sm text-slate-400">
        Prețul tăiat este prețul anterior minim practicat în ultimele 30 de zile. Completează numai
        pe baza unui istoric verificabil; sistemul verifică și modificările locale cunoscute. Fără
        referință documentată se afișează doar prețul curent.
      </p>
      <div className="grid gap-5 xl:grid-cols-2">
        {query.data.prices.map((row) => (
          <form
            key={`${row.id}:${row.price_bani}:${row.compare_at_bani}`}
            onSubmit={(e) => update(e, row)}
            className="space-y-4 rounded-lg border border-slate-700 p-5"
          >
            <h2 className="font-semibold text-white">{String(row.name)}</h2>
            <p className="text-xs text-slate-400">
              {String(row.sku)} · {String(row.currency)}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-300">
                Preț curent
                <input
                  name="price"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  defaultValue={Number(row.price_bani) / 100}
                  className={field}
                />
              </label>
              <label className="text-xs text-slate-300">
                Preț anterior (opțional)
                <input
                  name="reference"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={
                    row.compare_at_bani == null ? "" : Number(row.compare_at_bani) / 100
                  }
                  className={field}
                />
              </label>
            </div>
            <label className="block text-xs text-slate-300">
              Document / perioadă / dovadă pentru prețul anterior
              <textarea
                name="evidence"
                maxLength={1500}
                defaultValue={String(row.evidence ?? "")}
                className={field}
              />
            </label>
            <label className="flex items-start gap-2 text-xs leading-5 text-slate-300">
              <input name="confirmed" type="checkbox" />
              Am verificat prețul minim anterior și păstrez documentele justificative.
            </label>
            <button disabled={mutation.isPending} className={button}>
              Salvează prețul
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
