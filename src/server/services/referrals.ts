type CustomerIdentity = {
  email?: string | null;
  phone?: string | null;
  customerId?: string | null;
};

type ReferralCodeRow = {
  id: string;
  campaign_id: string;
  advocate_customer_id: string;
  source_order_id: string;
  code: string;
  status: string;
  usage_limit: number;
  used_count: number;
  expires_at: string;
  friend_reward_bani: number;
  advocate_reward_bani: number;
  advocate_email: string | null;
  advocate_phone: string | null;
};

export type CheckoutCodeEvaluation = {
  kind: "referral" | "promotion";
  code: string;
  discountBani: number;
  label: string;
  promotionId: string;
  promotionCodeId: string | null;
  referralCodeId: string | null;
  advocateRewardBani: number;
};

export class PromotionCodeError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "PromotionCodeError";
  }
}

export function normalizePromotionCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function comparablePhone(value: string | null | undefined): string {
  const compact = (value ?? "").replace(/[^+\d]/g, "");
  if (/^0\d{9}$/.test(compact)) return `+40${compact.slice(1)}`;
  if (/^40\d{9}$/.test(compact)) return `+${compact}`;
  return compact;
}

function sameIdentity(identity: CustomerIdentity, row: ReferralCodeRow): boolean {
  const email = identity.email?.trim().toLowerCase();
  const phone = comparablePhone(identity.phone);
  return Boolean(
    (identity.customerId && identity.customerId === row.advocate_customer_id) ||
    (email && row.advocate_email && email === row.advocate_email.trim().toLowerCase()) ||
    (phone && row.advocate_phone && phone === comparablePhone(row.advocate_phone)),
  );
}

