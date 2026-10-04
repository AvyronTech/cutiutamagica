import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  CheckCircle2,
  CircleDashed,
  Film,
  Image as ImageIcon,
  LockKeyhole,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

type Modality = "text" | "image" | "video";

type StudioState = {
  models: Array<{
    id: string;
    provider: "ollama" | "comfyui";
    modality: Modality;
    label: string;
    runtime_model_id: string;
    official_repository_url: string;
    license_spdx: string;
    status: string;
    last_verified_at: string | null;
    last_error_message: string | null;
  }>;
  jobs: Array<{
    id: string;
    modality: Modality;
    purpose: string;
    channel: string;
    aspect_ratio: string;
    prompt_text: string;
    status: string;
    output_text: string | null;
    error_message: string | null;
    product_name: string | null;
    model_label: string;
    asset_count: number;
    created_at: string;
  }>;
  connections: Array<{
    id: string;
    label: string;
    provider: string;
    status: string;
    last_verified_at: string | null;
  }>;
  products: Array<{ id: string; name: string; slug: string }>;
  security: {
    localPullRunner: boolean;
    secretsStoredInDatabase: boolean;
    publicOutputs: boolean;
    approvalRequired: boolean;
  };
};

type JobDraft = {
  modality: Modality;
  purpose: "social_post" | "story" | "reel" | "tiktok" | "campaign" | "product_visual";
  productId: string;
  channel: "facebook" | "instagram" | "tiktok" | "website" | "multi_channel";
  aspectRatio: "1:1" | "4:5" | "9:16" | "16:9";
  prompt: string;
};

const initialDraft: JobDraft = {
  modality: "text",
  purpose: "social_post",
  productId: "",
  channel: "multi_channel",
  aspectRatio: "4:5",
  prompt:
    "Creează o propunere de postare caldă și premium, bazată strict pe produsul selectat și regulile Cutiuța Magică.",
};

const statusLabels: Record<string, string> = {
  setup_required: "Configurare necesară",
  active: "Activ",
  degraded: "Necesită atenție",
  disabled: "Dezactivat",
  queued: "În coadă",
  running: "Se generează",
  awaiting_review: "Așteaptă verificarea",
  completed: "Aprobat",
  failed: "Eșuat",
  cancelled: "Anulat",
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init.headers } : init?.headers,
  });
  const body = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: { message?: string; code?: string };
  };
  if (!response.ok)
    throw new Error(body.error?.message || body.error?.code || "Operația nu a reușit.");
  return body.data as T;
}

function ModelIcon({ modality }: { modality: Modality }) {
  if (modality === "image") return <ImageIcon className="h-4 w-4" />;
  if (modality === "video") return <Film className="h-4 w-4" />;
  return <Bot className="h-4 w-4" />;
}

