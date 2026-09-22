import { z } from "zod";

export const reportSettingsSchema = z
  .object({
    enabled: z.boolean().default(false),
    recipients: z
      .array(
        z
          .string()
          .trim()
          .email()
          .max(254)
          .transform((v) => v.toLowerCase()),
      )
      .max(10)
      .default([]),
    day: z.number().int().min(1).max(28).default(5),
    hour: z.number().int().min(0).max(23).default(9),
    sales: z.boolean().default(true),
    products: z.boolean().default(true),
    traffic: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.enabled && (!v.recipients.length || !(v.sales || v.products || v.traffic)))
      ctx.addIssue({ code: "custom", message: "Alege destinatarii și cel puțin o secțiune." });
    if (new Set(v.recipients).size !== v.recipients.length)
      ctx.addIssue({ code: "custom", message: "Adresele de e-mail trebuie să fie distincte." });
  });
export type ReportSettings = z.infer<typeof reportSettingsSchema>;
export const trafficSettingsSchema = z.object({
  gaPropertyId: z
    .string()
    .trim()
    .regex(/^\d{1,20}$|^$/)
    .default(""),
  gscProperty: z
    .string()
    .trim()
    .max(250)
    .refine((v) => !v || v === "sc-domain:cutiutamagica.eu" || v === "https://cutiutamagica.eu/")
    .default(""),
  facebookPageId: z
    .string()
    .trim()
    .regex(/^\d{1,30}$|^$/)
    .default(""),
  instagramAccountId: z
    .string()
    .trim()
    .regex(/^\d{1,30}$|^$/)
    .default(""),
  tiktokAccountId: z.string().trim().max(100).default(""),
});
export const researchSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  maxDailyRuns: z.number().int().min(1).max(100).default(10),
  refreshDays: z.number().int().min(1).max(90).default(7),
});
export const financeSettingsSchema = z.object({
  currencies: z
    .array(z.enum(["RON", "EUR"]))
    .min(1)
    .max(2)
    .default(["RON", "EUR"]),
  revolutAccount: z.string().trim().max(100).default(""),
  stripeAccount: z
    .string()
    .trim()
    .regex(/^acct_[a-zA-Z0-9]+$|^$/)
    .default(""),
  fgoSeries: z.string().trim().max(30).default(""),
  spvClientId: z.string().trim().max(200).default(""),
  // Export is local and manual. Enabling external delivery needs a separate integration.
  avyronSummaryEnabled: z.literal(false).default(false),
});
export const credentialProviderSchema = z.enum([
  "fgo",
  "smartship",
  "stripe",
  "stripe_webhook",
  "revolut",
  "resend",
  "brave",
  "google",
  "meta",
]);
export type CredentialProvider = z.infer<typeof credentialProviderSchema>;

export function previousMonth(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);
  return new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
}

export function marketplaceForUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    return (
      ["temu.com", "aliexpress.com", "alibaba.com"].find(
        (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
      ) ?? null
    );
  } catch {
    return null;
  }
}
