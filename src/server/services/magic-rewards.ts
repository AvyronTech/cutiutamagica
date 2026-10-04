import { sendEmail } from "@/server/integrations/resend";
import type { CommerceEnv } from "@/server/integrations/provider-runtime";

type Program = {
  enabled: number;
  stars_for_order: number;
  stars_for_photo_review: number;
  stars_for_referral: number;
  stars_for_gift_profile: number;
  stars_for_collection: number;
  redemption_threshold: number;
  reward_bani: number;
  reward_valid_days: number;
  terms_version: string;
};

export type MagicRewardsDashboard = {
  program: {
    enabled: boolean;
    redemptionThreshold: number;
    rewardBani: number;
    rewardValidDays: number;
    termsVersion: string;
  };
  account: { availableStars: number; lifetimeStars: number; redeemedStars: number };
  ledger: Array<Record<string, string | number | null>>;
  rewards: Array<Record<string, string | number | null>>;
  profile: { preferences: Record<string, unknown>; completed: boolean } | null;
  calendar: Array<Record<string, string | number | boolean | number[]>>;
};

async function program(db: D1Database): Promise<Program> {
  const row = await db
    .prepare("SELECT * FROM magic_rewards_program WHERE code='magic_stars'")
    .first<Program>();
  if (!row) throw new Error("Programul Magic Stars nu este configurat.");
  return row;
}

