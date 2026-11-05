import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertPermission, requireAdminAuth } from "@/lib/admin-auth";

const listInput = z.object({
  page: z.number().int().min(0).max(1000).default(0),
  search: z.string().trim().max(80).default(""),
});
const detailInput = z.object({ customerId: z.string().min(1).max(128) });

export const getAdminCustomers = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .validator(listInput)
  .handler(async ({ context, data }) => {
    assertPermission(context.admin, "customers.read");
    const search = data.search.replaceAll(/[%_]/g, "");
    const where = search ? "AND (c.email LIKE ?1 OR c.full_name LIKE ?1)" : "";
    const pattern = `%${search}%`;
    const [summary, rows] = await Promise.all([
      env.DB.prepare(
        `SELECT
          (SELECT COUNT(*) FROM customers WHERE status!='anonymized') AS customers,
          (SELECT COUNT(*) FROM review_accounts WHERE status='active') AS members,
          (SELECT COUNT(*) FROM orders WHERE order_status!='cancelled') AS orders,
          (SELECT COALESCE(SUM(total_bani),0) FROM orders WHERE payment_status='paid') AS paid_bani,
          (SELECT COUNT(*) FROM gift_calendar_events WHERE active=1) AS moments,
          (SELECT COUNT(*) FROM gift_reminder_dispatches WHERE status='sent') AS reminders_sent`,
      ).first<Record<string, number>>(),
      env.DB.prepare(
        `SELECT c.id,c.full_name AS fullName,c.email,c.customer_type AS customerType,
                c.status,c.order_count AS orderCount,c.lifetime_value_bani AS lifetimeValueBani,
                c.last_order_at AS lastOrderAt,c.created_at AS createdAt,
                a.id AS accountId,COALESCE(s.available_stars,0) AS availableStars,
                (SELECT COUNT(*) FROM gift_calendar_events e WHERE e.review_account_id=a.id AND e.active=1) AS moments
         FROM customers c
         LEFT JOIN review_accounts a ON a.customer_id=c.id AND a.status='active'
         LEFT JOIN magic_star_accounts s ON s.review_account_id=a.id
         WHERE c.status!='anonymized' ${where}
         ORDER BY c.last_order_at DESC NULLS LAST,c.created_at DESC LIMIT 51 OFFSET ?${search ? 2 : 1}`,
      )
        .bind(...(search ? [pattern, data.page * 50] : [data.page * 50]))
        .all<Record<string, string | number | null>>(),
    ]);
    return {
      summary,
      customers: rows.results.slice(0, 50),
      hasMore: rows.results.length > 50,
      page: data.page,
    };
  });

export const getAdminCustomerDetail = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .validator(detailInput)
  .handler(async ({ context, data }) => {
    assertPermission(context.admin, "customers.read");
    const customer = await env.DB.prepare(
      `SELECT c.id,c.full_name AS fullName,c.email,c.phone_e164 AS phone,
              c.customer_type AS customerType,c.status,c.order_count AS orderCount,
              c.lifetime_value_bani AS lifetimeValueBani,c.created_at AS createdAt,
              a.id AS accountId,COALESCE(s.available_stars,0) AS availableStars
       FROM customers c
       LEFT JOIN review_accounts a ON a.customer_id=c.id AND a.status='active'
       LEFT JOIN magic_star_accounts s ON s.review_account_id=a.id
       WHERE c.id=?1 AND c.status!='anonymized'`,
    )
      .bind(data.customerId)
      .first<Record<string, string | number | null>>();
    if (!customer) throw new Error("Clientul nu a fost găsit.");
    const [orders, moments, activity] = await Promise.all([
      env.DB.prepare(
        `SELECT order_number AS orderNumber,order_status AS orderStatus,
                payment_status AS paymentStatus,fulfillment_status AS fulfillmentStatus,
                total_bani AS totalBani,currency,placed_at AS placedAt
         FROM orders WHERE customer_id=?1 ORDER BY placed_at DESC LIMIT 50`,
      )
        .bind(data.customerId)
        .all<Record<string, string | number | null>>(),
      env.DB.prepare(
        `SELECT occasion,person_name AS personName,event_month AS eventMonth,
                event_day AS eventDay,email_enabled AS emailEnabled
         FROM gift_calendar_events WHERE review_account_id=?1 AND active=1
         ORDER BY event_month,event_day`,
      )
        .bind(customer.accountId ?? "")
        .all<Record<string, string | number | null>>(),
      env.DB.prepare(
        `SELECT delta,reason,created_at AS createdAt FROM magic_star_ledger
         WHERE review_account_id=?1 ORDER BY created_at DESC LIMIT 20`,
      )
        .bind(customer.accountId ?? "")
        .all<Record<string, string | number | null>>(),
    ]);
    return {
      customer,
      orders: orders.results,
      moments: moments.results,
      activity: activity.results,
    };
  });
