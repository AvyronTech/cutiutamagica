import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Truck,
} from "lucide-react";
import {
  channelGuides,
  contribution,
  dropshippingChannels,
  emptyOpportunity,
  opportunitySchema,
  readiness,
  type DropshippingChannel,
  type OpportunityData,
} from "@/lib/dropshipping";

const root = "/api/v1/admin/dropshipping";
const input =
  "mt-1 w-full min-w-0 rounded-lg border border-slate-600 bg-slate-950 p-2.5 text-sm text-white";
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-100 disabled:cursor-not-allowed disabled:opacity-40";
const primary = button + " border-cyan-300 bg-cyan-300 text-slate-950 font-semibold";
const panel = "rounded-xl border border-slate-700 bg-slate-950/25 p-4 sm:p-5";
type Item = { id: string; version: number; archived: boolean; data: OpportunityData };
type Placement = {
  channel: DropshippingChannel;
  revision: number;
  status: string;
  approval_id: string;
  operation_id: string | null;
  listing_url: string | null;
  evidence: string | null;
  published_revision: number | null;
  expires_at: string;
  approval_status: string;
  snapshot_json: string;
};
type Asset = {
  id: string;
  channel: string;
  width: number;
  height: number;
  rights_evidence: string;
};
type Detail = Item & {
  placements: Placement[];
  assets: Asset[];
  sources?: Array<{ url: string; title: string; description?: string }>;
};
type Overview = {
  items: Item[];
  hasMore: boolean;
  ai: { available: boolean; used: number; limit: number; reason: string };
  braveConfigured: boolean;
};
async function api<T>(path = "", body?: unknown, method = "POST"): Promise<T> {
  const r = await fetch(
    root + path,
    body === undefined
      ? {}
      : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
  );
  const result = (await r.json()) as { data: T; error?: { message: string } };
  if (!r.ok) throw Error(result.error?.message ?? "Operație indisponibilă.");
  return result.data;
}
function download(name: string, value: unknown) {
  const u = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
function TextField({
  label,
  value,
  onChange,
  multiline = false,
  ...props
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: string;
  maxLength?: number;
  required?: boolean;
}) {
  return (
    <label className="block min-w-0 text-sm text-slate-300">
      {label}
      {multiline ? (
        <textarea
          className={input}
          value={value}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          maxLength={props.maxLength ?? 5000}
        />
      ) : (
        <input
          {...props}
          step={props.type === "number" ? "any" : undefined}
          min={props.type === "number" ? 0 : undefined}
          className={input}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onInput={props.type === "date" ? (e) => onChange(e.currentTarget.value) : undefined}
          onBlur={props.type === "date" ? (e) => onChange(e.currentTarget.value) : undefined}
        />
      )}
    </label>
  );
}
const states: Record<string, string> = {
  approved: "Aprobat · așteaptă execuția",
  executing: "Execuție în curs",
  uncertain: "Rezultat incert · verifică destinația",
  failed: "Eșec confirmat",
  published_manual: "Publicat · confirmare manuală",
  cancelled: "Aprobarea a fost închisă",
};
const approvalValid = (p: Placement | undefined) =>
  Boolean(
    p?.status === "approved" &&
    p.approval_status === "approved" &&
    p.expires_at > new Date().toISOString(),
  );
export default function Dropshipping() {
  const [selected, setSelected] = useState<string | null>(null),
    [creating, setCreating] = useState(false),
    [filter, setFilter] = useState(""),
    [newId, setNewId] = useState("");
  function canSwitch() {
    if (document.querySelector('[data-dropshipping-busy="true"]')) {
      toast.info("Așteaptă încheierea operației curente.");
      return false;
    }
    return (
      !document.querySelector('[data-dropshipping-dirty="true"]') ||
      window.confirm("Ai modificări nesalvate. Continui fără ele?")
    );
  }
  const query = useQuery({ queryKey: ["admin", "dropshipping"], queryFn: () => api<Overview>() });
  const detail = useQuery({
    queryKey: ["admin", "dropshipping", selected],
    queryFn: () => api<Detail>(`/${selected}`),
    enabled: Boolean(selected),
    refetchOnWindowFocus: false,
  });
  async function refresh() {
    await query.refetch();
    if (selected) await detail.refetch();
  }
  async function exportSkill() {
    try {
      download("cutiuta-dropshipping-skill.json", await api("/skill"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 text-slate-200 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-cyan-200">Comerț asistat de AI</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Dropshipping</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            De la sursă verificată la produs pregătit pentru fiecare canal. Orice categorie poate
            intra în cercetare.
          </p>
        </div>
        <button
          className={primary}
          onClick={() => {
            if (!canSwitch()) return;
            setNewId(crypto.randomUUID());
            setSelected(null);
            setCreating(true);
          }}
        >
          <Plus size={16} />
          Oportunitate nouă
        </button>
      </header>
      <ol className="grid grid-cols-2 gap-2 text-xs text-slate-300 sm:grid-cols-5">
        {[
          "01 · Cercetează",
          "02 · Verifică oferta",
          "03 · Pregătește conținutul",
          "04 · Aprobă revizia",
          "05 · Publică și verifică",
        ].map((x) => (
          <li className="rounded-lg border border-slate-700 p-3" key={x}>
            {x}
          </li>
        ))}
      </ol>
      <details className={panel}>
        <summary className="cursor-pointer font-medium text-white">
          Agent Codex și resurse disponibile
        </summary>
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <p>
            Codex execută asistat pe Mac, în profilul Opera dedicat Cutiuța Magică. O aprobare și un
            pachet exportat nu pornesc singure o sesiune Codex.
          </p>
          <p>
            {query.data?.ai.reason ?? "Se verifică resursele…"} Lucrări în acest modul:{" "}
            {query.data?.ai.used ?? "—"}/{query.data?.ai.limit ?? 8} astăzi, UTC.
          </p>
          <p>
            {query.data?.braveConfigured
              ? "Cheie Brave salvată; valabilitatea se verifică la căutare."
              : "Brave Search: cheia lipsește. Cercetarea poate continua din Opera; sursele se salvează manual în fișă."}
          </p>
          <div className="flex flex-wrap gap-3">
            <button className={button} onClick={exportSkill}>
              <ArrowDownToLine size={16} />
              Descarcă skillul
            </button>
            <a className={button} href="/admin/ai">
              Studio AI
            </a>
            <a className={button} href="/admin/suppliers">
              Aprovizionare
            </a>
            <a className={button} href="/admin/platforms">
              Canale de vânzare
            </a>
          </div>
        </div>
      </details>
      {query.isError ? (
        <div role="alert" className={panel}>
          {query.error.message}
          <button className={button + " ml-3"} onClick={() => query.refetch()}>
            Reîncearcă
          </button>
        </div>
      ) : query.isPending ? (
        <p role="status">Se încarcă oportunitățile…</p>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className={panel}>
            <label className="block text-sm">
              Caută oportunitatea
              <input
                className={input}
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Produs sau categorie"
              />
            </label>
            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto lg:max-h-[65vh]">
              {query.data.items
                .filter((x) =>
                  `${x.data.name} ${x.data.category}`.toLowerCase().includes(filter.toLowerCase()),
                )
                .map((x) => (
                  <button
                    key={x.id}
                    className={`w-full rounded-lg border p-3 text-left ${selected === x.id ? "border-cyan-300 bg-cyan-300/10" : "border-slate-700"}`}
                    onClick={() => {
                      if (selected !== x.id && canSwitch()) {
                        setSelected(x.id);
                        setCreating(false);
                      }
                    }}
                  >
                    <strong className="block break-words text-sm text-white">{x.data.name}</strong>
                    <span className="text-xs text-slate-400">
                      {x.data.category} · rev. {x.version}
                      {x.archived ? " · Arhivat" : ""}
                    </span>
                  </button>
                ))}
            </div>
            {!query.data.items.length && (
              <p className="mt-4 text-sm text-slate-400">
                Începe cu un produs și o sursă. Nicio ofertă nu este publicată automat.
              </p>
            )}
            {query.data.hasMore && (
              <p className="mt-3 text-xs text-amber-200">
                Sunt afișate cele mai recente 100 de oportunități.
              </p>
            )}
          </aside>
          {creating ? (
            <Editor
              key={`new:${newId}`}
              initial={{
                id: newId,
                version: 0,
                archived: false,
                data: emptyOpportunity(),
                placements: [],
                assets: [],
              }}
              overview={query.data}
              onSaved={async (id) => {
                setCreating(false);
                setSelected(id);
                await query.refetch();
              }}
              onRefresh={refresh}
            />
          ) : selected ? (
            detail.isError ? (
              <p role="alert">
                {detail.error.message}
                <button onClick={() => detail.refetch()} className={button}>
                  Reîncearcă
                </button>
              </p>
            ) : detail.data ? (
              <Editor
                key={`${detail.data.id}:${detail.data.version}`}
                initial={detail.data}
                overview={query.data}
                onSaved={refresh}
                onRefresh={refresh}
              />
            ) : (
              <p role="status">Se încarcă fișa…</p>
            )
          ) : (
            <section className={panel}>
              <Truck className="text-cyan-200" />
              <h2 className="mt-3 text-lg text-white">Alege oportunitatea sau adaugă un produs</h2>
              <p className="mt-2 text-sm text-slate-400">
                Păstrează oferta, costurile și dovezile într-un singur loc. Textele, imaginile și
                rezultatele publicării se urmăresc separat pentru fiecare platformă.
              </p>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
function Editor({
  initial,
  overview,
  onSaved,
  onRefresh,
}: {
  initial: Detail;
  overview: Overview;
  onSaved: (id: string) => Promise<unknown>;
  onRefresh: () => Promise<unknown>;
}) {
  const [data, setData] = useState(initial.data),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [sources, setSources] = useState<Array<{ url: string; title: string; description?: string }>>(
      initial.sources ?? [],
    ),
    [model, setModel] = useState<"small" | "editor">("small");
  const margin = contribution(data),
    locked =
      initial.archived ||
      initial.placements.some((p) => ["executing", "uncertain"].includes(p.status));
  function set<K extends keyof OpportunityData>(key: K, value: OpportunityData[K]) {
    setData((x) => ({ ...x, [key]: value }));
    setDirty(true);
  }
  function copy(
    channel: DropshippingChannel,
    key: keyof OpportunityData["channels"]["website"],
    value: string,
  ) {
    setData((x) => ({
      ...x,
      channels: { ...x.channels, [channel]: { ...x.channels[channel], [key]: value } },
    }));
    setDirty(true);
  }
  async function run(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      const r = await api(`/${initial.id}/${action}`, {
        expectedVersion: initial.version,
        ...extra,
      });
      await onRefresh();
      return r;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    const parsed = opportunitySchema.safeParse(data);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifică fișa.");
      return;
    }
    setBusy(true);
    try {
      await api(
        initial.version ? `/${initial.id}` : "",
        initial.version
          ? { expectedVersion: initial.version, data: parsed.data }
          : { id: initial.id, data: parsed.data },
        initial.version ? "PUT" : "POST",
      );
      setDirty(false);
      await onSaved(initial.id);
      toast.success("Fișa a fost salvată. Reviziile modificate cer aprobare nouă.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function generate(channel: DropshippingChannel) {
    const result = (await run("generate", { channel, model })) as {
      copy: { title: string; description: string };
    } | null;
    if (result) {
      setData((x) => ({
        ...x,
        channels: { ...x.channels, [channel]: { ...x.channels[channel], ...result.copy } },
      }));
      setDirty(true);
      toast.info("Ciornă AI pregătită. Verifică faptele și salvează revizia.");
    }
  }
  async function prepareImages(file: File | undefined) {
    if (!file) return;
    if (
      file.size > 15_000_000 ||
      !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)
    ) {
      toast.error("Alege o fotografie JPEG, PNG, WebP sau AVIF, maximum 15 MB.");
      return;
    }
    if (data.rightsEvidence.length < 12) {
      toast.error("Completează întâi dovada drepturilor fotografiei.");
      return;
    }
    setBusy(true);
    let bitmap: ImageBitmap | undefined;
    try {
      bitmap = await createImageBitmap(file);
      if (bitmap.width * bitmap.height > 32_000_000 || Math.max(bitmap.width, bitmap.height) < 1200)
        throw Error(
          "Folosește o fotografie clară, cu latura mare de minimum 1200 px și maximum 32 megapixeli.",
        );
      const channels = { ...data.channels };
      for (const channel of dropshippingChannels) {
        const guide = channelGuides[channel],
          canvas = document.createElement("canvas");
        canvas.width = guide.width;
        canvas.height = guide.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw Error("Canvas indisponibil.");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min(
          (canvas.width - 80) / bitmap.width,
          (canvas.height - 80) / bitmap.height,
          1,
        );
        ctx.drawImage(
          bitmap,
          (canvas.width - bitmap.width * scale) / 2,
          (canvas.height - bitmap.height * scale) / 2,
          bitmap.width * scale,
          bitmap.height * scale,
        );
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (x) => (x ? resolve(x) : reject(Error("Imagine indisponibilă."))),
            "image/png",
          ),
        );
        if (blob.size > 8_000_000) throw Error("Fișierul exportat depășește 8 MB.");
        const r = await fetch(`${root}/${initial.id}/image?channel=${channel}`, {
          method: "POST",
          headers: {
            "content-type": "image/png",
            "x-rights-evidence": encodeURIComponent(data.rightsEvidence),
          },
          body: blob,
        });
        const result = (await r.json()) as { data: { id: string }; error?: { message: string } };
        if (!r.ok) throw Error(result.error?.message ?? "Încărcare nereușită.");
        channels[channel] = { ...channels[channel], assetId: result.data.id };
      }
      set("channels", channels);
      await onRefresh();
      toast.success("Patru variante pregătite. Verifică imaginile și salvează selecția în fișă.");
    } catch (e) {
      toast.error((e as Error).message);
      await onRefresh();
    } finally {
      bitmap?.close();
      setBusy(false);
    }
  }
  function exportPacket() {
    download(`dropshipping-${initial.id}-r${initial.version}.json`, {
      agent: "cutiuta-magica-dropshipping",
      skillVersion: "2026.11.05.1",
      ...initial,
      guides: channelGuides,
      warning:
        "Pachet de lucru privat pentru Codex, nu feed sau publicare confirmată. Verifică aprobarea și contul în Opera înainte de execuție.",
    });
  }
  const field = (
    label: string,
    key: keyof Pick<
      OpportunityData,
      | "name"
      | "category"
      | "supplierName"
      | "supplierUrl"
      | "supplierEvidence"
      | "facts"
      | "quoteValidUntil"
      | "returnsTerms"
      | "rightsEvidence"
      | "catalogProductId"
    >,
    multiline = false,
  ) => (
    <TextField
      key={key}
      label={label}
      value={data[key]}
      onChange={(v) => set(key, v)}
      multiline={multiline}
      type={key === "quoteValidUntil" ? "date" : key === "supplierUrl" ? "url" : "text"}
    />
  );
  return (
    <section
      data-dropshipping-dirty={dirty}
      data-dropshipping-busy={busy}
      className="min-w-0 space-y-5"
    >
      <form onSubmit={save} className={panel + " space-y-5"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-white">
            {initial.version ? "Fișa oportunității" : "Oportunitate nouă"}
          </h2>
          <span className="text-xs text-slate-400">
            {initial.archived
              ? "Arhivată"
              : dirty
                ? "Modificări nesalvate"
                : `Revizia ${initial.version}`}
          </span>
        </div>
        <fieldset disabled={busy || locked} className="space-y-5 disabled:opacity-60">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("Denumire produs", "name")}
            {field("Categorie comercială", "category")}
            {field("Furnizor", "supplierName")}
            {field("Sursa ofertei · HTTPS", "supplierUrl")}
          </div>
          {field(
            "Oferta verificată · dată, surse și condiții confirmate",
            "supplierEvidence",
            true,
          )}
          {field("Specificații și beneficii susținute de surse", "facts", true)}
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={data.factsVerified}
              onChange={(e) => set("factsVerified", e.target.checked)}
            />
            Am verificat specificațiile de mai sus în sursele produsului.
          </label>
          <details open={!initial.version}>
            <summary className="cursor-pointer font-medium text-white">
              Ofertă, livrare și contribuție estimată
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(["saleBani", "costBani", "shippingBani", "feesBani", "reserveBani"] as const).map(
                (key, i) => (
                  <TextField
                    key={key}
                    label={
                      [
                        "Preț de vânzare · RON",
                        "Cost produs · RON",
                        "Transport și import · RON",
                        "Comisioane totale · RON",
                        "Rezervă retururi și alte costuri · RON",
                      ][i]
                    }
                    value={data[key] === null ? "" : String(data[key]! / 100)}
                    onChange={(v) => set(key, v === "" ? null : Math.round(Number(v) * 100))}
                    type="number"
                  />
                ),
              )}
              <TextField
                label="Stoc confirmat la furnizor · bucăți"
                type="number"
                value={data.stock === null ? "" : String(data.stock)}
                onChange={(v) => set("stock", v === "" ? null : Number(v))}
              />
              <TextField
                label="Termen maxim confirmat · zile"
                type="number"
                value={data.deliveryDays === null ? "" : String(data.deliveryDays)}
                onChange={(v) => set("deliveryDays", v === "" ? null : Number(v))}
              />
              {field("Oferta este valabilă până la", "quoteValidUntil")}
            </div>
            <p className="my-3 text-sm text-cyan-200">
              {margin
                ? `Contribuție estimată: ${(margin.bani / 100).toFixed(2)} RON · ${margin.percent}%`
                : "Completează toate costurile pentru calcul."}
            </p>
            <p className="mb-4 text-xs text-slate-400">
              Folosește aceeași bază fiscală pentru toate valorile. Estimarea nu reprezintă profit
              contabil; nu sunt folosite costuri ori cursuri valutare inventate.
            </p>
            <label className="flex gap-3 text-sm">
              <input
                type="checkbox"
                checked={data.supplierShipsDirect}
                onChange={(e) => set("supplierShipsDirect", e.target.checked)}
              />
              Furnizorul a confirmat expedierea directă către client.
            </label>
            <div className="mt-4">
              {field("Retururi, urmărire și responsabilitatea livrării", "returnsTerms", true)}
            </div>
          </details>
          {field("Dovada drepturilor fotografiilor și conținutului", "rightsEvidence", true)}
          <details>
            <summary className="cursor-pointer text-sm">
              Legătură opțională cu catalogul existent
            </summary>
            <div className="mt-3">
              {field("ID produs compatibil din catalogul central", "catalogProductId")}
              <p className="mt-2 text-xs text-slate-400">
                Catalogul propriu este specializat în cutiuțe muzicale. Produsele generale pot fi
                pregătite pentru marketplace; nu sunt convertite artificial în cutiuțe.
              </p>
            </div>
          </details>
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <button className={primary} disabled={busy || locked}>
            Salvează fișa
          </button>
          {initial.version > 0 && (
            <button
              type="button"
              className={button}
              disabled={busy || dirty}
              onClick={exportPacket}
            >
              <ArrowDownToLine size={15} />
              Pachet pentru Codex
            </button>
          )}
        </div>
        {locked && (
          <p role="status" className="text-sm text-amber-200">
            {initial.archived
              ? "Fișa este arhivată."
              : "Încheie sau reconciliază execuția înainte de modificarea fișei."}
          </p>
        )}
      </form>
      {initial.version > 0 && !initial.archived && (
        <>
          <section className={panel}>
            <h3 className="font-medium text-white">Surse și furnizori</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                className={button}
                disabled={busy || dirty || !overview.braveConfigured}
                onClick={async () => {
                  const r = (await run("research")) as { sources: typeof sources } | null;
                  if (r) setSources(r.sources);
                }}
              >
                <Search size={15} />
                Caută top 5 surse
              </button>
              <a
                className={button}
                target="_blank"
                rel="noopener noreferrer"
                href={`https://www.google.com/search?q=${encodeURIComponent(`${data.name} wholesale supplier dropshipping`)}`}
              >
                <ExternalLink size={15} />
                Cercetează în browser
              </a>
              <a href="/admin/suppliers" className={button}>
                Configurare căutare
              </a>
            </div>
            {!overview.braveConfigured && (
              <p className="mt-3 text-xs text-amber-200">
                Cheia Brave lipsește. Continuă cercetarea în browser sau deschide configurarea
                căutării.
              </p>
            )}
            <p className="mt-3 text-xs text-slate-400">
              Rezultatele sunt surse de verificat, nu furnizori certificați. Compară oferta și
              salvează dovada în fișă.
            </p>
            {sources.map((s) => (
              <article key={s.url} className="mt-3 border-t border-slate-700 pt-3">
                <a
                  className="break-words text-sm text-cyan-200 underline"
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s.title}
                </a>
                <p className="mt-1 text-xs text-slate-400">{s.description}</p>
              </article>
            ))}
          </section>
          <section className={panel}>
            <h3 className="font-medium text-white">Imagini pentru fiecare platformă</h3>
            <p className="my-3 text-sm text-slate-400">
              Compoziție pe suport alb, cu fotografia reală păstrată integral și fără mărire
              artificială. Fundalul fotografiei originale rămâne; verifică manual cerințele
              categoriei. Fișierele sunt private.
            </p>
            <label className={button}>
              Pregătește 4 variante din fotografie
              <input
                aria-label="Fotografie pentru variantele platformelor"
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                disabled={busy || locked || dirty}
                onChange={(e) => prepareImages(e.target.files?.[0])}
              />
            </label>
            <p className="mt-2 text-xs text-slate-400">
              Salvează întâi fișa și drepturile imaginii. JPEG/PNG/WebP/AVIF, maximum 15 MB.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {initial.assets
                .filter((a) => a.channel !== "source")
                .slice(0, 8)
                .map((a) => (
                  <div key={a.id} className="min-w-0 rounded-lg border border-slate-700 p-2">
                    <img
                      src={`${root}/${a.id}/image`}
                      alt={`Variantă ${a.channel} pentru ${data.name}`}
                      className="aspect-square w-full rounded object-contain bg-white"
                      width={a.width}
                      height={a.height}
                      loading="lazy"
                    />
                    <p className="mt-2 text-xs">
                      {a.channel} · {a.width}×{a.height}
                    </p>
                    <a
                      download={`${a.channel}-${a.id}.png`}
                      className="mt-2 block text-xs text-cyan-200 underline"
                      href={`${root}/${a.id}/image`}
                    >
                      Descarcă imaginea
                    </a>
                    <button
                      disabled={busy || locked}
                      className="mt-2 text-xs text-cyan-200 underline"
                      onClick={() => copy(a.channel as DropshippingChannel, "assetId", a.id)}
                    >
                      Selectează pentru canal
                    </button>
                  </div>
                ))}
            </div>
          </section>
          <section className={panel + " space-y-4"}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-medium text-white">Conținut și publicare pe canale</h3>
              <label className="text-xs text-slate-400">
                Model pentru ciorne
                <select
                  className={input}
                  value={model}
                  onChange={(e) => setModel(e.target.value as typeof model)}
                >
                  <option value="small">Llama 3.2 · 3B · economic</option>
                  <option value="editor">Llama 3.1 · 8B · revizie</option>
                </select>
              </label>
            </div>
            {!overview.ai.available && (
              <p className="text-xs text-amber-200">
                Workers AI așteaptă confirmarea planului gratuit. Poți pregăti textele cu agentul
                Codex și le poți salva în fișă.
              </p>
            )}
            {dropshippingChannels.map((channel) => {
              const guide = channelGuides[channel],
                c = data.channels[channel],
                placement = initial.placements.find((p) => p.channel === channel),
                issues = readiness(data, channel);
              return (
                <details key={channel} className="border-t border-slate-700 pt-4">
                  <summary className="cursor-pointer text-white">
                    {guide.name}
                    <span className="ml-2 text-xs text-slate-400">
                      {placement?.status === "approved" && !approvalValid(placement)
                        ? "Aprobare expirată sau retrasă"
                        : placement
                          ? states[placement.status]
                          : "Ciornă"}
                      {placement?.published_revision &&
                      placement.published_revision !== initial.version
                        ? " · necesită actualizare"
                        : ""}
                    </span>
                  </summary>
                  <div className="mt-4 space-y-4">
                    <p className="text-xs text-slate-400">{guide.notes}</p>
                    <div className="flex flex-wrap gap-3">
                      <a
                        className={button}
                        href={guide.portal}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Portal oficial <ExternalLink size={14} />
                      </a>
                      <a
                        className={button}
                        href={guide.docs}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Cerințe oficiale
                      </a>
                      <button
                        className={button}
                        disabled={busy || dirty || locked || !overview.ai.available}
                        onClick={() => generate(channel)}
                      >
                        <Sparkles size={14} />
                        Ciornă AI
                      </button>
                    </div>
                    <fieldset disabled={busy || locked} className="space-y-3">
                      <TextField
                        label="Titlu pentru platformă"
                        value={c.title}
                        onChange={(v) => copy(channel, "title", v)}
                        maxLength={180}
                      />
                      <TextField
                        label="Descriere"
                        value={c.description}
                        onChange={(v) => copy(channel, "description", v)}
                        multiline
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TextField
                          label="Cont oficial / seller așteptat"
                          value={c.account}
                          onChange={(v) => copy(channel, "account", v)}
                        />
                        <TextField
                          label="Categorie / ID din platformă"
                          value={c.categoryId}
                          onChange={(v) => copy(channel, "categoryId", v)}
                        />
                      </div>
                      <TextField
                        label="Atributele cerute, completate și verificate"
                        value={c.attributes}
                        onChange={(v) => copy(channel, "attributes", v)}
                        multiline
                      />
                      <TextField
                        label="Dovada verificării cerințelor în cont"
                        value={c.requirementsEvidence}
                        onChange={(v) => copy(channel, "requirementsEvidence", v)}
                        multiline
                      />
                      <TextField
                        label="Cerințe verificate la"
                        type="date"
                        value={c.requirementsCheckedAt}
                        onChange={(v) => copy(channel, "requirementsCheckedAt", v)}
                      />
                      <p className="text-xs text-slate-400">
                        Imagine selectată:{" "}
                        {c.assetId || "Alege o imagine din secțiunea de mai sus."}
                      </p>
                    </fieldset>
                    {issues.length > 0 && (
                      <ul className="space-y-1 rounded-lg border border-amber-400/20 p-3 text-xs text-amber-100">
                        {issues.map((x) => (
                          <li key={x}>{x}</li>
                        ))}
                      </ul>
                    )}
                    {dirty && (
                      <p className="text-xs text-amber-200">
                        Salvează fișa înainte de generare, aprobare sau export.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <button
                        className={primary}
                        disabled={
                          busy ||
                          dirty ||
                          locked ||
                          issues.length > 0 ||
                          approvalValid(placement) ||
                          (placement?.status === "published_manual" &&
                            placement.revision === initial.version)
                        }
                        onClick={() => run("approve", { channel })}
                      >
                        Aprobă {placement?.listing_url ? "actualizarea" : "publicarea"} · rev.{" "}
                        {initial.version}
                      </button>
                      {placement?.status === "approved" && (
                        <button
                          className={button}
                          disabled={busy || dirty}
                          onClick={() => run("cancel", { channel })}
                        >
                          Retrage aprobarea
                        </button>
                      )}
                    </div>
                    {placement?.listing_url && (
                      <a
                        className="block break-all text-sm text-cyan-200 underline"
                        href={placement.listing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Vezi publicarea anterioară
                      </a>
                    )}
                    {placement &&
                      (approvalValid(placement) ||
                        ["executing", "uncertain"].includes(placement.status)) && (
                        <Execution
                          placement={placement}
                          busy={busy || dirty}
                          account={c.account}
                          run={run}
                        />
                      )}
                    {placement?.evidence && (
                      <p className="break-words text-xs text-slate-400">
                        Ultima dovadă: {placement.evidence}
                      </p>
                    )}
                  </div>
                </details>
              );
            })}
            <p className="text-xs text-slate-400">
              Publicarea se execută asistat în contul oficial, apoi se salvează URL-ul și dovada. Un
              rezultat incert trebuie reconciliat înainte de reluare.
            </p>
          </section>
          <footer className="flex flex-wrap gap-3">
            <a href="/admin/orders" className={button}>
              Comenzi și urmărire
            </a>
            <a href="/admin/returns" className={button}>
              Retururi
            </a>
            <button
              className={button}
              disabled={busy || dirty || locked}
              onClick={() => {
                if (
                  window.confirm(
                    "Arhivezi oportunitatea? Publicările existente rămân active pe platforme.",
                  )
                )
                  run("archive");
              }}
            >
              Arhivează oportunitatea
            </button>
            <button className={button} disabled={busy || dirty} onClick={onRefresh}>
              <RefreshCw size={14} />
              Reîncarcă starea
            </button>
          </footer>
        </>
      )}
    </section>
  );
}
function Execution({
  placement,
  busy,
  account,
  run,
}: {
  placement: Placement;
  busy: boolean;
  account: string;
  run: (action: string, body: Record<string, unknown>) => Promise<unknown>;
}) {
  const [observed, setObserved] = useState(""),
    [url, setUrl] = useState(placement.listing_url ?? ""),
    [evidence, setEvidence] = useState("");
  return (
    <div className="space-y-3 rounded-lg border border-cyan-300/25 p-3">
      {placement.status === "approved" ? (
        <>
          <TextField
            label={`Confirmă identitatea observată în Opera · așteptat: ${account}`}
            value={observed}
            onChange={setObserved}
          />
          <button
            className={button}
            disabled={busy || observed !== account}
            onClick={() => run("claim", { channel: placement.channel, observedAccount: observed })}
          >
            Începe execuția în contul verificat
          </button>
        </>
      ) : (
        <>
          <p className="break-all text-xs text-slate-400">
            Execuție {placement.operation_id}.{" "}
            {placement.status === "uncertain"
              ? "Verifică destinația; nu repeta publicarea."
              : "Încarcă materialele în portal, apoi confirmă rezultatul."}
          </p>
          <TextField label="URL public al produsului" value={url} onChange={setUrl} type="url" />
          <TextField
            label="Dovadă · seller, dată, verificare și referință captură"
            value={evidence}
            onChange={setEvidence}
            multiline
          />
          <div className="flex flex-wrap gap-2">
            {(
              [
                "published_manual",
                "failed",
                ...(placement.status === "executing" ? ["uncertain"] : []),
              ] as const
            ).map((status) => (
              <button
                key={status}
                className={button}
                disabled={
                  busy || evidence.trim().length < 15 || (status === "published_manual" && !url)
                }
                onClick={() =>
                  run(placement.status === "uncertain" ? "reconcile" : "result", {
                    channel: placement.channel,
                    operationId: placement.operation_id,
                    status,
                    listingUrl: url,
                    evidence,
                  })
                }
              >
                {status === "published_manual"
                  ? "Confirmă produsul publicat"
                  : status === "failed"
                    ? placement.status === "uncertain"
                      ? "Confirmă că operația nu există"
                      : "Înregistrează eșecul"
                    : "Rezultat incert"}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
