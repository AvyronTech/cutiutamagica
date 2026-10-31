import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { assertPermission, requireAdminAuth } from "./admin-auth";

function sameOrigin() {
  const request = getRequest();
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new Error("Cerere de administrare nepermisă.");
}

export const getReferralAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "promotions.read");
    const [campaign, stats, codes, rewards] = await env.DB.batch<
      Record<string, string | number | null>
    >([
      env.DB.prepare(
        `SELECT id,name,status,friend_reward_bani,advocate_reward_bani,currency,
                code_valid_days,friend_usage_limit,updated_at
         FROM referral_campaigns WHERE id='referral_after_delivery_15'`,
      ),
      env.DB.prepare(
        `SELECT
           (SELECT COUNT(*) FROM referral_codes) AS codes_issued,
           (SELECT COUNT(*) FROM referral_codes WHERE status='active'
             AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')) AS codes_active,
           (SELECT COUNT(*) FROM referral_redemptions) AS referrals_started,
           (SELECT COUNT(*) FROM referral_redemptions WHERE status='qualified') AS referrals_qualified,
           (SELECT COALESCE(SUM(friend_discount_bani),0) FROM referral_redemptions) AS friend_discount_bani,
           (SELECT COALESCE(SUM(advocate_reward_bani),0) FROM referral_redemptions
             WHERE status='qualified') AS advocate_reward_bani`,
      ),
      env.DB.prepare(
        `SELECT rc.id,rc.code,rc.status,rc.used_count,rc.usage_limit,rc.expires_at,
                rc.created_at,c.full_name AS advocate_name,c.email AS advocate_email,
                o.order_number AS source_order_number
         FROM referral_codes rc
         JOIN customers c ON c.id=rc.advocate_customer_id
         JOIN orders o ON o.id=rc.source_order_id
         ORDER BY rc.created_at DESC LIMIT 50`,
      ),
      env.DB.prepare(
        `SELECT rr.id,rr.status,rr.friend_discount_bani,rr.advocate_reward_bani,
                rr.reserved_at,rr.qualified_at,o.order_number AS referred_order_number,
                pc.code AS advocate_reward_code
         FROM referral_redemptions rr
         JOIN orders o ON o.id=rr.referred_order_id
         LEFT JOIN promotion_codes pc ON pc.id=rr.advocate_reward_promotion_code_id
         ORDER BY rr.reserved_at DESC LIMIT 50`,
      ),
    ]);
    return {
      campaign: campaign.results[0] ?? null,
      stats: stats.results[0] ?? null,
      codes: codes.results,
      rewards: rewards.results,
    };
  });

const campaignInput = z.object({
  active: z.boolean(),
  friendRewardLei: z.number().min(1).max(100),
  advocateRewardLei: z.number().min(1).max(100),
  codeValidDays: z.number().int().min(1).max(730),
  friendUsageLimit: z.number().int().min(1).max(20),
});

export const saveReferralCampaign = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(campaignInput)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "promotions.write");
    const now = new Date().toISOString();
    const friendRewardBani = Math.round(data.friendRewardLei * 100);
    const advocateRewardBani = Math.round(data.advocateRewardLei * 100);
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE referral_campaigns SET status=?1,friend_reward_bani=?2,
           advocate_reward_bani=?3,code_valid_days=?4,friend_usage_limit=?5,updated_at=?6
         WHERE id='referral_after_delivery_15'`,
      ).bind(
        data.active ? "active" : "paused",
        friendRewardBani,
        advocateRewardBani,
        data.codeValidDays,
        data.friendUsageLimit,
        now,
      ),
      env.DB.prepare(
        "UPDATE promotions SET value=?1,status=?2,updated_at=?3 WHERE id='promotion_referral_friend_15'",
      ).bind(friendRewardBani, data.active ? "active" : "paused", now),
      env.DB.prepare(
        "UPDATE promotions SET value=?1,status=?2,updated_at=?3 WHERE id='promotion_referral_advocate_15'",
      ).bind(advocateRewardBani, data.active ? "active" : "paused", now),
      env.DB.prepare(
        `INSERT INTO audit_log(
           id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json,metadata_json
         ) VALUES(?1,?2,?3,'referral.campaign.update','referral_campaign',
           'referral_after_delivery_15',?4,'{}')`,
      ).bind(crypto.randomUUID(), context.admin.id, context.admin.email, JSON.stringify(data)),
    ]);
    return { ok: true };
  });

export const updateReferralCode = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(z.object({ codeId: z.string().uuid(), enabled: z.boolean() }))
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "promotions.write");
    const result = await env.DB.prepare(
      `UPDATE referral_codes SET status=CASE
         WHEN ?1=1 AND used_count<usage_limit AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')
           THEN 'active'
         WHEN ?1=1 THEN status
         ELSE 'disabled' END,
         updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id=?2`,
    )
      .bind(data.enabled ? 1 : 0, data.codeId)
      .run();
    if (Number(result.meta.changes) !== 1) throw new Error("Codul nu a fost găsit.");
    return { ok: true };
  });
