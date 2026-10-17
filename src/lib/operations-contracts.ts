import { z } from "zod";

export const marketingCampaignInputSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    objective: z.enum(["awareness", "traffic", "conversion", "retention"]),
    currency: z.enum(["RON", "EUR"]),
    budget: z.number().min(0).max(10_000_000),
    startDate: z.string().date().or(z.literal("")),
    endDate: z.string().date().or(z.literal("")),
    channels: z.array(z.enum(["facebook", "instagram", "tiktok", "email", "website"])).min(1),
    strategy: z.string().trim().min(10).max(3000),
    targetAudience: z.string().trim().min(3).max(1000),
  })
  .refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
    message: "Data finală trebuie să fie după data de început.",
    path: ["endDate"],
  });

export const marketingCostInputSchema = z.object({
  campaignId: z.string().uuid().or(z.literal("")),
  channel: z.string().trim().min(2).max(40),
  category: z.enum(["ads", "content", "creator", "software", "shipping", "other"]),
  amount: z.number().positive().max(10_000_000),
  currency: z.enum(["RON", "EUR"]),
  occurredOn: z.string().date(),
  note: z.string().trim().max(500),
});

export const socialDraftInputSchema = z.object({
  accountId: z.string().trim().max(128).or(z.literal("")),
  campaignId: z.string().uuid().or(z.literal("")),
  productId: z.string().trim().max(128).or(z.literal("")),
  platform: z.enum(["facebook", "instagram", "tiktok"]),
  postType: z.enum(["post", "story", "reel", "video", "carousel"]),
  objective: z.enum(["awareness", "traffic", "conversion", "retention"]),
  tone: z.enum(["cald", "magic", "nostalgic", "jucaus", "premium"]),
  callToAction: z.string().trim().min(2).max(120),
  notes: z.string().trim().max(1000),
});

export const socialRelationshipImportSchema = z.object({
  provider: z.enum(["instagram", "facebook", "tiktok", "manual"]),
  accounts: z
    .array(
      z.object({
        username: z.string().trim().min(1).max(100),
        profileUrl: z.string().trim().url().max(500).or(z.literal("")),
        followsBack: z.boolean(),
        engagementRate: z.number().min(0).max(100).nullable(),
        lastInteractionAt: z.string().datetime().nullable(),
        protected: z.boolean().default(false),
      }),
    )
    .min(1)
    .max(1000),
});

export const unfollowDecisionSchema = z.object({
  proposalId: z.string().uuid(),
  decision: z.enum(["keep", "approved_unfollow", "dismissed"]),
});

export const socialPostDecisionSchema = z.object({
  postId: z.string().uuid(),
  decision: z.enum(["approved", "cancelled"]),
});

export const backupPolicySchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(["manual", "daily", "weekly"]),
  weekday: z.number().int().min(1).max(7),
  hour: z.number().int().min(0).max(23),
  retentionCount: z.number().int().min(2).max(30),
  maxAgeDays: z.number().int().min(7).max(365),
  includeCustomerData: z.boolean(),
});

export type BackupPolicy = z.infer<typeof backupPolicySchema>;

export const accountConnectionInputSchema = z.object({
  owner: z.enum(["cutiuta_magica", "avyron"]),
  provider: z.string().trim().min(2).max(60),
  label: z.string().trim().min(2).max(100),
  authMethod: z.enum(["oauth", "api_key", "service_token", "device_session", "manual"]),
  secretReference: z
    .string()
    .trim()
    .regex(/^[A-Z][A-Z0-9_]{2,80}$|^$/),
  scopes: z.array(z.string().trim().min(1).max(100)).max(30),
  notes: z.string().trim().max(1000),
});
