import type { GrowthEventName } from "./growth-events";

export const analyticsTabs = ["overview", "sales", "traffic", "sources"] as const;
export type AnalyticsTab = (typeof analyticsTabs)[number];
export type AnalyticsDays = 7 | 30 | 90;
export function readAnalyticsSearch(input: Record<string, unknown>) {
  return {
    tab: analyticsTabs.includes(input.tab as AnalyticsTab)
      ? (input.tab as AnalyticsTab)
      : ("overview" as AnalyticsTab),
    days: [7, 30, 90].includes(Number(input.days))
      ? (Number(input.days) as AnalyticsDays)
      : (30 as AnalyticsDays),
  };
}
export function readFinanceSearch(input: Record<string, unknown>) {
  return {
    days: readAnalyticsSearch(input).days,
    currency:
      typeof input.currency === "string" && /^[A-Z]{3}$/.test(input.currency)
        ? input.currency
        : "RON",
  };
}
export function analyticsPeriod(days: AnalyticsDays, now = new Date()) {
  const endDay = now.toISOString().slice(0, 10);
  const startDay = new Date(now.getTime() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const until = new Date(`${endDay}T00:00:00Z`);
  until.setUTCDate(until.getUTCDate() + 1);
  return { startDay, endDay, from: `${startDay}T00:00:00.000Z`, until: until.toISOString() };
}
export const eventLabels: Record<GrowthEventName, string> = {
  page_view: "Afișări de pagină",
  product_view: "Vizualizări de produs",
  gift_finder_started: "Căutări de cadou începute",
  gift_finder_completed: "Recomandări de cadou primite",
  audio_play: "Audiții începute",
  audio_75: "Audiții ascultate în proporție de 75%",
  gallery_open: "Deschideri ale galeriei",
  personalization_start: "Personalizări începute",
  add_to_cart: "Adăugări în coș",
  gift_wrap_added: "Ambalări de cadou adăugate",
  checkout_start: "Comenzi începute",
  checkout_abandon: "Ieșiri din formularul de comandă",
  purchase: "Confirmări de comandă urmărite",
  review_submitted: "Recenzii trimise",
  waitlist_joined: "Înscrieri pentru disponibilitate",
};
export function eventRatio(part: number, total: number): number | null {
  return total > 0 ? (part / total) * 100 : null;
}
export const formatCount = (value: number) => value.toLocaleString("ro-RO");
export const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat("ro-RO", { style: "currency", currency }).format(value);
export const formatDay = (value: string) =>
  new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
