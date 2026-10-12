import { sendEmail } from "@/server/integrations/resend";
import type { CommerceEnv } from "@/server/integrations/provider-runtime";

type Program = {
  enabled: number;
  redemption_threshold: number;
  reward_bani: number;
  reward_valid_days: number;
  terms_version: string;
};

export type MagicRewardActivity = {
  code: string;
  name: string;
  description: string;
  stars: number;
  cadence: "once" | "per_event" | "daily" | "yearly";
  periodLimit: number;
  enabled: boolean;
  automatic: boolean;
  customerVisible: boolean;
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
  activities: MagicRewardActivity[];
  birthday: { month: number; day: number } | null;
  ledger: Array<Record<string, string | number | null>>;
  rewards: Array<Record<string, string | number | null>>;
  profile: { preferences: Record<string, unknown>; completed: boolean } | null;
  calendar: Array<Record<string, string | number | boolean | number[]>>;
};

type ActivityRow = {
  code: string;
  name: string;
  description: string;
  stars: number;
  cadence: MagicRewardActivity["cadence"];
  period_limit: number;
  enabled: number;
  automatic: number;
  customer_visible: number;
};

function publicActivity(row: ActivityRow): MagicRewardActivity {
  return {
    code: row.code,
    name: row.name,
    description: row.description,
    stars: Number(row.stars),
    cadence: row.cadence,
    periodLimit: Number(row.period_limit),
    enabled: Number(row.enabled) === 1,
    automatic: Number(row.automatic) === 1,
    customerVisible: Number(row.customer_visible) === 1,
  };
}

export async function listMagicRewardActivities(
  db: D1Database,
  customerVisibleOnly = false,
): Promise<MagicRewardActivity[]> {
  const rows = await db
    .prepare(
      `SELECT code,name,description,stars,cadence,period_limit,enabled,automatic,customer_visible
       FROM magic_reward_activities
       WHERE (?1=0 OR customer_visible=1)
       ORDER BY sort_order,code`,
    )
    .bind(customerVisibleOnly ? 1 : 0)
    .all<ActivityRow>();
  return rows.results.map(publicActivity);
}

