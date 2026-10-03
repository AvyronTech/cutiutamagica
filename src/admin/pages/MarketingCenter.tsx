import { useMemo, useState, type FormEvent, type InputHTMLAttributes } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bot,
  Calculator,
  Megaphone,
  Plus,
  Save,
  Send,
  UserMinus,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  addMarketingCost,
  analyzeSocialRelationships,
  createMarketingCampaign,
  createSocialDraft,
  decideUnfollowProposal,
  getMarketingCenter,
  reviewSocialDraft,
} from "@/lib/operations.functions";

const input =
  "w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-fuchsia-300";
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-fuchsia-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-200 disabled:opacity-50";
const secondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:border-fuchsia-300/60";

export default function MarketingCenter({
  initialTab = "strategy",
}: {
  initialTab?: "strategy" | "content" | "social";
}) {
  const client = useQueryClient();
  const load = useServerFn(getMarketingCenter);
  const addCampaign = useServerFn(createMarketingCampaign);
  const addCost = useServerFn(addMarketingCost);
  const makeDraft = useServerFn(createSocialDraft);
  const analyze = useServerFn(analyzeSocialRelationships);
  const decide = useServerFn(decideUnfollowProposal);
  const reviewDraft = useServerFn(reviewSocialDraft);
  const [tab, setTab] = useState(initialTab);
  const [relationships, setRelationships] = useState("");
  const query = useQuery({
    queryKey: ["admin", "marketing"],
    queryFn: () => load(),
    staleTime: 15_000,
  });
  const invalidate = () => client.invalidateQueries({ queryKey: ["admin", "marketing"] });
  const mutation = useMutation({
    mutationFn: async (operation: () => Promise<unknown>) => operation(),
    onSuccess: async () => {
      await invalidate();
      toast.success("Modificarea a fost salvată");
    },
    onError: (error) => toast.error(error.message),
  });

  const totals = useMemo(() => {
    const values = { RON: 0, EUR: 0 };
    for (const cost of query.data?.costs ?? []) {
      const currency = cost.currency === "EUR" ? "EUR" : "RON";
      values[currency] += Number(cost.amountMinor ?? 0) / 100;
    }
    return values;
  }, [query.data?.costs]);

  if (query.isError)
    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-5 text-rose-100">
        Marketing Hub necesită migrația D1 0015.
      </div>
    );
  if (!query.data) return <p role="status">Se încarcă Marketing Hub...</p>;

  const data = query.data;
  const field = (
    name: string,
    label: string,
    props: InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label className="space-y-1.5 text-sm text-slate-300">
      <span>{label}</span>
      <input name={name} className={input} {...props} />
    </label>
  );

  function campaignSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate(() =>
      addCampaign({
        data: {
          name: String(form.get("name")),
          objective: String(form.get("objective")) as "awareness",
          currency: String(form.get("currency")) as "RON",
          budget: Number(form.get("budget")),
          startDate: String(form.get("startDate")),
          endDate: String(form.get("endDate")),
          channels: form.getAll("channels") as Array<
            "facebook" | "instagram" | "tiktok" | "email" | "website"
          >,
          strategy: String(form.get("strategy")),
          targetAudience: String(form.get("targetAudience")),
        },
      }),
    );
  }

  function costSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate(() =>
      addCost({
        data: {
          campaignId: String(form.get("campaignId")),
          channel: String(form.get("channel")),
          category: String(form.get("category")) as "ads",
          amount: Number(form.get("amount")),
          currency: String(form.get("currency")) as "RON",
          occurredOn: String(form.get("occurredOn")),
          note: String(form.get("note")),
        },
      }),
    );
  }

  function draftSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate(() =>
      makeDraft({
        data: {
          accountId: String(form.get("accountId")),
          campaignId: String(form.get("campaignId")),
          productId: String(form.get("productId")),
          platform: String(form.get("platform")) as "instagram",
          postType: String(form.get("postType")) as "post",
          objective: String(form.get("objective")) as "conversion",
          tone: String(form.get("tone")) as "magic",
          callToAction: String(form.get("callToAction")),
          notes: String(form.get("notes")),
        },
      }),
    );
  }

  function runAnalysis() {
    const accounts = relationships
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [username, followsBack, engagement, profileUrl = ""] = line
          .split(",")
          .map((item) => item.trim());
        return {
          username,
          followsBack: /^(da|yes|true|1)$/i.test(followsBack),
          engagementRate: engagement ? Number(engagement) : null,
          profileUrl,
          lastInteractionAt: null,
          protected: false,
        };
      });
    mutation.mutate(() => analyze({ data: { provider: "instagram", accounts } }));
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-fuchsia-300">
          Creștere controlată
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-white">Marketing Hub</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Strategii, bugete, conținut asistat și igiena conturilor sociale, cu aprobare umană
          înainte de orice acțiune externă.
        </p>
      </header>
      <section className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ["Campanii", data.campaigns.length, Megaphone],
            ["Cost total RON", totals.RON.toFixed(2), Calculator],
            [
              "Propuneri unfollow",
              data.proposals.filter((item) => item.decision === "proposed").length,
              UserMinus,
            ],
          ] as Array<[string, string | number, LucideIcon]>
        ).map(([label, value, Icon]) => (
          <article key={label} className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
            <Icon className="h-4 w-4 text-fuchsia-300" />
            <p className="mt-3 text-2xl font-semibold text-white">{String(value)}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </article>
        ))}
      </section>
      <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-3">
        {(
          [
            ["strategy", "Strategii și costuri", Megaphone],
            ["content", "Conținut și postări", Send],
            ["social", "Agent unfollow", Bot],
          ] as const
        ).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={tab === id ? button : secondary}>
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === "strategy" && (
        <div className="grid gap-5 xl:grid-cols-2">
          <form
            onSubmit={campaignSubmit}
            className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/40 p-5"
          >
            <h2 className="font-semibold text-white">Strategie nouă</h2>
            {field("name", "Nume campanie", { required: true })}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-300">
                Obiectiv
                <select name="objective" className={`${input} mt-1.5`}>
                  <option value="conversion">Conversii</option>
                  <option value="awareness">Vizibilitate</option>
                  <option value="traffic">Trafic</option>
                  <option value="retention">Retenție</option>
                </select>
              </label>
              <label className="text-sm text-slate-300">
                Monedă
                <select name="currency" className={`${input} mt-1.5`}>
                  <option>RON</option>
                  <option>EUR</option>
                </select>
              </label>
            </div>
            {field("budget", "Buget planificat", {
              type: "number",
              min: 0,
              step: "0.01",
              defaultValue: 0,
            })}
            <div className="grid gap-3 sm:grid-cols-2">
              {field("startDate", "Început", { type: "date" })}
              {field("endDate", "Final", { type: "date" })}
            </div>
            <div className="flex flex-wrap gap-3">
              {["facebook", "instagram", "tiktok", "email", "website"].map((channel) => (
                <label key={channel} className="text-xs text-slate-300">
                  <input type="checkbox" name="channels" value={channel} className="mr-1.5" />
                  {channel}
                </label>
              ))}
            </div>
            <label className="block text-sm text-slate-300">
              Public țintă
              <textarea name="targetAudience" className={`${input} mt-1.5`} required />
            </label>
            <label className="block text-sm text-slate-300">
              Strategie și ipoteză
              <textarea name="strategy" className={`${input} mt-1.5 min-h-28`} required />
            </label>
            <button className={button}>
              <Plus size={15} />
              Creează strategia
            </button>
          </form>
          <div className="space-y-5">
            <form
              onSubmit={costSubmit}
              className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/40 p-5"
            >
              <h2 className="font-semibold text-white">Înregistrează cost</h2>
              <select name="campaignId" className={input}>
                <option value="">Fără campanie</option>
                {data.campaigns.map((item) => (
                  <option key={String(item.id)} value={String(item.id)}>
                    {String(item.name)}
                  </option>
                ))}
              </select>
              <div className="grid gap-3 sm:grid-cols-2">
                {field("channel", "Canal", { required: true, placeholder: "Meta Ads" })}
                <label className="text-sm text-slate-300">
                  Categorie
                  <select name="category" className={`${input} mt-1.5`}>
                    <option value="ads">Reclame</option>
                    <option value="content">Conținut</option>
                    <option value="creator">Creator</option>
                    <option value="software">Software</option>
                    <option value="shipping">Livrare</option>
                    <option value="other">Altele</option>
                  </select>
                </label>
                {field("amount", "Valoare", {
                  type: "number",
                  min: 0.01,
                  step: "0.01",
                  required: true,
                })}
                <label className="text-sm text-slate-300">
                  Monedă
                  <select name="currency" className={`${input} mt-1.5`}>
                    <option>RON</option>
                    <option>EUR</option>
                  </select>
                </label>
                {field("occurredOn", "Data", {
                  type: "date",
                  required: true,
                  defaultValue: new Date().toISOString().slice(0, 10),
                })}
                {field("note", "Notă")}
              </div>
              <button className={button}>
                <Save size={15} />
                Salvează costul
              </button>
            </form>
            <div className="rounded-lg border border-slate-700 p-5">
              <h2 className="font-semibold text-white">Campanii</h2>
              <div className="mt-3 space-y-2">
                {data.campaigns.slice(0, 8).map((item) => (
                  <div
                    key={String(item.id)}
                    className="flex justify-between rounded-md bg-slate-900 p-3 text-sm"
                  >
                    <span className="text-white">{String(item.name)}</span>
                    <span className="text-slate-400">
                      {(Number(item.budgetMinor) / 100).toFixed(2)} {String(item.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "content" && (
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <form
            onSubmit={draftSubmit}
            className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/40 p-5"
          >
            <h2 className="font-semibold text-white">Generează draft asistat</h2>
            <label className="text-sm text-slate-300">
              Produs
              <select name="productId" className={`${input} mt-1.5`}>
                <option value="">Colecția generală</option>
                {data.products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Cont
              <select name="accountId" className={`${input} mt-1.5`}>
                <option value="">Se alege la aprobare</option>
                {data.accounts.map((item) => (
                  <option key={String(item.id)} value={String(item.id)}>
                    {String(item.provider)} · {String(item.label)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-slate-300">
              Campanie
              <select name="campaignId" className={`${input} mt-1.5`}>
                <option value="">Fără campanie</option>
                {data.campaigns.map((item) => (
                  <option key={String(item.id)} value={String(item.id)}>
                    {String(item.name)}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-slate-300">
                Platformă
                <select name="platform" className={`${input} mt-1.5`}>
                  <option>instagram</option>
                  <option>facebook</option>
                  <option>tiktok</option>
                </select>
              </label>
              <label className="text-sm text-slate-300">
                Format
                <select name="postType" className={`${input} mt-1.5`}>
                  <option value="post">Postare</option>
                  <option value="story">Story</option>
                  <option value="reel">Reel</option>
                  <option value="video">Video</option>
                  <option value="carousel">Carusel</option>
                </select>
              </label>
              <label className="text-sm text-slate-300">
                Obiectiv
                <select name="objective" className={`${input} mt-1.5`}>
                  <option value="conversion">Conversii</option>
                  <option value="awareness">Vizibilitate</option>
                  <option value="traffic">Trafic</option>
                  <option value="retention">Retenție</option>
                </select>
              </label>
              <label className="text-sm text-slate-300">
                Ton
                <select name="tone" className={`${input} mt-1.5`}>
                  <option value="magic">Magic</option>
                  <option value="cald">Cald</option>
                  <option value="nostalgic">Nostalgic</option>
                  <option value="jucaus">Jucăuș</option>
                  <option value="premium">Premium</option>
                </select>
              </label>
            </div>
            {field("callToAction", "Îndemn", {
              required: true,
              defaultValue: "Descoperă cutiuța pe cutiutamagica.eu",
            })}
            <label className="block text-sm text-slate-300">
              Criterii suplimentare
              <textarea name="notes" className={`${input} mt-1.5`} />
            </label>
            <button className={button}>
              <Bot size={15} />
              Creează draft
            </button>
            <p className="text-xs leading-5 text-slate-500">
              Draftul folosește catalogul D1. Publicarea este separată și cere aprobare plus API
              oficial conectat.
            </p>
          </form>
          <div className="space-y-3">
            {data.posts.map((post) => (
              <article
                key={String(post.id)}
                className="rounded-lg border border-slate-700 bg-slate-900/40 p-4"
              >
                <div className="flex justify-between text-xs text-slate-400">
                  <span>
                    {String(post.provider ?? "neatribuit")} · {String(post.postType)}
                  </span>
                  <span>{String(post.status)}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                  {String(post.caption)}
                </p>
                {(post.status === "draft" || post.status === "review") && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className={button}
                      onClick={() =>
                        mutation.mutate(() =>
                          reviewDraft({
                            data: { postId: String(post.id), decision: "approved" },
                          }),
                        )
                      }
                    >
                      <Save size={14} /> Aprobă draftul
                    </button>
                    <button
                      className={secondary}
                      onClick={() =>
                        mutation.mutate(() =>
                          reviewDraft({
                            data: { postId: String(post.id), decision: "cancelled" },
                          }),
                        )
                      }
                    >
                      Anulează
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === "social" && (
        <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
          <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-5">
            <h2 className="font-semibold text-white">Import relații autorizate</h2>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              Câte un cont pe linie: <code>username, da/nu, engagement %, URL opțional</code>.
              Sistemul propune maximum 50; nu execută unfollow automat.
            </p>
            <textarea
              value={relationships}
              onChange={(event) => setRelationships(event.target.value)}
              className={`${input} mt-4 min-h-52 font-mono text-xs`}
              placeholder={
                "cont_exemplu, nu, 0.2, https://instagram.com/cont_exemplu\npartener, da, 4.1"
              }
            />
            <button
              onClick={runAnalysis}
              disabled={!relationships.trim() || mutation.isPending}
              className={`${button} mt-3`}
            >
              <Bot size={15} />
              Analizează
            </button>
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-white">Propuneri pentru revizuire</h2>
              <span className="text-xs text-slate-500">{data.proposals.length}/50</span>
            </div>
            <div className="space-y-2">
              {data.proposals.map((item) => (
                <article
                  key={String(item.id)}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-4"
                >
                  <div>
                    <p className="font-medium text-white">@{String(item.username)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Scor {String(item.score)} · engagement{" "}
                      {item.engagementRate == null
                        ? "necunoscut"
                        : `${String(item.engagementRate)}%`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className={secondary}
                      onClick={() =>
                        mutation.mutate(() =>
                          decide({ data: { proposalId: String(item.id), decision: "keep" } }),
                        )
                      }
                    >
                      Păstrează
                    </button>
                    <button
                      className={secondary}
                      onClick={() =>
                        mutation.mutate(() =>
                          decide({
                            data: { proposalId: String(item.id), decision: "approved_unfollow" },
                          }),
                        )
                      }
                    >
                      Aprobă propunerea
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
