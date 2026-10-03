import { z } from "zod";
export const paymentProviders = ["stripe", "revolut_pay", "netopia"] as const;
export type PaymentProvider = (typeof paymentProviders)[number];
const payment = z
  .object({
    enabled: z.boolean().default(false),
    environment: z.enum(["sandbox", "production"]).default("sandbox"),
    acceptanceTestReference: z.string().trim().max(120).default(""),
  })
  .default({});
export const checkoutSettingsSchema = z.object({
  stripe: payment,
  revolut_pay: payment,
  netopia: payment,
  netopiaPosSignature: z.string().trim().max(100).default(""),
  netopiaActiveKey: z.string().trim().max(100).default(""),
  invoiceProvider: z.enum(["none", "fgo", "oblio"]).default("none"),
  oblioEmail: z.union([z.literal(""), z.string().email().max(254)]).default(""),
  invoiceSeries: z.string().trim().max(30).default(""),
  invoiceTaxId: z.string().trim().max(30).default(""),
  // Invoices remain explicit admin operations; configuring a provider never issues one.
});
export type CheckoutSettings = z.infer<typeof checkoutSettingsSchema>;
export type CheckoutOption = { id: PaymentProvider; label: string; description: string };
export type PaymentStatus = {
  orderNumber: string;
  total: number;
  currency: string;
  status: "paid" | "pending" | "cancelled" | "refunded";
  canResume: boolean;
};
