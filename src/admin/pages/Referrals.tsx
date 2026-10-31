import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Gift, Link2, Save, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import {
  getReferralAdmin,
  saveReferralCampaign,
  updateReferralCode,
} from "@/lib/referrals.functions";

const field = "w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white";
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50";

function money(bani: number) {
  return new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(bani / 100);
}

export default function Referrals() {
  const load = useServerFn(getReferralAdmin);
  const save = useServerFn(saveReferralCampaign);
  const updateCode = useServerFn(updateReferralCode);
  const query = useQuery({ queryKey: ["admin", "referrals"], queryFn: () => load() });
  const mutation = useMutation({
    mutationFn: save,
    onSuccess: async () => {
      await query.refetch();
      toast.success("Programul de recomandări a fost actualizat.");
    },
    onError: (error) => toast.error(error.message),
  });
  const codeMutation = useMutation({
    mutationFn: updateCode,
    onSuccess: () => query.refetch(),
    onError: (error) => toast.error(error.message),
  });

  if (query.isError)
    return (
      <p role="alert" className="text-red-300">
        Programul de recomandări nu a putut fi încărcat.{" "}
        <button className="underline" onClick={() => query.refetch()}>
          Reîncearcă
        </button>
      </p>
    );
  if (!query.data?.campaign) return <p role="status">Se încarcă recomandările…</p>;

  const campaign = query.data.campaign;
  const stats = query.data.stats ?? {};
  const number = (value: unknown) => Number(value ?? 0);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          După experiența produsului
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Referral inteligent</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Codul de distribuit apare numai după marcarea comenzii ca livrată. Prietenul primește
          reducerea în coș, iar recomandantul primește recompensa numai după livrarea noii comenzi.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [Link2, "Coduri emise", number(stats.codes_issued)],
          [Sparkles, "Coduri active", number(stats.codes_active)],
          [Users, "Recomandări începute", number(stats.referrals_started)],
          [Gift, "Recompense confirmate", number(stats.referrals_qualified)],
        ].map(([Icon, label, value]) => {
          const CardIcon = Icon as typeof Link2;
          return (
            <article key={String(label)} className="glass-card rounded-xl p-4">
              <CardIcon className="h-5 w-5 text-cyan-300" />
              <p className="mt-3 text-2xl font-semibold text-white">{String(value)}</p>
              <p className="text-xs text-slate-400">{String(label)}</p>
            </article>
          );
        })}
      </div>

      <form
        className="glass-card grid gap-4 rounded-xl p-5 md:grid-cols-2 xl:grid-cols-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          mutation.mutate({
            data: {
              active: form.get("active") === "on",
              friendRewardLei: Number(form.get("friendRewardLei")),
              advocateRewardLei: Number(form.get("advocateRewardLei")),
              codeValidDays: Number(form.get("codeValidDays")),
              friendUsageLimit: Number(form.get("friendUsageLimit")),
            },
          });
        }}
      >
        <label className="space-y-2 text-sm text-slate-300">
          <span>Cadou pentru prieten (lei)</span>
          <input
            name="friendRewardLei"
            type="number"
            min="1"
            max="100"
            step="1"
            defaultValue={number(campaign.friend_reward_bani) / 100}
            className={field}
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span>Recompensă recomandant (lei)</span>
          <input
            name="advocateRewardLei"
            type="number"
            min="1"
            max="100"
            step="1"
            defaultValue={number(campaign.advocate_reward_bani) / 100}
            className={field}
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span>Valabilitate cod (zile)</span>
          <input
            name="codeValidDays"
            type="number"
            min="1"
            max="730"
            defaultValue={number(campaign.code_valid_days)}
            className={field}
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span>Utilizări / cod</span>
          <input
            name="friendUsageLimit"
            type="number"
            min="1"
            max="20"
            defaultValue={number(campaign.friend_usage_limit)}
            className={field}
          />
        </label>
        <div className="flex flex-col justify-end gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              name="active"
              type="checkbox"
              defaultChecked={campaign.status === "active"}
              className="h-4 w-4"
            />
            Program activ
          </label>
          <button className={button} disabled={mutation.isPending}>
            <Save className="h-4 w-4" /> Salvează
          </button>
        </div>
      </form>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass-card overflow-hidden rounded-xl">
          <div className="border-b border-slate-700 p-4">
            <h2 className="font-semibold text-white">Coduri de distribuit</h2>
            <p className="mt-1 text-xs text-slate-400">Emise automat numai după livrare.</p>
          </div>
          <div className="max-h-[32rem] overflow-auto">
            {query.data.codes.length === 0 ? (
              <p className="p-5 text-sm text-slate-400">Nu există încă nicio comandă eligibilă.</p>
            ) : (
              query.data.codes.map((code) => (
                <article
                  key={String(code.id)}
                  className="border-b border-slate-800 p-4 last:border-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <code className="font-semibold text-cyan-200">{String(code.code)}</code>
                      <p className="mt-1 text-xs text-slate-400">
                        {String(code.advocate_name || code.advocate_email)} ·{" "}
                        {String(code.source_order_number)}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {number(code.used_count)}/{number(code.usage_limit)} utilizări · expiră{" "}
                        {new Date(String(code.expires_at)).toLocaleDateString("ro-RO")}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={codeMutation.isPending || code.status === "depleted"}
                      onClick={() =>
                        codeMutation.mutate({
                          data: { codeId: String(code.id), enabled: code.status !== "active" },
                        })
                      }
                      className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-40"
                    >
                      {code.status === "active" ? "Dezactivează" : "Reactivează"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="glass-card overflow-hidden rounded-xl">
          <div className="border-b border-slate-700 p-4">
            <h2 className="font-semibold text-white">Recompense și conversii</h2>
            <p className="mt-1 text-xs text-slate-400">
              Reduceri prieten: {money(number(stats.friend_discount_bani))} · recompense confirmate:{" "}
              {money(number(stats.advocate_reward_bani))}
            </p>
          </div>
          <div className="max-h-[32rem] overflow-auto">
            {query.data.rewards.length === 0 ? (
              <p className="p-5 text-sm text-slate-400">Nicio recomandare folosită încă.</p>
            ) : (
              query.data.rewards.map((reward) => (
                <article
                  key={String(reward.id)}
                  className="border-b border-slate-800 p-4 last:border-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">
                        {String(reward.referred_order_number)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Prieten: −{money(number(reward.friend_discount_bani))}
                      </p>
                      {reward.advocate_reward_code && (
                        <code className="mt-2 block text-xs text-cyan-200">
                          {String(reward.advocate_reward_code)}
                        </code>
                      )}
                    </div>
                    <span className="rounded-full border border-slate-600 px-2 py-1 text-[10px] uppercase text-slate-300">
                      {reward.status === "qualified" ? "confirmată" : "în așteptare"}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
