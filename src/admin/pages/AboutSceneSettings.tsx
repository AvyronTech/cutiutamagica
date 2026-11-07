import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Music2 } from "lucide-react";
import { toast } from "sonner";
import type { StorySceneAdmin } from "@/lib/story-scene";
import { AudioClipUpload } from "./AudioClipUpload";

const endpoint = "/api/v1/admin/story-scene";
const input = "mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-white";
async function result<T>(response: Response): Promise<T> {
  const body = (await response.json()) as { data: T; error?: { message: string } };
  if (!response.ok) throw new Error(body.error?.message ?? "Operațiunea nu a reușit.");
  return body.data;
}

export function AboutSceneSettings() {
  const query = useQuery({
    queryKey: ["admin", "story-scene"],
    refetchOnWindowFocus: false,
    queryFn: async () => result<StorySceneAdmin>(await fetch(endpoint)),
  });
  return (
    <section
      id="despre-cutiuta"
      className="glass-card scroll-mt-24 rounded-xl p-5 space-y-4 text-slate-200"
    >
      <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
        <Music2 size={20} /> Despre cutiuță · scena și melodia
      </h2>
      <p className="text-sm text-slate-400">
        Fragmentul ales se aude când vizitatorul apasă manivela. Încărcarea îl păstrează privat;
        activează-l după previzualizare. Configurarea aceasta este separată de melodiile produselor.
      </p>
      <Link
        to="/despre-cutiuta"
        target="_blank"
        rel="noopener"
        className="inline-flex min-h-11 items-center text-sm text-purple-300 underline"
      >
        Deschide scena publică ↗
      </Link>
      {query.isPending && <p role="status">Se încarcă setările…</p>}
      {query.isError && (
        <p role="alert">
          Setările nu sunt disponibile.{" "}
          <button type="button" className="underline" onClick={() => void query.refetch()}>
            Reîncearcă
          </button>
        </p>
      )}
      {query.data && (
        <SceneForm
          key={query.data.settings.version}
          snapshot={query.data}
          reload={async () => {
            await query.refetch();
          }}
        />
      )}
    </section>
  );
}

function SceneForm({
  snapshot,
  reload,
}: {
  snapshot: StorySceneAdmin;
  reload: () => Promise<void>;
}) {
  const [assetId, setAssetId] = useState(snapshot.settings.assetId ?? "");
  const [title, setTitle] = useState(snapshot.settings.title);
  const [enabled, setEnabled] = useState(snapshot.settings.enabled);
  const [rights, setRights] = useState(snapshot.settings.rightsConfirmed);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  async function upload(file: File) {
    setBusy(true);
    try {
      const saved = await result<{ id: string }>(
        await fetch(`${endpoint}/audio`, {
          method: "POST",
          headers: { "content-type": "audio/wav" },
          body: file,
        }),
      );
      setAssetId(saved.id);
      setEnabled(false);
      setRights(false);
      await reload();
      toast.success("Fragment salvat privat. Ascultă-l și activează-l când este pregătit.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetId: assetId || null,
          title,
          enabled,
          rightsConfirmed: rights,
          expectedVersion: snapshot.settings.version,
        }),
      });
      if (response.status === 409) setConflict(true);
      await result(response);
      await reload();
      toast.success(
        enabled
          ? "Melodia scenei a fost activată."
          : "Configurarea a fost salvată. Sunetul public este oprit.",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <AudioClipUpload
        busy={busy}
        onUpload={(file) => void upload(file)}
        title="Melodia scenei din atelier"
      />
      <form onSubmit={(e) => void save(e)} className="space-y-4">
        {snapshot.developmentPreview && (
          <p className="text-sm text-cyan-200">
            Previzualizare locală: verificarea drepturilor nu blochează testarea melodiei.
          </p>
        )}
        <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              Fragment audio
              <select
                className={input}
                value={assetId}
                onChange={(e) => {
                  setAssetId(e.target.value);
                  setRights(false);
                  setEnabled(false);
                }}
              >
                <option value="">Fără fragment</option>
                {snapshot.assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {new Date(a.createdAt).toLocaleString("ro-RO")} · {Math.round(a.duration)} sec ·{" "}
                    {a.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Titlu afișat vizitatorilor
              <input
                className={input}
                required
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          </div>
          {assetId && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">Previzualizare privată</p>
              <audio
                key={assetId}
                src={`${endpoint}/audio/${assetId}`}
                controls
                preload="none"
                className="w-full"
              />
            </div>
          )}
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={rights}
              onChange={(e) => {
                setRights(e.target.checked);
                if (!e.target.checked && !snapshot.developmentPreview) setEnabled(false);
              }}
            />{" "}
            Confirm că avem dreptul să difuzăm public acest fragment.
          </label>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={!assetId || (!rights && !snapshot.developmentPreview)}
            />{" "}
            Activează melodia la apăsarea manivelei.
          </label>
          <button
            type="submit"
            disabled={enabled && ((!rights && !snapshot.developmentPreview) || !assetId)}
            className="min-h-11 rounded-lg bg-purple-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Se salvează…" : "Salvează configurarea scenei"}
          </button>
        </fieldset>
      </form>
      {conflict && (
        <p role="alert" className="text-sm text-amber-200">
          Configurația trebuie reîncărcată.{" "}
          <button type="button" className="underline" onClick={() => void reload()}>
            Reîncarcă setările salvate
          </button>
        </p>
      )}
    </div>
  );
}
