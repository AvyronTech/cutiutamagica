import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Save, Sparkles, Star } from "lucide-react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import {
  adjustMagicStars,
  getMagicRewardsAdmin,
  saveMagicRewardsProgram,
} from "@/lib/magic-rewards.functions";

const input = "w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white";

export default function MagicRewardsAdmin() {
  const client = useQueryClient();
  const load = useServerFn(getMagicRewardsAdmin);
  const save = useServerFn(saveMagicRewardsProgram);
  const adjust = useServerFn(adjustMagicStars);
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
        starsForOrder: number("starsForOrder"),
        starsForPhotoReview: number("starsForPhotoReview"),
        starsForReferral: number("starsForReferral"),
        starsForGiftProfile: number("starsForGiftProfile"),
        starsForCollection: number("starsForCollection"),
        redemptionThreshold: number("redemptionThreshold"),
        rewardLei: number("rewardLei"),
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
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Conturi", stats.accounts],
          ["Stele disponibile", stats.available_stars],
          ["Stele acordate", stats.lifetime_stars],
          ["Beneficii active", stats.active_rewards],
          ["Remindere trimise", stats.reminders_sent],
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
            {[
              ["starsForOrder", "Comandă livrată", "stars_for_order"],
              ["starsForPhotoReview", "Review foto aprobat", "stars_for_photo_review"],
              ["starsForReferral", "Recomandare livrată", "stars_for_referral"],
              ["starsForGiftProfile", "Profil de cadouri", "stars_for_gift_profile"],
              ["starsForCollection", "Colecție completată", "stars_for_collection"],
            ].map(([name, label, key]) => (
              <label key={name} className="text-xs text-slate-400">
                {label}
                <input
                  className={`${input} mt-1.5`}
                  name={name}
                  type="number"
                  min="0"
                  max="20"
                  defaultValue={Number(program[key])}
                />
              </label>
            ))}
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
            <label className="text-xs text-slate-400">
              Beneficiu (lei)
              <input
                className={`${input} mt-1.5`}
                name="rewardLei"
                type="number"
                min="1"
                step="0.01"
                defaultValue={Number(program.reward_bani) / 100}
              />
            </label>
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
