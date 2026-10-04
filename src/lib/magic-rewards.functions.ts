import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { assertPermission, requireAdminAuth } from "./admin-auth";

type DbValue = string | number | null;
type DbRow = Record<string, DbValue>;

function sameOrigin() {
  const request = getRequest();
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new Error("Cerere de administrare nepermisă.");
}

export const getMagicRewardsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "promotions.read");
    const [program, stats, ledger, reminders] = await Promise.all([
      env.DB.prepare("SELECT * FROM magic_rewards_program WHERE code='magic_stars'").first<DbRow>(),
      env.DB.prepare(
        `SELECT
          (SELECT COUNT(*) FROM magic_star_accounts) AS accounts,
          (SELECT COALESCE(SUM(available_stars),0) FROM magic_star_accounts) AS available_stars,
          (SELECT COALESCE(SUM(lifetime_stars),0) FROM magic_star_accounts) AS lifetime_stars,
          (SELECT COUNT(*) FROM magic_star_rewards WHERE status='active') AS active_rewards,
          (SELECT COUNT(*) FROM gift_calendar_events WHERE active=1) AS calendar_events,
          (SELECT COUNT(*) FROM gift_reminder_dispatches WHERE status='sent') AS reminders_sent`,
      ).first<DbRow>(),
      env.DB.prepare(
        `SELECT l.id,a.email,a.display_name,l.delta,l.reason,l.note,l.created_at
         FROM magic_star_ledger l JOIN review_accounts a ON a.id=l.review_account_id
         ORDER BY l.created_at DESC LIMIT 50`,
      ).all<DbRow>(),
      env.DB.prepare(
        `SELECT d.id,a.email,e.person_name,e.occasion,d.days_before,d.status,d.scheduled_for,d.sent_at,d.error_message
         FROM gift_reminder_dispatches d
         JOIN gift_calendar_events e ON e.id=d.event_id
         JOIN review_accounts a ON a.id=e.review_account_id
         ORDER BY d.created_at DESC LIMIT 30`,
      ).all<DbRow>(),
    ]);
    return { program, stats, ledger: ledger.results, reminders: reminders.results };
  });

const programInput = z.object({
  enabled: z.boolean(),
  starsForOrder: z.number().int().min(0).max(20),
  starsForPhotoReview: z.number().int().min(0).max(20),
  starsForReferral: z.number().int().min(0).max(20),
  starsForGiftProfile: z.number().int().min(0).max(20),
  starsForCollection: z.number().int().min(0).max(20),
  redemptionThreshold: z.number().int().min(1).max(100),
  rewardLei: z.number().min(1).max(1000),
  rewardValidDays: z.number().int().min(1).max(730),
  termsVersion: z.string().trim().min(4).max(40),
});

export const saveMagicRewardsProgram = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(programInput)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "promotions.write");
    const rewardBani = Math.round(data.rewardLei * 100);
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE magic_rewards_program SET enabled=?1,stars_for_order=?2,
          stars_for_photo_review=?3,stars_for_referral=?4,stars_for_gift_profile=?5,
          stars_for_collection=?6,redemption_threshold=?7,reward_bani=?8,
          reward_valid_days=?9,terms_version=?10,updated_by=?11,
          updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE code='magic_stars'`,
      ).bind(
        data.enabled ? 1 : 0,
        data.starsForOrder,
        data.starsForPhotoReview,
        data.starsForReferral,
        data.starsForGiftProfile,
        data.starsForCollection,
        data.redemptionThreshold,
        rewardBani,
        data.rewardValidDays,
        data.termsVersion,
        context.admin.id,
      ),
      env.DB.prepare(
        `INSERT INTO audit_log(
          id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json,metadata_json
        ) VALUES(?1,?2,?3,'magic_rewards.program.update','magic_rewards_program','magic_stars',?4,'{}')`,
      ).bind(crypto.randomUUID(), context.admin.id, context.admin.email, JSON.stringify(data)),
    ]);
    return { ok: true };
  });

export const adjustMagicStars = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(
    z.object({
      email: z
        .string()
        .trim()
        .email()
        .max(254)
        .transform((value) => value.toLowerCase()),
      delta: z
        .number()
        .int()
        .min(-20)
        .max(20)
        .refine((value) => value !== 0),
      note: z.string().trim().min(4).max(300),
    }),
  )
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "promotions.write");
    const account = await env.DB.prepare(
      "SELECT id FROM review_accounts WHERE email=?1 AND status='active'",
    )
      .bind(data.email)
      .first<{ id: string }>();
    if (!account) throw new Error("Nu există un cont client activ cu acest e-mail.");
    await env.DB.prepare(
      `INSERT INTO magic_star_ledger(
        id,review_account_id,delta,reason,source_type,source_id,note,actor_admin_user_id
      ) VALUES(?1,?2,?3,'admin_adjustment','admin_adjustment',?4,?5,?6)`,
    )
      .bind(
        crypto.randomUUID(),
        account.id,
        data.delta,
        crypto.randomUUID(),
        data.note,
        context.admin.id,
      )
      .run();
    return { ok: true };
  });
