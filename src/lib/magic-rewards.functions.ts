import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { assertPermission, requireAdminAuth } from "./admin-auth";
import { listMagicRewardActivities } from "@/server/services/magic-rewards";

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
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Bucharest",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const [program, activities, stats, ledger, reminders] = await Promise.all([
      env.DB.prepare("SELECT * FROM magic_rewards_program WHERE code='magic_stars'").first<DbRow>(),
      listMagicRewardActivities(env.DB),
      env.DB.prepare(
        `SELECT
          (SELECT COUNT(*) FROM magic_star_accounts) AS accounts,
          (SELECT COALESCE(SUM(available_stars),0) FROM magic_star_accounts) AS available_stars,
          (SELECT COALESCE(SUM(lifetime_stars),0) FROM magic_star_accounts) AS lifetime_stars,
          (SELECT COUNT(*) FROM magic_star_rewards WHERE status='active') AS active_rewards,
          (SELECT COUNT(*) FROM gift_calendar_events WHERE active=1) AS calendar_events,
          (SELECT COUNT(*) FROM gift_reminder_dispatches WHERE status='sent') AS reminders_sent,
          (SELECT COUNT(*) FROM magic_reward_activity_events
           WHERE activity_code='social_share' AND period_key=?1) AS shares_today,
          (SELECT COUNT(*) FROM magic_reward_activity_events
           WHERE activity_code='birthday_bonus') AS birthday_bonuses`,
      )
        .bind(today)
        .first<DbRow>(),
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
    return { program, activities, stats, ledger: ledger.results, reminders: reminders.results };
  });

export const getPublicMagicRewards = createServerFn({ method: "GET" }).handler(async () => {
  const [program, activities] = await Promise.all([
    env.DB.prepare(
      `SELECT enabled,redemption_threshold,reward_bani,reward_valid_days
       FROM magic_rewards_program WHERE code='magic_stars'`,
    ).first<DbRow>(),
    listMagicRewardActivities(env.DB, true),
  ]);
  return { program, activities: activities.filter((activity) => activity.enabled) };
});

const programInput = z.object({
  enabled: z.boolean(),
  redemptionThreshold: z.number().int().min(1).max(100),
  rewardValidDays: z.number().int().min(1).max(730),
  termsVersion: z.string().trim().min(4).max(40),
});

export const saveMagicRewardsProgram = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(programInput)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "promotions.write");
    const rewardBani = data.redemptionThreshold * 100;
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE magic_rewards_program SET enabled=?1,redemption_threshold=?2,reward_bani=?3,
          reward_valid_days=?4,terms_version=?5,updated_by=?6,
          updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE code='magic_stars'`,
      ).bind(
        data.enabled ? 1 : 0,
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

const activitiesInput = z.object({
  activities: z
    .array(
      z.object({
        code: z
          .string()
          .trim()
          .regex(/^[a-z0-9_]{2,64}$/),
        stars: z.number().int().min(0).max(100),
        periodLimit: z.number().int().min(0).max(100),
        enabled: z.boolean(),
      }),
    )
    .min(1)
    .max(30),
});

export const saveMagicRewardActivities = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(activitiesInput)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "promotions.write");
    const existing = await env.DB.prepare("SELECT code FROM magic_reward_activities").all<{
      code: string;
    }>();
    const allowed = new Set(existing.results.map((row) => row.code));
    if (data.activities.some((activity) => !allowed.has(activity.code)))
      throw new Error("Lista activităților Magic Rewards s-a schimbat. Reîncarcă pagina.");
    await env.DB.batch([
      ...data.activities.map((activity) =>
        env.DB.prepare(
          `UPDATE magic_reward_activities
           SET stars=?2,period_limit=?3,enabled=?4,updated_by=?5,
             updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
           WHERE code=?1`,
        ).bind(
          activity.code,
          activity.stars,
          activity.periodLimit,
          activity.enabled ? 1 : 0,
          context.admin.id,
        ),
      ),
      env.DB.prepare(
        `INSERT INTO audit_log(
          id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json,metadata_json
        ) VALUES(?1,?2,?3,'magic_rewards.activities.update','magic_reward_activities','catalog',?4,'{}')`,
      ).bind(
        crypto.randomUUID(),
        context.admin.id,
        context.admin.email,
        JSON.stringify(data.activities),
      ),
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
