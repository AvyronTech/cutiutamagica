import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Cake, CalendarDays, Gift, Sparkles, Star, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { reviewApi } from "@/lib/reviews";

type Dashboard = {
  program: { enabled: boolean; redemptionThreshold: number; rewardBani: number };
  account: { availableStars: number; lifetimeStars: number; redeemedStars: number };
  activities: Array<{
    code: string;
    name: string;
    description: string;
    stars: number;
    periodLimit: number;
    enabled: boolean;
  }>;
  birthday: { month: number; day: number } | null;
  ledger: Array<{
    id: string;
    delta: number;
    reason: string;
    source_type: string;
    activity_code?: string | null;
    note: string | null;
  }>;
  rewards: Array<{
    id: string;
    code: string;
    value_bani: number;
    status: string;
    expires_at: string;
  }>;
  profile: { preferences: Record<string, unknown>; completed: boolean } | null;
  calendar: Array<{
    id: string;
    occasion: string;
    personName: string;
    eventMonth: number;
    eventDay: number;
    reminderDays: number[];
    emailEnabled: boolean;
  }>;
};

const occasions: Record<string, string> = {
  birthday_partner: "Ziua iubitei / iubitului",
  relationship_anniversary: "Aniversarea relației",
  child_day: "Ziua copilului",
  christmas: "Crăciun",
  secret_santa: "Secret Santa",
  birthday: "Zi de naștere",
  other: "Alt moment",
};

const reasonLabels: Record<string, string> = {
  order_delivered: "Comandă livrată",
  photo_review_approved: "Review cu fotografie aprobat",
  referral_completed: "Recomandare confirmată",
  gift_profile_completed: "Profil de cadouri completat",
  collection_completed: "Colecție completată",
  reward_redeemed: "Beneficiu activat",
  admin_adjustment: "Ajustare verificată",
};

const monthNames = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
];

