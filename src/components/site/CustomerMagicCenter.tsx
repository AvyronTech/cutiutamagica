import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Cake, CalendarDays, Gift, Sparkles, Star, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { CustomerAccountSection } from "@/lib/customer-account";
import { isCurrentCustomer } from "@/lib/customer-session";
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
  rewardEmailEnabled: boolean;
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
  photo_review_approved: "Recenzie cu fotografie aprobată",
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

export function CustomerMagicCenter({
  accountId,
  section = "beneficii",
}: {
  accountId: string;
  section?: CustomerAccountSection;
}) {
  const active = section === "beneficii" || section === "calendar" || section === "profil";
  const client = useQueryClient();
  const [profileOpen, setProfileOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [calendarSaving, setCalendarSaving] = useState(false);
  const [birthdaySaving, setBirthdaySaving] = useState(false);
  const [calendarActionPending, setCalendarActionPending] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const query = useQuery({
    queryKey: ["customer", accountId, "magic-center"],
    queryFn: () => reviewApi<Dashboard>("/api/v1/customer/rewards"),
    staleTime: 20_000,
    enabled: active,
  });
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["customer", accountId, "magic-center"] });
  const redeem = useMutation({
    mutationFn: () =>
      reviewApi<{ code: string; valueBani: number }>("/api/v1/customer/rewards/redeem", {
        method: "POST",
        body: "{}",
      }),
    onSuccess: async (result) => {
      if (!isCurrentCustomer(client, accountId)) return;
      await refresh();
      toast.success(`Codul ${result.code} este pregătit în cont.`);
    },
    onError: (error) => toast.error(error.message),
  });

  if (!active && !query.data) return null;
  if (query.isLoading)
    return (
      <section className="customer-magic-center customer-account-status">
        Se încarcă secțiunea…
      </section>
    );
  if (!query.data || query.isError)
    return (
      <section
        className="customer-magic-center customer-account-status"
        role="alert"
        hidden={!active}
      >
        <p>Magic Stars și Calendarul cadourilor nu pot fi încărcate acum.</p>
        <button
          className="magic-button"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          {query.isFetching ? "Se reîncearcă…" : "Reîncearcă"}
        </button>
      </section>
    );
  const data = query.data;
  const remaining = Math.max(0, data.program.redemptionThreshold - data.account.availableStars);
  const birthdayActivity = data.activities.find(
    (activity) => activity.code === "birthday_bonus" && activity.enabled,
  );
  const usableRewards = data.rewards.filter(
    (reward) => reward.status === "active" && Date.parse(reward.expires_at) > Date.now(),
  );

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
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
    } finally {
      setProfileSaving(false);
    }
  }

  async function addEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCalendarSaving(true);
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
          reminderDays: [7, 3],
          emailEnabled: form.get("emailEnabled") === "on",
        }),
      });
      target.reset();
      await refresh();
      setCalendarOpen(false);
      toast.success("Momentul a fost adăugat în calendar.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Momentul nu a putut fi salvat.");
    } finally {
      setCalendarSaving(false);
    }
  }

  async function saveBirthday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBirthdaySaving(true);
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
    } finally {
      setBirthdaySaving(false);
    }
  }

  return (
    <section
      id="beneficii"
      className="customer-magic-center"
      hidden={!active}
      data-account-view={section}
      aria-label={
        section === "calendar"
          ? "Calendarul cadourilor"
          : section === "profil"
            ? "Preferințe pentru cadouri"
            : undefined
      }
      aria-labelledby={section === "beneficii" ? "magic-center-title" : undefined}
    >
      <div className="customer-magic-center__hero" hidden={section !== "beneficii"}>
        <div className="customer-magic-center__orb" aria-hidden>
          <Star />
        </div>
        <div>
          <p className="catalog-eyebrow">
            {data.program.enabled ? "Magic Rewards" : "Magic Rewards · momentan indisponibil"}
          </p>
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

      {usableRewards.length > 0 && (
        <div className="customer-reward-codes" hidden={section !== "beneficii"}>
          {usableRewards.map((reward) => (
            <article key={reward.id}>
              <strong>
                {(reward.value_bani / 100).toLocaleString("ro-RO")} lei pentru următoarea comandă
              </strong>
              <code>{reward.code}</code>
              <small>
                Valabil până la{" "}
                {new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium" }).format(
                  new Date(reward.expires_at),
                )}
              </small>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(reward.code);
                    toast.success("Codul a fost copiat.");
                  } catch {
                    toast.error("Copiază codul afișat pentru a-l folosi la comandă.");
                  }
                }}
              >
                Copiază codul
              </button>
            </article>
          ))}
        </div>
      )}

      <details className="customer-star-history" hidden={section !== "beneficii"}>
        <summary>Ultimele activități Magic Stars</summary>
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
      </details>

      <div className="customer-magic-center__grid">
        <article id="calendar" hidden={section !== "calendar"}>
          <div className="customer-magic-center__heading">
            <div>
              <p className="catalog-eyebrow">Calendarul cadourilor</p>
              <h2>Momentele care merită păstrate</h2>
            </div>
            <button
              type="button"
              aria-expanded={calendarOpen}
              aria-controls="customer-calendar-form"
              onClick={() => setCalendarOpen((value) => !value)}
            >
              <CalendarDays size={16} /> {calendarOpen ? "Închide" : "Adaugă"}
            </button>
          </div>
          {calendarOpen && (
            <form
              id="customer-calendar-form"
              className="customer-magic-form"
              onSubmit={(event) => void addEvent(event)}
            >
              <label className="customer-field">
                Pentru cine
                <input
                  name="personName"
                  aria-label="Persoana căreia îi dăruiești"
                  required
                  maxLength={80}
                  placeholder="Maria"
                />
              </label>
              <select name="occasion" aria-label="Ocazia" defaultValue="birthday">
                {Object.entries(occasions).map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
              <label className="customer-field">
                Data momentului
                <input name="date" type="date" aria-label="Data momentului" required />
              </label>
              <small>Moment anual: păstrăm ziua și luna, fără an.</small>
              <label>
                <input name="emailEnabled" type="checkbox" defaultChecked /> E-mail cu 7 și 3 zile
                înainte
              </label>
              <button className="magic-button" disabled={calendarSaving}>
                {calendarSaving ? "Se salvează…" : "Salvează momentul"}
              </button>
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
                      {event.emailEnabled
                        ? ` · memento cu ${event.reminderDays.join(" și ")} zile înainte`
                        : " · mementouri oprite"}
                    </small>
                  </span>
                  <span className="customer-calendar-actions">
                    <button
                      type="button"
                      aria-label={
                        event.emailEnabled
                          ? `Oprește mementourile pentru ${event.personName}`
                          : `Activează mementourile pentru ${event.personName}`
                      }
                      disabled={calendarActionPending}
                      onClick={async () => {
                        setCalendarActionPending(true);
                        try {
                          await reviewApi(`/api/v1/customer/gift-calendar/${event.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ emailEnabled: !event.emailEnabled }),
                          });
                          await refresh();
                          toast.success(
                            event.emailEnabled
                              ? "Mementourile au fost oprite."
                              : "Mementourile au fost activate.",
                          );
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Preferința nu a putut fi salvată.",
                          );
                        } finally {
                          setCalendarActionPending(false);
                        }
                      }}
                    >
                      {event.emailEnabled ? <Bell size={15} /> : <BellOff size={15} />}
                    </button>
                    <button
                      type="button"
                      aria-label={`Șterge momentul pentru ${event.personName}`}
                      disabled={calendarActionPending}
                      onClick={async () => {
                        setCalendarActionPending(true);
                        try {
                          await reviewApi(`/api/v1/customer/gift-calendar/${event.id}`, {
                            method: "DELETE",
                          });
                          await refresh();
                          toast.success("Momentul a fost șters.");
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Momentul nu a putut fi șters.",
                          );
                        } finally {
                          setCalendarActionPending(false);
                        }
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </span>
                </div>
              ))
            ) : (
              <p>Adaugă primul moment și îți amintim discret, la timp.</p>
            )}
          </div>
        </article>

        <article hidden={section !== "profil"}>
          <div className="customer-magic-center__heading">
            <div>
              <p className="catalog-eyebrow">Profil de cadouri</p>
              <h2>Preferințele tale</h2>
            </div>
            <button
              type="button"
              aria-expanded={profileOpen}
              aria-controls="customer-gift-profile-form"
              onClick={() => setProfileOpen((value) => !value)}
            >
              <Sparkles size={16} />{" "}
              {profileOpen ? "Închide" : data.profile?.completed ? "Actualizează" : "Completează"}
            </button>
          </div>
          {profileOpen && (
            <form
              id="customer-gift-profile-form"
              className="customer-magic-form"
              onSubmit={(event) => void saveProfile(event)}
            >
              <label className="customer-field">
                Pentru cine dăruiești
                <input
                  name="recipients"
                  aria-label="Pentru cine dăruiești"
                  placeholder="Pentru cine: iubită, mamă, colegă"
                  defaultValue={
                    Array.isArray(data.profile?.preferences.recipients)
                      ? data.profile?.preferences.recipients.join(", ")
                      : ""
                  }
                />
              </label>
              <label className="customer-field">
                Ocazii preferate
                <input
                  name="occasions"
                  aria-label="Ocazii preferate"
                  placeholder="Ocazii: aniversare, Crăciun"
                  defaultValue={
                    Array.isArray(data.profile?.preferences.occasions)
                      ? data.profile.preferences.occasions.join(", ")
                      : ""
                  }
                />
              </label>
              <label className="customer-field">
                Teme preferate
                <input
                  name="themes"
                  aria-label="Teme preferate"
                  placeholder="Teme preferate: fantasy, pisici"
                  defaultValue={
                    Array.isArray(data.profile?.preferences.themes)
                      ? data.profile.preferences.themes.join(", ")
                      : ""
                  }
                />
              </label>
              <small>Separă opțiunile prin virgulă.</small>
              <button className="magic-button" disabled={profileSaving}>
                {profileSaving ? "Se salvează…" : "Salvează profilul"}
              </button>
            </form>
          )}
          <form className="customer-birthday" onSubmit={(event) => void saveBirthday(event)}>
            <span>
              <Cake size={15} aria-hidden />
              <span>
                <strong>Ziua ta magică</strong>
                <small>
                  {birthdayActivity
                    ? `+${birthdayActivity.stars} ✦ o dată pe an · zi și lună`
                    : "Păstrăm numai ziua și luna"}
                </small>
              </span>
            </span>
            <select
              name="day"
              aria-label="Ziua nașterii"
              defaultValue={data.birthday?.day ?? ""}
              required
            >
              <option value="" disabled>
                Zi
              </option>
              {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            <select
              name="month"
              aria-label="Luna nașterii"
              defaultValue={data.birthday?.month ?? ""}
              required
            >
              <option value="" disabled>
                Lună
              </option>
              {monthNames.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
            <button disabled={birthdaySaving}>
              {birthdaySaving ? "Se salvează…" : "Salvează"}
            </button>
          </form>

          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={data.rewardEmailEnabled}
              disabled={emailSaving}
              onChange={async (event) => {
                setEmailSaving(true);
                const enabled = event.currentTarget.checked;
                try {
                  await reviewApi("/api/v1/customer/rewards/email-preference", {
                    method: "PUT",
                    body: JSON.stringify({ enabled }),
                  });
                  await refresh();
                  toast.success(
                    enabled
                      ? "Noutățile despre stelele tale sunt active."
                      : "Noutățile despre stele au fost oprite.",
                  );
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Preferința nu a putut fi salvată.",
                  );
                } finally {
                  setEmailSaving(false);
                }
              }}
            />
            <span>
              Primește un singur e-mail despre stelele câștigate într-o zi. Poți opri oricând
              mesajele.
            </span>
          </label>
        </article>
      </div>
      <div className="customer-reward-activities" hidden={section !== "beneficii"}>
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