export async function evaluateCheckoutCode(
  db: D1Database,
  rawCode: string | null | undefined,
  subtotalBani: number,
  identity: CustomerIdentity = {},
): Promise<CheckoutCodeEvaluation | null> {
  if (!rawCode?.trim()) return null;
  const code = normalizePromotionCode(rawCode);
  if (!/^[A-Z0-9-]{4,40}$/.test(code)) {
    throw new PromotionCodeError("Codul promoțional nu are un format valid.", "CODE_INVALID");
  }
  if (subtotalBani <= 0) {
    throw new PromotionCodeError("Adaugă un produs înainte de aplicarea codului.", "CART_EMPTY");
  }

  const referral = await db
    .prepare(
      `SELECT rc.id,rc.campaign_id,rc.advocate_customer_id,rc.source_order_id,rc.code,
              rc.status,rc.usage_limit,rc.used_count,rc.expires_at,
              campaign.friend_reward_bani,campaign.advocate_reward_bani,
              customer.email AS advocate_email,customer.phone_e164 AS advocate_phone
       FROM referral_codes rc
       JOIN referral_campaigns campaign ON campaign.id=rc.campaign_id
       JOIN customers customer ON customer.id=rc.advocate_customer_id
       JOIN orders source_order ON source_order.id=rc.source_order_id
       WHERE rc.code=?1 COLLATE NOCASE
         AND campaign.status='active'
         AND campaign.trigger_status='delivered'
         AND source_order.fulfillment_status='delivered'
       LIMIT 1`,
    )
    .bind(code)
    .first<ReferralCodeRow>();

  if (referral) {
    if (
      referral.status !== "active" ||
      referral.used_count >= referral.usage_limit ||
      Date.parse(referral.expires_at) <= Date.now()
    ) {
      throw new PromotionCodeError("Codul de recomandare nu mai este disponibil.", "CODE_EXPIRED");
    }
    if (sameIdentity(identity, referral)) {
      throw new PromotionCodeError(
        "Codul de recomandare este pentru un prieten și nu poate fi folosit la propria comandă.",
        "SELF_REFERRAL",
      );
    }
    return {
      kind: "referral",
      code: referral.code.toUpperCase(),
      discountBani: Math.min(referral.friend_reward_bani, subtotalBani),
      label: "Cadou de recomandare · 15 lei",
      promotionId: "promotion_referral_friend_15",
      promotionCodeId: null,
      referralCodeId: referral.id,
      advocateRewardBani: referral.advocate_reward_bani,
    };
  }

  const promotion = await db
    .prepare(
      `SELECT pc.id AS code_id,pc.code,pc.status AS code_status,pc.usage_limit,pc.used_count,
              pc.assigned_customer_id,p.id AS promotion_id,p.name,p.promotion_type,p.value,
              p.status,p.starts_at,p.ends_at,p.usage_limit AS promotion_usage_limit,
              p.per_customer_limit
       FROM promotion_codes pc
       JOIN promotions p ON p.id=pc.promotion_id
       WHERE pc.code=?1 COLLATE NOCASE
       LIMIT 1`,
    )
    .bind(code)
    .first<Record<string, string | number | null>>();
  if (!promotion) {
    throw new PromotionCodeError("Codul promoțional nu există.", "CODE_NOT_FOUND");
  }
  const now = Date.now();
  if (
    promotion.code_status !== "active" ||
    promotion.status !== "active" ||
    (promotion.starts_at && Date.parse(String(promotion.starts_at)) > now) ||
    (promotion.ends_at && Date.parse(String(promotion.ends_at)) <= now) ||
    (promotion.usage_limit != null && Number(promotion.used_count) >= Number(promotion.usage_limit))
  ) {
    throw new PromotionCodeError("Codul promoțional nu mai este disponibil.", "CODE_EXPIRED");
  }
  if (promotion.promotion_type !== "fixed") {
    throw new PromotionCodeError("Acest tip de cod nu este disponibil în coș.", "CODE_UNSUPPORTED");
  }
  if (promotion.assigned_customer_id) {
    const identityProvided = Boolean(identity.customerId || identity.email || identity.phone);
    let assigned = identity.customerId === promotion.assigned_customer_id;
    if (!assigned && (identity.email || identity.phone)) {
      const owner = await db
        .prepare("SELECT email_normalized,phone_e164 FROM customers WHERE id=?1")
        .bind(promotion.assigned_customer_id)
        .first<{ email_normalized: string | null; phone_e164: string | null }>();
      assigned = Boolean(
        owner &&
        ((identity.email && owner.email_normalized === identity.email.trim().toLowerCase()) ||
          (identity.phone &&
            comparablePhone(owner.phone_e164) === comparablePhone(identity.phone))),
      );
    }
    if (identityProvided && !assigned) {
      throw new PromotionCodeError("Codul este asociat altui cont de client.", "CODE_NOT_ASSIGNED");
    }
  }
  const perCustomerLimit = Number(promotion.per_customer_limit ?? 0);
  if (perCustomerLimit > 0 && identity.customerId) {
    const usage = await db
      .prepare(
        `SELECT COUNT(*) AS count FROM promotion_redemptions
         WHERE promotion_id=?1 AND customer_id=?2 AND status IN ('reserved','consumed')`,
      )
      .bind(promotion.promotion_id, identity.customerId)
      .first<{ count: number }>();
    if (Number(usage?.count ?? 0) >= perCustomerLimit) {
      throw new PromotionCodeError("Codul a fost deja folosit.", "CUSTOMER_LIMIT_REACHED");
    }
  }
  return {
    kind: "promotion",
    code: String(promotion.code).toUpperCase(),
    discountBani: Math.min(Number(promotion.value), subtotalBani),
    label: String(promotion.name),
    promotionId: String(promotion.promotion_id),
    promotionCodeId: String(promotion.code_id),
    referralCodeId: null,
    advocateRewardBani: 0,
  };
}

