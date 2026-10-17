import { sendEmail } from "@/server/integrations/resend";
import { emailTextToHtml, getEmailSettings } from "@/server/services/email-center";
import { credential } from "@/server/services/growth-settings";
import type { CommerceEnv } from "@/server/integrations/provider-runtime";

const MAX_REWARD_EMAILS_PER_DAY = 20;
const MAX_REWARD_EMAILS_PER_MONTH = 500;
const MAX_RESEND_EMAILS_PER_DAY = 80;
const MAX_RESEND_EMAILS_PER_MONTH = 2400;

type DigestCandidate = {
  account_id: string;
  email: string;
  display_name: string;
  activity_day: string;
  event_count: number;
  stars: number;
  available_stars: number;
};

type DigestActivity = { name: string; stars: number };

export function rewardDigestContent(
  candidate: Pick<DigestCandidate, "display_name" | "stars" | "available_stars">,
  activities: DigestActivity[],
  siteUrl: string,
) {
  const firstName = candidate.display_name.trim().split(/\s+/)[0] || "dragă prieten";
  const subject = `Ai primit +${candidate.stars} Magic Stars ✦`;
  const text = [
    `Bună, ${firstName}!`,
    "",
    "Micile momente se adună: în contul tău au apărut noi Magic Stars.",
    "",
    ...activities.map((activity) => `+${activity.stars} ✦ ${activity.name}`),
    "",
    `Soldul tău disponibil: ${candidate.available_stars} ✦.`,
    `Descoperă beneficiile în cont: ${new URL("/cont", siteUrl).toString()}`,
    "",
    "Cu drag, Cutiuța Magică",
    "Poți opri aceste mesaje oricând din contul tău.",
  ].join("\n");
  return { subject, text, html: emailTextToHtml(text) };
}

/**
 * Sends at most one digest per opted-in customer and UTC activity day. Failed or
 * uncertain sends stay visible for review; cron never guesses whether to retry.
 */
export async function processRewardEmailDigests(env: CommerceEnv, now = new Date()) {
  if (env.APP_ENV !== "production" || !(await credential(env, "resend"))) return 0;
  const settings = await getEmailSettings(env.DB);
  if (!settings.customerEmailsEnabled) return 0;

  const today = now.toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const usage = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM magic_reward_email_dispatches
        WHERE status='sent' AND substr(sent_at,1,10)=?1) AS reward_day,
       (SELECT COUNT(*) FROM magic_reward_email_dispatches
        WHERE status='sent' AND substr(sent_at,1,7)=?2) AS reward_month,
       (SELECT COUNT(*) FROM provider_operations
        WHERE provider='resend' AND operation_type='email.send' AND status='succeeded'
          AND substr(created_at,1,10)=?1) AS resend_day,
       (SELECT COUNT(*) FROM provider_operations
        WHERE provider='resend' AND operation_type='email.send' AND status='succeeded'
          AND substr(created_at,1,7)=?2) AS resend_month`,
  )
    .bind(today, month)
    .first<{
      reward_day: number;
      reward_month: number;
      resend_day: number;
      resend_month: number;
    }>();
  const capacity = Math.max(
    0,
    Math.min(
      MAX_REWARD_EMAILS_PER_DAY - Number(usage?.reward_day ?? 0),
      MAX_REWARD_EMAILS_PER_MONTH - Number(usage?.reward_month ?? 0),
      MAX_RESEND_EMAILS_PER_DAY - Number(usage?.resend_day ?? 0),
      MAX_RESEND_EMAILS_PER_MONTH - Number(usage?.resend_month ?? 0),
      20,
    ),
  );
  if (!capacity) return 0;

  const candidates = await env.DB.prepare(
    `SELECT a.id AS account_id,a.email,a.display_name,
            substr(e.created_at,1,10) AS activity_day,
            COUNT(*) AS event_count,SUM(e.stars) AS stars,
            COALESCE(s.available_stars,0) AS available_stars
     FROM magic_reward_activity_events e
     JOIN review_accounts a ON a.id=e.review_account_id
     JOIN magic_star_accounts s ON s.review_account_id=a.id
     LEFT JOIN magic_reward_email_dispatches d
       ON d.review_account_id=a.id AND d.activity_day=substr(e.created_at,1,10)
     WHERE a.status='active' AND a.reward_email_enabled=1
       AND a.reward_email_opted_in_at IS NOT NULL
       AND e.created_at>=a.reward_email_opted_in_at
       AND substr(e.created_at,1,10)<?1
       AND e.created_at>=?2 AND d.id IS NULL
     GROUP BY a.id,substr(e.created_at,1,10)
     ORDER BY activity_day,a.id LIMIT ?3`,
  )
    .bind(today, new Date(now.getTime() - 14 * 86400000).toISOString(), capacity)
    .all<DigestCandidate>();

  let sent = 0;
  for (const candidate of candidates.results) {
    const activities = await env.DB.prepare(
      `SELECT activity.name,e.stars
       FROM magic_reward_activity_events e
       JOIN magic_reward_activities activity ON activity.code=e.activity_code
       WHERE e.review_account_id=?1 AND substr(e.created_at,1,10)=?2
         AND e.created_at >= (
           SELECT reward_email_opted_in_at FROM review_accounts WHERE id=?1
         )
       ORDER BY e.created_at,e.id LIMIT 30`,
    )
      .bind(candidate.account_id, candidate.activity_day)
      .all<DigestActivity>();
    if (!activities.results.length) continue;
    const dispatchId = crypto.randomUUID();
    const claimed = await env.DB.prepare(
      `INSERT OR IGNORE INTO magic_reward_email_dispatches(
        id,review_account_id,activity_day,status,event_count,first_attempt_at
       ) SELECT ?1,id,?2,'processing',?3,?4 FROM review_accounts
         WHERE id=?5 AND status='active' AND reward_email_enabled=1`,
    )
      .bind(
        dispatchId,
        candidate.activity_day,
        candidate.event_count,
        now.toISOString(),
        candidate.account_id,
      )
      .run();
    if (!claimed.meta.changes) continue;
    const content = rewardDigestContent(candidate, activities.results, env.PUBLIC_SITE_URL);
    try {
      await sendEmail(env, {
        to: candidate.email,
        channel: "default",
        resendOnly: true,
        subject: content.subject,
        text: content.text,
        html: content.html,
        idempotencyKey: `magic-rewards-digest/${candidate.account_id}/${candidate.activity_day}`,
        entityType: "magic_rewards_digest",
        entityId: dispatchId,
      });
      await env.DB.prepare(
        `UPDATE magic_reward_email_dispatches SET status='sent',sent_at=?2 WHERE id=?1`,
      )
        .bind(dispatchId, now.toISOString())
        .run();
      sent += 1;
    } catch (error) {
      await env.DB.prepare(
        `UPDATE magic_reward_email_dispatches SET status='failed',error_message=?2 WHERE id=?1`,
      )
        .bind(dispatchId, error instanceof Error ? error.message.slice(0, 500) : "Eroare e-mail")
        .run();
    }
  }
  return sent;
}
