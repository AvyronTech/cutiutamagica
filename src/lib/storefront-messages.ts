import { z } from "zod";
// Public links are intentionally confined to customer-facing pages.
export const publicLinkSchema = z
  .string()
  .max(180)
  .regex(/^\/(?:produse|despre-cutiuta|retur|comanda|produs\/[a-z0-9-]+)?$/);
export const storefrontMessageSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
  expectedVersion: z.number().int().nonnegative(),
  title: z.string().trim().min(2).max(90),
  message: z.string().trim().min(5).max(240),
  placement: z.enum(["home", "products", "product", "cart"]),
  link: publicLinkSchema,
  label: z.string().trim().min(2).max(40),
  delaySeconds: z.number().int().min(8).max(120),
  scrollPercent: z.number().int().min(0).max(90),
  enabled: z.boolean(),
});
export type StorefrontMessage = Omit<
  z.infer<typeof storefrontMessageSchema>,
  "expectedVersion" | "enabled"
> & { version: number; enabled: number };
