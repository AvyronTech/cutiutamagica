import { z } from "zod";
import { MAX_CART_QUANTITY, MAX_ITEM_QUANTITY } from "@/lib/pricing";

export const websiteOrderInputSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    website: z.string().max(0).optional().default(""),
    customer: z.object({
      name: z.string().trim().min(2).max(120),
      phone: z.string().trim().min(8).max(30),
      address: z.string().trim().min(5).max(300),
      city: z.string().trim().min(2).max(120),
      notes: z.string().trim().max(1_000),
    }),
    items: z
      .array(
        z.object({
          productId: z.string().trim().min(1).max(120),
          quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
        }),
      )
      .min(1)
      .max(40),
  })
  .superRefine((value, context) => {
    const totalQuantity = value.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity > MAX_CART_QUANTITY) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cantitatea totală din coș este prea mare.",
        path: ["items"],
      });
    }
  });

export type WebsiteOrderInput = z.infer<typeof websiteOrderInputSchema>;

export interface WebsiteOrderPublicResult {
  orderId: string;
  orderNumber: string;
  publicToken: string;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  shippingPending: true;
}
