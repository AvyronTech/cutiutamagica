import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Barcode,
  Boxes,
  Download,
  FileSpreadsheet,
  PackageSearch,
  Printer,
  QrCode,
  Search,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  IDENTIFICATION_COLUMNS,
  readSpreadsheet,
  rowsToCsv,
  rowsToXlsx,
} from "@/lib/catalog-spreadsheet";
import {
  barcodeSvg,
  downloadBlob,
  labelSize,
  labelsToPdf,
  renderLabelSvg,
  svgToPng,
  type LabelFormat,
  type LabelInput,
  type LabelOptions,
} from "@/lib/product-labels";

type CatalogRow = {
  id: string;
  name: string;
  category: string;
  status: string;
  public_url: string | null;
  variant_id: string;
  variant_name: string;
  sku: string;
  ean_gtin: string | null;
  verification_status: string | null;
  source_type: string | null;
  gtin_type: string | null;
  available_stock: number;
  lot_count: number;
};
type Variant = {
  id: string;
  sku: string;
  name: string;
  status: string;
  version: number;
  ean_gtin: string | null;
  verification_status: string | null;
  gtin_type: string | null;
  on_hand: number;
  reserved: number;
};
type Lot = {
  id: string;
  lot_code: string;
  variant_id: string;
  location_id: string;
  location_name: string;
  source_kind: string;
  supplier_reference: string | null;
  received_at: string;
  initial_quantity: number;
  available_quantity: number;
};
type Detail = {
  product: { id: string; name: string; status: string; published_at: string | null };
  publicUrl: string | null;
  variants: Variant[];
  lots: Lot[];
  history: Array<{
    id: string;
    variant_id: string;
    action: string;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
  }>;
  serials: Array<{ id: string; variant_id: string; serial_code: string }>;
  personalizations: Array<{ code: string; variant_id: string | null; production_status: string }>;
  orderItems: Array<{ id: string; variant_id: string; order_number: string; unallocated: number }>;
  documents: Array<{
    id: string;
    document_type: string;
    document_number: string | null;
    url: string;
  }>;
  locations: Array<{ id: string; name: string }>;
};
type ImportRow = {
  variantId: string;
  gtin: string;
  source: "gs1" | "supplier" | "manufacturer";
  sourceReference: string;
  lotQuantity: number;
  locationId: string | null;
  lotSourceKind: "supplier" | "in_house";
  supplierReference: string;
  receivedAt?: string;
};
const endpoint = "/api/v1/admin/product-identification";
const inputClass =
  "w-full rounded-xl border border-white/15 bg-[#0b1526] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300 focus:outline-none";
const card =
  "rounded-2xl border border-white/10 bg-gradient-to-br from-[#182a40] to-[#0e1929] p-4 md:p-5";
const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50";

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  const payload = (await response.json()) as {
    data?: T;
    error?: { message?: string; code?: string };
  };
  if (!response.ok || !payload.data)
    throw new Error(payload.error?.message || "Datele nu au putut fi încărcate.");
  return payload.data;
}
async function postJson<T>(body: unknown): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as {
    data?: T;
    error?: { message?: string; code?: string };
  };
  if (!response.ok || !payload.data)
    throw new Error(
      payload.error?.message || payload.error?.code || "Operația nu a putut fi salvată.",
    );
  return payload.data;
}
function saveText(value: string, filename: string, mime: string) {
  downloadBlob(new Blob([value], { type: mime }), filename);
}
function codeImageSvg(): string {
  const element = document.querySelector("#product-identification-qr svg");
  if (!element) throw new Error("Codul QR nu este disponibil.");
  return new XMLSerializer().serializeToString(element);
}

