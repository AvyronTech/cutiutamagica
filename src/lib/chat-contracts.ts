import { z } from "zod";

export const chatSettingsSchema = z.object({
  enabled: z.boolean(),
  availability: z.enum(["online", "offline", "auto"]),
  position: z.enum(["left", "right"]),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  welcomeTitle: z.string().trim().min(2).max(80),
  welcomeMessage: z.string().trim().min(10).max(400),
  offlineMessage: z.string().trim().min(10).max(400),
  responseTimeLabel: z.string().trim().min(3).max(100),
  requireConsent: z.boolean(),
  collectName: z.boolean(),
  collectEmail: z.boolean(),
  quickReplies: z.array(z.string().trim().min(2).max(80)).max(8),
  aiEnabled: z.boolean(),
  retentionDays: z.number().int().min(30).max(1095),
});

export type ChatSettings = z.infer<typeof chatSettingsSchema>;

export const createChatConversationSchema = z.object({
  name: z.string().trim().max(100).optional().default(""),
  email: z.string().trim().email().max(254).or(z.literal("")).optional().default(""),
  consent: z.boolean(),
  sourcePath: z.string().trim().startsWith("/").max(500).default("/"),
  visitorKey: z.string().trim().min(16).max(128).optional(),
  context: z
    .object({
      productId: z.string().trim().max(128).optional(),
      productName: z.string().trim().max(180).optional(),
      referrer: z.string().trim().max(500).optional(),
    })
    .default({}),
});

export const visitorChatMessageSchema = z.object({
  messageId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
});

export const adminChatReplySchema = visitorChatMessageSchema.extend({
  conversationId: z.string().uuid(),
});

export const chatConversationStatusSchema = z.object({
  conversationId: z.string().uuid(),
  status: z.enum(["open", "pending", "closed", "spam"]),
});

export type ChatConversationStatus = z.infer<typeof chatConversationStatusSchema>["status"];
