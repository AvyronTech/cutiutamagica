import { paymentProviders } from "./checkout-settings";
import { z } from "zod";
import { MAX_CART_QUANTITY, MAX_ITEM_QUANTITY } from "@/lib/pricing";
import { PAYMENT_METHODS, SHIPPING_OPTIONS } from "@/lib/commerce-operations-contracts";

export const websiteOrderInputSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    website: z.string().max(0).optional().default(""),
    customer: z.object({
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(254),
      phone: z.string().trim().min(8).max(30),
      address: z.string().trim().min(5).max(300),
      city: z.string().trim().min(2).max(120),
      county: z.string().trim().max(120).optional().default(""),
      postalCode: z.string().trim().max(20).optional().default(""),
      notes: z.string().trim().max(1_000),
    }),
    paymentMethod: z.enum(PAYMENT_METHODS),
    shippingOption: z.enum(SHIPPING_OPTIONS),
    paymentProvider: z.enum(paymentProviders).optional(),
    shippingQuoteId: z.string().uuid().optional(),
    expectedTotalBani: z.number().int().nonnegative().max(100_000_000).optional(),
    checkoutConsentAccepted: z.literal(true),
    checkoutConsentVersion: z.string().trim().min(1).max(30),
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
    if (
      value.paymentMethod === "card" &&
      value.paymentProvider === "revolut_pay" &&
      !/^\d{6}$/.test(value.customer.postalCode)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Completează codul poștal pentru plata prin Revolut.",
        path: ["customer", "postalCode"],
      });
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
  shipping: number;
  shippingPending: boolean;
}