export default function AiContentStudio() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<JobDraft>(initialDraft);
  const [notice, setNotice] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["admin", "ai-content-studio"],
    queryFn: () => api<StudioState>("/api/v1/admin/ai-studio"),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
  const create = useMutation({
    mutationFn: (value: JobDraft) =>
      api<{ jobId: string; status: string }>("/api/v1/admin/ai-studio/jobs", {
        method: "POST",
        body: JSON.stringify({
          ...value,
          productId: value.productId || null,
          idempotencyKey: crypto.randomUUID(),
        }),
      }),
    onSuccess: async () => {
      setNotice("Lucrarea a intrat în coada locală. Rezultatul nu va fi publicat automat.");
      await queryClient.invalidateQueries({ queryKey: ["admin", "ai-content-studio"] });
    },
    onError: (error) =>
      setNotice(error instanceof Error ? error.message : "Generarea nu a pornit."),
  });

  const modelReady = useMemo(
    () =>
      query.data?.models.some(
        (model) => model.modality === draft.modality && model.status === "active",
      ) ?? false,
    [draft.modality, query.data?.models],
  );

  if (query.isLoading)
    return <p className="text-sm text-slate-400">Se încarcă studioul AI local…</p>;
  if (query.isError || !query.data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
        Studioul AI devine disponibil după aplicarea migrării locale dedicate.
      </div>
    );
  }

  const data = query.data;
  return (
    <section className="space-y-5 rounded-xl border border-violet-400/20 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,.12),transparent_32%),#0b1524] p-4 shadow-[0_24px_90px_rgba(0,0,0,.28)] md:p-5">
      <header className="flex flex-col gap-3 border-b border-[#28364d] pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-violet-300">
            <Sparkles className="h-5 w-5" />
            <h2 className="text-base font-semibold text-white">
              Studio AI local · conținut și media
            </h2>
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            Qwen3 planifică și scrie prin Ollama; ComfyUI produce fundaluri și video cu produsul
            păstrat ca strat protejat. Codex furnizează regulile de brand și datele aprobate din
            magazin.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" /> Fără auto-publicare
        </span>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        {data.models.map((model) => {
          const ready = model.status === "active";
          return (
            <article
              key={model.id}
              className="rounded-lg border border-[#2b3850] bg-[#111c2e]/95 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className={ready ? "text-emerald-300" : "text-amber-300"}>
                  <ModelIcon modality={model.modality} />
                </span>
                <span
                  className={`rounded-full px-2 py-1 text-[10px] ${ready ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}
                >
                  {statusLabels[model.status] ?? model.status}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-white">{model.label}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {model.runtime_model_id} · {model.license_spdx}
              </p>
              <a
                className="mt-3 inline-block text-[11px] text-cyan-300 hover:text-cyan-200"
                href={model.official_repository_url}
                target="_blank"
                rel="noreferrer"
              >
                Repository oficial ↗
              </a>
              {model.last_error_message && (
                <p className="mt-2 text-[11px] leading-4 text-amber-200/70">
                  {model.last_error_message}
                </p>
              )}
            </article>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[.9fr_1.1fr]">
        <form
          className="space-y-3 rounded-lg border border-[#2b3850] bg-[#111c2e]/95 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setNotice(null);
            create.mutate(draft);
          }}
        >
          <div>
            <h3 className="text-sm font-semibold text-white">Creează o lucrare</h3>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              Contextul include numai catalogul, politicile și imaginile aprobate. Datele clienților
              și secretele sunt excluse.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-400">
              Tip
              <select
                value={draft.modality}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    modality: event.target.value as Modality,
                    aspectRatio: event.target.value === "video" ? "9:16" : draft.aspectRatio,
                  })
                }
                className="mt-1.5 w-full rounded-lg border border-[#33445f] bg-[#0d1727] px-3 py-2.5 text-sm text-white"
              >
                <option value="text">Text / strategie</option>
                <option value="image">Imagine</option>
                <option value="video">Video</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Canal
              <select
                value={draft.channel}
                onChange={(event) =>
                  setDraft({ ...draft, channel: event.target.value as JobDraft["channel"] })
                }
                className="mt-1.5 w-full rounded-lg border border-[#33445f] bg-[#0d1727] px-3 py-2.5 text-sm text-white"
              >
                <option value="multi_channel">Mai multe canale</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="website">Website</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Format
              <select
                value={draft.aspectRatio}
                onChange={(event) =>
                  setDraft({ ...draft, aspectRatio: event.target.value as JobDraft["aspectRatio"] })
                }
                className="mt-1.5 w-full rounded-lg border border-[#33445f] bg-[#0d1727] px-3 py-2.5 text-sm text-white"
              >
                <option value="1:1">1:1</option>
                <option value="4:5">4:5</option>
                <option value="9:16">9:16</option>
                <option value="16:9">16:9</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Produs
              <select
                value={draft.productId}
                required={draft.modality !== "text"}
                onChange={(event) => setDraft({ ...draft, productId: event.target.value })}
                className="mt-1.5 w-full rounded-lg border border-[#33445f] bg-[#0d1727] px-3 py-2.5 text-sm text-white"
              >
                <option value="">Fără produs specific</option>
                {data.products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-xs text-slate-400">
            Brief
            <textarea
              value={draft.prompt}
              onChange={(event) => setDraft({ ...draft, prompt: event.target.value })}
              rows={5}
              className="mt-1.5 w-full resize-y rounded-lg border border-[#33445f] bg-[#0d1727] px-3 py-2.5 text-sm leading-6 text-white"
            />
          </label>
          {notice && (
            <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/8 p-3 text-xs text-cyan-100">
              {notice}
            </div>
          )}
          <button
            type="submit"
            disabled={!modelReady || create.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Send className="h-4 w-4" />
            {modelReady
              ? create.isPending
                ? "Se pregătește…"
                : "Trimite în studioul local"
              : "Pornește și verifică runnerul local"}
          </button>
        </form>

        <section className="overflow-hidden rounded-lg border border-[#2b3850] bg-[#111c2e]/95">
          <div className="flex items-center justify-between border-b border-[#2b3850] px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Lucrări recente</h3>
            <span className="text-[11px] text-slate-500">{data.jobs.length} afișate</span>
          </div>
          <div className="max-h-[560px] divide-y divide-[#2b3850] overflow-y-auto">
            {data.jobs.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">Nicio lucrare creată încă.</p>
            ) : (
              data.jobs.map((job) => (
                <article key={job.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={
                        job.status === "awaiting_review"
                          ? "text-amber-300"
                          : job.status === "failed"
                            ? "text-red-300"
                            : "text-cyan-300"
                      }
                    >
                      {job.status === "queued" ? (
                        <CircleDashed className="h-4 w-4" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-100">
                          {job.product_name || job.purpose}
                        </p>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                          {statusLabels[job.status] ?? job.status}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                        {job.prompt_text}
                      </p>
                      <p className="mt-2 text-[10px] text-slate-600">
                        {job.model_label} · {job.channel} · {job.aspect_ratio}
                        {job.asset_count ? ` · ${job.asset_count} fișier(e)` : ""}
                      </p>
                      {job.output_text && (
                        <p className="mt-2 rounded-md bg-[#0d1727] p-2 text-xs leading-5 text-slate-300">
                          {job.output_text}
                        </p>
                      )}
                      {job.error_message && (
                        <p className="mt-2 text-xs text-red-300">{job.error_message}</p>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {data.connections.map((connection) => (
          <div
            key={connection.id}
            className="flex items-start gap-3 rounded-lg border border-[#2b3850] bg-[#0d1727] p-3"
          >
            <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
            <div>
              <p className="text-xs font-medium text-slate-200">{connection.label}</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {statusLabels[connection.status] ?? connection.status} · secret numai în Worker și
                iMac
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
