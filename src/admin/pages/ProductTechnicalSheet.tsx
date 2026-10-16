import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import {
  BarChart3,
  Barcode,
  Boxes,
  FileText,
  Link2,
  PackageSearch,
  Printer,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { isValidGtin } from "@/lib/gtin";

type Sheet = {
  variant: {
    id: string;
    sku: string;
    ean_gtin: string | null;
    mpn: string | null;
    cost_bani: number | null;
    version: number;
  };
  source: {
    source_type: string;
    source_reference: string | null;
    verification_status: string;
    gtin_type: string | null;
    assigned_at: string | null;
    document_id: string | null;
  } | null;
  documents: Array<{
    id: string;
    document_type: string;
    document_number: string | null;
    review_status: string;
  }>;
  levels: Array<{
    name: string;
    on_hand_quantity: number;
    reserved_quantity: number;
    safety_stock_quantity: number;
  }>;
  sales: { orders_count: number; units_sold: number; sales_bani: number } | null;
  invoices: { invoice_count: number } | null;
};

const field =
  "mt-1.5 w-full rounded-xl border border-white/15 bg-[#0b1526] px-3 py-3 text-base text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/15";
const card =
  "rounded-2xl border border-white/10 bg-gradient-to-br from-[#182a40] to-[#0e1929] p-5 shadow-[0_20px_40px_rgba(0,0,0,.13)]";
const money = (bani: number) =>
  (bani / 100).toLocaleString("ro-RO", { style: "currency", currency: "RON" });

export function ProductTechnicalSheet({
  productId,
  onSaved,
  onOpenGeneral,
  onOpenSuppliers,
}: {
  productId: string;
  onSaved: () => Promise<unknown>;
  onOpenGeneral: () => void;
  onOpenSuppliers: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const query = useQuery({
    queryKey: ["admin", "product-technical-sheet", productId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/admin/products/${productId}/technical-sheet`);
      const payload = (await response.json()) as { data?: Sheet; error?: { message?: string } };
      if (!response.ok || !payload.data)
        throw new Error(payload.error?.message || "Fișa nu poate fi încărcată.");
      return payload.data;
    },
  });
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sheet = query.data;
    if (!sheet) return;
    const form = new FormData(event.currentTarget);
    const eanGtin = String(form.get("eanGtin") || "").trim();
    if (eanGtin && !isValidGtin(eanGtin)) {
      toast.error("EAN-ul are lungimea sau cifra de control greșită.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/admin/products/${productId}/technical-sheet`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          variantId: sheet.variant.id,
          expectedVersion: sheet.variant.version,
          eanGtin,
          mpn: String(form.get("mpn") || ""),
          cost: form.get("cost") === "" ? null : Number(form.get("cost")),
          identifierSource: form.get("identifierSource"),
          sourceReference: String(form.get("sourceReference") || ""),
          documentId: String(form.get("documentId") || "") || null,
          verifyGtin: form.get("verifyGtin") === "on",
          changeReason: String(form.get("changeReason") || ""),
        }),
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Nu am putut salva fișa.");
      await Promise.all([query.refetch(), onSaved()]);
      toast.success("Identificatorii produsului au fost salvați.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Fișa nu a putut fi salvată.");
    } finally {
      setBusy(false);
    }
  }
  if (query.isLoading) return <p className="text-sm text-slate-400">Se încarcă fișa tehnică…</p>;
  if (query.isError || !query.data)
    return (
      <p role="alert" className="text-sm text-rose-300">
        {query.error instanceof Error ? query.error.message : "Fișa nu poate fi încărcată."}
      </p>
    );
  const { variant, source, levels, sales, invoices, documents } = query.data;
  const available = levels.reduce(
    (sum, level) =>
      sum +
      Math.max(0, level.on_hand_quantity - level.reserved_quantity - level.safety_stock_quantity),
    0,
  );
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className={card}>
          <Barcode className="mb-3 h-5 w-5 text-cyan-200" aria-hidden />
          <p className="text-xs uppercase tracking-widest text-slate-400">SKU intern</p>
          <p className="mt-1 break-all font-mono text-lg text-white">{variant.sku}</p>
        </div>
        <div className={card}>
          <Boxes className="mb-3 h-5 w-5 text-amber-200" aria-hidden />
          <p className="text-xs uppercase tracking-widest text-slate-400">Disponibil din stoc</p>
          <p className="mt-1 text-2xl font-semibold text-white">{available}</p>
        </div>
        <div className={card}>
          <BarChart3 className="mb-3 h-5 w-5 text-purple-200" aria-hidden />
          <p className="text-xs uppercase tracking-widest text-slate-400">Unități comandate</p>
          <p className="mt-1 text-2xl font-semibold text-white">{sales?.units_sold ?? "—"}</p>
        </div>
        <div className={card}>
          <FileText className="mb-3 h-5 w-5 text-emerald-200" aria-hidden />
          <p className="text-xs uppercase tracking-widest text-slate-400">Facturi emise</p>
          <p className="mt-1 text-2xl font-semibold text-white">{invoices?.invoice_count ?? "—"}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,.85fr)]">
        <section className={card} aria-labelledby="product-identifiers-title">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[.18em] text-cyan-300">
                Identitate și proveniență
              </p>
              <h2 id="product-identifiers-title" className="mt-1 text-xl font-semibold text-white">
                Codurile produsului
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                EAN-ul este verificat matematic și conectat la varianta folosită de catalog, comenzi
                și listări. Proveniența rămâne în așteptarea verificării când o schimbi.
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs ${source?.verification_status === "verified" ? "border-emerald-400/30 text-emerald-200" : "border-amber-400/30 text-amber-200"}`}
            >
              {source?.verification_status === "verified"
                ? `${source.gtin_type ?? "GTIN"} verificat`
                : source
                  ? "Sursă de verificat"
                  : "Fără EAN"}
            </span>
          </div>
          <form key={variant.version} onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-300">
              GTIN / EAN
              <input
                name="eanGtin"
                inputMode="numeric"
                autoComplete="off"
                maxLength={14}
                defaultValue={variant.ean_gtin ?? ""}
                placeholder="8, 12, 13 sau 14 cifre"
                className={field}
              />
              <span className="mt-1 block text-xs text-slate-500">
                Introdu codul exact de pe ambalaj; nu inventa un EAN.
              </span>
            </label>
            <label className="text-sm text-slate-300">
              Cod producător (MPN)
              <input
                name="mpn"
                maxLength={120}
                defaultValue={variant.mpn ?? ""}
                className={field}
              />
            </label>
            <label className="text-sm text-slate-300">
              Sursa codului
              <select
                name="identifierSource"
                defaultValue={source?.source_type ?? "supplier"}
                className={field}
              >
                <option value="gs1">GS1</option>
                <option value="manufacturer">Producător</option>
                <option value="supplier">Furnizor</option>
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Referința sursei
              <input
                name="sourceReference"
                maxLength={240}
                defaultValue={source?.source_reference ?? ""}
                placeholder="Document, furnizor sau referință"
                className={field}
              />
            </label>
            <label className="text-sm text-slate-300">
              Document justificativ
              <select name="documentId" defaultValue={source?.document_id ?? ""} className={field}>
                <option value="">Fără document asociat</option>
                {documents
                  .filter((document) => document.review_status === "verified")
                  .map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.document_type}
                      {document.document_number ? ` · ${document.document_number}` : ""}
                    </option>
                  ))}
              </select>
              <span className="mt-1 block text-xs text-slate-500">
                Sunt afișate doar documentele verificate ale produsului.
              </span>
            </label>
            <label className="flex items-center gap-3 self-end rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              <input type="checkbox" name="verifyGtin" className="h-4 w-4 accent-cyan-300" />
              Confirm atribuirea codului pe baza sursei completate
            </label>
            <label className="text-sm text-slate-300">
              Cost unitar intern (RON)
              <input
                name="cost"
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                defaultValue={variant.cost_bani === null ? "" : variant.cost_bani / 100}
                className={field}
              />
            </label>
            {(variant.ean_gtin || variant.mpn) && (
              <label className="text-sm text-slate-300">
                Motivul retragerii sau schimbării unui cod
                <input
                  name="changeReason"
                  maxLength={500}
                  placeholder="Obligatoriu dacă modifici codul existent"
                  className={field}
                />
              </label>
            )}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-200 px-5 py-3 text-sm font-semibold text-[#0b1726] transition hover:bg-cyan-100 disabled:opacity-50"
              >
                <Save className="h-4 w-4" aria-hidden />
                {busy ? "Se salvează…" : "Salvează fișa"}
              </button>
            </div>
          </form>
          <div className="mt-4 border-t border-white/10 pt-4">
            <a
              href={`/admin/products/identification?product=${encodeURIComponent(productId)}`}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/30 px-4 py-2.5 text-sm font-medium text-cyan-200 hover:bg-cyan-300/10"
            >
              <Printer className="h-4 w-4" aria-hidden /> Generează etichetă și vezi loturile
            </a>
          </div>
        </section>
        <section className={card} aria-labelledby="product-links-title">
          <p className="text-xs uppercase tracking-[.18em] text-cyan-300">Legături operaționale</p>
          <h2 id="product-links-title" className="mt-1 text-xl font-semibold text-white">
            Din aceeași fișă
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Datele de mai jos provin din înregistrările existente. Deschide secțiunea dedicată
            pentru operațiuni.
          </p>
          <div className="mt-5 grid gap-2">
            <a
              href="/admin/orders"
              className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-200 hover:border-cyan-300/40"
            >
              <span>Comenzi · {sales?.orders_count ?? "acces restricționat"}</span>
              <Link2 className="h-4 w-4" />
            </a>
            <a
              href="/admin/billing"
              className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-200 hover:border-cyan-300/40"
            >
              <span>Facturi · {invoices?.invoice_count ?? "acces restricționat"}</span>
              <Link2 className="h-4 w-4" />
            </a>
            <a
              href="/admin/statistics"
              className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-200 hover:border-cyan-300/40"
            >
              <span>Statistici {sales ? `· ${money(sales.sales_bani)}` : ""}</span>
              <Link2 className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={onOpenGeneral}
              className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-left text-sm text-slate-200 hover:border-cyan-300/40"
            >
              <span>Material, dimensiuni și descriere</span>
              <PackageSearch className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onOpenSuppliers}
              className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-left text-sm text-slate-200 hover:border-cyan-300/40"
            >
              <span>Surse și furnizori</span>
              <Link2 className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
      <section className={card} aria-labelledby="stock-by-location-title">
        <h2 id="stock-by-location-title" className="text-lg font-semibold text-white">
          Stoc pe locații
        </h2>
        {levels.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="pb-3">Locație</th>
                  <th className="pb-3">Fizic</th>
                  <th className="pb-3">Rezervat</th>
                  <th className="pb-3">Siguranță</th>
                  <th className="pb-3">Disponibil</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((level) => (
                  <tr key={level.name} className="border-b border-white/5 text-slate-200">
                    <td className="py-3 font-medium">{level.name}</td>
                    <td>{level.on_hand_quantity}</td>
                    <td>{level.reserved_quantity}</td>
                    <td>{level.safety_stock_quantity}</td>
                    <td className="text-cyan-200">
                      {Math.max(
                        0,
                        level.on_hand_quantity -
                          level.reserved_quantity -
                          level.safety_stock_quantity,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            Nu există încă locații de stoc configurate pentru această variantă.
          </p>
        )}
      </section>
    </div>
  );
}
