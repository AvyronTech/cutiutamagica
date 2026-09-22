import { z } from "zod";

const brandedAddress = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase())
  .refine((value) => value.endsWith("@cutiutamagica.eu"), {
    message: "Adresa expeditorului trebuie să folosească domeniul cutiutamagica.eu.",
  });

const contactAddress = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());

export const emailSettingsSchema = z.object({
  provider: z.literal("resend").default("resend"),
  senderName: z.string().trim().min(2).max(80).default("Cutiuța Magică"),
  defaultFromEmail: brandedAddress.default("contact@cutiutamagica.eu"),
  ordersFromEmail: brandedAddress.default("comenzi@cutiutamagica.eu"),
  returnsFromEmail: brandedAddress.default("retururi@cutiutamagica.eu"),
  partnersFromEmail: brandedAddress.default("parteneri@cutiutamagica.eu"),
  replyToEmail: contactAddress.default("cutiutamagica@gmail.com"),
  inboundAddress: brandedAddress.default("contact@cutiutamagica.eu"),
  forwardingTarget: contactAddress.default("cutiutamagica@gmail.com"),
  customerEmailsEnabled: z.boolean().default(true),
  partnerEmailsEnabled: z.boolean().default(false),
});

export type EmailSettings = z.infer<typeof emailSettingsSchema>;

export const emailTemplateCodeSchema = z.enum(["order_confirmation", "return_acknowledgement"]);
export type EmailTemplateCode = z.infer<typeof emailTemplateCodeSchema>;

export const emailTemplateInputSchema = z.object({
  code: emailTemplateCodeSchema,
  enabled: z.boolean(),
  subjectTemplate: z.string().trim().min(3).max(180),
  textTemplate: z.string().trim().min(10).max(10_000),
});

export const partnerContactInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  company: z.string().trim().max(160).default(""),
  email: contactAddress,
  notes: z.string().trim().max(1_000).default(""),
});

export const partnerMessageSchema = z.object({
  contactId: z.string().uuid(),
  subject: z.string().trim().min(3).max(180),
  message: z.string().trim().min(10).max(10_000),
});

export const emailTestSchema = z.object({
  channel: z.enum(["default", "orders", "returns", "partners"]),
});

export type EmailChannel = z.infer<typeof emailTestSchema>["channel"];

export const allowedTemplateVariables: Record<EmailTemplateCode, string[]> = {
  order_confirmation: ["customer_name", "order_number", "total"],
  return_acknowledgement: ["customer_name", "return_number"],
};
