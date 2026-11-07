import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspaceActive } from "@/admin/workspace-activity";
import { workspaceHref } from "@/lib/admin-workspaces";
import {
  Boxes,
  Download,
  FileSpreadsheet,
  PackageSearch,
  Printer,
  QrCode,
  Search,
  Copy,
  ListFilter,
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
  variant_status: string;
  public_url: string | null;
  variant_id: string;
  variant_name: string;
  sku: string;
  internal_code: string;
  merchant_reference: string;
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
  internal_code: string;
  merchant_reference: string;
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
  listings: Array<{
    id: string;
    variant_id: string | null;
    channel_name: string;
    external_listing_id: string | null;
    external_product_id: string | null;
    external_offer_id: string | null;
    status: string;
  }>;
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

export default function ProductIdentification({
  embedded = false,
  selectedProductId,
  onProductChange,
}: {
  embedded?: boolean;
  selectedProductId?: string | null;
  onProductChange?: (id: string) => void;
}) {
  const activePanel = useWorkspaceActive();
  const Heading = embedded ? "h2" : "h1";
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState("all");
  const [detailView, setDetailView] = useState<"codes" | "labels" | "trace">("codes");
  const [productId, setProductId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [barcodeMarkup, setBarcodeMarkup] = useState("");
  const [labelMarkup, setLabelMarkup] = useState("");
  const [labelError, setLabelError] = useState("");
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
    setProductId(
      selectedProductId !== undefined
        ? selectedProductId
        : new URLSearchParams(window.location.search).get("product"),
    );
  }, [selectedProductId]);
  const catalog = useQuery({
    queryKey: ["identification", "catalog"],
    queryFn: () => getJson<{ products: CatalogRow[] }>(endpoint),
    staleTime: 30_000,
    enabled: activePanel,
  });
  const detail = useQuery({
    queryKey: ["identification", productId],
    queryFn: () => getJson<Detail>(`${endpoint}?product=${encodeURIComponent(productId!)}`),
    enabled: activePanel && !!productId,
  });
  const filtered = useMemo(
    () =>
      (catalog.data?.products ?? []).filter(
        (row) =>
          (scope === "all" ||
            (scope === "active"
              ? row.status === "active" && row.variant_status === "active"
              : !row.public_url)) &&
          (!search.trim() ||
            [
              row.name,
              row.variant_name,
              row.internal_code,
              row.merchant_reference,
              row.sku,
              row.ean_gtin ?? "",
              row.category,
            ].some((value) =>
              value.toLocaleLowerCase("ro-RO").includes(search.trim().toLocaleLowerCase("ro-RO")),
            )),
      ),
    [catalog.data, search, scope],
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
    if (!barcodeValue || !activePanel || detailView !== "codes") {
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
  }, [barcodeValue, activePanel, detailView]);
  useEffect(() => {
    let active = true;
    if (!labelInput || !activePanel || detailView !== "labels") {
      setLabelMarkup("");
      return;
    }
    setLabelError("");
    renderLabelSvg(labelInput, labelOptions)
      .then((svg) => {
        if (active) setLabelMarkup(svg);
      })
      .catch((error) => {
        if (active) {
          setLabelMarkup("");
          setLabelError(
            error instanceof Error
              ? error.message
              : "La acest format, eticheta nu poate fi generată.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [labelInput, labelOptions, activePanel, detailView]);
  async function mutate(body: unknown, success: string) {
    setBusy(true);
    try {
      const result = await postJson<Record<string, unknown>>(body);
      await Promise.all([catalog.refetch(), ...(productId ? [detail.refetch()] : [])]);
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
    if (onProductChange) onProductChange(id);
    else {
      const url = new URL(window.location.href);
      url.searchParams.set("product", id);
      window.history.replaceState(window.history.state, "", url);
    }
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
            p.internal_code,
            p.merchant_reference,
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
  async function downloadCode(value: string) {
    try {
      saveText(await barcodeSvg(value, "CODE128", true), `${value}-code128.svg`, "image/svg+xml");
    } catch {
      toast.error("Codul de bare nu a putut fi generat.");
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
      if (filtered.length > 30)
        throw new Error(
          "Filtrează registrul la cel mult 30 de variante pentru o coală de etichete.",
        );
      const items = filtered.map((row) => ({
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
  async function copyCode(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Cod copiat.");
    } catch {
      toast.error("Copiere indisponibilă. Poți selecta codul sau descărca registrul.");
    }
  }
  const stats = {
    products: new Set(catalog.data?.products.map((row) => row.id)).size,
    variants: catalog.data?.products.length ?? 0,
    references: catalog.data?.products.filter((row) => row.merchant_reference).length ?? 0,
  };
  return (
    <div className="identification-workspace min-w-0 space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading className="text-base font-semibold text-white">Registrul codurilor</Heading>
          <p className="mt-1 text-xs text-slate-300">
            {stats.products} produse · {stats.variants} SKU-uri · {stats.references} referințe
            comerciale
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className={button}
            disabled={busy || !catalog.data}
            onClick={() => exportData("csv")}
          >
            <Download size={15} /> CSV
          </button>
          <button
            className={button}
            disabled={busy || !catalog.data}
            onClick={() => exportData("xlsx")}
          >
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button
            className={button}
            aria-expanded={showImport}
            onClick={() => setShowImport((value) => !value)}
          >
            Import
          </button>
        </div>
      </header>
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
      <section className={`${card} min-w-0`} aria-label="Registru de produse și coduri">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <span className="sr-only">Caută sau scanează un cod</span>
            <input
              className={`${inputClass} pl-10`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && filtered[0])
                  selectProduct(filtered[0].id, filtered[0].variant_id);
              }}
              placeholder="Nume, cod intern, SKU, referință sau GTIN"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <ListFilter size={16} aria-hidden />
            <span className="sr-only">Filtrează produsele</span>
            <select
              className={inputClass}
              value={scope}
              onChange={(event) => setScope(event.target.value)}
            >
              <option value="all">Toate variantele</option>
              <option value="active">Active</option>
              <option value="unpublished">Nepublicate</option>
            </select>
          </label>
        </div>
        <p className="my-2 text-xs text-slate-400">
          {filtered.length} rezultate · Scanează un cod și apasă Enter. Pe mobil, derulează tabelul
          lateral.
        </p>
        {catalog.isError ? (
          <div role="alert" className="flex items-center gap-3 py-3 text-sm text-rose-200">
            Registrul nu poate fi încărcat.
            <button className={button} onClick={() => void catalog.refetch()}>
              Reîncearcă
            </button>
          </div>
        ) : (
          <div
            className="code-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Tabelul codurilor disponibile"
          >
            <table className="code-registry-table">
              <caption className="sr-only">
                Codurile permanente ale produselor și variantelor. GTIN este opțional și necesită o
                sursă verificată.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Produs / variantă</th>
                  <th scope="col">Cod intern</th>
                  <th scope="col">SKU</th>
                  <th scope="col">Referință externă</th>
                  <th scope="col">GTIN / EAN</th>
                  <th scope="col">Stoc</th>
                  <th scope="col">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.variant_id}
                    data-selected={variant?.id === row.variant_id || undefined}
                  >
                    <th scope="row">
                      <button
                        type="button"
                        onClick={() => {
                          selectProduct(row.id, row.variant_id);
                          setDetailView("codes");
                        }}
                        className="text-left hover:text-cyan-200"
                      >
                        <span className="block font-medium">{row.name}</span>
                        <span className="mt-0.5 block text-xs font-normal text-slate-400">
                          {row.variant_name}
                          {row.variant_status !== "active" ? " · inactivă" : ""}
                        </span>
                      </button>
                    </th>
                    {[row.internal_code, row.sku, row.merchant_reference].map((code, index) => (
                      <td key={index}>
                        <button
                          type="button"
                          className="code-copy"
                          onClick={() => void copyCode(code)}
                          aria-label={`Copiază ${["codul intern", "SKU-ul", "referința externă"][index]} ${code}`}
                        >
                          <code>{code}</code>
                          <Copy size={12} aria-hidden />
                        </button>
                      </td>
                    ))}
                    <td>
                      {row.ean_gtin ? (
                        <>
                          <code>{row.ean_gtin}</code>
                          <span
                            className={`block text-xs ${row.verification_status === "verified" ? "text-emerald-200" : "text-amber-200"}`}
                          >
                            {row.verification_status === "verified" ? "Verificat" : "De verificat"}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">Neatribuit · opțional</span>
                      )}
                    </td>
                    <td className="tabular-nums">{row.available_stock}</td>
                    <td>
                      <button
                        type="button"
                        className={button}
                        onClick={() => {
                          selectProduct(row.id, row.variant_id);
                          setDetailView("labels");
                        }}
                      >
                        Etichetă
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {catalog.isLoading && (
              <p role="status" className="p-4 text-sm text-slate-300">
                Se încarcă registrul…
              </p>
            )}
            {!catalog.isLoading && !filtered.length && (
              <p className="p-4 text-sm text-slate-300">
                Niciun rezultat. Schimbă filtrul sau termenul de căutare.
              </p>
            )}
          </div>
        )}
        <details className="mt-2 text-xs text-slate-300">
          <summary className="cursor-pointer py-1">Cum folosești codurile</summary>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-white">Cod intern · CM-P</dt>
              <dd>Identifică permanent produsul, indiferent de titlu sau temă.</dd>
            </div>
            <div>
              <dt className="font-semibold text-white">SKU</dt>
              <dd>Identifică varianta din stoc. Codurile existente se păstrează.</dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Referință externă · CM-R</dt>
              <dd>
                Referința comercială a magazinului, pregătită pentru fișierele de export. Nu
                înlocuiește ID-ul atribuit de platformă sau GTIN.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-white">Lot / serial / QR</dt>
              <dd>
                Lotul urmărește recepția, serialul o unitate, iar QR-ul deschide pagina ori
                documentul public.
              </dd>
            </div>
          </dl>
        </details>
      </section>
      <div className="identification-detail min-w-0 space-y-3">
        {detail.isLoading && <div className={card}>Se încarcă fișa produsului…</div>}
        {detail.isError && (
          <div className={card} role="alert">
            Fișa nu a putut fi încărcată.
          </div>
        )}
        {detail.data && variant && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#101d30] px-3 py-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-white">{detail.data.product.name}</h2>
                <p className="text-xs text-slate-400">
                  {variant.name} · {variant.sku}
                </p>
              </div>
              <div className="flex flex-wrap gap-1" aria-label="Instrumente pentru produs">
                {(
                  [
                    ["codes", "Coduri"],
                    ["labels", "Etichete"],
                    ["trace", "Trasabilitate"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={detailView === key}
                    onClick={() => setDetailView(key)}
                    className={`min-h-10 rounded-lg border px-3 text-sm ${detailView === key ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100" : "border-transparent text-slate-300 hover:bg-white/5"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <section className={card} hidden={detailView !== "codes"}>
              <div className="flex flex-wrap gap-2">
                <a className={button} href={`/admin/products/${detail.data.product.id}`}>
                  Fișa produsului →
                </a>
                <a
                  className={button}
                  href={workspaceHref("inventory", { product: detail.data.product.id })}
                >
                  Stoc și aprovizionare →
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
              <dl className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Cod intern produs", variant.internal_code],
                  ["SKU variantă", variant.sku],
                  ["Referință externă", variant.merchant_reference],
                  ["GTIN / EAN", variant.ean_gtin],
                ].map(([label, code]) => (
                  <div key={label} className="min-w-0 rounded-lg bg-black/20 p-3">
                    <dt className="text-xs text-slate-400">{label}</dt>
                    <dd className="mt-1">
                      {code ? (
                        <button
                          className="code-copy"
                          onClick={() => void copyCode(code)}
                          aria-label={`Copiază ${label}: ${code}`}
                        >
                          <code>{code}</code>
                          <Copy size={12} />
                        </button>
                      ) : (
                        <span className="text-sm text-slate-300">Neatribuit · opțional</span>
                      )}
                    </dd>
                    {code && label !== "GTIN / EAN" && (
                      <button
                        className="mt-1 inline-flex min-h-8 items-center gap-1 text-xs text-slate-300 hover:text-white"
                        onClick={() => void downloadCode(code)}
                      >
                        <Download size={12} aria-hidden />
                        Bare SVG
                      </button>
                    )}
                  </div>
                ))}
              </dl>
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
            <section className={card} hidden={detailView !== "codes"}>
              <h3 className="text-sm font-semibold text-white">Identificatori pe canale</h3>
              <p className="mt-1 text-xs text-slate-400">
                ID-uri deja înregistrate în magazin. Referința CM-R poate fi folosită la pregătirea
                exportului; publicarea se aprobă separat în Canale de vânzare.
              </p>
              <div
                className="code-table-scroll mt-3"
                tabIndex={0}
                role="region"
                aria-label="Identificatori pe canale"
              >
                <table className="code-registry-table">
                  <thead>
                    <tr>
                      <th scope="col">Canal</th>
                      <th scope="col">ID listare</th>
                      <th scope="col">ID produs</th>
                      <th scope="col">ID ofertă</th>
                      <th scope="col">Stare înregistrată</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.data.listings
                      .filter((item) => !item.variant_id || item.variant_id === variant.id)
                      .map((item) => (
                        <tr key={item.id}>
                          <th scope="row">{item.channel_name}</th>
                          <td>
                            <code>{item.external_listing_id || "—"}</code>
                          </td>
                          <td>
                            <code>{item.external_product_id || "—"}</code>
                          </td>
                          <td>
                            <code>{item.external_offer_id || "—"}</code>
                          </td>
                          <td>
                            {(
                              {
                                draft: "Ciornă",
                                pending: "În așteptare",
                                active: "Activă",
                                paused: "În pauză",
                                rejected: "Respinsă",
                                archived: "Arhivată",
                                error: "Necesită verificare",
                              } as Record<string, string>
                            )[item.status] ?? "De verificat"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!detail.data.listings.some(
                  (item) => !item.variant_id || item.variant_id === variant.id,
                ) && (
                  <p className="p-3 text-xs text-slate-300">
                    Nu există identificatori atribuiți de platforme pentru această variantă.
                  </p>
                )}
              </div>
              <a
                className={`${button} mt-2`}
                href={`/admin/products/${detail.data.product.id}#technical`}
              >
                Canale de vânzare →
              </a>
            </section>
            <section className={card} hidden={detailView !== "codes"}>
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
                  onClick={() => saveText(codeImageSvg(), `${variant.sku}-qr.svg`, "image/svg+xml")}
                >
                  QR SVG
                </button>
                <button
                  className={button}
                  disabled={!qrUrl}
                  onClick={async () => {
                    try {
                      downloadBlob(await svgToPng(codeImageSvg(), 40, 40), `${variant.sku}-qr.png`);
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
            <section className={card} hidden={detailView !== "trace"}>
              <div className="flex items-center gap-2">
                <Boxes className="h-5 w-5 text-cyan-200" />
                <h2 className="font-semibold text-white">Loturi și trasabilitate</h2>
              </div>
              <div
                className="code-table-scroll mt-3"
                tabIndex={0}
                role="region"
                aria-label="Loturi ale variantei"
              >
                <table className="code-registry-table">
                  <thead>
                    <tr>
                      <th scope="col">Cod lot</th>
                      <th scope="col">Locație</th>
                      <th scope="col">Sursă / recepție</th>
                      <th scope="col">Disponibil / inițial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.data.lots
                      .filter((lot) => lot.variant_id === variant.id)
                      .map((lot) => (
                        <tr key={lot.id}>
                          <th scope="row">
                            <button
                              className="code-copy"
                              onClick={() => void copyCode(lot.lot_code)}
                            >
                              <code>{lot.lot_code}</code>
                              <Copy size={12} />
                            </button>
                          </th>
                          <td>{lot.location_name}</td>
                          <td>
                            {lot.source_kind === "in_house" ? "Producție proprie" : "Furnizor"}
                            <span className="block text-xs text-slate-400">{lot.received_at}</span>
                          </td>
                          <td>
                            {lot.available_quantity} / {lot.initial_quantity}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!detail.data.lots.some((lot) => lot.variant_id === variant.id) && (
                  <p className="p-3 text-xs text-slate-300">
                    Niciun lot asociat. Înregistrează un lot numai pentru o recepție reală; stocul
                    existent se păstrează.
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
                    const formElement = event.currentTarget;
                    const form = new FormData(formElement);
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
                    if (result) formElement.reset();
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
            <section className={card} hidden={detailView !== "trace"}>
              <h2 className="font-semibold text-white">Personalizări și serializare opțională</h2>
              <p className="mt-1 text-sm text-slate-300">
                Codul personalizării este intern și legat de cererea sau comanda existentă. Serialul
                se creează numai la cerere.
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
              <button
                className={`${button} mt-2`}
                disabled={
                  !detail.data.serials.some((item) => item.variant_id === variant.id) &&
                  !detail.data.personalizations.some((item) => item.variant_id === variant.id)
                }
                onClick={() =>
                  saveText(
                    rowsToCsv([
                      ["type", "code", "variant_id"],
                      ...detail.data.serials
                        .filter((item) => item.variant_id === variant.id)
                        .map((item) => ["serial", item.serial_code, variant.id]),
                      ...detail.data.personalizations
                        .filter((item) => item.variant_id === variant.id)
                        .map((item) => ["personalization", item.code, variant.id]),
                    ]),
                    `${variant.sku}-coduri-unitare.csv`,
                    "text/csv;charset=utf-8",
                  )
                }
              >
                CSV · coduri afișate
              </button>
              <div
                className="code-table-scroll mt-3"
                role="region"
                tabIndex={0}
                aria-label="Seriale și personalizări"
              >
                <table className="code-registry-table">
                  <caption className="sr-only">
                    Coduri unitare pentru varianta selectată, cele mai recente 100 de înregistrări
                    per produs
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Tip</th>
                      <th scope="col">Cod</th>
                      <th scope="col">Stare</th>
                      <th scope="col">Export</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.data.serials
                      .filter((item) => item.variant_id === variant.id)
                      .map((item) => (
                        <tr key={item.id}>
                          <th scope="row">Serial</th>
                          <td>
                            <button
                              className="code-copy"
                              onClick={() => void copyCode(item.serial_code)}
                            >
                              <code>{item.serial_code}</code>
                              <Copy size={12} />
                            </button>
                          </td>
                          <td>Înregistrat</td>
                          <td>
                            <button
                              className={button}
                              onClick={() => void downloadCode(item.serial_code)}
                            >
                              Bare SVG
                            </button>
                          </td>
                        </tr>
                      ))}
                    {detail.data.personalizations
                      .filter((item) => item.variant_id === variant.id)
                      .map((item) => (
                        <tr key={item.code}>
                          <th scope="row">Personalizare</th>
                          <td>
                            <code>{item.code}</code>
                          </td>
                          <td>
                            {(
                              {
                                approved: "Aprobată",
                                in_production: "În producție",
                                shipped: "Expediată",
                                cancelled: "Anulată",
                              } as Record<string, string>
                            )[item.production_status] ?? "În pregătire"}
                          </td>
                          <td>
                            <button className={button} onClick={() => void downloadCode(item.code)}>
                              Bare SVG
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Cele mai recente 100 de seriale și 100 de personalizări per produs. Creează seriale
                numai pentru unitățile pe care le urmărești individual.
              </p>
            </section>
            <section className={card} hidden={detailView !== "labels"}>
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
                    <span role={labelError ? "alert" : "status"} className="text-sm text-slate-700">
                      {labelError || "Previzualizarea se generează…"}
                    </span>
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
                <button
                  className={button}
                  disabled={!filtered.length || filtered.length > 30}
                  onClick={() => void downloadA4()}
                >
                  A4 · {filtered.length} variante filtrate
                </button>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                A4: maximum 30 de variante per export; folosește căutarea pentru selecție. Eticheta
                internă nu înlocuiește informațiile legale obligatorii ale produsului.
              </p>
            </section>
            <details className={card} hidden={detailView !== "codes"}>
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-white">
                <PackageSearch className="h-4 w-4 text-cyan-200" /> Istoricul codurilor
              </summary>
              <div className="mt-3 space-y-2">
                {detail.data.history
                  .filter((entry) => entry.variant_id === variant.id)
                  .map((entry) => (
                    <p key={entry.id} className="rounded-lg bg-black/20 p-2 text-xs text-slate-300">
                      {entry.created_at.slice(0, 16)} ·{" "}
                      {(
                        {
                          sku_assigned: "SKU atribuit",
                          sku_changed: "SKU modificat",
                          gtin_assigned: "GTIN atribuit",
                          gtin_changed: "GTIN modificat",
                          gtin_cleared: "GTIN retras",
                          gtin_verified: "GTIN verificat",
                          gtin_rejected: "GTIN respins",
                        } as Record<string, string>
                      )[entry.action] ?? "Actualizare identificator"}{" "}
                      · {entry.old_value || "—"} → {entry.new_value || "—"}
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
          <div className={`${card} py-5 text-center text-sm text-slate-300`}>
            Selectează un produs sau scanează codul pentru fișa lui.
          </div>
        )}
      </div>
    </div>
  );
}
