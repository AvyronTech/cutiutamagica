import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getAdminNotifications, markNotificationRead } from "@/lib/admin.functions";
import type { StorefrontMessage } from "@/lib/storefront-messages";
const input = "mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-white";
const url = "/api/v1/admin/storefront/messages";
export default function NotificationCenter() {
  const load = useServerFn(getAdminNotifications),
    read = useServerFn(markNotificationRead);
  const live = useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: () => load(),
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
  const messages = useQuery({
    queryKey: ["admin", "storefront-messages"],
    queryFn: async () => {
      const r = await fetch(url);
      if (!r.ok) throw new Error("Mesajele nu pot fi încărcate.");
      return ((await r.json()) as { data: StorefrontMessage[] }).data;
    },
  });
  const [busy, setBusy] = useState(false),
    [newId, setNewId] = useState<string | null>(null);
  async function save(e: FormEvent<HTMLFormElement>, m: StorefrontMessage) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const r = await fetch(url, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: m.id,
          expectedVersion: m.version,
          title: f.get("title"),
          message: f.get("message"),
          placement: f.get("placement"),
          link: f.get("link"),
          label: f.get("label"),
          delaySeconds: Number(f.get("delay")),
          scrollPercent: Number(f.get("scroll")),
          enabled: f.get("enabled") === "on",
        }),
      });
      const body = (await r.json()) as { error?: { message: string } };
      if (!r.ok) throw new Error(body.error?.message);
      await messages.refetch();
      setNewId(null);
      toast.success("Mesaj salvat.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const all = [
    ...(messages.data ?? []),
    ...(newId
      ? [
          {
            id: newId,
            version: 0,
            title: "",
            message: "",
            placement: "home" as const,
            link: "/produse",
            label: "Descoperă",
            delaySeconds: 20,
            scrollPercent: 25,
            enabled: 0,
          },
        ]
      : []),
  ];
  return (
    <div className="space-y-8 text-slate-200">
      <header>
        <h1 className="text-2xl font-semibold">Notificări și mesaje calde</h1>
        <p className="mt-2 text-slate-400">
          Alertele echipei sunt private. Pe landing apar cel mult trei mesaje pe sesiune, pe rând,
          câte 5 secunde, cu minimum 18 secunde între ele. Pe celelalte pagini apare cel mult unul
          la fiecare vizită, în limita aceleiași sesiuni.
        </p>
      </header>
      <section className="rounded-xl border border-slate-700 p-5">
        <h2 className="mb-4 text-lg">Alerte live pentru echipă · actualizare la 15 secunde</h2>
        {live.isError && <p role="alert">Alertele nu pot fi încărcate.</p>}
        {live.data?.notifications.length === 0 && <p>Nu sunt alerte noi.</p>}
        {live.data?.notifications.map((n) => (
          <article
            key={n.id}
            className="flex flex-wrap justify-between gap-4 border-t border-slate-700 py-4"
          >
            <div>
              <strong>{n.title}</strong>
              <p className="mt-1 text-sm text-slate-400">{n.message}</p>
            </div>
            <button
              onClick={async () => {
                try {
                  await read({ data: { notificationId: n.id } });
                  await live.refetch();
                } catch {
                  toast.error("Alerta nu a putut fi actualizată.");
                }
              }}
              disabled={n.read}
              className="text-sm text-amber-200 disabled:opacity-40"
            >
              {n.read ? "Citită" : "Marchează citită"}
            </button>
          </article>
        ))}
      </section>
      <section>
        <h2 className="text-lg">Mesajele de pe site</h2>
        <p className="my-2 text-sm text-slate-400">
          Cronometrul pornește după încărcarea paginii și închiderea introducerii. Mesajele așteaptă
          dacă există un dialog, chat, altă notificare sau un câmp în curs de completare. Închiderea
          manuală oprește sugestiile pentru restul sesiunii. Fără urgențe sau comenzi inventate.
        </p>
        {messages.isError && <p role="alert">Mesajele nu pot fi încărcate.</p>}
        <div className="grid gap-5 lg:grid-cols-2">
          {all.map((m) => (
            <form
              key={`${m.id}-${m.version}`}
              onSubmit={(e) => save(e, m)}
              className="space-y-3 rounded-xl border border-slate-700 p-5"
            >
              <label className="block text-sm">
                Titlu
                <input
                  name="title"
                  required
                  maxLength={90}
                  defaultValue={m.title}
                  className={input}
                />
              </label>
              <label className="block text-sm">
                Mesaj
                <textarea
                  name="message"
                  required
                  maxLength={240}
                  defaultValue={m.message}
                  className={input}
                />
              </label>
              <label className="block text-sm">
                Unde apare
                <select name="placement" defaultValue={m.placement} className={input}>
                  <option value="home">Landing page</option>
                  <option value="products">Catalog</option>
                  <option value="product">Pagina cutiuței</option>
                  <option value="cart">Comandă</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  După secunde
                  <input
                    name="delay"
                    type="number"
                    min={8}
                    max={120}
                    defaultValue={m.delaySeconds}
                    required
                    className={input}
                  />
                </label>
                <label className="text-sm">
                  După scroll (%)
                  <input
                    name="scroll"
                    type="number"
                    min={0}
                    max={90}
                    defaultValue={m.scrollPercent}
                    required
                    className={input}
                  />
                </label>
              </div>
              <label className="block text-sm">
                Text buton
                <input
                  name="label"
                  required
                  maxLength={40}
                  defaultValue={m.label}
                  className={input}
                />
              </label>
              <label className="block text-sm">
                Destinație publică
                <input name="link" required defaultValue={m.link} className={input} />
              </label>
              <label className="flex gap-3 text-sm">
                <input name="enabled" type="checkbox" defaultChecked={Boolean(m.enabled)} />
                Activ pe site
              </label>
              <button disabled={busy} className="rounded-lg bg-amber-200 px-4 py-2 text-slate-950">
                Salvează mesajul
              </button>
            </form>
          ))}
        </div>
        <button
          disabled={Boolean(newId)}
          onClick={() => setNewId(crypto.randomUUID())}
          className="mt-5 rounded-lg border border-slate-600 px-4 py-2"
        >
          Adaugă mesaj
        </button>
      </section>
    </div>
  );
}
