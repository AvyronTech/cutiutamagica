import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Archive,
  Clock3,
  DatabaseBackup,
  HardDrive,
  Save,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  getBackupCenter,
  protectBackupAsBaseline,
  runBackupNow,
  saveBackupPolicy,
} from "@/lib/operations.functions";

const input =
  "w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300";
const primary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50";
const secondary =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-300/60 disabled:opacity-50";

function bytes(value: unknown): string {
  const amount = Number(value ?? 0);
  if (amount < 1024) return `${amount} B`;
  if (amount < 1024 ** 2) return `${(amount / 1024).toFixed(1)} KB`;
  return `${(amount / 1024 ** 2).toFixed(1)} MB`;
}

export default function BackupCenter() {
  const load = useServerFn(getBackupCenter);
  const savePolicy = useServerFn(saveBackupPolicy);
  const runNow = useServerFn(runBackupNow);
  const protect = useServerFn(protectBackupAsBaseline);
  const client = useQueryClient();
  const [running, setRunning] = useState(false);
  const query = useQuery({ queryKey: ["admin", "backups"], queryFn: () => load() });
  const refresh = () => client.invalidateQueries({ queryKey: ["admin", "backups"] });
  const policyMutation = useMutation({
    mutationFn: savePolicy,
    onSuccess: async () => {
      await refresh();
      toast.success("Politica de backup a fost salvată");
    },
    onError: (error) => toast.error(error.message),
  });

  if (query.isError)
    return (
      <p role="alert" className="text-rose-200">
        Backup Center necesită migrația D1 0015.
      </p>
    );
  if (!query.data) return <p role="status">Se încarcă Backup Center...</p>;

  const { policy, runs } = query.data;
  const completeRuns = runs.filter((run) => run.status === "completed" || run.status === "partial");
  const baseline = completeRuns.find((run) => Number(run.isBaseline) === 1);
  const totalSize = completeRuns.reduce((sum, run) => sum + Number(run.sizeBytes ?? 0), 0);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    policyMutation.mutate({
      data: {
        enabled: form.get("enabled") === "on",
        frequency: String(form.get("frequency")) as "manual" | "daily" | "weekly",
        weekday: Number(form.get("weekday")),
        hour: Number(form.get("hour")),
        retentionCount: Number(form.get("retentionCount")),
        maxAgeDays: Number(form.get("maxAgeDays")),
        includeCustomerData: form.get("includeCustomerData") === "on",
      },
    });
  }

  async function createBackup() {
    setRunning(true);
    try {
      const result = await runNow();
      await refresh();
      toast.success(`Backup ${result.status}: ${bytes(result.sizeBytes)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Backupul nu a putut fi creat");
    } finally {
      setRunning(false);
    }
  }

  async function setBaseline(backupId: string) {
    try {
      await protect({ data: { backupId } });
      await refresh();
      toast.success("Backupul de bază este protejat de regulile de ștergere");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Modificarea nu a reușit");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">
            Continuitate operațională
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Backup Center</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Snapshoturi comprimate ale datelor aplicației în R2 privat, cu retenție controlată și un
            backup de bază protejat.
          </p>
        </div>
        <button className={primary} disabled={running} onClick={createBackup}>
          <DatabaseBackup size={16} /> {running ? "Se creează..." : "Backup acum"}
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(
          [
            [ShieldCheck, "D1 Time Travel", "Activ", "Restaurare nativă Cloudflare"],
            [
              Archive,
              "Snapshoturi R2",
              completeRuns.length,
              "Date comprimate, media fără duplicate",
            ],
            [HardDrive, "Spațiu utilizat", bytes(totalSize), "Doar snapshoturile administrate"],
            [
              Clock3,
              "Backup de bază",
              baseline ? "Protejat" : "Neselectat",
              "Nu este șters automat",
            ],
          ] as Array<[LucideIcon, string, string | number, string]>
        ).map(([Icon, label, value, note]) => (
          <article
            key={String(label)}
            className="rounded-lg border border-slate-700 bg-slate-900/55 p-4"
          >
            <Icon className="h-4 w-4 text-cyan-300" />
            <p className="mt-3 text-xl font-semibold text-white">{String(value)}</p>
            <p className="text-xs font-medium text-slate-300">{String(label)}</p>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">{String(note)}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
        <form
          onSubmit={submit}
          className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/40 p-5"
        >
          <h2 className="font-semibold text-white">Politică automată</h2>
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input name="enabled" type="checkbox" defaultChecked={policy.enabled} /> Backup
            programat activ
          </label>
          <label className="block text-sm text-slate-300">
            Frecvență
            <select name="frequency" defaultValue={policy.frequency} className={`${input} mt-1.5`}>
              <option value="manual">Doar manual</option>
              <option value="daily">Zilnic</option>
              <option value="weekly">Săptămânal</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-300">
              Ziua săptămânii
              <select name="weekday" defaultValue={policy.weekday} className={`${input} mt-1.5`}>
                {["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"].map(
                  (day, index) => (
                    <option key={day} value={index + 1}>
                      {day}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Ora locală
              <input
                name="hour"
                type="number"
                min="0"
                max="23"
                defaultValue={policy.hour}
                className={`${input} mt-1.5`}
              />
            </label>
            <label className="text-sm text-slate-300">
              Număr păstrat
              <input
                name="retentionCount"
                type="number"
                min="2"
                max="30"
                defaultValue={policy.retentionCount}
                className={`${input} mt-1.5`}
              />
            </label>
            <label className="text-sm text-slate-300">
              Vechime maximă (zile)
              <input
                name="maxAgeDays"
                type="number"
                min="7"
                max="365"
                defaultValue={policy.maxAgeDays}
                className={`${input} mt-1.5`}
              />
            </label>
          </div>
          <label className="flex items-start gap-3 text-sm leading-5 text-slate-300">
            <input
              name="includeCustomerData"
              type="checkbox"
              defaultChecked={policy.includeCustomerData}
              className="mt-1"
            />{" "}
            Include datele clienților și comenzilor în snapshotul criptat la nivelul platformei
          </label>
          <button className={primary} disabled={policyMutation.isPending}>
            <Save size={15} /> Salvează politica
          </button>
          <p className="text-[11px] leading-5 text-slate-500">
            Programarea folosește fusul Europe/Bucharest. Fișierele produselor rămân versionate în
            R2 și nu sunt copiate în fiecare snapshot.
          </p>
        </form>

        <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-5">
          <h2 className="font-semibold text-white">Istoric și retenție</h2>
          <div className="mt-4 space-y-2">
            {runs.length === 0 ? (
              <p className="text-sm text-slate-500">Nu există încă backupuri ale aplicației.</p>
            ) : (
              runs.map((run) => (
                <article
                  key={String(run.id)}
                  className="flex flex-col gap-3 rounded-lg border border-slate-700/80 bg-slate-950/45 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {String(run.triggerType) === "manual" ? "Manual" : "Programat"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${run.status === "failed" ? "bg-rose-400/10 text-rose-200" : "bg-emerald-400/10 text-emerald-200"}`}
                      >
                        {String(run.status)}
                      </span>
                      {Number(run.isBaseline) === 1 && (
                        <span className="rounded-full bg-cyan-300/10 px-2 py-0.5 text-[10px] text-cyan-200">
                          bază protejată
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(String(run.createdAt)).toLocaleString("ro-RO")} ·{" "}
                      {bytes(run.sizeBytes)} · {String(run.tableCount)} tabele
                    </p>
                    {run.errorMessage ? (
                      <p className="mt-1 text-xs text-rose-200">{String(run.errorMessage)}</p>
                    ) : null}
                  </div>
                  {(run.status === "completed" || run.status === "partial") &&
                  Number(run.isBaseline) !== 1 ? (
                    <button className={secondary} onClick={() => setBaseline(String(run.id))}>
                      <ShieldCheck size={14} /> Protejează ca bază
                    </button>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
