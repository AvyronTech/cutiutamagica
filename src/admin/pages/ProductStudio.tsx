import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Film,
  ImagePlus,
  Library,
  Loader2,
  Music2,
  Rotate3D,
  Save,
  Search,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

const SLOT_GUIDE = [
  {
    code: "01_hero",
    number: "01",
    title: "Hero",
    hint: "Capac deschis, imagine principală, text scurt; fără Play desenat.",
    example: "Pornește magia.",
  },
  {
    code: "02_decor",
    number: "02",
    title: "Decor tematic",
    hint: "Capac deschis, decor diferit, cinematic și sugestiv.",
    example: "Mică cutie, vrajă mare.",
  },
  {
    code: "03_closed",
    number: "03",
    title: "Capac închis",
    hint: "Construcție și design vizibile clar.",
    example: "Cadoul care vrăjește.",
  },
  {
    code: "04_dimensions",
    number: "04",
    title: "Dimensiuni",
    hint: "Unghi dreapta-față, dimensiuni în cm și inch.",
    example: "Mică, dar memorabilă.",
  },
  {
    code: "05_mechanism",
    number: "05",
    title: "Mecanism",
    hint: "Cilindru, pieptene metalic și manivelă explicate vizual.",
    example: "Fără baterii. Doar farmec.",
  },
  {
    code: "06_melody",
    number: "06",
    title: "Melodie",
    hint: "Unghi stânga-spate și numele melodiei.",
    example: "O rotești. Te cucerește.",
  },
] as const;

type TabId =
  "general" | "media" | "documents" | "audio" | "spin360" | "animation" | "seo" | "avyron";
type MediaAsset = {
  id: string;
  media_type: "image" | "audio" | "video" | "spin_360" | "model_3d" | "document";
  slot_code: string | null;
  title: string | null;
  promo_text_ro: string | null;
  alt_text: string | null;
  mime_type: string | null;
  tags_json: string;
  usage_type: string;
  marketing_approved: number;
  public_access: number;
  sync_to_avyron: number;
  status: "draft" | "active" | "archived" | "processing" | "failed";
  rights_status: "review_required" | "cleared" | "restricted" | "expired";
  version: number;
};

type ProductData = {
  id: string;
  slug: string;
  name: string;
  status: string;
  tagline: string | null;
  short_description: string | null;
  description: string | null;
  story: string | null;
  category: string;
  material: string | null;
  dimensions_text: string | null;
  weight_g: number | null;
  rights_status: "review_required" | "cleared" | "restricted" | "expired";
  rights_notes: string | null;
  seo_title: string | null;
  seo_description: string | null;
  search_terms: string | null;
  version: number;
};

type StudioData = {
  product: ProductData;
  media: MediaAsset[];
  audio: Record<string, string | number | null> | null;
  spin360:
    | (Record<string, string | number | null> & {
        frames?: Array<{ media_id: string; frame_index: number }>;
      })
    | null;
  animation: Record<string, string | number | null> | null;
  documents: Array<{
    id: string;
    media_id: string;
    document_type: string;
    review_status: string;
  }>;
  variant: {
    id: string;
    sku: string;
    ean_gtin: string | null;
    mpn: string | null;
    cost_bani: number | null;
    weight_g: number | null;
    version: number;
    identifier_source: string | null;
    identifier_status: string | null;
  } | null;
};

const inputClass =
  "w-full rounded-lg border border-[#334155] bg-[#0b1526] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-400/60 focus:outline-none focus:ring-2 focus:ring-cyan-400/15";
