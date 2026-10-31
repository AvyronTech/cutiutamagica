import { currentReviewer, reviewJson, sameOrigin } from "@/server/review-accounts";
import { boundedJson } from "./bounded-json";
import { z } from "zod";
import {
  createStripeCardSetup,
  removeStripeCard,
  stripeCardReady,
} from "../services/customer-stripe-cards";
import { ProviderError } from "../integrations/provider-runtime";

type BillingAccount = { customer_id: string | null };

export async function handleCustomerBilling(request: Request, env: Env): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (
    path !== "/api/v1/customer/billing" &&
    path !== "/api/v1/customer/billing/cards/setup" &&
    !/^\/api\/v1\/customer\/billing\/cards\/[a-f0-9-]{36}$/.test(path)
  )
    return null;
  const reviewer = await currentReviewer(request, env);
  if (!reviewer) return reviewJson({ error: { message: "Autentificare necesară." } }, 401);
  const account = await env.DB.prepare(
    "SELECT customer_id FROM review_accounts WHERE id=?1 AND status='active'",
  )
    .bind(reviewer.id)
    .first<BillingAccount>();
  if (!account?.customer_id)
    return reviewJson({
      data: {
        orders: [],
        orderPage: 0,
        hasMoreOrders: false,
        paymentMethods: [],
        subscriptions: [],
        cardSavingEnabled: false,
      },
    });

  if (request.method !== "GET") {
    try {
      sameOrigin(request);
      if (path === "/api/v1/customer/billing/cards/setup" && request.method === "POST") {
        z.object({ consent: z.literal(true) }).parse(await boundedJson(request, 1_000));
        return reviewJson({
          data: await createStripeCardSetup(env, {
            id: reviewer.id,
            email: reviewer.email,
            customerId: account.customer_id,
          }),
        });
      }
      const methodId = path.split("/").at(-1) ?? "";
      if (request.method === "DELETE" && path !== "/api/v1/customer/billing") {
        await removeStripeCard(env, account.customer_id, methodId);
        return reviewJson({ data: { removed: true } });
      }
      return reviewJson({ error: { message: "Metodă nepermisă." } }, 405);
    } catch (error) {
      const status = error instanceof ProviderError ? error.status : 400;
      const message =
        error instanceof ProviderError
          ? error.code === "STRIPE_CARD_NOT_READY"
            ? "Salvarea cardurilor nu este disponibilă momentan."
            : request.method === "DELETE"
              ? "Cardul nu poate fi eliminat acum. Încearcă din nou."
              : "Pagina securizată pentru card nu poate fi deschisă acum. Încearcă din nou."
          : error instanceof Error
            ? error.message
            : "Operațiunea nu a reușit.";
      return reviewJson({ error: { message } }, status);
    }
  }
  if (path !== "/api/v1/customer/billing")
    return reviewJson({ error: { message: "Metodă nepermisă." } }, 405);

  const rawPage = Number(new URL(request.url).searchParams.get("page") ?? 0);
  const page = Number.isInteger(rawPage) && rawPage >= 0 && rawPage <= 1000 ? rawPage : 0;
  const results = await env.DB.batch([
    env.DB.prepare(
      `SELECT o.order_number AS orderNumber,o.order_status AS orderStatus,
              o.fulfillment_status AS fulfillmentStatus,o.payment_status AS paymentStatus,
              o.total_bani AS totalBani,o.currency,o.placed_at AS placedAt,
              (SELECT json_group_array(json_object(
                'name',i.product_name,'quantity',i.quantity,'totalBani',i.line_total_bani
              )) FROM order_items i WHERE i.order_id=o.id) AS itemsJson
       FROM orders o WHERE o.customer_id=?1 ORDER BY o.placed_at DESC,o.id DESC LIMIT 21 OFFSET ?2`,
    ).bind(account.customer_id, page * 20),
    env.DB.prepare(
      `SELECT id,provider,method_type AS methodType,display_label AS displayLabel,
              brand,last4,expiry_month AS expiryMonth,expiry_year AS expiryYear,
              is_default AS isDefault,status
       FROM customer_payment_methods
       WHERE customer_id=?1 AND status='active'
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
      orders: results[0].results.slice(0, 20).map((value) => {
        const { itemsJson, ...order } = value as Record<string, unknown>;
        return {
          ...order,
          items: JSON.parse(String(itemsJson ?? "[]")) as Array<{
            name: string;
            quantity: number;
            totalBani: number;
          }>,
        };
      }),
      orderPage: page,
      hasMoreOrders: results[0].results.length > 20,
      paymentMethods: results[1].results,
      subscriptions: results[2].results,
      cardSavingEnabled: await stripeCardReady(env),
    },
  });
}
