import { z } from "zod";

export const PERSONALIZATION_BASE_PRICE_BANI = 18_900;
export const PERSONALIZATION_GIFT_WRAP_BANI = 3_500;
export const PERSONALIZATION_DELIVERY = "4–7 zile lucrătoare";
export const PERSONALIZATION_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const personalizationBoxModels = [
  {
    id: "classic",
    label: "Clasică",
    eyebrow: "Esențială",
    description: "Silueta familiară, compactă, cu capac drept și manivelă laterală.",
    detail: "Potrivită pentru portrete, mesaje scurte și cadouri intime.",
  },
  {
    id: "panorama",
    label: "Panorama",
    eyebrow: "Mai multă imagine",
    description: "Capac vizual mai amplu, gândit pentru fotografii de grup sau peisaje.",
    detail: "Sursa și proporțiile finale sunt confirmate de atelier înainte de comandă.",
  },
  {
    id: "keepsake",
    label: "Cufăr",
    eyebrow: "Obiect de păstrat",
    description: "O interpretare mai profundă, cu volum de cufăr și prezență de colecție.",
    detail: "Disponibilitatea modelului se verifică individual pentru fiecare cerere.",
  },
] as const;

export const personalizationMelodies = [
  {
    id: "melody-1",
    label: "Melodia I",
    description: "caldă și tandră",
  },
  {
    id: "melody-2",
    label: "Melodia II",
    description: "luminoasă și jucăușă",
  },
  {
    id: "melody-3",
    label: "Melodia III",
    description: "blândă și nostalgică",
  },
] as const;

export const personalizationFieldsSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(24)
    .regex(/^[+0-9 ()-]+$/),
  boxModel: z.enum(["classic", "panorama", "keepsake"]),
  boxColor: z.enum(["black", "yellow"]),
  melody: z.enum(["melody-1", "melody-2", "melody-3"]),
  engraving: z.string().trim().max(28).default(""),
  giftWrap: z.enum(["true", "false"]).transform((value) => value === "true"),
  notes: z.string().trim().max(1000).default(""),
  consent: z.literal("true"),
  website: z.string().max(0).default(""),
});

export type PersonalizationFields = z.infer<typeof personalizationFieldsSchema>;
export type PersonalizationMelody = (typeof personalizationMelodies)[number]["id"];
export type PersonalizationBoxModel = (typeof personalizationBoxModels)[number]["id"];
export type PersonalizationBoxColor = PersonalizationFields["boxColor"];

export type PersonalizationRequestSummary = {
  id: string;
  boxModel: PersonalizationBoxModel;
  boxColor: PersonalizationBoxColor;
  melody: PersonalizationMelody;
  giftWrap: boolean;
  totalBani: number;
  status: "received" | "contacted" | "approved" | "in_production" | "shipped" | "cancelled";
  createdAt: string;
};

export function personalizationTotalBani(giftWrap: boolean): number {
  return PERSONALIZATION_BASE_PRICE_BANI + (giftWrap ? PERSONALIZATION_GIFT_WRAP_BANI : 0);
}

export function personalizationReference(id: string): string {
  return `CM-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export function formatPersonalizationPrice(bani: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 0,
  }).format(bani / 100);
}