const labelClass = "space-y-1.5 text-xs font-medium text-slate-400";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => null)) as {
    data?: T;
    error?: { message?: string; code?: string };
  } | null;
  if (!response.ok)
    throw new Error(payload?.error?.message || payload?.error?.code || "Operația nu a reușit.");
  return payload?.data as T;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={labelClass}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function AssetStatus({ asset }: { asset: MediaAsset }) {
  const ready = asset.status === "active" && asset.public_access === 1;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium ${
        ready
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
          : "border-amber-400/30 bg-amber-400/10 text-amber-300"
      }`}
    >
      {ready ? <CheckCircle2 className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
      {ready ? "Public" : asset.status === "draft" ? "În verificare" : asset.status}
    </span>
  );
}

function AssetEditor({
  asset,
  onChanged,
}: {
  asset: MediaAsset;
  onChanged: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(asset.title ?? "");
  const [promo, setPromo] = useState(asset.promo_text_ro ?? "");
  const [alt, setAlt] = useState(asset.alt_text ?? "");

  async function update(publish: boolean) {
    setBusy(true);
    try {
      await api(`/api/v1/admin/media/${asset.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          promoTextRo: promo,
          altText: alt,
          expectedVersion: asset.version,
          ...(publish
            ? {
                marketingApproved: true,
                rightsStatus: "cleared",
                publicAccess: asset.media_type === "document" ? false : true,
                status: "active",
              }
            : {}),
        }),
      });
      await onChanged();
      toast.success(
        publish
          ? asset.media_type === "document"
            ? "Document validat intern"
            : "Asset aprobat și publicat"
          : "Metadate salvate",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Asset-ul nu a putut fi actualizat.");
    } finally {
      setBusy(false);
    }
  }

  const previewUrl = `/api/v1/admin/media/${asset.id}/content`;
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-lg border border-[#334155] bg-[#07111f]">
        {asset.media_type === "image" || asset.media_type === "spin_360" ? (
          <img
            src={previewUrl}
            alt={asset.alt_text || "Preview asset"}
            className="h-full w-full object-contain"
          />
        ) : asset.media_type === "audio" ? (
          <div className="flex h-full items-center p-3">
            <audio src={previewUrl} controls preload="metadata" className="w-full" />
          </div>
        ) : asset.media_type === "video" ? (
          <video
            src={previewUrl}
            controls
            preload="metadata"
            className="h-full w-full object-contain"
          />
        ) : asset.media_type === "document" ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-full flex-col items-center justify-center gap-2 text-xs text-cyan-200 hover:text-cyan-100"
          >
            <FileText className="h-10 w-10" /> Deschide documentul PDF
          </a>
        ) : (
          <div className="grid h-full place-items-center text-xs text-slate-500">
            Preview indisponibil
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <AssetStatus asset={asset} />
        <span className="truncate font-mono text-[10px] text-slate-600">{asset.id}</span>
      </div>
      <Field label="Titlu">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Text promo scurt">
        <input
          className={inputClass}
          maxLength={90}
          value={promo}
          onChange={(e) => setPromo(e.target.value)}
        />
      </Field>
      {(asset.media_type === "image" || asset.media_type === "spin_360") && (
        <Field label="Text alternativ">
          <textarea
            className={inputClass}
            rows={2}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
          />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => update(false)}
          className="rounded-lg border border-[#334155] px-3 py-2 text-xs text-slate-200 hover:border-cyan-400/40 disabled:opacity-50"
        >
          Salvează
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => update(true)}
          className="rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-[#052014] hover:bg-emerald-300 disabled:opacity-50"
        >
          {busy
            ? "Se salvează..."
            : asset.media_type === "document"
              ? "Validează intern"
              : "Aprobă și publică"}
        </button>
      </div>
    </div>
  );
}

function UploadButton({
  accept,
  multiple,
  busy,
  label,
  onFiles,
}: {
  accept: string;
  multiple?: boolean;
  busy: boolean;
  label: string;
  onFiles: (files: File[]) => void;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-cyan-400/40 bg-cyan-400/5 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-400/10">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      {label}
      <input
        type="file"
        className="sr-only"
        accept={accept}
        multiple={multiple}
        disabled={busy}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) onFiles(files);
          event.currentTarget.value = "";
        }}
      />
    </label>
  );
}

