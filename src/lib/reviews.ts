import { z } from "zod";
export const reviewSources = {
  store: "Cutiuța Store",
  facebook: "Facebook",
  tiktok: "TikTok",
  emag: "eMAG",
  trendyol: "Trendyol",
  vinted: "Vinted",
  olx: "OLX",
  okazii: "Okazii",
} as const;
export type ReviewSource = keyof typeof reviewSources;
export const reviewInput = z.object({
  productSlug: z.string().regex(/^[a-z0-9-]{1,128}$/),
  displayName: z.string().trim().min(2).max(60).optional(),
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((v) => v.toLowerCase())
    .optional(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(1200),
  language: z.enum(["ro", "en"]),
  consent: z.literal(true),
  website: z.string().max(0).default(""),
});
export type PublicReview = {
  id: string;
  productSlug: string;
  productName: string;
  displayName: string;
  rating: number;
  body: string;
  language: "ro" | "en";
  source: ReviewSource;
  sourceUrl: string | null;
};
export type ReviewList = {
  reviews: PublicReview[];
  total: number;
  average: number | null;
  hasMore: boolean;
};
export type Reviewer = { id: string; displayName: string; email: string };
const sourceHosts: Record<ReviewSource, string[]> = {
  store: ["cutiutamagica.eu"],
  facebook: ["facebook.com"],
  tiktok: ["tiktok.com"],
  emag: ["emag.ro"],
  trendyol: ["trendyol.com"],
  vinted: ["vinted.ro", "vinted.com"],
  olx: ["olx.ro"],
  okazii: ["okazii.ro"],
};
export function validReviewSource(source: ReviewSource, value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      url.pathname !== "/" &&
      sourceHosts[source].some((host) => url.hostname === host || url.hostname.endsWith("." + host))
    );
  } catch {
    return false;
  }
}
export async function reviewApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const result = (await response.json()) as { data?: T; error?: { message?: string } };
  if (!response.ok) throw new Error(result.error?.message || "Nu am putut salva. Reîncearcă.");
  return result.data as T;
}
