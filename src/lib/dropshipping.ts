import { z } from "zod";

export const dropshippingChannels = ["website", "emag", "trendyol", "okazii"] as const;
export type DropshippingChannel = (typeof dropshippingChannels)[number];
export const publicSourceUrl = z
  .string()
  .url()
  .max(1500)
  .refine((value) => {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      ![...u.searchParams.keys()].some((key) =>
        /^(access_token|api_key|apikey|secret|password|authorization)$/i.test(key),
      ) &&
      !/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(
        u.hostname,
      ) &&
      u.hostname.includes(".")
    );
  }, "Folosește un URL HTTPS public, fără credențiale.");
const optionalUrl = z.union([z.literal(""), publicSourceUrl]);
const amount = z.number().int().min(0).max(100_000_000).nullable();
export const channelCopySchema = z.object({
  title: z.string().trim().max(180).default(""),
  description: z.string().trim().max(6000).default(""),
  categoryId: z.string().trim().max(160).default(""),
  attributes: z.string().trim().max(3000).default(""),
  account: z.string().trim().max(180).default(""),
  requirementsEvidence: z.string().trim().max(1500).default(""),
  requirementsCheckedAt: z.string().date().or(z.literal("")).default(""),
  assetId: z.string().uuid().or(z.literal("")).default(""),
});
export const opportunitySchema = z.object({
  name: z.string().trim().min(3).max(180),
  category: z.string().trim().min(2).max(120),
  supplierName: z.string().trim().max(180).default(""),
  supplierUrl: optionalUrl.default(""),
  supplierEvidence: z.string().trim().max(2000).default(""),
  facts: z.string().trim().max(5000).default(""),
  factsVerified: z.boolean().default(false),
  stock: z.number().int().min(0).max(1_000_000).nullable().default(null),
  deliveryDays: z.number().int().min(1).max(90).nullable().default(null),
  quoteValidUntil: z.string().date().or(z.literal("")).default(""),
  supplierShipsDirect: z.boolean().default(false),
  returnsTerms: z.string().trim().max(1500).default(""),
  rightsEvidence: z.string().trim().max(1500).default(""),
  saleBani: amount.default(null),
  costBani: amount.default(null),
  shippingBani: amount.default(null),
  feesBani: amount.default(null),
  reserveBani: amount.default(null),
  catalogProductId: z
    .string()
    .regex(/^[a-zA-Z0-9_-]{1,100}$/)
    .or(z.literal(""))
    .default(""),
  channels: z.object({
    website: channelCopySchema,
    emag: channelCopySchema,
    trendyol: channelCopySchema,
    okazii: channelCopySchema,
  }),
});
export type OpportunityData = z.infer<typeof opportunitySchema>;
export type DropshippingCopy = z.infer<typeof channelCopySchema>;
export function emptyOpportunity(): OpportunityData {
  return {
    ...opportunitySchema.parse({
      name: "Produs nou",
      category: "Diverse",
      channels: { website: {}, emag: {}, trendyol: {}, okazii: {} },
    }),
    name: "",
    category: "",
  };
}
export const channelGuides = {
  website: {
    name: "Magazin propriu",
    width: 1200,
    height: 1200,
    portal: "https://cutiutamagica.eu/admin/products",
    docs: "https://support.google.com/merchants/answer/6324350",
    notes:
      "Fotografie clară, produs real, text alternativ. Catalogul actual acceptă cutiuțe muzicale; alte categorii se pregătesc pentru marketplace până la extinderea catalogului.",
  },
  emag: {
    name: "eMAG",
    width: 1200,
    height: 1200,
    portal: "https://marketplace.emag.ro/",
    docs: "https://marketplace.emag.ro/infocenter/emag-academy/cum-se-adauga-un-produs/standardul-pentru-imaginea-principala-a-produselor/",
    notes:
      "Fotografia principală pe fundal alb, produs întreg, fără promoții sau watermark. Verifică standardul categoriei în cont înainte de aprobare.",
  },
  trendyol: {
    name: "Trendyol",
    width: 1200,
    height: 1800,
    portal: "https://partner.trendyol.com/",
    docs: "https://developers.trendyol.com/",
    notes:
      "Preset vertical de lucru 2:3. Categoria, atributele, formatul și cerințele imaginii se reconfirmă în portalul sellerului; presetul nu certifică acceptarea.",
  },
  okazii: {
    name: "Okazii",
    width: 1200,
    height: 1200,
    portal: "https://www.okazii.ro/",
    docs: "https://ajutor.okazii.ro/magazine-okazii-ro/import-produse.html",
    notes:
      "Fotografii reale și categorie din cont. Exportul de lucru nu este un feed XML validat; verifică importul în portal.",
  },
} as const;
export function contribution(data: OpportunityData) {
  const values = [data.saleBani, data.costBani, data.shippingBani, data.feesBani, data.reserveBani];
  if (values.some((x) => x === null) || !data.saleBani) return null;
  const bani =
    data.saleBani - data.costBani! - data.shippingBani! - data.feesBani! - data.reserveBani!;
  return { bani, percent: Math.round((bani / data.saleBani) * 1000) / 10 };
}
export function readiness(
  data: OpportunityData,
  channel: DropshippingChannel,
  today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Bucharest" }).format(new Date()),
) {
  const issues: string[] = [];
  const copy = data.channels[channel];
  if (!data.supplierName || !data.supplierUrl || data.supplierEvidence.length < 12)
    issues.push("Verifică furnizorul și salvează dovada ofertei.");
  if (!data.factsVerified || data.facts.length < 20)
    issues.push("Confirmă specificațiile factuale ale produsului.");
  if (!data.supplierShipsDirect) issues.push("Confirmă expedierea directă de către furnizor.");
  if (!data.stock || !data.deliveryDays || !data.quoteValidUntil || data.quoteValidUntil < today)
    issues.push("Actualizează stocul, termenul și valabilitatea ofertei.");
  if (data.returnsTerms.length < 12)
    issues.push("Completează condițiile de retur și responsabilitatea livrării.");
  if (data.rightsEvidence.length < 12)
    issues.push("Atașează dovada drepturilor pentru fotografii și conținut.");
  const margin = contribution(data);
  if (!margin || margin.bani <= 0)
    issues.push("Completează costurile RON pe aceeași bază fiscală și verifică marja estimată.");
  if (copy.title.length < 3 || copy.description.length < 30)
    issues.push("Pregătește titlul și descrierea canalului.");
  if (!copy.account || !copy.categoryId || !copy.attributes)
    issues.push("Completează contul oficial, categoria și atributele canalului.");
  if (
    copy.requirementsEvidence.length < 12 ||
    !copy.requirementsCheckedAt ||
    copy.requirementsCheckedAt > today ||
    Date.parse(today) - Date.parse(copy.requirementsCheckedAt) > 30 * 86400000
  )
    issues.push("Reconfirmă cerințele canalului, cu dovadă și dată recentă.");
  if (!copy.assetId) issues.push("Selectează imaginea verificată pentru canal.");
  if (channel === "website" && !data.catalogProductId)
    issues.push(
      "Leagă un produs compatibil din catalogul central; produsele generale nu se publică drept cutiuțe muzicale.",
    );
  return issues;
}
export function validListingUrl(channel: DropshippingChannel, value: string) {
  if (!publicSourceUrl.safeParse(value).success) return false;
  const u = new URL(value);
  const hosts = {
    website: ["cutiutamagica.eu"],
    emag: ["emag.ro", "www.emag.ro"],
    trendyol: ["trendyol.com", "www.trendyol.com"],
    okazii: ["okazii.ro", "www.okazii.ro"],
  };
  return (
    hosts[channel].includes(u.hostname) &&
    u.pathname.length > 2 &&
    !u.pathname.startsWith("/admin") &&
    !u.pathname.startsWith("/auth")
  );
}