export function CustomerMagicCenter() {
  const client = useQueryClient();
  const [profileOpen, setProfileOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const query = useQuery({
    queryKey: ["customer", "magic-center"],
    queryFn: () => reviewApi<Dashboard>("/api/v1/customer/rewards"),
    staleTime: 20_000,
  });
  const refresh = () => client.invalidateQueries({ queryKey: ["customer", "magic-center"] });
  const redeem = useMutation({
    mutationFn: () =>
      reviewApi<{ code: string; valueBani: number }>("/api/v1/customer/rewards/redeem", {
        method: "POST",
        body: "{}",
      }),
    onSuccess: async (result) => {
      await refresh();
      toast.success(`Codul ${result.code} este pregătit în cont.`);
    },
    onError: (error) => toast.error(error.message),
  });

  if (query.isLoading)
    return <section className="customer-magic-center">Se aprind stelele contului tău…</section>;
  if (!query.data || query.isError)
    return (
      <section className="customer-magic-center" role="alert">
        Magic Stars și Calendarul cadourilor nu pot fi încărcate acum.
      </section>
    );
  const data = query.data;
  const remaining = Math.max(0, data.program.redemptionThreshold - data.account.availableStars);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      const split = (name: string) =>
        String(form.get(name) ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
      await reviewApi("/api/v1/customer/gift-profile", {
        method: "PUT",
        body: JSON.stringify({
          recipients: split("recipients"),
          occasions: split("occasions"),
          themes: split("themes"),
        }),
      });
      await refresh();
      setProfileOpen(false);
      toast.success("Profilul de cadouri a fost salvat.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Profilul nu a putut fi salvat.");
    }
  }

  async function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const target = event.currentTarget;
      const form = new FormData(target);
      const date = String(form.get("date"));
      const parsed = new Date(`${date}T12:00:00`);
      if (!date || Number.isNaN(parsed.getTime())) return;
      await reviewApi("/api/v1/customer/gift-calendar", {
        method: "POST",
        body: JSON.stringify({
          occasion: form.get("occasion"),
          personName: form.get("personName"),
          eventMonth: parsed.getMonth() + 1,
          eventDay: parsed.getDate(),
          reminderDays: [12, 3],
          emailEnabled: form.get("emailEnabled") === "on",
        }),
      });
      target.reset();
      await refresh();
      setCalendarOpen(false);
      toast.success("Momentul a fost adăugat în calendar.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Momentul nu a putut fi salvat.");
    }
  }

  async function saveBirthday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const form = new FormData(event.currentTarget);
      await reviewApi("/api/v1/customer/rewards/birthday", {
        method: "PUT",
        body: JSON.stringify({ month: Number(form.get("month")), day: Number(form.get("day")) }),
      });
      await refresh();
      toast.success("Ziua ta magică a fost salvată.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Data nu a putut fi salvată.");
    }
  }

  return (
    <section className="customer-magic-center" aria-labelledby="magic-center-title">
      <div className="customer-magic-center__hero">
        <div className="customer-magic-center__orb" aria-hidden>
          <Star />
        </div>
        <div>
          <p className="catalog-eyebrow">Program activ · Magic Rewards</p>
          <h2 id="magic-center-title">{data.account.availableStars} Magic Stars ✦</h2>
          <p>
            {remaining
              ? `Încă ${remaining} ${remaining === 1 ? "stea" : "stele"} până la beneficiul de ${(data.program.rewardBani / 100).toLocaleString("ro-RO")} lei.`
              : `Poți activa acum beneficiul de ${(data.program.rewardBani / 100).toLocaleString("ro-RO")} lei.`}
          </p>
        </div>
        <button
          className="magic-button"
          disabled={remaining > 0 || redeem.isPending || !data.program.enabled}
          onClick={() => redeem.mutate()}
        >
          <Gift size={16} /> Activează beneficiul
        </button>
      </div>

      <div className="customer-magic-center__grid">
        <article>
          <div className="customer-magic-center__heading">
            <div>
              <p className="catalog-eyebrow">Calendarul cadourilor</p>
              <h3>Momentele care merită păstrate</h3>
            </div>
            <button type="button" onClick={() => setCalendarOpen((value) => !value)}>
              <CalendarDays size={16} /> Adaugă
            </button>
          </div>
          {calendarOpen && (
            <form className="customer-magic-form" onSubmit={(event) => void addEvent(event)}>
              <input name="personName" required maxLength={80} placeholder="Maria" />
              <select name="occasion" defaultValue="birthday">
                {Object.entries(occasions).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
              <input name="date" type="date" required />
              <label>
                <input name="emailEnabled" type="checkbox" defaultChecked /> E-mail cu 12 și 3 zile
                înainte
              </label>
              <button className="magic-button">Salvează momentul</button>
            </form>
          )}
          <div className="customer-calendar-list">
            {data.calendar.length ? (
              data.calendar.map((event) => (
                <div key={event.id}>
                  <span>
                    <strong>{event.personName}</strong>
                    <small>
                      {occasions[event.occasion]} · {String(event.eventDay).padStart(2, "0")}/
                      {String(event.eventMonth).padStart(2, "0")}
                      {event.emailEnabled ? " · reminder e-mail" : ""}
                    </small>
                  </span>
                  <button
                    type="button"
                    aria-label={`Șterge momentul pentru ${event.personName}`}
                    onClick={async () => {
                      try {
                        await reviewApi(`/api/v1/customer/gift-calendar/${event.id}`, {
                          method: "DELETE",
                        });
                        await refresh();
                        toast.success("Momentul a fost șters.");
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Momentul nu a putut fi șters.",
                        );
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            ) : (
              <p>Adaugă primul moment și îți amintim discret, la timp.</p>
            )}
          </div>
        </article>

        <article>
          <div className="customer-magic-center__heading">
            <div>
              <p className="catalog-eyebrow">Profil de cadouri</p>
              <h3>Recomandări mai potrivite</h3>
            </div>
            <button type="button" onClick={() => setProfileOpen((value) => !value)}>
              <Sparkles size={16} /> {data.profile?.completed ? "Actualizează" : "Completează"}
            </button>
          </div>
          {profileOpen && (
            <form className="customer-magic-form" onSubmit={(event) => void saveProfile(event)}>
              <input
                name="recipients"
                placeholder="Pentru cine: iubită, mamă, colegă"
                defaultValue={
                  Array.isArray(data.profile?.preferences.recipients)
                    ? data.profile?.preferences.recipients.join(", ")
                    : ""
                }
              />
              <input name="occasions" placeholder="Ocazii: aniversare, Crăciun" />
              <input name="themes" placeholder="Teme preferate: fantasy, pisici" />
              <button className="magic-button">Salvează profilul</button>
            </form>
          )}
          <form className="customer-birthday" onSubmit={(event) => void saveBirthday(event)}>
            <span>
              <Cake size={15} aria-hidden />
              <span>
                <strong>Ziua ta magică</strong>
                <small>+10 ✦ o dată pe an, fără să păstrăm anul nașterii</small>
              </span>
            </span>
            <select name="day" aria-label="Ziua nașterii" defaultValue={data.birthday?.day ?? 1}>
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            <select
              name="month"
              aria-label="Luna nașterii"
              defaultValue={data.birthday?.month ?? 1}
            >
              {monthNames.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
            <button>Salvează</button>
          </form>
          <div className="customer-star-history">
            {data.ledger.slice(0, 5).map((item) => (
              <div key={item.id}>
                <span>
                  {item.source_type === "reward_activity"
                    ? (item.note ?? "Activitate Magic Rewards")
                    : (reasonLabels[item.reason] ?? item.note ?? "Magic Stars")}
                </span>
                <strong>
                  {item.delta > 0 ? "+" : ""}
                  {item.delta} ✦
                </strong>
              </div>
            ))}
            {!data.ledger.length && <p>Prima stea apare după un moment eligibil confirmat.</p>}
          </div>
          {data.rewards.some((reward) => reward.status === "active") && (
            <div className="customer-reward-codes">
              {data.rewards
                .filter((reward) => reward.status === "active")
                .map((reward) => (
                  <code key={reward.id}>{reward.code}</code>
                ))}
            </div>
          )}
        </article>
      </div>
      <div className="customer-reward-activities">
        <div>
          <p className="catalog-eyebrow">Activități disponibile</p>
          <h3>Fiecare gest are o valoare clară.</h3>
        </div>
        <div>
          {data.activities
            .filter((activity) => activity.enabled)
            .map((activity) => (
              <span key={activity.code}>
                <strong>+{activity.stars} ✦</strong>
                <span>{activity.name}</span>
                {activity.code === "social_share" && activity.periodLimit > 0 ? (
                  <small>max. {activity.periodLimit}/zi</small>
                ) : null}
              </span>
            ))}
        </div>
      </div>
    </section>
  );
}