function shareCode(): string {
  return `MAGIC-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

function rewardCode(): string {
  return `POVESTE-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

export type PostDeliveryReferralResult = {
  invitation: {
    code: string;
    email: string;
    expiresAt: string;
    friendRewardBani: number;
    advocateRewardBani: number;
  } | null;
  advocateReward: { code: string; email: string; valueBani: number } | null;
};

export async function issuePostDeliveryReferral(
  db: D1Database,
  orderId: string,
): Promise<PostDeliveryReferralResult> {
  const order = await db
    .prepare(
      `SELECT o.id,o.customer_id,o.customer_email,o.fulfillment_status
       FROM orders o WHERE o.id=?1`,
    )
    .bind(orderId)
    .first<{
      id: string;
      customer_id: string | null;
      customer_email: string | null;
      fulfillment_status: string;
    }>();
  if (!order || order.fulfillment_status !== "delivered" || !order.customer_id) {
    return { invitation: null, advocateReward: null };
  }

  let invitation: PostDeliveryReferralResult["invitation"] = null;
  const existing = await db
    .prepare("SELECT code,expires_at FROM referral_codes WHERE source_order_id=?1")
    .bind(orderId)
    .first<{ code: string; expires_at: string }>();
  if (!existing) {
    const campaign = await db
      .prepare(
        `SELECT id,code_valid_days,friend_usage_limit,friend_reward_bani,advocate_reward_bani
         FROM referral_campaigns
         WHERE status='active' AND trigger_status='delivered'
         ORDER BY created_at DESC LIMIT 1`,
      )
      .first<{
        id: string;
        code_valid_days: number;
        friend_usage_limit: number;
        friend_reward_bani: number;
        advocate_reward_bani: number;
      }>();
    if (campaign && order.customer_email) {
      const expiresAt = new Date(
        Date.now() + Number(campaign.code_valid_days) * 86_400_000,
      ).toISOString();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = shareCode();
        try {
          const result = await db
            .prepare(
              `INSERT OR IGNORE INTO referral_codes(
                 id,campaign_id,advocate_customer_id,source_order_id,code,status,
                 usage_limit,used_count,expires_at
               ) SELECT ?1,?2,?3,?4,?5,'active',?6,0,?7
                 WHERE EXISTS(SELECT 1 FROM orders WHERE id=?4 AND fulfillment_status='delivered')`,
            )
            .bind(
              crypto.randomUUID(),
              campaign.id,
              order.customer_id,
              orderId,
              code,
              campaign.friend_usage_limit,
              expiresAt,
            )
            .run();
          if (Number(result.meta.changes) === 1) {
            invitation = {
              code,
              email: order.customer_email,
              expiresAt,
              friendRewardBani: Number(campaign.friend_reward_bani),
              advocateRewardBani: Number(campaign.advocate_reward_bani),
            };
            break;
          }
          const concurrent = await db
            .prepare("SELECT code,expires_at FROM referral_codes WHERE source_order_id=?1")
            .bind(orderId)
            .first<{ code: string; expires_at: string }>();
          if (concurrent) break;
        } catch (error) {
          if (attempt === 4) throw error;
        }
      }
    }
  }

  const redemption = await db
    .prepare(
      `SELECT rr.id,rr.advocate_reward_bani,rc.advocate_customer_id,c.email
       FROM referral_redemptions rr
       JOIN referral_codes rc ON rc.id=rr.referral_code_id
       JOIN customers c ON c.id=rc.advocate_customer_id
       WHERE rr.referred_order_id=?1 AND rr.status='reserved'
       LIMIT 1`,
    )
    .bind(orderId)
    .first<{
      id: string;
      advocate_reward_bani: number;
      advocate_customer_id: string;
      email: string | null;
    }>();
  let advocateReward: PostDeliveryReferralResult["advocateReward"] = null;
  if (redemption?.email) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = rewardCode();
      const promotionCodeId = crypto.randomUUID();
      try {
        const [insertResult] = await db.batch([
          db
            .prepare(
              `INSERT INTO promotion_codes(
                 id,promotion_id,code,status,assigned_customer_id,usage_limit,used_count
               ) SELECT ?1,'promotion_referral_advocate_15',?2,'active',?3,1,0
                 WHERE EXISTS(SELECT 1 FROM referral_redemptions WHERE id=?4 AND status='reserved')`,
            )
            .bind(promotionCodeId, code, redemption.advocate_customer_id, redemption.id),
          db
            .prepare(
              `UPDATE referral_redemptions
               SET status='qualified',qualified_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
                   advocate_reward_promotion_code_id=?1
               WHERE id=?2 AND status='reserved'`,
            )
            .bind(promotionCodeId, redemption.id),
        ]);
        if (Number(insertResult.meta.changes) === 1) {
          advocateReward = {
            code,
            email: redemption.email,
            valueBani: Number(redemption.advocate_reward_bani),
          };
        }
        break;
      } catch (error) {
        if (attempt === 4) throw error;
      }
    }
  }
  return { invitation, advocateReward };
}
