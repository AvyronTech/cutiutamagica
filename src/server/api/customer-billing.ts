import { currentReviewer, reviewJson } from "@/server/review-accounts";

type BillingAccount = { customer_id: string | null };

export async function handleCustomerBilling(request: Request, env: Env): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (path !== "/api/v1/customer/billing") return null;
  if (request.method !== "GET") return reviewJson({ error: { message: "Metodă nepermisă." } }, 405);
  const reviewer = await currentReviewer(request, env);
  if (!reviewer) return reviewJson({ error: { message: "Autentificare necesară." } }, 401);
  const account = await env.DB.prepare(
    "SELECT customer_id FROM review_accounts WHERE id=?1 AND status='active'",
  )
    .bind(reviewer.id)
    .first<BillingAccount>();
  if (!account?.customer_id)
    return reviewJson({ data: { orders: [], paymentMethods: [], subscriptions: [] } });

  const results = await env.DB.batch([
    env.DB.prepare(
      `SELECT order_number AS orderNumber,order_status AS orderStatus,
              payment_status AS paymentStatus,total_bani AS totalBani,currency,placed_at AS placedAt
       FROM orders WHERE customer_id=?1 ORDER BY placed_at DESC LIMIT 20`,
    ).bind(account.customer_id),
    env.DB.prepare(
      `SELECT id,provider,method_type AS methodType,display_label AS displayLabel,
              brand,last4,expiry_month AS expiryMonth,expiry_year AS expiryYear,
              is_default AS isDefault,status
       FROM customer_payment_methods
       WHERE customer_id=?1 AND status IN ('active','expired')
       ORDER BY is_default DESC,updated_at DESC`,
    ).bind(account.customer_id),
    env.DB.prepare(
      `SELECT s.id,s.provider,s.status,s.current_period_end AS currentPeriodEnd,
              s.cancel_at_period_end AS cancelAtPeriodEnd,p.label,p.unit_amount_bani AS unitAmountBani,
              p.currency,p.interval_unit AS intervalUnit,p.interval_count AS intervalCount,
              service.name AS serviceName
       FROM billing_subscriptions s
       JOIN billing_prices p ON p.id=s.billing_price_id
       LEFT JOIN service_offerings service ON service.id=p.service_offering_id
       WHERE s.customer_id=?1 AND s.status NOT IN ('cancelled','expired')
       ORDER BY s.updated_at DESC`,
    ).bind(account.customer_id),
  ]);
  return reviewJson({
    data: {
      orders: results[0].results,
      paymentMethods: results[1].results,
      subscriptions: results[2].results,
    },
  });
}
