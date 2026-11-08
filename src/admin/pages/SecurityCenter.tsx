import { useState, useEffect, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Laptop, KeyRound, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { Workspace } from "@/admin/Workspace";

type Session = {
  id: string;
  current: boolean;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  idle_expires_at: string | null;
};
type Service = {
  id: string;
  label: string;
  scope: string;
  key_version: number;
  access_client_id: string | null;
  expires_at: string;
  revoked_at: string | null;
};
type SecurityData = {
  sessions: Session[];
  services: Service[];
  events: Array<{ id: string; action: string; severity: string; created_at: string }>;
  logins: Array<{ id: string; outcome: string; created_at: string }>;
  canRead: boolean;
  canManage: boolean;
  policy: {
    adminHost: string;
    hostMode: string;
    accessMode: string;
    mfa: string;
    accessConfigured: boolean;
    legacyRunnerAllowed: boolean;
    vaultReady: boolean;
  };
};
const base = "/api/v1/admin/security";
async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(base + path, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await r.json()) as { data: T; error?: { message: string } };
  if (!r.ok) throw new Error(payload.error?.message || "Operația nu a reușit.");
  return payload.data;
}
const panel = "rounded-xl border border-slate-700 bg-slate-900/50 p-4";
const button =
  "min-h-10 rounded-lg border border-slate-500 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700 disabled:opacity-50";
const field =
  "mt-1 block w-full rounded-lg border border-slate-500 bg-slate-950 p-2.5 text-sm text-white";
const actions: Record<string, string> = {
  "session.revoked": "Sesiune revocată",
  "session.rotated": "Cheie de sesiune reînnoită",
  "service.created": "Identitate automată creată",
  "service.key_rotated": "Cheie de serviciu rotită",
  "service.revoked": "Identitate automată revocată",
};
const severities: Record<string, string> = {
  info: "Informare",
  warning: "Atenție",
  critical: "Operație critică",
};
const date = (s: string) => new Date(s).toLocaleString("ro-RO");