export async function awardMagicRewardActivity(
  db: D1Database,
  input: {
    accountId: string;
    activityCode: string;
    sourceType: string;
    sourceId: string;
    metadata?: Record<string, unknown>;
    now?: Date;
  },
) {
  const activity = await db
    .prepare(
      `SELECT code,name,description,stars,cadence,period_limit,enabled,automatic,customer_visible
       FROM magic_reward_activities WHERE code=?1`,
    )
    .bind(input.activityCode)
    .first<ActivityRow>();
  if (!activity || !activity.enabled || Number(activity.stars) <= 0)
    return { awarded: false, stars: 0, limitReached: false };

  const today = bucharestDate(input.now);
  const periodKey =
    activity.cadence === "once"
      ? "lifetime"
      : activity.cadence === "yearly"
        ? today.slice(0, 4)
        : activity.cadence === "daily"
          ? today
          : `event:${input.sourceId}`;
  const periodLimit =
    activity.cadence === "per_event" ? 1 : Math.max(1, Number(activity.period_limit));
  const period = await db
    .prepare(
      `SELECT COUNT(*) AS count,COALESCE(MAX(period_slot),0) AS max_slot
       FROM magic_reward_activity_events
       WHERE review_account_id=?1 AND activity_code=?2 AND period_key=?3`,
    )
    .bind(input.accountId, input.activityCode, periodKey)
    .first<{ count: number; max_slot: number }>();
  if (Number(period?.count ?? 0) >= periodLimit)
    return { awarded: false, stars: 0, limitReached: true };

  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO magic_reward_activity_events(
         id,review_account_id,activity_code,source_type,source_id,period_key,period_slot,stars,metadata_json
       ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9)`,
    )
    .bind(
      crypto.randomUUID(),
      input.accountId,
      input.activityCode,
      input.sourceType,
      input.sourceId,
      periodKey,
      Number(period?.max_slot ?? 0) + 1,
      Number(activity.stars),
      JSON.stringify(input.metadata ?? {}),
    )
    .run();
  const awarded = Number(result.meta.changes) === 1;
  return { awarded, stars: awarded ? Number(activity.stars) : 0, limitReached: false };
}

async function program(db: D1Database): Promise<Program> {
  const row = await db
    .prepare("SELECT * FROM magic_rewards_program WHERE code='magic_stars'")
    .first<Program>();
  if (!row) throw new Error("Programul Magic Stars nu este configurat.");
  return row;
}

async function awardCollections(db: D1Database, accountId: string, email: string) {
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
    await awardMagicRewardActivity(db, {
      accountId,
      activityCode: "collection_completed",
      sourceType: "collection",
      sourceId: collection.id,
      metadata: { collectionName: collection.name },
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
  await awardMagicRewardActivity(db, {
    accountId: account.id,
    activityCode: "account_created",
    sourceType: "review_account",
    sourceId: account.id,
  });
  const delivered = await db
    .prepare(
      `SELECT id,order_number FROM orders
       WHERE lower(customer_email)=lower(?1) AND fulfillment_status='delivered'`,
    )
    .bind(account.email)
    .all<{ id: string; order_number: string }>();
  for (const order of delivered.results) {
    await awardMagicRewardActivity(db, {
      accountId: account.id,
      activityCode: "order_delivered",
      sourceType: "order",
      sourceId: order.id,
      metadata: { orderNumber: order.order_number },
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
    await awardMagicRewardActivity(db, {
      accountId: account.id,
      activityCode: "referral_completed",
      sourceType: "referral_redemption",
      sourceId: referral.id,
    });
  }
  const reviews = await db
    .prepare(
      `SELECT id FROM product_reviews
       WHERE account_id=?1 AND status='approved'`,
    )
    .bind(account.id)
    .all<{ id: string }>();
  for (const review of reviews.results) {
    await awardMagicRewardActivity(db, {
      accountId: account.id,
      activityCode: "review_approved",
      sourceType: "product_review",
      sourceId: review.id,
    });
  }
  const profile = await db
    .prepare("SELECT completed FROM gift_profiles WHERE review_account_id=?1")
    .bind(account.id)
    .first<{ completed: number }>();
  if (Number(profile?.completed) === 1)
    await awardMagicRewardActivity(db, {
      accountId: account.id,
      activityCode: "gift_profile_completed",
      sourceType: "gift_profile",
      sourceId: account.id,
    });
  const firstCalendarEvent = await db
    .prepare(
      `SELECT id FROM gift_calendar_events
       WHERE review_account_id=?1 ORDER BY created_at,id LIMIT 1`,
    )
    .bind(account.id)
    .first<{ id: string }>();
  if (firstCalendarEvent)
    await awardMagicRewardActivity(db, {
      accountId: account.id,
      activityCode: "first_calendar_event",
      sourceType: "gift_calendar_event",
      sourceId: firstCalendarEvent.id,
    });
  await awardCollections(db, account.id, account.email);
  await awardBirthdayForAccount(db, account.id);
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

export async function awardMagicStarsForApprovedReview(db: D1Database, reviewId: string) {
  const review = await db
    .prepare(
      `SELECT id,account_id FROM product_reviews
       WHERE id=?1 AND status='approved' AND account_id IS NOT NULL`,
    )
    .bind(reviewId)
    .first<{ id: string; account_id: string }>();
  if (!review) return { awarded: false, stars: 0, limitReached: false };
  return awardMagicRewardActivity(db, {
    accountId: review.account_id,
    activityCode: "review_approved",
    sourceType: "product_review",
    sourceId: review.id,
  });
}

export async function awardMagicStarsForShare(
  db: D1Database,
  input: { accountId: string; channel: string; productId: string; actionId: string },
) {
  return awardMagicRewardActivity(db, {
    accountId: input.accountId,
    activityCode: "social_share",
    sourceType: "product_share",
    sourceId: input.actionId,
    metadata: { channel: input.channel, productId: input.productId },
  });
}

export async function saveCustomerBirthday(
  db: D1Database,
  accountId: string,
  birthday: { month: number; day: number },
) {
  const probe = new Date(Date.UTC(2024, birthday.month - 1, birthday.day));
  if (probe.getUTCMonth() !== birthday.month - 1 || probe.getUTCDate() !== birthday.day)
    throw new Error("Data aniversării nu este validă.");
  await db
    .prepare(
      `UPDATE review_accounts SET birth_month=?2,birth_day=?3
       WHERE id=?1 AND status='active'`,
    )
    .bind(accountId, birthday.month, birthday.day)
    .run();
  return awardBirthdayForAccount(db, accountId);
}

export async function awardBirthdayForAccount(db: D1Database, accountId: string, now = new Date()) {
  const birthday = await db
    .prepare("SELECT birth_month,birth_day FROM review_accounts WHERE id=?1 AND status='active'")
    .bind(accountId)
    .first<{ birth_month: number | null; birth_day: number | null }>();
  if (!birthday?.birth_month || !birthday.birth_day)
    return { awarded: false, stars: 0, limitReached: false };
  const today = bucharestDate(now);
  if (
    Number(today.slice(5, 7)) !== Number(birthday.birth_month) ||
    Number(today.slice(8, 10)) !== Number(birthday.birth_day)
  )
    return { awarded: false, stars: 0, limitReached: false };
  return awardMagicRewardActivity(db, {
    accountId,
    activityCode: "birthday_bonus",
    sourceType: "birthday",
    sourceId: today.slice(0, 4),
    now,
  });
}

export async function processBirthdayRewards(db: D1Database, now = new Date()) {
  const today = bucharestDate(now);
  const accounts = await db
    .prepare(
      `SELECT id FROM review_accounts
       WHERE status='active' AND birth_month=?1 AND birth_day=?2`,
    )
    .bind(Number(today.slice(5, 7)), Number(today.slice(8, 10)))
    .all<{ id: string }>();
  let awarded = 0;
  for (const account of accounts.results) {
    const result = await awardBirthdayForAccount(db, account.id, now);
    if (result.awarded) awarded += 1;
  }
  return awarded;
}

export async function magicRewardsDashboard(
  db: D1Database,
  account: { id: string; email: string },
): Promise<MagicRewardsDashboard> {
  await reconcileMagicStarsAccount(db, account);
  const [cfg, balance, activities, birthday, ledger, rewards, profile, calendar] =
    await Promise.all([
      program(db),
      db
        .prepare(
          `SELECT available_stars,lifetime_stars,redeemed_stars
         FROM magic_star_accounts WHERE review_account_id=?1`,
        )
        .bind(account.id)
        .first<{ available_stars: number; lifetime_stars: number; redeemed_stars: number }>(),
      listMagicRewardActivities(db, true),
      db
        .prepare("SELECT birth_month,birth_day FROM review_accounts WHERE id=?1")
        .bind(account.id)
        .first<{ birth_month: number | null; birth_day: number | null }>(),
      db
        .prepare(
          `SELECT l.id,l.delta,l.reason,l.source_type,l.source_id,
          COALESCE(activity.name,l.note) AS note,event.activity_code,l.created_at
         FROM magic_star_ledger l
         LEFT JOIN magic_reward_activity_events event
           ON l.source_type='reward_activity' AND event.id=l.source_id
         LEFT JOIN magic_reward_activities activity ON activity.code=event.activity_code
         WHERE l.review_account_id=?1
         ORDER BY l.created_at DESC LIMIT 50`,
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
    activities,
    birthday:
      birthday?.birth_month && birthday.birth_day
        ? { month: Number(birthday.birth_month), day: Number(birthday.birth_day) }
        : null,
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
  if (completed && cfg.enabled)
    await awardMagicRewardActivity(db, {
      accountId,
      activityCode: "gift_profile_completed",
      sourceType: "gift_profile",
      sourceId: accountId,
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