export default function ProductIdentification() {
  const [search, setSearch] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [barcodeMarkup, setBarcodeMarkup] = useState("");
  const [labelMarkup, setLabelMarkup] = useState("");
  const [format, setFormat] = useState<LabelFormat>("50x50");
  const [customWidth, setCustomWidth] = useState(50);
  const [customHeight, setCustomHeight] = useState(40);
  const [lotId, setLotId] = useState("");
  const [qrDestination, setQrDestination] = useState("product");
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importReport, setImportReport] = useState<{
    valid: boolean;
    errors: Array<{ row: number; message: string }>;
    summary: { gtinAssignments: number; lotReceipts: number };
  } | null>(null);
  const [options, setOptions] = useState({
    name: true,
    sku: true,
    gtin: true,
    qr: true,
    code128: true,
    eanGraphic: false,
    lot: false,
    variant: true,
    logo: true,
  });
  useEffect(() => {
    setProductId(new URLSearchParams(window.location.search).get("product"));
  }, []);
  const catalog = useQuery({
    queryKey: ["identification", "catalog"],
    queryFn: () => getJson<{ products: CatalogRow[] }>(endpoint),
    staleTime: 30_000,
  });
  const detail = useQuery({
    queryKey: ["identification", productId],
    queryFn: () => getJson<Detail>(`${endpoint}?product=${encodeURIComponent(productId!)}`),
    enabled: !!productId,
  });
  const filtered = useMemo(
    () =>
      (catalog.data?.products ?? []).filter(
        (row) =>
          !search.trim() ||
          [row.name, row.variant_name, row.sku, row.ean_gtin ?? "", row.category].some((value) =>
            value.toLocaleLowerCase("ro-RO").includes(search.trim().toLocaleLowerCase("ro-RO")),
          ),
      ),
    [catalog.data, search],
  );
  const variant =
    detail.data?.variants.find((row) => row.id === variantId) ?? detail.data?.variants[0];
  const selectedLot = detail.data?.lots.find(
    (row) => row.id === lotId && row.variant_id === variant?.id,
  );
  const verifiedGtin = variant?.verification_status === "verified" ? variant.ean_gtin : null;
  const qrUrl =
    qrDestination === "product"
      ? detail.data?.publicUrl
      : detail.data?.documents.find((document) => document.id === qrDestination)?.url;
  const size = useMemo(
    () => labelSize(format, customWidth, customHeight),
    [format, customWidth, customHeight],
  );
  const labelOptions: LabelOptions = useMemo(() => ({ ...options, ...size }), [options, size]);
  const labelInput: LabelInput | null = useMemo(
    () =>
      variant && detail.data
        ? {
            name: detail.data.product.name,
            sku: variant.sku,
            gtin: verifiedGtin,
            qrUrl,
            lotCode: selectedLot?.lot_code,
            variantName: variant.name,
          }
        : null,
    [variant, detail.data, verifiedGtin, qrUrl, selectedLot],
  );
  const barcodeValue = variant?.sku;
  useEffect(() => {
    let active = true;
    if (!barcodeValue) {
      setBarcodeMarkup("");
      return;
    }
    barcodeSvg(barcodeValue)
      .then((svg) => {
        if (active) setBarcodeMarkup(svg);
      })
      .catch(() => {
        if (active) setBarcodeMarkup("");
      });
    return () => {
      active = false;
    };
  }, [barcodeValue]);
  useEffect(() => {
    let active = true;
    if (!labelInput) {
      setLabelMarkup("");
      return;
    }
    renderLabelSvg(labelInput, labelOptions)
      .then((svg) => {
        if (active) setLabelMarkup(svg);
      })
      .catch(() => {
        if (active) setLabelMarkup("");
      });
    return () => {
      active = false;
    };
  }, [labelInput, labelOptions]);
  async function mutate(body: unknown, success: string) {
    setBusy(true);
    try {
      const result = await postJson<Record<string, unknown>>(body);
      await Promise.all([catalog.refetch(), detail.refetch()]);
      toast.success(success);
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Operația a eșuat.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  function selectProduct(id: string, variant?: string) {
    setProductId(id);
    setVariantId(variant ?? null);
    setLotId("");
    setQrDestination("product");
    window.history.replaceState(
      null,
      "",
      `/admin/products/identification?product=${encodeURIComponent(id)}`,
    );
  }
  async function exportData(kind: "csv" | "xlsx") {
    try {
      const data = await getJson<{
        products: CatalogRow[];
        lots: Array<Lot & { variant_id: string; location_id: string }>;
        personalizations: Array<{
          code: string;
          variant_id: string | null;
          production_status: string;
        }>;
      }>(`${endpoint}?export=1`);
      const rows = [
        Array.from(IDENTIFICATION_COLUMNS),
        ...data.products.flatMap((p) => {
          const lots = data.lots.filter((lot) => lot.variant_id === p.variant_id);
          const codes = data.personalizations
            .filter((item) => item.variant_id === p.variant_id)
            .map((item) => item.code)
            .join("; ");
          return (lots.length ? lots : [null]).map((lot) => [
            p.id,
            p.variant_id,
            p.name,
            p.variant_name,
            p.sku,
            p.ean_gtin ?? "",
            p.verification_status ?? "",
            p.source_type ?? "",
            lot?.lot_code ?? "",
            String(lot?.initial_quantity ?? ""),
            String(lot?.available_quantity ?? ""),
            lot?.location_id ?? "",
            lot?.source_kind ?? "",
            lot?.supplier_reference ?? "",
            String(p.available_stock),
            codes,
          ]);
        }),
      ];
      if (kind === "csv")
        saveText(rowsToCsv(rows), "cutiuta-identificare.csv", "text/csv;charset=utf-8");
      else downloadBlob(rowsToXlsx(rows), "cutiuta-identificare.xlsx");
      const lotRows = [
        [
          "lot_code",
          "variant_id",
          "location_id",
          "source_kind",
          "supplier_reference",
          "initial_quantity",
          "available_quantity",
        ],
        ...data.lots.map((l) => [
          l.lot_code,
          l.variant_id,
          l.location_id,
          l.source_kind,
          l.supplier_reference ?? "",
          String(l.initial_quantity),
          String(l.available_quantity),
        ]),
      ];
      saveText(rowsToCsv(lotRows), "cutiuta-loturi.csv", "text/csv;charset=utf-8");
      if (data.personalizations.length)
        saveText(
          rowsToCsv([
            ["code", "variant_id", "production_status"],
            ...data.personalizations.map((p) => [p.code, p.variant_id ?? "", p.production_status]),
          ]),
          "cutiuta-personalizari-interne.csv",
          "text/csv;charset=utf-8",
        );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Exportul a eșuat.");
    }
  }
  async function previewImport(file: File) {
    try {
      const table = await readSpreadsheet(file);
      const headers = (table[0] ?? []).map((cell) => cell.trim().toLowerCase());
      if (!headers.includes("variant_id")) throw new Error("Coloana variant_id lipsește.");
      const at = (row: string[], name: string) => row[headers.indexOf(name)]?.trim() ?? "";
      const rows: ImportRow[] = table
        .slice(1)
        .filter((row) => at(row, "variant_id"))
        .map((row) => {
          const source = at(row, "gtin_source");
          const lotSource = at(row, "lot_source");
          return {
            variantId: at(row, "variant_id"),
            gtin: at(row, "gtin"),
            source: source === "gs1" || source === "manufacturer" ? source : "supplier",
            sourceReference: at(row, "source_reference"),
            lotQuantity: Number(at(row, "lot_quantity") || 0),
            locationId: at(row, "location_id") || null,
            lotSourceKind: lotSource === "in_house" ? "in_house" : "supplier",
            supplierReference: at(row, "supplier_reference"),
            receivedAt: at(row, "received_at") || undefined,
          };
        });
      if (!rows.length || rows.length > 30) throw new Error("Importă între 1 și 30 de variante.");
      const report = await postJson<typeof importReport>({
        action: "import",
        mode: "preview",
        rows,
      });
      setImportRows(rows);
      setImportReport(report);
      setShowImport(true);
    } catch (error) {
      setImportReport(null);
      toast.error(error instanceof Error ? error.message : "Fișier invalid.");
    }
  }
  async function downloadLabel(kind: "svg" | "png" | "pdf") {
    if (!labelInput || !labelMarkup) return;
    try {
      if (kind === "svg")
        saveText(labelMarkup, `${variant?.sku}-eticheta.svg`, "image/svg+xml;charset=utf-8");
      if (kind === "png")
        downloadBlob(
          await svgToPng(labelMarkup, size.widthMm, size.heightMm),
          `${variant?.sku}-eticheta.png`,
        );
      if (kind === "pdf")
        downloadBlob(
          await labelsToPdf([{ input: labelInput, svg: labelMarkup }], labelOptions, false),
          `${variant?.sku}-eticheta.pdf`,
        );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Exportul etichetei a eșuat.");
    }
  }
  async function downloadA4() {
    try {
      const items = filtered.slice(0, 30).map((row) => ({
        name: row.name,
        sku: row.sku,
        gtin: row.verification_status === "verified" ? row.ean_gtin : null,
        qrUrl: row.public_url,
        variantName: row.variant_name,
      }));
      if (!items.length) return;
      const labels = await Promise.all(
        items.map(async (input) => ({ input, svg: await renderLabelSvg(input, labelOptions) })),
      );
      downloadBlob(await labelsToPdf(labels, labelOptions, true), "cutiuta-etichete-A4.pdf");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PDF-ul A4 nu a putut fi generat.");
    }
  }
  const stats = {
    variants: catalog.data?.products.length ?? 0,
    withoutGtin: catalog.data?.products.filter((row) => !row.ean_gtin).length ?? 0,
    pending:
      catalog.data?.products.filter((row) => row.ean_gtin && row.verification_status !== "verified")
        .length ?? 0,
  };
  return (
    <div className="space-y-5 pb-12">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-cyan-300">
            Produse / administrare internă
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white">Identificare & etichetare</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Un singur loc pentru SKU, GTIN verificat, loturi, coduri scanabile și etichete. Stocul
            rămâne în gestiunea existentă.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={button} onClick={() => exportData("csv")}>
            <Download size={16} /> CSV
          </button>
          <button className={button} onClick={() => exportData("xlsx")}>
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button className={button} onClick={() => setShowImport((value) => !value)}>
            Import cu previzualizare
          </button>
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { name: "Variante în catalog", value: stats.variants, icon: Boxes },
          { name: "Fără GTIN", value: stats.withoutGtin, icon: Barcode },
          { name: "GTIN în verificare", value: stats.pending, icon: ShieldCheck },
        ].map(({ name, value, icon: Icon }) => (
          <div key={name} className={card}>
            <Icon className="mb-2 h-5 w-5 text-cyan-200" />
            <strong className="text-2xl text-white">{value}</strong>
            <p className="text-xs text-slate-400">{name}</p>
          </div>
        ))}
      </div>
      {showImport && (
        <section className={card} aria-label="Import identificatori">
          <h2 className="font-semibold text-white">Import controlat</h2>
          <p className="mt-1 text-sm text-slate-300">
            Acceptă CSV/Excel cu <code>variant_id</code>, <code>gtin</code>,{" "}
            <code>gtin_source</code>, <code>source_reference</code>. Pentru recepții adaugă{" "}
            <code>lot_quantity</code> și <code>location_id</code>. GTIN-urile existente nu sunt
            suprascrise.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="file"
              accept=".csv,.xlsx"
              aria-label="Fișier CSV sau Excel"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void previewImport(file);
              }}
              className="max-w-full text-sm text-slate-200"
            />
            <button
              className={button}
              onClick={() =>
                saveText(
                  rowsToCsv([
                    [
                      "variant_id",
                      "gtin",
                      "gtin_source",
                      "source_reference",
                      "lot_quantity",
                      "location_id",
                      "lot_source",
                      "supplier_reference",
                      "received_at",
                    ],
                  ]),
                  "model-import-identificare.csv",
                  "text/csv;charset=utf-8",
                )
              }
            >
              Descarcă model
            </button>
          </div>
          {importReport && (
            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-200">
              <p>
                {importReport.valid ? "Date valide" : "Corectează erorile"} ·{" "}
                {importReport.summary.gtinAssignments} GTIN noi · {importReport.summary.lotReceipts}{" "}
                loturi noi
              </p>
              {importReport.errors.map((error, index) => (
                <p key={index} className="mt-1 text-rose-300">
                  Rândul {error.row + 1}: {error.message}
                </p>
              ))}
              {importReport.valid && (
                <button
                  className={`${button} mt-3`}
                  disabled={busy}
                  onClick={async () => {
                    const result = await mutate(
                      { action: "import", mode: "apply", rows: importRows },
                      "Importul a fost aplicat.",
                    );
                    if (result) {
                      setImportReport(null);
                      setImportRows([]);
                      setShowImport(false);
                    }
                  }}
                >
                  Confirmă importul
                </button>
              )}
            </div>
          )}
        </section>
      )}
      <div className="grid gap-5 xl:grid-cols-[minmax(300px,.8fr)_minmax(0,1.5fr)]">
        <section className={`${card} min-w-0`} aria-label="Catalog produse și coduri">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Catalog</h2>
            <span className="text-xs text-slate-400">{filtered.length} variante</span>
          </div>
          <label className="relative mt-3 block">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <span className="sr-only">Caută sau scanează codul</span>
            <input
              className={`${inputClass} pl-10`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && filtered[0])
                  selectProduct(filtered[0].id, filtered[0].variant_id);
              }}
              placeholder="Caută sau scanează SKU / GTIN"
            />
          </label>
          <p className="mt-1 text-xs text-slate-400">
            Scanerele USB/Bluetooth introduc codul ca tastatură. Apasă Enter pentru prima potrivire.
          </p>
          {catalog.isError && (
            <p className="mt-3 text-sm text-rose-300" role="alert">
              Catalogul nu a putut fi încărcat.
            </p>
          )}
          <div className="mt-3 max-h-[570px] space-y-2 overflow-y-auto pr-1">
            {filtered.map((row) => (
              <button
                key={row.variant_id}
                type="button"
                onClick={() => selectProduct(row.id, row.variant_id)}
                className={`w-full rounded-xl border p-3 text-left transition ${variant?.id === row.variant_id ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/10 bg-white/[.025] hover:border-white/25"}`}
              >
                <span className="block text-sm font-medium text-white">{row.name}</span>
                <span className="mt-1 block text-xs text-slate-300">
                  {row.variant_name} · <code>{row.sku}</code>
                </span>
                <span className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-md bg-white/5 px-2 py-1 text-slate-300">
                    Stoc {row.available_stock}
                  </span>
                  <span className="rounded-md bg-white/5 px-2 py-1 text-slate-300">
                    {row.lot_count} loturi
                  </span>
                  <span
                    className={`rounded-md px-2 py-1 ${row.verification_status === "verified" ? "bg-emerald-500/15 text-emerald-200" : row.ean_gtin ? "bg-amber-500/15 text-amber-200" : "bg-slate-500/15 text-slate-300"}`}
                  >
                    {row.verification_status === "verified"
                      ? "GTIN verificat"
                      : row.ean_gtin
                        ? "GTIN de verificat"
                        : "Fără GTIN"}
                  </span>
                </span>
              </button>
            ))}
            {catalog.isLoading && (
              <p className="py-6 text-center text-sm text-slate-400">Se încarcă produsele…</p>
            )}
            {!catalog.isLoading && !filtered.length && (
              <p className="py-6 text-center text-sm text-slate-400">Niciun cod găsit.</p>
            )}
          </div>
        </section>
        <div className="min-w-0 space-y-4">
          {detail.isLoading && <div className={card}>Se încarcă fișa produsului…</div>}
          {detail.isError && (
            <div className={card} role="alert">
              Fișa nu a putut fi încărcată.
            </div>
          )}
          {detail.data && variant && (
            <>
              <section className={card}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-cyan-300">
                      Identificare produs
                    </p>
                    <h2 className="mt-1 text-xl font-semibold text-white">
                      {detail.data.product.name}
                    </h2>
                  </div>
                  <a className={button} href={`/admin/products/${detail.data.product.id}`}>
                    Deschide fișa tehnică
                  </a>
                </div>
                {detail.data.variants.length > 1 && (
                  <label className="mt-4 block text-sm text-slate-300">
                    Variantă comercială
                    <select
                      className={`${inputClass} mt-1`}
                      value={variant.id}
                      onChange={(event) => {
                        setVariantId(event.target.value);
                        setLotId("");
                      }}
                    >
                      {detail.data.variants.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.sku}
                          {item.status !== "active" ? " · inactivă" : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <details className="mt-4 rounded-xl border border-white/10 p-3">
                  <summary className="cursor-pointer text-sm text-slate-200">
                    Adaugă variantă comercială
                  </summary>
                  <p className="mt-2 text-xs text-slate-400">
                    Primește automat un SKU nou. Varianta rămâne inactivă până la configurarea
                    completă în catalog.
                  </p>
                  <form
                    className="mt-3 grid gap-2 sm:grid-cols-[1fr_9rem_auto]"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const formElement = event.currentTarget;
                      const form = new FormData(formElement);
                      const result = await mutate(
                        {
                          action: "variant.create",
                          productId: detail.data.product.id,
                          name: String(form.get("name") || "").trim(),
                          priceBani: Math.round(Number(form.get("price")) * 100),
                        },
                        "Varianta a fost creată cu un SKU unic.",
                      );
                      if (result?.id) {
                        setVariantId(String(result.id));
                        formElement.reset();
                      }
                    }}
                  >
                    <input
                      name="name"
                      className={inputClass}
                      aria-label="Numele variantei"
                      placeholder="Numele variantei"
                      minLength={2}
                      maxLength={120}
                      required
                    />
                    <input
                      name="price"
                      className={inputClass}
                      aria-label="Preț în lei"
                      type="number"
                      min="0.01"
                      max="100000"
                      step="0.01"
                      placeholder="Preț în lei"
                      required
                    />
                    <button className={button} disabled={busy}>
                      Creează
                    </button>
                  </form>
                </details>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-black/20 p-3">
                    <span className="text-xs text-slate-400">SKU stabil</span>
                    <p className="mt-1 break-all font-mono text-base text-white">{variant.sku}</p>
                    <button
                      className="mt-2 text-xs text-cyan-200"
                      onClick={() => {
                        void navigator.clipboard.writeText(variant.sku);
                        toast.success("SKU copiat.");
                      }}
                    >
                      Copiază
                    </button>
                  </div>
                  <div className="rounded-xl bg-black/20 p-3">
                    <span className="text-xs text-slate-400">GTIN / EAN</span>
                    <p className="mt-1 font-mono text-base text-white">
                      {variant.ean_gtin || "Neatribuit"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {variant.ean_gtin
                        ? variant.verification_status === "verified"
                          ? "Verificat pentru canalele comerciale"
                          : "Valid matematic; atribuirea oficială rămâne de verificat"
                        : "Se poate lăsa necompletat"}
                    </p>
                  </div>
                </div>
                {!detail.data.product.published_at && (
                  <details className="mt-4 rounded-xl border border-white/10 p-3">
                    <summary className="cursor-pointer text-sm text-slate-200">
                      Corectează manual SKU înainte de publicare
                    </summary>
                    <form
                      className="mt-3 flex gap-2"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        await mutate(
                          {
                            action: "sku.change",
                            variantId: variant.id,
                            expectedVersion: variant.version,
                            sku: String(form.get("sku") || "")
                              .trim()
                              .toUpperCase(),
                          },
                          "SKU actualizat.",
                        );
                      }}
                    >
                      <input
                        name="sku"
                        className={inputClass}
                        defaultValue={variant.sku}
                        aria-label="SKU nou"
                      />
                      <button className={button} disabled={busy}>
                        Salvează
                      </button>
                    </form>
                  </details>
                )}
              </section>
              <section className={card}>
                <div className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-cyan-200" />
                  <h2 className="font-semibold text-white">Coduri scanabile</h2>
                </div>
                <label className="mt-3 block text-xs text-slate-300">
                  Destinația publică a codului QR
                  <select
                    className={`${inputClass} mt-1`}
                    value={qrDestination}
                    onChange={(event) => setQrDestination(event.target.value)}
                  >
                    <option value="product">Pagina produsului</option>
                    {detail.data.documents.map((document) => (
                      <option key={document.id} value={document.id}>
                        {document.document_type === "instructions"
                          ? "Instrucțiuni"
                          : document.document_type === "safety"
                            ? "Siguranță"
                            : "Garanție"}
                        {document.document_number ? ` · ${document.document_number}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-3 text-center text-slate-900">
                    <div id="product-identification-qr" className="mx-auto w-fit">
                      {qrUrl ? (
                        <QRCodeSVG value={qrUrl} size={150} level="M" marginSize={2} />
                      ) : (
                        <div className="grid h-[150px] place-items-center text-xs text-slate-500">
                          Destinația publică nu este disponibilă
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs">
                      {qrDestination === "product"
                        ? "Pagina produsului"
                        : "Document public verificat"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-3 text-center text-slate-900">
                    {barcodeMarkup ? (
                      <div
                        aria-label={`Code 128 ${variant.sku}`}
                        className="mx-auto max-w-[230px] [&_svg]:h-[150px] [&_svg]:w-full"
                        dangerouslySetInnerHTML={{ __html: barcodeMarkup }}
                      />
                    ) : (
                      <div className="grid h-[150px] place-items-center text-xs">
                        Cod indisponibil
                      </div>
                    )}
                    <p className="mt-2 text-xs">Code 128 · {variant.sku}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className={button}
                    disabled={!qrUrl}
                    onClick={() => {
                      if (qrUrl) window.open(qrUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Testează destinația QR
                  </button>
                  <button
                    className={button}
                    disabled={!qrUrl}
                    onClick={() =>
                      saveText(codeImageSvg(), `${variant.sku}-qr.svg`, "image/svg+xml")
                    }
                  >
                    QR SVG
                  </button>
                  <button
                    className={button}
                    disabled={!qrUrl}
                    onClick={async () => {
                      try {
                        downloadBlob(
                          await svgToPng(codeImageSvg(), 40, 40),
                          `${variant.sku}-qr.png`,
                        );
                      } catch {
                        toast.error("QR PNG nu a putut fi generat.");
                      }
                    }}
                  >
                    QR PNG
                  </button>
                  <button
                    className={button}
                    disabled={!barcodeMarkup}
                    onClick={() =>
                      saveText(barcodeMarkup, `${variant.sku}-code128.svg`, "image/svg+xml")
                    }
                  >
                    Code 128 SVG
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  QR-ul indică numai o destinație publică. Numele, imaginile și documentele private
                  ale clienților nu intră în cod.
                </p>
              </section>
              <section className={card}>
                <div className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-cyan-200" />
                  <h2 className="font-semibold text-white">Loturi și trasabilitate</h2>
                </div>
                <div className="mt-3 space-y-2">
                  {detail.data.lots
                    .filter((lot) => lot.variant_id === variant.id)
                    .map((lot) => (
                      <div
                        key={lot.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[.025] p-3 text-sm text-slate-200"
                      >
                        <span>
                          <code>{lot.lot_code}</code> · {lot.location_name}
                          <span className="block text-xs text-slate-400">
                            {lot.source_kind === "in_house" ? "Producție proprie" : "Furnizor"} ·{" "}
                            {lot.received_at}
                          </span>
                        </span>
                        <strong>
                          {lot.available_quantity}/{lot.initial_quantity}
                        </strong>
                      </div>
                    ))}
                  {!detail.data.lots.some((lot) => lot.variant_id === variant.id) && (
                    <p className="text-sm text-slate-400">
                      Niciun lot asociat. Stocul existent rămâne disponibil în gestiune.
                    </p>
                  )}
                </div>
                <details className="mt-3 rounded-xl border border-white/10 p-3">
                  <summary className="cursor-pointer text-sm text-slate-200">
                    Recepționează un lot în stocul existent
                  </summary>
                  <form
                    className="mt-3 grid gap-2 sm:grid-cols-2"
                    onSubmit={async (event: FormEvent<HTMLFormElement>) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      const result = await mutate(
                        {
                          action: "lot.create",
                          variantId: variant.id,
                          locationId: String(form.get("locationId")),
                          sourceKind: String(form.get("sourceKind")),
                          supplierReference: String(form.get("supplierReference") || ""),
                          receivedAt: String(form.get("receivedAt")),
                          quantity: Number(form.get("quantity")),
                        },
                        "Lot recepționat și stoc actualizat.",
                      );
                      if (result) event.currentTarget.reset();
                    }}
                  >
                    <label className="text-xs text-slate-300">
                      Locație
                      <select name="locationId" required className={`${inputClass} mt-1`}>
                        {detail.data.locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-slate-300">
                      Sursă
                      <select name="sourceKind" className={`${inputClass} mt-1`}>
                        <option value="supplier">Furnizor</option>
                        <option value="in_house">Producție proprie</option>
                      </select>
                    </label>
                    <label className="text-xs text-slate-300">
                      Data recepției
                      <input
                        name="receivedAt"
                        type="date"
                        required
                        defaultValue={new Date().toISOString().slice(0, 10)}
                        className={`${inputClass} mt-1`}
                      />
                    </label>
                    <label className="text-xs text-slate-300">
                      Cantitate
                      <input
                        name="quantity"
                        type="number"
                        min="1"
                        max="1000000"
                        required
                        className={`${inputClass} mt-1`}
                      />
                    </label>
                    <label className="text-xs text-slate-300 sm:col-span-2">
                      Referința furnizorului / producției
                      <input name="supplierReference" className={`${inputClass} mt-1`} />
                    </label>
                    <button className={button} disabled={busy}>
                      Înregistrează recepția
                    </button>
                  </form>
                </details>
                {detail.data.orderItems.some(
                  (item) => item.variant_id === variant.id && item.unallocated > 0,
                ) && (
                  <details className="mt-3 rounded-xl border border-white/10 p-3">
                    <summary className="cursor-pointer text-sm text-slate-200">
                      Asociază un lot cu o comandă pregătită sau expediată
                    </summary>
                    <form
                      className="mt-3 grid gap-2 sm:grid-cols-2"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        const form = new FormData(event.currentTarget);
                        await mutate(
                          {
                            action: "lot.allocate",
                            lotId: String(form.get("lotId")),
                            orderItemId: String(form.get("orderItemId")),
                            quantity: Number(form.get("quantity")),
                          },
                          "Lot asociat comenzii.",
                        );
                      }}
                    >
                      <select name="lotId" required className={inputClass}>
                        {detail.data.lots
                          .filter(
                            (lot) => lot.variant_id === variant.id && lot.available_quantity > 0,
                          )
                          .map((lot) => (
                            <option key={lot.id} value={lot.id}>
                              {lot.lot_code} · {lot.available_quantity} libere
                            </option>
                          ))}
                      </select>
                      <select name="orderItemId" required className={inputClass}>
                        {detail.data.orderItems
                          .filter((item) => item.variant_id === variant.id && item.unallocated > 0)
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.order_number} · {item.unallocated} neatribuite
                            </option>
                          ))}
                      </select>
                      <input
                        name="quantity"
                        type="number"
                        min="1"
                        required
                        placeholder="Cantitate"
                        className={inputClass}
                      />
                      <button className={button} disabled={busy}>
                        Asociază lotul
                      </button>
                    </form>
                  </details>
                )}
              </section>
              <section className={card}>
                <h2 className="font-semibold text-white">Personalizări și serializare opțională</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Codul personalizării este intern și legat de cererea sau comanda existentă.
                  Serialul se creează numai la cerere.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      void mutate(
                        {
                          action: "serial.create",
                          variantId: variant.id,
                          lotId: selectedLot?.id ?? null,
                        },
                        "Număr serial creat.",
                      )
                    }
                  >
                    Creează un serial
                  </button>
                  <a href="/admin/personalizations" className={button}>
                    Deschide personalizările
                  </a>
                </div>
                {detail.data.serials
                  .filter((item) => item.variant_id === variant.id)
                  .slice(0, 5)
                  .map((item) => (
                    <p key={item.id} className="mt-2 break-all font-mono text-xs text-slate-300">
                      {item.serial_code}
                    </p>
                  ))}
                {detail.data.personalizations
                  .filter((item) => item.variant_id === variant.id)
                  .slice(0, 5)
                  .map((item) => (
                    <p key={item.code} className="mt-2 font-mono text-xs text-slate-300">
                      {item.code} · {item.production_status}
                    </p>
                  ))}
              </section>
              <section className={card}>
                <div className="flex items-center gap-2">
                  <Printer className="h-5 w-5 text-cyan-200" />
                  <h2 className="font-semibold text-white">Generează etichetă</h2>
                </div>
                <p className="mt-1 text-sm text-slate-300">
                  Previzualizează la dimensiune reală, apoi exportă individual sau toate variantele
                  vizibile pe A4.
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="space-y-3">
                    <label className="block text-xs text-slate-300">
                      Format
                      <select
                        className={`${inputClass} mt-1`}
                        value={format}
                        onChange={(event) => setFormat(event.target.value as LabelFormat)}
                      >
                        <option value="40x40">40 × 40 mm</option>
                        <option value="50x50">50 × 50 mm</option>
                        <option value="50x30">50 × 30 mm</option>
                        <option value="custom">Personalizat</option>
                      </select>
                    </label>
                    {format === "custom" && (
                      <div className="flex gap-2">
                        <label className="text-xs text-slate-300">
                          Lățime mm
                          <input
                            type="number"
                            min="35"
                            max="150"
                            value={customWidth}
                            onChange={(event) => setCustomWidth(Number(event.target.value))}
                            className={`${inputClass} mt-1`}
                          />
                        </label>
                        <label className="text-xs text-slate-300">
                          Înălțime mm
                          <input
                            type="number"
                            min="25"
                            max="150"
                            value={customHeight}
                            onChange={(event) => setCustomHeight(Number(event.target.value))}
                            className={`${inputClass} mt-1`}
                          />
                        </label>
                      </div>
                    )}
                    <label className="block text-xs text-slate-300">
                      Lot pe etichetă
                      <select
                        className={`${inputClass} mt-1`}
                        value={lotId}
                        onChange={(event) => setLotId(event.target.value)}
                      >
                        <option value="">Fără lot</option>
                        {detail.data.lots
                          .filter((lot) => lot.variant_id === variant.id)
                          .map((lot) => (
                            <option key={lot.id} value={lot.id}>
                              {lot.lot_code}
                            </option>
                          ))}
                      </select>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          "name",
                          "sku",
                          "gtin",
                          "qr",
                          "code128",
                          "eanGraphic",
                          "lot",
                          "variant",
                          "logo",
                        ] as const
                      ).map((key) => (
                        <label key={key} className="flex items-center gap-2 text-xs text-slate-200">
                          <input
                            type="checkbox"
                            checked={options[key]}
                            onChange={(event) =>
                              setOptions((current) => ({ ...current, [key]: event.target.checked }))
                            }
                            disabled={
                              ((key === "gtin" || key === "eanGraphic") && !verifiedGtin) ||
                              (key === "qr" && !qrUrl)
                            }
                          />
                          {
                            {
                              name: "Nume",
                              sku: "SKU",
                              gtin: "GTIN verificat",
                              qr: "QR",
                              code128: "Code 128",
                              eanGraphic: "Bare GTIN",
                              lot: "Lot",
                              variant: "Variantă",
                              logo: "Logo",
                            }[key]
                          }
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex min-h-[200px] items-center justify-center overflow-auto rounded-xl bg-slate-200 p-4">
                    {labelMarkup ? (
                      <div
                        className="max-w-full shadow-lg"
                        style={{ width: `${size.widthMm * 3.2}px` }}
                        dangerouslySetInnerHTML={{ __html: labelMarkup }}
                      />
                    ) : (
                      <span className="text-sm text-slate-600">Previzualizarea se generează…</span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    className={button}
                    disabled={!labelMarkup}
                    onClick={() => void downloadLabel("pdf")}
                  >
                    PDF
                  </button>
                  <button
                    className={button}
                    disabled={!labelMarkup}
                    onClick={() => void downloadLabel("png")}
                  >
                    PNG 300 dpi
                  </button>
                  <button
                    className={button}
                    disabled={!labelMarkup}
                    onClick={() => void downloadLabel("svg")}
                  >
                    SVG
                  </button>
                  <button className={button} onClick={() => void downloadA4()}>
                    A4 · toate cele {filtered.length} variante vizibile
                  </button>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Eticheta internă nu înlocuiește informațiile legale obligatorii ale produsului.
                </p>
              </section>
              <details className={card}>
                <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-white">
                  <PackageSearch className="h-4 w-4 text-cyan-200" /> Istoricul codurilor
                </summary>
                <div className="mt-3 space-y-2">
                  {detail.data.history
                    .filter((entry) => entry.variant_id === variant.id)
                    .map((entry) => (
                      <p
                        key={entry.id}
                        className="rounded-lg bg-black/20 p-2 text-xs text-slate-300"
                      >
                        {entry.created_at.slice(0, 16)} · {entry.action} · {entry.old_value || "—"}{" "}
                        → {entry.new_value || "—"}
                      </p>
                    ))}
                  {!detail.data.history.length && (
                    <p className="text-xs text-slate-400">
                      Codurile existente au fost păstrate; modificările noi apar aici.
                    </p>
                  )}
                </div>
              </details>
            </>
          )}
          {!productId && (
            <div className={`${card} py-16 text-center text-sm text-slate-300`}>
              Selectează un produs sau scanează codul pentru fișa lui.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