export default function SecurityCenter() {
  const client = useQueryClient();
  const [bindings, setBindings] = useState<Record<string, string>>({});
  const [tab, setTab] = useState("access"),
    [busy, setBusy] = useState(false),
    [secret, setSecret] = useState("");
  useEffect(() => {
    if (!secret) return;
    const timer = setTimeout(() => setSecret(""), 300_000);
    return () => clearTimeout(timer);
  }, [secret]);
  const query = useQuery({
    queryKey: ["admin", "security"],
    queryFn: () => api<SecurityData>(""),
    staleTime: 30_000,
  });
  async function act(path: string, body: unknown) {
    setBusy(true);
    setSecret("");
    try {
      const result = await api<{ signedOut?: boolean; secret?: string }>(path, body);
      if (result.signedOut) {
        client.clear();
        window.location.assign("/auth?role=admin");
        return;
      }
      if (result.secret) setSecret(result.secret);
      else toast.success("Operația a fost finalizată.");
      await client.invalidateQueries({ queryKey: ["admin", "security"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Operația nu a reușit.");
    } finally {
      setBusy(false);
    }
  }
  async function probeAccess() {
    setBusy(true);
    try {
      const result = await api<{ verified: boolean; accountMatched: boolean }>("/access-check");
      if (result.verified && result.accountMatched)
        toast.success("Identitatea Access este validă și corespunde contului.");
      else toast.error("Identitatea Access nu a fost confirmată.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verificarea nu a reușit.");
    } finally {
      setBusy(false);
    }
  }
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void act("/services", {
      action: "create",
      id: String(data.get("id")),
      label: String(data.get("label")),
      accessClientId: String(data.get("accessClientId") || ""),
    });
  }
  if (query.isPending) return <p role="status">Se verifică securitatea contului…</p>;
  if (query.isError)
    return (
      <div role="alert" className={panel}>
        <p>{query.error.message}</p>
        <button className={button} onClick={() => void query.refetch()}>
          Reîncearcă
        </button>
      </div>
    );
  const data = query.data;
  return (
    <Workspace
      title="Securitate și acces"
      description="Sesiuni reale, identități automate și protecții verificate pe server."
      active={tab}
      onSelect={(value) => {
        setSecret("");
        setTab(value);
      }}
      tabs={[
        {
          id: "access",
          label: "Acces și sesiuni",
          description: "Contul și dispozitivele tale",
          icon: Laptop,
          content: (
            <div className="space-y-3">
              <div className={panel}>
                <h2 className="font-semibold text-white">Protecția administrării</h2>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-400">Domeniu intern</dt>
                    <dd className="text-white break-all">{data.policy.adminHost}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Separarea administrării</dt>
                    <dd className="text-white">
                      {data.policy.hostMode === "dedicated"
                        ? "Domeniu dedicat"
                        : "Compatibilitate cu adresele existente"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Validare Access în aplicație</dt>
                    <dd className="text-white">
                      {data.policy.accessMode === "off"
                        ? "Pregătită; neactivată"
                        : data.policy.accessMode === "pilot"
                          ? "Pilot limitat"
                          : "Activată"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">MFA și passkeys</dt>
                    <dd className="text-white">Doar în pregătire · neactivate</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-slate-300">
                  Autentificarea și permisiunile magazinului se verifică separat de Cloudflare
                  Access.
                </p>
                {data.canRead && (
                  <button
                    className={button + " mt-3"}
                    disabled={busy || !data.policy.accessConfigured}
                    onClick={() => void probeAccess()}
                  >
                    Verifică identitatea în pilotul Access
                  </button>
                )}
              </div>
              <div className={panel}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold text-white">Sesiunile tale active</h2>
                  <button
                    disabled={busy}
                    className={button}
                    onClick={() => void act("/sessions", { action: "revoke", target: "others" })}
                  >
                    Închide celelalte sesiuni
                  </button>
                </div>
                <ul className="mt-3 divide-y divide-slate-700">
                  {data.sessions.map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                    >
                      <div>
                        <strong className="text-white">
                          {s.current ? "Acest dispozitiv" : "Altă sesiune"}
                        </strong>
                        <p className="text-slate-300">Creată: {date(s.created_at)}</p>
                        <p className="text-xs text-slate-400">Expiră: {date(s.expires_at)}</p>
                      </div>
                      <button
                        className={button}
                        disabled={busy}
                        onClick={() => void act("/sessions", { action: "revoke", target: s.id })}
                      >
                        {s.current ? "Deconectare" : "Revocă sesiunea"}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    className={button}
                    onClick={() => void act("/sessions", { action: "rotate" })}
                  >
                    Reînnoiește cheia acestei sesiuni
                  </button>
                  <button
                    disabled={busy}
                    className={button}
                    onClick={() => void act("/sessions", { action: "revoke", target: "all" })}
                  >
                    Deconectare de pe toate dispozitivele
                  </button>
                </div>
              </div>
            </div>
          ),
        },
        ...(data.canRead
          ? [
              {
                id: "services",
                label: "Servicii automate",
                description: "Scopuri, rotație și revocare",
                icon: KeyRound,
                content: (
                  <div className="space-y-3">
                    <div className={panel}>
                      <h2 className="font-semibold text-white">
                        Identități fără drepturi de administrator
                      </h2>
                      <p className="mt-2 text-sm text-slate-300">
                        Runnerii pot prelua și trimite ciorne AI. Publicarea continuă prin
                        aprobările existente. Cheile expiră după 90 de zile.
                      </p>
                      {data.policy.legacyRunnerAllowed && (
                        <p className="mt-2 text-sm text-amber-200">
                          Cheia comună veche este încă acceptată pentru compatibilitate. Migrează
                          runnerii înainte de dezactivarea ei.
                        </p>
                      )}
                      <ul className="mt-3 divide-y divide-slate-700">
                        {data.services.map((s) => (
                          <li
                            key={s.id}
                            className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                          >
                            <div>
                              <strong className="text-white">{s.label}</strong>
                              <p className="text-slate-300 break-all">
                                {s.id} · {s.revoked_at ? "Revocată" : `Versiunea ${s.key_version}`}{" "}
                                · expiră {date(s.expires_at)}
                              </p>
                            </div>
                            {data.canManage && !s.revoked_at && (
                              <div className="flex flex-wrap items-end gap-2">
                                <label className="text-xs text-slate-300">
                                  Client ID Access
                                  <input
                                    aria-label={"Client ID Access pentru " + s.label}
                                    className={field}
                                    maxLength={160}
                                    value={bindings[s.id] ?? s.access_client_id ?? ""}
                                    onChange={(e) =>
                                      setBindings((previous) => ({
                                        ...previous,
                                        [s.id]: e.target.value,
                                      }))
                                    }
                                  />
                                </label>
                                <button
                                  disabled={busy}
                                  className={button}
                                  onClick={() =>
                                    void act("/services", {
                                      action: "rotate",
                                      id: s.id,
                                      version: s.key_version,
                                      graceMinutes: 60,
                                      accessClientId: bindings[s.id] ?? s.access_client_id ?? "",
                                    })
                                  }
                                >
                                  Rotește cheia
                                </button>
                                <button
                                  disabled={busy}
                                  className={button}
                                  onClick={() =>
                                    void act("/services", { action: "revoke", id: s.id })
                                  }
                                >
                                  Revocă
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                      {!data.services.length && (
                        <p className="mt-3 text-sm text-slate-400">
                          Nicio identitate individuală configurată.
                        </p>
                      )}
                    </div>
                    {secret && (
                      <div className={panel}>
                        <label className="text-sm text-white">
                          Cheie nouă — afișată o singură dată
                          <textarea className={field} readOnly value={secret} autoComplete="off" />
                        </label>
                        <p className="mt-2 text-xs text-slate-300">
                          Păstreaz-o în secretele runnerului. Închiderea acestei file o ascunde.
                        </p>
                        <button className={button} onClick={() => setSecret("")}>
                          Am păstrat cheia în siguranță
                        </button>
                      </div>
                    )}
                    {data.canManage && (
                      <form className={panel} onSubmit={create}>
                        <h2 className="mb-3 font-semibold text-white">Adaugă un runner dedicat</h2>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-sm text-slate-200">
                            ID runner
                            <input
                              required
                              name="id"
                              pattern="[a-zA-Z0-9._-]{3,100}"
                              className={field}
                            />
                          </label>
                          <label className="text-sm text-slate-200">
                            Denumire
                            <input
                              required
                              name="label"
                              minLength={2}
                              maxLength={80}
                              className={field}
                            />
                          </label>
                          <label className="text-sm text-slate-200 sm:col-span-2">
                            Client ID Cloudflare Access (pentru activarea Access)
                            <input name="accessClientId" maxLength={160} className={field} />
                          </label>
                        </div>
                        <button
                          className={button + " mt-3"}
                          disabled={busy || !data.policy.vaultReady}
                        >
                          Generează cheia pentru runner
                        </button>
                        {!data.policy.vaultReady && (
                          <p className="mt-2 text-sm text-amber-200">
                            Configurează criptarea existentă înainte de emiterea unei chei.
                          </p>
                        )}
                      </form>
                    )}
                  </div>
                ),
              },
              {
                id: "events",
                label: "Jurnal de securitate",
                description: "Evenimente fără date sensibile",
                icon: ScrollText,
                content: (
                  <div className={panel}>
                    <h2 className="font-semibold text-white">Evenimente recente</h2>
                    <ul className="mt-3 divide-y divide-slate-700">
                      {data.events.map((e) => (
                        <li key={e.id} className="py-3 text-sm">
                          <strong className="text-slate-100">
                            {actions[e.action] || "Eveniment de securitate"}
                          </strong>
                          <p className="text-xs text-slate-400">
                            {date(e.created_at)} · {severities[e.severity] || "Informare"}
                          </p>
                        </li>
                      ))}
                    </ul>
                    {!data.events.length && (
                      <p className="mt-3 text-sm text-slate-300">
                        Nu sunt evenimente noi în jurnal.
                      </p>
                    )}
                    <h3 className="mt-5 font-semibold text-white">Autentificări recente</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Rezultate și ore, fără adrese IP, e-mailuri sau tokenuri.
                    </p>
                    <ul className="mt-2 divide-y divide-slate-700">
                      {data.logins.map((e) => (
                        <li key={e.id} className="py-2 text-sm text-slate-200">
                          {(
                            {
                              success: "Autentificare reușită",
                              invalid: "Autentificare respinsă",
                              locked: "Încercare limitată",
                              logout: "Deconectare",
                              password_changed: "Parolă schimbată",
                            } as Record<string, string>
                          )[e.outcome] || "Eveniment de autentificare"}
                          <span className="block text-xs text-slate-400">{date(e.created_at)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
              },
            ]
          : []),
      ]}
    />
  );
}
