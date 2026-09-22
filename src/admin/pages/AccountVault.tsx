import { type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  KeyRound,
  Laptop,
  Link2,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Unplug,
} from "lucide-react";
import { toast } from "sonner";
import { CredentialPanel } from "@/admin/pages/GrowthSettings";
import {
  getAccountVault,
  revokeAdminDevice,
  saveAccountConnection,
} from "@/lib/operations.functions";

const input =
  "w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300";
const button =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-50";
const secondary =
  "inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-200 hover:border-rose-300/60";

export default function AccountVault() {
  const load = useServerFn(getAccountVault);
  const save = useServerFn(saveAccountConnection);
  const revoke = useServerFn(revokeAdminDevice);
  const client = useQueryClient();
  const query = useQuery({ queryKey: ["admin", "account-vault"], queryFn: () => load() });
  const refresh = () => client.invalidateQueries({ queryKey: ["admin", "account-vault"] });
  const mutation = useMutation({
    mutationFn: save,
    onSuccess: async () => {
      await refresh();
      toast.success("Conexiunea a fost înregistrată");
    },
    onError: (error) => toast.error(error.message),
  });

  if (query.isError)
    return (
      <p role="alert" className="text-rose-200">
        Seiful de conturi necesită migrația D1 0015.
      </p>
    );
  if (!query.data) return <p role="status">Se încarcă seiful de conturi...</p>;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      data: {
        owner: String(form.get("owner")) as "cutiuta_magica" | "avyron",
        provider: String(form.get("provider")),
        label: String(form.get("label")),
        authMethod: String(form.get("authMethod")) as
          "oauth" | "api_key" | "service_token" | "device_session" | "manual",
        secretReference: String(form.get("secretReference")).trim().toUpperCase(),
        scopes: String(form.get("scopes"))
          .split(/[\s,]+/)
          .map((value) => value.trim())
          .filter(Boolean),
        notes: String(form.get("notes")),
      },
    });
  }

  async function revokeDevice(deviceId: string) {
    try {
      await revoke({ data: { deviceId } });
      await refresh();
      toast.success("Dispozitivul a fost revocat");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Revocarea nu a reușit");
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">
          Acces controlat
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Conturi și dispozitive</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Inventar de conexiuni pentru Cutiuța Magică și AVYRON, fără a stoca parole în clar și fără
          dependențe între aplicații.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-lg border border-slate-700 bg-slate-900/55 p-4">
          <ShieldCheck className="h-5 w-5 text-emerald-300" />
          <h2 className="mt-3 text-sm font-semibold text-white">Secrete în Worker</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            D1 păstrează numai numele bindingului sau referința secretului.
          </p>
        </article>
        <article className="rounded-lg border border-slate-700 bg-slate-900/55 p-4">
          <LockKeyhole className="h-5 w-5 text-cyan-300" />
          <h2 className="mt-3 text-sm font-semibold text-white">OAuth preferat</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Folosește permisiuni minime și revocabile pentru platformele externe.
          </p>
        </article>
        <article className="rounded-lg border border-slate-700 bg-slate-900/55 p-4">
          <Smartphone className="h-5 w-5 text-fuchsia-300" />
          <h2 className="mt-3 text-sm font-semibold text-white">Dispozitive staff</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Instalarea PWA înregistrează dispozitivul, dar nu păstrează parola.
          </p>
        </article>
      </section>

      <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
        <form
          onSubmit={submit}
          className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/40 p-5"
        >
          <h2 className="flex items-center gap-2 font-semibold text-white">
            <Link2 size={17} /> Adaugă referință de conectare
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-300">
              Proprietar
              <select name="owner" className={`${input} mt-1.5`}>
                <option value="cutiuta_magica">Cutiuța Magică</option>
                <option value="avyron">AVYRON</option>
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Metodă
              <select name="authMethod" className={`${input} mt-1.5`}>
                <option value="oauth">OAuth</option>
                <option value="api_key">API key</option>
                <option value="service_token">Service token</option>
                <option value="device_session">Sesiune dispozitiv</option>
                <option value="manual">Manual</option>
              </select>
            </label>
          </div>
          <label className="block text-sm text-slate-300">
            Platformă
            <input
              name="provider"
              required
              minLength={2}
              className={`${input} mt-1.5`}
              placeholder="Meta, TikTok, Google..."
            />
          </label>
          <label className="block text-sm text-slate-300">
            Etichetă
            <input
              name="label"
              required
              minLength={2}
              className={`${input} mt-1.5`}
              placeholder="Cont social principal"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Referință secret Cloudflare
            <input
              name="secretReference"
              className={`${input} mt-1.5 font-mono uppercase`}
              placeholder="META_ACCESS_TOKEN"
              pattern="[A-Z][A-Z0-9_]{2,80}"
            />
            <span className="mt-1 block text-[11px] text-slate-500">
              Doar numele secretului Worker, niciodată valoarea tokenului.
            </span>
          </label>
          <label className="block text-sm text-slate-300">
            Permisiuni / scopes
            <input
              name="scopes"
              className={`${input} mt-1.5`}
              placeholder="pages_read_engagement, instagram_content_publish"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Note
            <textarea name="notes" className={`${input} mt-1.5 min-h-24`} />
          </label>
          <button className={button} disabled={mutation.isPending}>
            <KeyRound size={15} /> Salvează conexiunea
          </button>
        </form>

        <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-5">
          <h2 className="font-semibold text-white">Inventar conexiuni</h2>
          <div className="mt-4 space-y-2">
            {query.data.connections.length === 0 ? (
              <p className="text-sm text-slate-500">Nu există conexiuni înregistrate.</p>
            ) : (
              query.data.connections.map((connection) => (
                <article
                  key={String(connection.id)}
                  className="rounded-lg border border-slate-700/80 bg-slate-950/45 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{String(connection.label)}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {String(connection.owner)} · {String(connection.provider)} ·{" "}
                        {String(connection.authMethod)}
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-300/10 px-2 py-1 text-[10px] text-amber-200">
                      {String(connection.status)}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-cyan-200">
                    {connection.secretReference
                      ? String(connection.secretReference)
                      : "fără secret asociat"}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <CredentialPanel providers={["meta"]} />

      <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-5">
        <h2 className="flex items-center gap-2 font-semibold text-white">
          <Laptop size={17} /> Dispozitive administrative
        </h2>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Dispozitivele sunt înregistrate când PWA rulează instalată. Accesul live la iMac sau
          telefon nu este activat implicit; orice control la distanță trebuie autorizat separat la
          nivelul dispozitivului.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {query.data.devices.map((device) => (
            <article
              key={String(device.id)}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-700/80 p-4"
            >
              <div>
                <p className="text-sm font-medium text-white">{String(device.deviceName)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {String(device.email)} · {String(device.platform)} ·{" "}
                  {new Date(String(device.lastSeenAt)).toLocaleString("ro-RO")}
                </p>
              </div>
              {device.revokedAt ? (
                <span className="text-xs text-rose-300">revocat</span>
              ) : (
                <button className={secondary} onClick={() => revokeDevice(String(device.id))}>
                  <Unplug size={14} /> Revocă
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
