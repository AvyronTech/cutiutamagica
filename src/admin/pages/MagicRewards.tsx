import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save, Sparkles, Star } from "lucide-react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import {
  adjustMagicStars,
  getMagicRewardsAdmin,
  saveMagicRewardActivities,
  saveMagicRewardsProgram,
} from "@/lib/magic-rewards.functions";

const input = "w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white";

export default function MagicRewardsAdmin() {
  const client = useQueryClient();
  const load = useServerFn(getMagicRewardsAdmin);
  const save = useServerFn(saveMagicRewardsProgram);
  const adjust = useServerFn(adjustMagicStars);
  const saveActivities = useServerFn(saveMagicRewardActivities);
  const query = useQuery({ queryKey: ["admin", "magic-rewards"], queryFn: () => load() });
  const refresh = () => client.invalidateQueries({ queryKey: ["admin", "magic-rewards"] });
  const saveMutation = useMutation({
    mutationFn: save,
    onSuccess: async () => {
      await refresh();
      toast.success("Programul Magic Stars a fost actualizat.");
    },
    onError: (error) => toast.error(error.message),
  });
  const adjustMutation = useMutation({
    mutationFn: adjust,
    onSuccess: async () => {
      await refresh();
      toast.success("Ajustarea a fost înregistrată în registru.");
    },
    onError: (error) => toast.error(error.message),
  });
  const activitiesMutation = useMutation({
    mutationFn: saveActivities,
    onSuccess: async () => {
      await refresh();
      toast.success("Activitățile și limitele au fost actualizate.");
    },
    onError: (error) => toast.error(error.message),
  });
  if (query.isLoading) return <p>Se încarcă Magic Rewards…</p>;
  if (!query.data?.program) return <p role="alert">Aplică migrația D1 pentru Magic Rewards.</p>;
  const program = query.data.program as Record<string, string | number>;
  const stats = (query.data.stats ?? {}) as Record<string, string | number>;

  function submitProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const number = (name: string) => Number(form.get(name));
    saveMutation.mutate({
      data: {
        enabled: form.get("enabled") === "on",
        redemptionThreshold: number("redemptionThreshold"),
        rewardValidDays: number("rewardValidDays"),
        termsVersion: String(form.get("termsVersion")),
      },
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-amber-300">
          Fidelitate verificabilă
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Magic Rewards · Magic Stars</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Registru append-only pentru stele, beneficii, profiluri de cadouri și remindere e-mail.
        </p>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {[
          ["Conturi", stats.accounts],
          ["Stele disponibile", stats.available_stars],
          ["Stele acordate", stats.lifetime_stars],
          ["Beneficii active", stats.active_rewards],
          ["Remindere trimise", stats.reminders_sent],
          ["Distribuiri azi", stats.shares_today],
          ["Bonusuri aniversare", stats.birthday_bonuses],
        ].map(([label, value]) => (
          <article
            key={String(label)}
            className="rounded-xl border border-slate-700 bg-slate-900/50 p-4"
          >
            <p className="text-xs text-slate-500">{label}</p>
            <strong className="mt-2 block text-2xl text-white">{Number(value ?? 0)}</strong>
          </article>
        ))}
      </section>
      <form
        className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/45 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          activitiesMutation.mutate({
            data: {
              activities: query.data.activities.map((activity) => ({
                code: activity.code,
                stars: Number(form.get(`${activity.code}:stars`)),
                periodLimit: Number(form.get(`${activity.code}:limit`)),
                enabled: form.get(`${activity.code}:enabled`) === "on",
              })),
            },
          });
        }}
      >
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-white">
            <Sparkles size={17} /> Activități și limite
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Acordarea este automată și idempotentă. Limita se aplică perioadei fiecărei activități.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {query.data.activities.map((activity) => (
            <article key={activity.code} className="rounded-xl border border-slate-700 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="text-sm text-white">{activity.name}</strong>
                  <p className="mt-1 text-xs text-slate-500">{activity.description}</p>
                </div>
                <label className="text-xs text-slate-400">
                  <input
                    name={`${activity.code}:enabled`}
                    type="checkbox"
                    defaultChecked={activity.enabled}
                  />{" "}
                  Activă
                </label>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-400">
                  Stele
                  <input
                    className={`${input} mt-1`}
                    name={`${activity.code}:stars`}
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={activity.stars}
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Limită / perioadă
                  <input
                    className={`${input} mt-1`}
                    name={`${activity.code}:limit`}
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={activity.periodLimit}
                    disabled={activity.cadence === "per_event"}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-amber-200 px-4 py-2 text-sm font-semibold text-slate-950"
          disabled={activitiesMutation.isPending}
        >
          <Save size={15} /> Salvează activitățile
        </button>
      </form>
      <div className="grid gap-5 xl:grid-cols-[1fr_.75fr]">
        <form
          onSubmit={submitProgram}
          className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/45 p-5"
        >
          <h2 className="flex items-center gap-2 font-semibold text-white">
            <Sparkles size={17} /> Reguli program
          </h2>
          <label className="flex gap-2 text-sm text-slate-300">
            <input name="enabled" type="checkbox" defaultChecked={Number(program.enabled) === 1} />{" "}
            Program activ
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-400">
              Prag stele
              <input
                className={`${input} mt-1.5`}
                name="redemptionThreshold"
                type="number"
                min="1"
                max="100"
                defaultValue={Number(program.redemption_threshold)}
              />
            </label>
            <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400">
              Conversie fixă
              <strong className="mt-1.5 block text-sm text-amber-200">
                1 Magic Star = 1 leu · beneficiu {Number(program.redemption_threshold)} lei
              </strong>
            </div>
            <label className="text-xs text-slate-400">
              Valabilitate cod (zile)
              <input
                className={`${input} mt-1.5`}
                name="rewardValidDays"
                type="number"
                min="1"
                max="730"
                defaultValue={Number(program.reward_valid_days)}
              />
            </label>
            <label className="text-xs text-slate-400">
              Versiune regulament
              <input
                className={`${input} mt-1.5`}
                name="termsVersion"
                defaultValue={String(program.terms_version)}
              />
            </label>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-amber-200 px-4 py-2 text-sm font-semibold text-slate-950"
            disabled={saveMutation.isPending}
          >
            <Save size={15} /> Salvează programul
          </button>
        </form>
        <form
          className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/45 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            adjustMutation.mutate({
              data: {
                email: String(form.get("email")),
                delta: Number(form.get("delta")),
                note: String(form.get("note")),
              },
            });
          }}
        >
          <h2 className="flex items-center gap-2 font-semibold text-white">
            <Star size={17} /> Ajustare auditată
          </h2>
          <input
            className={input}
            name="email"
            type="email"
            required
            placeholder="client@email.ro"
          />
          <input
            className={input}
            name="delta"
            type="number"
            min="-20"
            max="20"
            required
            placeholder="+1 sau -1"
          />
          <textarea
            className={`${input} min-h-24`}
            name="note"
            minLength={4}
            maxLength={300}
            required
            placeholder="Motivul verificabil al ajustării"
          />
          <button
            className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950"
            disabled={adjustMutation.isPending}
          >
            Înregistrează
          </button>
        </form>
      </div>
      <section className="rounded-xl border border-slate-700 bg-slate-900/45 p-5">
        <h2 className="font-semibold text-white">Ultimele mișcări</h2>
        <div className="mt-3 space-y-2">
          {query.data.ledger.map((item) => (
            <div
              key={String(item.id)}
              className="flex justify-between gap-4 rounded-lg bg-slate-950/45 p-3 text-xs"
            >
              <span className="text-slate-300">
                {String(item.display_name)} · {String(item.email)} ·{" "}
                {String(item.note ?? item.reason)}
              </span>
              <strong className="text-amber-200">
                {Number(item.delta) > 0 ? "+" : ""}
                {Number(item.delta)} ✦
              </strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
