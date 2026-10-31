import { z } from "zod";

export const productDiscoverySchema = z.object({
  intro: z.string().trim().max(900),
  audience: z.string().trim().max(500),
  occasions: z.array(z.string().trim().min(1).max(350)).max(6),
  moments: z.array(z.string().trim().min(1).max(350)).max(6),
  guides: z.array(z.enum(["halloween", "secret-santa", "mos-nicolae", "craciun"])).max(4),
});
export type ProductDiscovery = z.infer<typeof productDiscoverySchema>;
export function readProductDiscovery(raw: unknown): ProductDiscovery | null {
  try {
    const parsed = productDiscoverySchema.safeParse(
      typeof raw === "string" ? JSON.parse(raw) : raw,
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