async function addStars(
  db: D1Database,
  input: {
    accountId: string;
    delta: number;
    reason: string;
    sourceType: string;
    sourceId: string;
    note?: string;
    actorAdminId?: string | null;
  },
) {
  if (!input.delta) return false;
  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO magic_star_ledger(
         id,review_account_id,delta,reason,source_type,source_id,note,actor_admin_user_id
       ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)`,
    )
    .bind(
      crypto.randomUUID(),
      input.accountId,
      input.delta,
      input.reason,
      input.sourceType,
      input.sourceId,
      input.note ?? null,
      input.actorAdminId ?? null,
    )
    .run();
  return Number(result.meta.changes) === 1;
}

async function awardCollections(db: D1Database, accountId: string, email: string, cfg: Program) {
  if (!cfg.stars_for_collection) return;
  const completed = await db
    .prepare(
      `SELECT c.id,c.name
       FROM collections c
       WHERE c.status='active'
         AND EXISTS(SELECT 1 FROM product_collections pc WHERE pc.collection_id=c.id)
         AND NOT EXISTS(
           SELECT 1 FROM product_collections pc
           WHERE pc.collection_id=c.id
             AND NOT EXISTS(
               SELECT 1 FROM order_items oi
               JOIN orders o ON o.id=oi.order_id
               WHERE oi.product_id=pc.product_id AND lower(o.customer_email)=lower(?1)
                 AND o.fulfillment_status='delivered'
             )
         )`,
    )
    .bind(email)
    .all<{ id: string; name: string }>();
  for (const collection of completed.results) {
    await addStars(db, {
      accountId,
      delta: cfg.stars_for_collection,
      reason: "collection_completed",
      sourceType: "collection",
      sourceId: collection.id,
      note: `Colecție completată: ${collection.name}`,
    });
  }
}

export async function reconcileMagicStarsAccount(
  db: D1Database,
  account: { id: string; email: string },
) {
  const cfg = await program(db);
  await db
    .prepare(
      `INSERT INTO magic_star_accounts(review_account_id)
       VALUES(?1) ON CONFLICT(review_account_id) DO NOTHING`,
    )
    .bind(account.id)
    .run();
  if (!cfg.enabled) return;
  const delivered = await db
    .prepare(
      `SELECT id,order_number FROM orders
       WHERE lower(customer_email)=lower(?1) AND fulfillment_status='delivered'`,
    )
    .bind(account.email)
    .all<{ id: string; order_number: string }>();
  for (const order of delivered.results) {
    await addStars(db, {
      accountId: account.id,
      delta: cfg.stars_for_order,
      reason: "order_delivered",
      sourceType: "order",
      sourceId: order.id,
      note: `Comandă livrată: ${order.order_number}`,
    });
  }
  const referrals = await db
    .prepare(
      `SELECT rr.id
       FROM referral_redemptions rr
       JOIN referral_codes rc ON rc.id=rr.referral_code_id
       JOIN customers c ON c.id=rc.advocate_customer_id
       WHERE lower(c.email)=lower(?1) AND rr.status='qualified'`,
    )
    .bind(account.email)
    .all<{ id: string }>();
  for (const referral of referrals.results) {
    await addStars(db, {
      accountId: account.id,
      delta: cfg.stars_for_referral,
      reason: "referral_completed",
      sourceType: "referral_redemption",
      sourceId: referral.id,
      note: "Recomandare confirmată după livrare",
    });
  }
  const photoReviews = await db
    .prepare(
      `SELECT id FROM product_reviews
       WHERE account_id=?1 AND status='approved'
         AND photo_r2_key IS NOT NULL AND trim(photo_r2_key)!=''`,
    )
    .bind(account.id)
    .all<{ id: string }>();
  for (const review of photoReviews.results) {
    await addStars(db, {
      accountId: account.id,
      delta: cfg.stars_for_photo_review,
      reason: "photo_review_approved",
      sourceType: "product_review",
      sourceId: review.id,
      note: "Recenzie cu fotografie aprobată",
    });
  }
  await awardCollections(db, account.id, account.email, cfg);
}

export async function awardMagicStarsForDeliveredOrder(db: D1Database, orderId: string) {
  const order = await db
    .prepare(`SELECT id,customer_email,fulfillment_status FROM orders WHERE id=?1`)
    .bind(orderId)
    .first<{ id: string; customer_email: string | null; fulfillment_status: string }>();
  if (!order?.customer_email || order.fulfillment_status !== "delivered") return;
  const account = await db
    .prepare(
      "SELECT id,email FROM review_accounts WHERE lower(email)=lower(?1) AND status='active'",
    )
    .bind(order.customer_email)
    .first<{ id: string; email: string }>();
  if (account) await reconcileMagicStarsAccount(db, account);
}

export async function magicRewardsDashboard(
  db: D1Database,
  account: { id: string; email: string },
): Promise<MagicRewardsDashboard> {
  await reconcileMagicStarsAccount(db, account);
  const [cfg, balance, ledger, rewards, profile, calendar] = await Promise.all([
    program(db),
    db
      .prepare(
        `SELECT available_stars,lifetime_stars,redeemed_stars
         FROM magic_star_accounts WHERE review_account_id=?1`,
      )
      .bind(account.id)
      .first<{ available_stars: number; lifetime_stars: number; redeemed_stars: number }>(),
    db
      .prepare(
        `SELECT id,delta,reason,source_type,source_id,note,created_at
         FROM magic_star_ledger WHERE review_account_id=?1
         ORDER BY created_at DESC LIMIT 50`,
      )
      .bind(account.id)
      .all<Record<string, string | number | null>>(),
    db
      .prepare(
        `SELECT id,code,stars_spent,value_bani,status,expires_at,used_at,created_at
         FROM magic_star_rewards WHERE review_account_id=?1
         ORDER BY created_at DESC LIMIT 20`,
      )
      .bind(account.id)
      .all<Record<string, string | number | null>>(),
    db
      .prepare("SELECT preferences_json,completed FROM gift_profiles WHERE review_account_id=?1")
      .bind(account.id)
      .first<{ preferences_json: string; completed: number }>(),
    db
      .prepare(
        `SELECT id,occasion,person_name,event_month,event_day,reminder_days_json,email_enabled,active,created_at
         FROM gift_calendar_events WHERE review_account_id=?1 ORDER BY event_month,event_day,person_name`,
      )
      .bind(account.id)
      .all<Record<string, string | number>>(),
  ]);
  return {
    program: {
      enabled: cfg.enabled === 1,
      redemptionThreshold: cfg.redemption_threshold,
      rewardBani: cfg.reward_bani,
      rewardValidDays: cfg.reward_valid_days,
      termsVersion: cfg.terms_version,
    },
    account: {
      availableStars: balance?.available_stars ?? 0,
      lifetimeStars: balance?.lifetime_stars ?? 0,
      redeemedStars: balance?.redeemed_stars ?? 0,
    },
    ledger: ledger.results,
    rewards: rewards.results,
    profile: profile
      ? { preferences: JSON.parse(profile.preferences_json), completed: profile.completed === 1 }
      : null,
    calendar: calendar.results.map((event) => ({
      id: String(event.id),
      occasion: String(event.occasion),
      personName: String(event.person_name),
      eventMonth: Number(event.event_month),
      eventDay: Number(event.event_day),
      reminderDays: JSON.parse(String(event.reminder_days_json)) as number[],
      emailEnabled: Number(event.email_enabled) === 1,
      active: Number(event.active) === 1,
      createdAt: String(event.created_at),
    })),
  };
}

export async function saveGiftProfile(
  db: D1Database,
  accountId: string,
  preferences: Record<string, unknown>,
) {
  const cfg = await program(db);
  const completed = Object.values(preferences).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value),
  );
  await db
    .prepare(
      `INSERT INTO gift_profiles(review_account_id,preferences_json,completed,updated_at)
       VALUES(?1,?2,?3,strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       ON CONFLICT(review_account_id) DO UPDATE SET preferences_json=excluded.preferences_json,
         completed=excluded.completed,updated_at=excluded.updated_at`,
    )
    .bind(accountId, JSON.stringify(preferences), completed ? 1 : 0)
    .run();
  if (completed && cfg.enabled && cfg.stars_for_gift_profile)
    await addStars(db, {
      accountId,
      delta: cfg.stars_for_gift_profile,
      reason: "gift_profile_completed",
      sourceType: "gift_profile",
      sourceId: accountId,
      note: "Profilul de cadouri a fost completat",
    });
}

export async function redeemMagicStars(db: D1Database, accountId: string) {
  const cfg = await program(db);
  if (!cfg.enabled) throw new Error("Programul Magic Stars nu este activ.");
  const balance = await db
    .prepare("SELECT available_stars FROM magic_star_accounts WHERE review_account_id=?1")
    .bind(accountId)
    .first<{ available_stars: number }>();
  if ((balance?.available_stars ?? 0) < cfg.redemption_threshold)
    throw new Error(`Ai nevoie de ${cfg.redemption_threshold} stele pentru acest beneficiu.`);
  const code = `STEA-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
  const ledgerId = crypto.randomUUID();
  const promotionCodeId = crypto.randomUUID();
  const rewardId = crypto.randomUUID();
  const promotionId = `promotion_magic_stars_${rewardId}`;
  const expiresAt = new Date(Date.now() + cfg.reward_valid_days * 86_400_000).toISOString();
  await db.batch([
    db
      .prepare(
        `INSERT INTO promotions(
           id,name,description,promotion_type,value,status,priority,stack_mode,
           ends_at,usage_limit,per_customer_limit
         ) VALUES(?1,'Magic Stars · recompensă individuală',?2,'fixed',?3,'active',30,
           'exclusive',?4,1,1)`,
      )
      .bind(
        promotionId,
        `Beneficiu individual pentru ${cfg.redemption_threshold} stele confirmate.`,
        cfg.reward_bani,
        expiresAt,
      ),
    db
      .prepare(
        `INSERT INTO magic_star_ledger(
           id,review_account_id,delta,reason,source_type,source_id,note
         ) VALUES(?1,?2,?3,'reward_redeemed','magic_star_reward',?4,?5)`,
      )
      .bind(
        ledgerId,
        accountId,
        -cfg.redemption_threshold,
        rewardId,
        `Beneficiu ${cfg.reward_bani / 100} lei`,
      ),
    db
      .prepare(
        `INSERT INTO promotion_codes(
           id,promotion_id,code,status,usage_limit,used_count
         ) VALUES(?1,?2,?3,'active',1,0)`,
      )
      .bind(promotionCodeId, promotionId, code),
    db
      .prepare(
        `INSERT INTO magic_star_rewards(
           id,review_account_id,ledger_id,promotion_code_id,code,stars_spent,value_bani,expires_at
         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)`,
      )
      .bind(
        rewardId,
        accountId,
        ledgerId,
        promotionCodeId,
        code,
        cfg.redemption_threshold,
        cfg.reward_bani,
        expiresAt,
      ),
  ]);
  return { code, valueBani: cfg.reward_bani, expiresAt };
}

function bucharestDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dayDifference(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function processGiftCalendarReminders(env: CommerceEnv) {
  const today = bucharestDate();
  const year = Number(today.slice(0, 4));
  const candidates = await env.DB.prepare(
    `SELECT e.*,a.email FROM gift_calendar_events e
     JOIN review_accounts a ON a.id=e.review_account_id
     WHERE e.active=1 AND e.email_enabled=1 AND a.status='active'`,
  ).all<Record<string, string | number>>();
  for (const event of candidates.results) {
    const month = String(event.event_month).padStart(2, "0");
    const day = String(event.event_day).padStart(2, "0");
    let occurrence = `${year}-${month}-${day}`;
    if (dayDifference(today, occurrence) < 0) occurrence = `${year + 1}-${month}-${day}`;
    const daysBefore = dayDifference(today, occurrence);
    const reminders = JSON.parse(String(event.reminder_days_json)) as number[];
    if (!reminders.includes(daysBefore)) continue;
    const key = `gift-reminder/${event.id}/${occurrence}/${daysBefore}`;
    const existing = await env.DB.prepare(
      `SELECT id,status FROM gift_reminder_dispatches
       WHERE event_id=?1 AND reminder_year=?2 AND days_before=?3`,
    )
      .bind(event.id, Number(occurrence.slice(0, 4)), daysBefore)
      .first<{ id: string; status: string }>();
    if (existing?.status === "sent" || existing?.status === "pending") continue;
    const dispatchId = existing?.id ?? crypto.randomUUID();
    const inserted = await env.DB.prepare(
      `INSERT OR IGNORE INTO gift_reminder_dispatches(
         id,event_id,reminder_year,days_before,scheduled_for,status,provider_operation_key
       ) VALUES(?1,?2,?3,?4,?5,'pending',?6)`,
    )
      .bind(dispatchId, event.id, Number(occurrence.slice(0, 4)), daysBefore, today, key)
      .run();
    if (!inserted.meta.changes) {
      if (existing?.status !== "failed") continue;
      await env.DB.prepare(
        `UPDATE gift_reminder_dispatches SET status='pending',error_message=NULL,
         updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?1 AND status='failed'`,
      )
        .bind(dispatchId)
        .run();
    }
    const person = String(event.person_name);
    const subject =
      daysBefore === 0
        ? `Astăzi este momentul lui ${person} ✨`
        : `Mai sunt ${daysBefore} zile până la momentul lui ${person} ✨`;
    const text = [
      subject,
      "",
      "Am păstrat momentul în Calendarul cadourilor.",
      "Vrei să vezi trei idei potrivite?",
      "",
      `${env.PUBLIC_SITE_URL}/cadouri`,
      "",
      "Poți opri oricând reminderele din contul tău.",
    ].join("\n");
    try {
      await sendEmail(env, {
        to: String(event.email),
        subject,
        text,
        html: `<div style="font-family:Inter,system-ui,sans-serif;line-height:1.6;color:#3c2d24"><h1>${escapeHtml(subject)}</h1><p>Am păstrat momentul în Calendarul cadourilor.</p><p><a href="${env.PUBLIC_SITE_URL}/cadouri">Vezi trei idei de cadou</a></p><small>Poți opri oricând reminderele din contul tău.</small></div>`,
        channel: "default",
        idempotencyKey: key,
        entityType: "gift_calendar_reminder",
        entityId: String(event.id),
      });
      await env.DB.prepare(
        `UPDATE gift_reminder_dispatches SET status='sent',sent_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?1`,
      )
        .bind(dispatchId)
        .run();
    } catch (error) {
      await env.DB.prepare(
        `UPDATE gift_reminder_dispatches SET status='failed',error_message=?2,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?1`,
      )
        .bind(dispatchId, error instanceof Error ? error.message.slice(0, 500) : "Eroare e-mail")
        .run();
    }
  }
}