function GeneralForm({ data, onChanged }: { data: StudioData; onChanged: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await api(`/api/v1/admin/products/${data.product.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedVersion: data.product.version,
          name: form.get("name"),
          tagline: form.get("tagline"),
          shortDescription: form.get("shortDescription"),
          description: form.get("description"),
          story: form.get("story"),
          category: form.get("category"),
          material: form.get("material"),
          dimensionsText: form.get("dimensionsText"),
          weightG: form.get("weightG") ? Number(form.get("weightG")) : null,
          rightsStatus: form.get("rightsStatus"),
          rightsNotes: form.get("rightsNotes"),
          seoTitle: data.product.seo_title ?? "",
          seoDescription: data.product.seo_description ?? "",
          searchTerms: data.product.search_terms ?? "",
          variant: data.variant
            ? {
                id: data.variant.id,
                expectedVersion: data.variant.version,
                eanGtin: String(form.get("eanGtin") ?? ""),
                mpn: String(form.get("mpn") ?? ""),
                cost: form.get("cost") ? Number(form.get("cost")) : null,
                identifierSource: form.get("identifierSource"),
              }
            : undefined,
        }),
      });
      await onChanged();
      toast.success("Datele produsului au fost salvate");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Produsul nu a putut fi salvat.");
    } finally {
      setBusy(false);
    }
  }
  const p = data.product;
  return (
    <form key={p.version} onSubmit={submit} className="grid gap-4 lg:grid-cols-2">
      <Field label="Nume">
        <input name="name" required defaultValue={p.name} className={inputClass} />
      </Field>
      <Field label="Categorie">
        <input name="category" required defaultValue={p.category} className={inputClass} />
      </Field>
      <Field label="Tagline">
        <input name="tagline" defaultValue={p.tagline ?? ""} className={inputClass} />
      </Field>
      <Field label="Descriere scurtă">
        <input
          name="shortDescription"
          defaultValue={p.short_description ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Material">
        <input name="material" defaultValue={p.material ?? ""} className={inputClass} />
      </Field>
      <Field label="Dimensiuni">
        <input
          name="dimensionsText"
          defaultValue={p.dimensions_text ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Greutate (g)">
        <input
          name="weightG"
          type="number"
          min="1"
          defaultValue={p.weight_g ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="SKU (read-only)">
        <input value={data.variant?.sku ?? ""} readOnly className={`${inputClass} opacity-70`} />
      </Field>
      <Field label="GTIN / EAN">
        <input
          name="eanGtin"
          inputMode="numeric"
          pattern="[0-9]{8,14}"
          defaultValue={data.variant?.ean_gtin ?? ""}
          placeholder="8–14 cifre"
          className={inputClass}
        />
      </Field>
      <Field label="Sursa GTIN / EAN">
        <select
          name="identifierSource"
          defaultValue={data.variant?.identifier_source ?? "supplier"}
          className={inputClass}
        >
          <option value="gs1">GS1</option>
          <option value="manufacturer">Producător</option>
          <option value="supplier">Furnizor</option>
        </select>
      </Field>
      <Field label="MPN / cod producător">
        <input name="mpn" defaultValue={data.variant?.mpn ?? ""} className={inputClass} />
      </Field>
      <Field label="Cost unitar (RON)">
        <input
          name="cost"
          type="number"
          min="0"
          step="0.01"
          defaultValue={data.variant?.cost_bani == null ? "" : data.variant.cost_bani / 100}
          className={inputClass}
        />
      </Field>
      <Field label="Drepturi">
        <select name="rightsStatus" defaultValue={p.rights_status} className={inputClass}>
          <option value="review_required">De verificat</option>
          <option value="cleared">Validate</option>
          <option value="restricted">Restricționate</option>
          <option value="expired">Expirate</option>
        </select>
      </Field>
      <Field label="Descriere">
        <textarea
          name="description"
          rows={5}
          defaultValue={p.description ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Poveste">
        <textarea name="story" rows={5} defaultValue={p.story ?? ""} className={inputClass} />
      </Field>
      <div className="lg:col-span-2">
        <Field label="Note drepturi">
          <textarea
            name="rightsNotes"
            rows={2}
            defaultValue={p.rights_notes ?? ""}
            className={inputClass}
          />
        </Field>
      </div>
      <button
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-[#07111f] disabled:opacity-50 lg:col-span-2 lg:justify-self-start"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{" "}
        Salvează produsul
      </button>
    </form>
  );
}

function SeoForm({ data, onChanged }: { data: StudioData; onChanged: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const p = data.product;
      await api(`/api/v1/admin/products/${p.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedVersion: p.version,
          name: p.name,
          tagline: p.tagline ?? "",
          shortDescription: p.short_description ?? "",
          description: p.description ?? "",
          story: p.story ?? "",
          category: p.category,
          material: p.material ?? "",
          dimensionsText: p.dimensions_text ?? "",
          weightG: p.weight_g,
          rightsStatus: p.rights_status,
          rightsNotes: p.rights_notes ?? "",
          seoTitle: form.get("seoTitle"),
          seoDescription: form.get("seoDescription"),
          searchTerms: form.get("searchTerms"),
        }),
      });
      await onChanged();
      toast.success("SEO salvat");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "SEO nu a putut fi salvat.");
    } finally {
      setBusy(false);
    }
  }
  const p = data.product;
  return (
    <form key={p.version} onSubmit={submit} className="max-w-3xl space-y-4">
      <Field label="Titlu SEO (max. 70)">
        <input
          name="seoTitle"
          maxLength={70}
          defaultValue={p.seo_title ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Meta descriere (max. 180)">
        <textarea
          name="seoDescription"
          maxLength={180}
          rows={3}
          defaultValue={p.seo_description ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Expresii de căutare">
        <textarea
          name="searchTerms"
          rows={5}
          defaultValue={p.search_terms ?? ""}
          className={inputClass}
        />
      </Field>
      <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-4 text-xs leading-5 text-slate-400">
        Include natural: cutiuță muzicală cu manivelă, mecanism clasic/mecanic, cutiuță cadou, tema
        melodiei și ocazia potrivită. Nu repeta mecanic aceleași expresii.
      </div>
      <button
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-[#07111f] disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{" "}
        Salvează SEO
      </button>
    </form>
  );
}

export default function ProductStudio({ productId }: { productId: string }) {
  const [tab, setTab] = useState<TabId>("media");
  const [uploading, setUploading] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("origin");
  const query = useQuery({
    queryKey: ["admin", "product-studio", productId],
    queryFn: () => api<StudioData>(`/api/v1/admin/products/${productId}/media`),
    staleTime: 15_000,
  });

  const upload = useMutation({
    mutationFn: async ({
      file,
      metadata,
      marker,
    }: {
      file: File;
      metadata: Record<string, unknown>;
      marker: string;
    }) => {
      setUploading(marker);
      return api(`/api/v1/admin/products/${productId}/media`, {
        method: "POST",
        headers: {
          "content-type": file.type,
          "x-media-size": String(file.size),
          "x-media-filename": encodeURIComponent(file.name),
          "x-media-metadata": encodeURIComponent(JSON.stringify(metadata)),
        },
        body: file,
      });
    },
    onSuccess: async () => {
      await query.refetch();
      toast.success("Fișier încărcat în R2 pentru verificare");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Upload-ul nu a reușit."),
    onSettled: () => setUploading(null),
  });

  async function uploadFiles(
    files: File[],
    marker: string,
    metadata: {
      mediaType: string;
      usageType: string;
      slotCode?: string | null;
      title?: string;
      documentType?: string;
    },
  ) {
    for (const file of files) {
      await upload.mutateAsync({
        file,
        marker,
        metadata: {
          ...metadata,
          title: metadata.title ?? file.name,
          promoTextRo: "",
          altText:
            metadata.mediaType === "image" || metadata.mediaType === "spin_360" ? file.name : "",
          tags: [],
          syncToAvyron: false,
        },
      });
    }
  }

  if (query.isLoading)
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
      </div>
    );
  if (!query.data || query.isError)
    return (
      <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-5 text-sm text-red-200">
        Produsul nu poate fi încărcat din D1.
      </div>
    );
  const data = query.data;
  const mediaBySlot = new Map(
    data.media.filter((asset) => asset.slot_code).map((asset) => [asset.slot_code, asset]),
  );
  const audioAssets = data.media.filter((asset) => asset.media_type === "audio");
  const spinAssets = data.media.filter((asset) => asset.usage_type === "360");
  const videoAssets = data.media.filter((asset) => asset.media_type === "video");
  const imageAssets = data.media.filter((asset) => asset.media_type === "image");
  const documentAssets = data.media.filter((asset) => asset.media_type === "document");

  const tabs: Array<{ id: TabId; label: string; icon: typeof Library }> = [
    { id: "general", label: "General", icon: Search },
    { id: "media", label: "Media 01–06", icon: Library },
    { id: "documents", label: "Documente", icon: FileText },
    { id: "audio", label: "Audio", icon: Music2 },
    { id: "spin360", label: "360°", icon: Rotate3D },
    { id: "animation", label: "Animație", icon: Film },
    { id: "seo", label: "SEO", icon: Search },
    { id: "avyron", label: "Sync AVYRON", icon: Send },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <a
            href="/admin/products"
            className="mb-3 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Catalog
          </a>
          <h1 className="text-2xl font-semibold text-white">{data.product.name}</h1>
          <p className="mt-1 font-mono text-xs text-slate-500">
            {data.product.id} · v{data.product.version}
          </p>
        </div>
        <a
          href={`/produs/${data.product.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#334155] px-3 py-2 text-xs text-slate-200 hover:border-cyan-400/40"
        >
          Vezi produsul <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-[#25334a] pb-px">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-xs font-medium ${tab === id ? "border-cyan-300 text-cyan-200" : "border-transparent text-slate-500 hover:text-slate-200"}`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === "general" && <GeneralForm data={data} onChanged={() => query.refetch()} />}
      {tab === "seo" && <SeoForm data={data} onChanged={() => query.refetch()} />}

      {tab === "media" && (
        <div className="space-y-5">
          <section className="rounded-lg border border-cyan-400/20 bg-[#101c2f] p-4">
            <h2 className="text-sm font-semibold text-white">Ghid galerie produs</h2>
            <p className="mt-1 text-xs text-slate-400">
              Texte în română, foarte scurte, calde și diferite. Fără blocuri mari de copy și fără
              buton Play desenat în imagine.
            </p>
          </section>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {SLOT_GUIDE.map((slot) => {
              const asset = mediaBySlot.get(slot.code);
              return (
                <section
                  key={slot.code}
                  className="rounded-lg border border-[#2a3951] bg-[#101a2c] p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-cyan-300">{slot.number}</p>
                      <h3 className="text-sm font-semibold text-white">{slot.title}</h3>
                    </div>
                    <ImagePlus className="h-5 w-5 text-slate-600" />
                  </div>
                  <p className="min-h-10 text-xs leading-5 text-slate-500">{slot.hint}</p>
                  <p className="mb-3 mt-1 text-xs italic text-slate-400">„{slot.example}”</p>
                  {asset && <AssetEditor asset={asset} onChanged={() => query.refetch()} />}
                  <div className="mt-3">
                    <UploadButton
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      busy={uploading === slot.code}
                      label={asset ? "Înlocuiește" : "Încarcă imaginea"}
                      onFiles={(files) =>
                        uploadFiles(files, slot.code, {
                          mediaType: "image",
                          usageType: slot.code === "01_hero" ? "hero" : "detail",
                          slotCode: slot.code,
                          title: slot.title,
                        })
                      }
                    />
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {tab === "documents" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {documentAssets.map((asset) => (
                <div key={asset.id} className="rounded-lg border border-[#2a3951] bg-[#101a2c] p-4">
                  <p className="mb-3 text-[11px] uppercase tracking-wide text-slate-500">
                    {data.documents.find((document) => document.media_id === asset.id)
                      ?.document_type ?? "document"}
                  </p>
                  <AssetEditor asset={asset} onChanged={() => query.refetch()} />
                </div>
              ))}
            </div>
            {documentAssets.length === 0 && (
              <div className="rounded-lg border border-dashed border-[#334155] p-10 text-center text-xs text-slate-500">
                Nu există documente pentru acest produs.
              </div>
            )}
          </section>
          <aside className="h-fit space-y-4 rounded-lg border border-[#2a3951] bg-[#101a2c] p-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Dosarul produsului</h2>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Documentele rămân private în R2 și nu sunt publicate în magazin.
              </p>
            </div>
            <Field label="Tip document">
              <select
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value)}
                className={inputClass}
              >
                <option value="origin">Origine</option>
                <option value="conformity">Conformitate</option>
                <option value="warranty">Garanție</option>
                <option value="rights">Drepturi</option>
                <option value="license">Licență</option>
                <option value="supplier_invoice">Factură furnizor</option>
                <option value="safety">Siguranță</option>
                <option value="instructions">Instrucțiuni</option>
                <option value="other">Alt document</option>
              </select>
            </Field>
            <UploadButton
              accept="application/pdf"
              busy={uploading === "document"}
              label="Încarcă PDF privat"
              onFiles={(files) =>
                uploadFiles(files, "document", {
                  mediaType: "document",
                  usageType: "product",
                  documentType,
                })
              }
            />
            <p className="text-[11px] leading-5 text-slate-500">
              Maxim 10 MB. Fișierul este verificat după semnătura PDF, jurnalizat și legat de
              produs.
            </p>
          </aside>
        </div>
      )}

      {tab === "audio" && (
        <ExperiencePanel
          kind="audio"
          data={data}
          assets={audioAssets}
          onChanged={() => query.refetch()}
          upload={
            <UploadButton
              accept="audio/mpeg,audio/wav,audio/ogg"
              busy={uploading === "audio"}
              label="Încarcă MP3, WAV sau OGG"
              onFiles={(files) =>
                uploadFiles(files, "audio", { mediaType: "audio", usageType: "audio" })
              }
            />
          }
        />
      )}
      {tab === "spin360" && (
        <ExperiencePanel
          kind="spin360"
          data={data}
          assets={spinAssets}
          onChanged={() => query.refetch()}
          upload={
            <UploadButton
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              busy={uploading === "spin360"}
              label="Încarcă secvența de cadre"
              onFiles={(files) =>
                uploadFiles(files, "spin360", { mediaType: "spin_360", usageType: "360" })
              }
            />
          }
        />
      )}
      {tab === "animation" && (
        <ExperiencePanel
          kind="animation"
          data={data}
          assets={[...videoAssets, ...imageAssets]}
          onChanged={() => query.refetch()}
          upload={
            <div className="flex flex-wrap gap-2">
              <UploadButton
                accept="video/mp4,video/webm"
                busy={uploading === "video"}
                label="Încarcă video"
                onFiles={(files) =>
                  uploadFiles(files, "video", { mediaType: "video", usageType: "animation" })
                }
              />
              <UploadButton
                accept="image/jpeg,image/png,image/webp,image/avif"
                busy={uploading === "poster"}
                label="Încarcă poster"
                onFiles={(files) =>
                  uploadFiles(files, "poster", { mediaType: "image", usageType: "animation" })
                }
              />
            </div>
          }
        />
      )}

      {tab === "avyron" && <AvyronSyncPanel data={data} />}
    </div>
  );
}

function AvyronSyncPanel({ data }: { data: StudioData }) {
  const [busyAsset, setBusyAsset] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["admin", "avyron-sync", data.product.id],
    queryFn: () =>
      api<{
        target: {
          status: string;
          endpoint_url: string | null;
          last_error_message: string | null;
        } | null;
        jobs: Array<{
          id: string;
          asset_id: string;
          status: string;
          attempts: number;
          last_error: string | null;
          created_at: string;
          completed_at: string | null;
        }>;
      }>(`/api/v1/admin/products/${data.product.id}/avyron-sync`),
    staleTime: 10_000,
  });
  const eligible = data.media.filter(
    (asset) =>
      asset.status === "active" &&
      asset.public_access === 1 &&
      asset.marketing_approved === 1 &&
      asset.rights_status === "cleared",
  );

  async function sync(asset: MediaAsset) {
    setBusyAsset(asset.id);
    try {
      const result = await api<{ queued: boolean; targetStatus: string }>(
        `/api/v1/admin/media/${asset.id}/sync-avyron`,
        { method: "POST" },
      );
      await query.refetch();
      toast.success(
        result.queued
          ? "Job trimis în coada de sincronizare"
          : "Job salvat în așteptarea configurării AVYRON",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Jobul nu a putut fi creat.");
    } finally {
      setBusyAsset(null);
    }
  }

  const targetStatus = query.data?.target?.status ?? "disabled";
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <section className="rounded-lg border border-[#2a3951] bg-[#101a2c] p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Asset-uri eligibile</h2>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Numai fișierele publicate, aprobate și cu drepturi validate pot părăsi magazinul.
            </p>
          </div>
          <span
            className={`rounded-md border px-2 py-1 text-[11px] ${targetStatus === "active" ? "border-emerald-400/30 text-emerald-300" : "border-amber-400/30 text-amber-300"}`}
          >
            {targetStatus}
          </span>
        </div>
        {targetStatus !== "active" && (
          <div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs leading-5 text-amber-200">
            Joburile sunt păstrate local. Pentru livrare trebuie configurate endpointul HTTPS în D1
            și secretul <code>AVYRON_SYNC_HMAC_SECRET</code> în Worker, niciodată în frontend.
          </div>
        )}
        <div className="mt-4 space-y-2">
          {eligible.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[#334155] p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-200">
                  {asset.title || asset.id}
                </p>
                <p className="mt-1 text-[10px] text-slate-600">
                  {asset.media_type} · v{asset.version}
                </p>
              </div>
              <button
                type="button"
                disabled={busyAsset === asset.id}
                onClick={() => sync(asset)}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-semibold text-[#07111f] disabled:opacity-50"
              >
                {busyAsset === asset.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}{" "}
                Sincronizează
              </button>
            </div>
          ))}
          {eligible.length === 0 && (
            <p className="rounded-lg border border-dashed border-[#334155] p-6 text-center text-xs text-slate-500">
              Aprobă și publică cel puțin un asset.
            </p>
          )}
        </div>
      </section>
      <section className="rounded-lg border border-[#2a3951] bg-[#101a2c] p-5">
        <h2 className="text-sm font-semibold text-white">Jurnal sincronizare</h2>
        <div className="mt-4 space-y-2">
          {(query.data?.jobs ?? []).map((job) => (
            <div key={job.id} className="rounded-lg border border-[#334155] p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-slate-400">{job.asset_id}</span>
                <span
                  className={
                    job.status === "success"
                      ? "text-emerald-300"
                      : job.status === "failed"
                        ? "text-red-300"
                        : "text-amber-300"
                  }
                >
                  {job.status}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-600">
                Încercări: {job.attempts} · {new Date(job.created_at).toLocaleString("ro-RO")}
              </p>
              {job.last_error && (
                <p className="mt-2 text-[11px] leading-4 text-red-300">{job.last_error}</p>
              )}
            </div>
          ))}
          {!query.isLoading && (query.data?.jobs.length ?? 0) === 0 && (
            <p className="py-8 text-center text-xs text-slate-500">
              Nu există joburi pentru acest produs.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function ExperiencePanel({
  kind,
  data,
  assets,
  upload,
  onChanged,
}: {
  kind: "audio" | "spin360" | "animation";
  data: StudioData;
  assets: MediaAsset[];
  upload: React.ReactNode;
  onChanged: () => Promise<unknown>;
}) {
  const initialSelected = useMemo(() => {
    if (kind === "audio") return data.audio?.media_id ? [String(data.audio.media_id)] : [];
    if (kind === "spin360") return data.spin360?.frames?.map((frame) => frame.media_id) ?? [];
    return data.animation?.video_media_id ? [String(data.animation.video_media_id)] : [];
  }, [data, kind]);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [enabled, setEnabled] = useState(
    Boolean(
      kind === "audio"
        ? data.audio?.public_enabled
        : kind === "spin360"
          ? data.spin360?.enabled
          : data.animation?.enabled,
    ),
  );
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected]);

  const primaryAssets =
    kind === "animation" ? assets.filter((asset) => asset.media_type === "video") : assets;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      const body =
        kind === "audio"
          ? {
              section: "audio",
              expectedVersion: Number(data.audio?.version ?? 0),
              mediaId: selected[0] ?? null,
              displayName: String(form.get("displayName") ?? ""),
              publicEnabled: enabled,
              status: enabled ? "active" : selected.length ? "draft" : "disabled",
            }
          : kind === "spin360"
            ? {
                section: "spin360",
                expectedVersion: Number(data.spin360?.version ?? 0),
                enabled,
                spinType: "image_sequence",
                coverMediaId: selected[0] ?? null,
                primaryMediaId: null,
                frameMediaIds: selected,
                status: enabled ? "ready" : selected.length ? "uploading" : "missing",
              }
            : {
                section: "animation",
                expectedVersion: Number(data.animation?.version ?? 0),
                enabled,
                videoMediaId: selected[0] ?? null,
                posterMediaId: String(form.get("posterMediaId") || "") || null,
                thumbnailMediaId: null,
                title: String(form.get("title") ?? ""),
                durationSeconds: null,
                autoplayMutedPreview: form.get("autoplayMutedPreview") === "on",
                status: enabled ? "ready" : selected.length ? "processing" : "missing",
              };
      await api(`/api/v1/admin/products/${data.product.id}/experience`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      await onChanged();
      toast.success("Configurația a fost salvată");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Configurația nu a putut fi salvată.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        <div>{upload}</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <AssetEditor key={asset.id} asset={asset} onChanged={onChanged} />
          ))}
        </div>
        {assets.length === 0 && (
          <div className="rounded-lg border border-dashed border-[#334155] p-10 text-center text-xs text-slate-500">
            Nu există încă asset-uri pentru această secțiune.
          </div>
        )}
      </section>
      <form
        onSubmit={save}
        className="h-fit space-y-4 rounded-lg border border-[#2a3951] bg-[#101a2c] p-4"
      >
        <h2 className="text-sm font-semibold text-white">Configurare publică</h2>
        {kind === "audio" && (
          <Field label="Numele melodiei">
            <input
              name="displayName"
              defaultValue={String(data.audio?.display_name ?? "")}
              className={inputClass}
            />
          </Field>
        )}
        {kind === "animation" && (
          <Field label="Titlul secvenței">
            <input
              name="title"
              defaultValue={String(data.animation?.title ?? "")}
              className={inputClass}
            />
          </Field>
        )}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400">
            {kind === "spin360" ? "Cadre în ordine" : "Fișier principal"}
          </p>
          {primaryAssets.map((asset) => {
            const active = selected.includes(asset.id);
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() =>
                  setSelected((current) =>
                    kind === "spin360"
                      ? active
                        ? current.filter((id) => id !== asset.id)
                        : [...current, asset.id]
                      : [asset.id],
                  )
                }
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs ${active ? "border-cyan-300/50 bg-cyan-300/10 text-cyan-100" : "border-[#334155] text-slate-400"}`}
              >
                <span className="truncate">{asset.title || asset.id}</span>
                {active && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
          {primaryAssets.length === 0 && (
            <p className="rounded-lg border border-dashed border-[#334155] px-3 py-4 text-center text-[11px] text-slate-500">
              {kind === "animation"
                ? "Încarcă un fișier MP4 sau WebM pentru secvența principală."
                : "Nu există încă fișiere eligibile."}
            </p>
          )}
        </div>
        {kind === "animation" && (
          <Field label="Poster">
            <select
              name="posterMediaId"
              defaultValue={String(data.animation?.poster_media_id ?? "")}
              className={inputClass}
            >
              <option value="">Fără poster</option>
              {assets
                .filter((a) => a.media_type === "image")
                .map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.title || asset.id}
                  </option>
                ))}
            </select>
          </Field>
        )}
        {kind === "animation" && (
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              name="autoplayMutedPreview"
              type="checkbox"
              defaultChecked={Boolean(data.animation?.autoplay_muted_preview)}
            />{" "}
            Preview automat, fără sunet
          </label>
        )}
        <label className="flex items-center justify-between rounded-lg border border-[#334155] p-3 text-xs text-slate-300">
          <span>Vizibil public</span>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        </label>
        <p className="text-[11px] leading-5 text-slate-500">
          Activarea este acceptată numai când toate asset-urile selectate sunt aprobate, publice și
          au drepturile validate.
        </p>
        <button
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-[#07111f] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{" "}
          Salvează
        </button>
      </form>
    </div>
  );
}
