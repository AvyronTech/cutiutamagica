import { analyticsPeriod, type AnalyticsDays } from "@/lib/analytics-report";
import { readTrafficOverview } from "./traffic-overview";
import { readSetting } from "./growth-settings";
import { trafficSettingsSchema } from "@/lib/growth-contracts";

type Row = Record<string, string | number | null>;
const n = (row: Row, key: string) => Number(row[key] ?? 0);
// A pending card payment is a checkout attempt, not a confirmed sale.
const eligible = `o.order_status!='draft' AND NOT (o.order_status='pending' AND COALESCE(o.payment_method_requested,'')='card' AND o.paid_bani=0)`;
const valid = `o.order_status!='cancelled'`;
const customerKey = `COALESCE('id:'||o.customer_id,'email:'||lower(NULLIF(o.customer_email,'')),'phone:'||o.customer_phone_e164)`;
export async function readCommerceOverview(db: D1Database, days: AnalyticsDays, now = new Date()) {
  const period = analyticsPeriod(days, now);
  const within = `julianday(o.placed_at)>=julianday(?1) AND julianday(o.placed_at)<julianday(?2) AND ${eligible}`;
  const scoped = (sql: string) => db.prepare(sql).bind(period.from, period.until);
  const [totals, money, daily, channels, products, delivery, operations, inventory] =
    await db.batch<Row>([
      scoped(`SELECT COUNT(*) AS total,SUM(CASE WHEN ${valid} THEN 1 ELSE 0 END) AS accepted,
      SUM(CASE WHEN o.order_status='cancelled' THEN 1 ELSE 0 END) AS cancelled,
      SUM(CASE WHEN ${valid} AND sc.code='website' THEN 1 ELSE 0 END) AS website_orders,
      COUNT(DISTINCT CASE WHEN ${valid} THEN ${customerKey} END) AS customers,
      SUM(CASE WHEN ${valid} AND o.fulfillment_status='returned' THEN 1 ELSE 0 END) AS returned
      FROM orders o JOIN sales_channels sc ON sc.id=o.channel_id WHERE ${within}`),
      scoped(`SELECT o.currency,COUNT(*) AS records,
      SUM(CASE WHEN ${valid} THEN 1 ELSE 0 END) AS orders,
      SUM(CASE WHEN ${valid} THEN o.total_bani-o.refunded_bani ELSE 0 END)/100.0 AS ordered,
      SUM(o.paid_bani-o.refunded_bani)/100.0 AS collected,
      SUM(o.refunded_bani)/100.0 AS refunded,
      SUM(CASE WHEN ${valid} THEN o.discount_bani ELSE 0 END)/100.0 AS discounts,
      SUM(CASE WHEN ${valid} THEN o.shipping_bani ELSE 0 END)/100.0 AS shipping,
      CASE WHEN SUM(CASE WHEN ${valid} THEN 1 ELSE 0 END)>0 AND SUM(CASE WHEN ${valid} AND o.estimated_cost_bani IS NULL THEN 1 ELSE 0 END)=0 THEN SUM(CASE WHEN ${valid} THEN o.estimated_cost_bani ELSE 0 END)/100.0 END AS cost
      FROM orders o WHERE ${within} GROUP BY o.currency ORDER BY o.currency`),
      scoped(`SELECT date(o.placed_at) AS day,o.currency,COUNT(*) AS orders,
      SUM(o.total_bani-o.refunded_bani)/100.0 AS ordered
      FROM orders o WHERE ${within} AND ${valid} GROUP BY day,o.currency ORDER BY day,o.currency`),
      scoped(`SELECT sc.id,sc.name,o.currency,COUNT(*) AS orders,SUM(o.total_bani-o.refunded_bani)/100.0 AS ordered
      FROM orders o JOIN sales_channels sc ON sc.id=o.channel_id WHERE ${within} AND ${valid}
      GROUP BY sc.id,o.currency ORDER BY orders DESC,sc.name`),
      scoped(`SELECT COALESCE(p.id,oi.product_id,oi.sku) AS id,MAX(COALESCE(p.name,oi.product_name)) AS name,
      o.currency,SUM(oi.quantity) AS units,SUM(oi.line_total_bani)/100.0 AS value,
      CASE WHEN COUNT(oi.unit_cost_bani)=COUNT(*) THEN SUM(oi.unit_cost_bani*oi.quantity)/100.0 END AS cost
      FROM order_items oi JOIN orders o ON o.id=oi.order_id LEFT JOIN products p ON p.id=oi.product_id
      WHERE ${within} AND ${valid} GROUP BY COALESCE(p.id,oi.product_id,oi.sku),o.currency
      ORDER BY units DESC,value DESC LIMIT 10`),
      scoped(`SELECT COALESCE((SELECT COALESCE(sm.name,s.provider) FROM shipments s
      LEFT JOIN shipping_methods sm ON sm.id=s.shipping_method_id WHERE s.order_id=o.id
      ORDER BY s.created_at DESC,s.id DESC LIMIT 1),'Nealocată') AS name,COUNT(*) AS orders
      FROM orders o WHERE ${within} AND ${valid} GROUP BY name ORDER BY orders DESC,name`),
      db.prepare(`SELECT
      (SELECT COUNT(*) FROM orders o WHERE ${eligible} AND o.order_status IN ('pending','confirmed','processing')) AS openOrders,
      (SELECT COUNT(*) FROM orders WHERE payment_status='failed' AND order_status NOT IN ('draft','cancelled')) AS failedPayments,
      (SELECT COUNT(*) FROM return_requests WHERE status NOT IN ('closed','cancelled','rejected','refunded')) AS openReturns,
      (SELECT COUNT(*) FROM sync_failures WHERE resolved_at IS NULL) AS syncFailures,
      (SELECT COUNT(*) FROM approval_requests WHERE status='pending' AND (expires_at IS NULL OR expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))) AS approvals,
      (SELECT COUNT(*) FROM social_posts WHERE status='review') AS socialReview,
      (SELECT COUNT(*) FROM outbox_events WHERE status IN ('failed','dead_letter')) AS failedEvents,
      (SELECT COUNT(*) FROM newsletter_subscribers WHERE status='active') AS subscribers`),
      db.prepare(`WITH quantities AS (
        SELECT pv.product_id,SUM(il.on_hand_quantity) AS physical,SUM(il.reserved_quantity) AS reserved,SUM(il.safety_stock_quantity) AS safety
        FROM product_variants pv JOIN inventory_levels il ON il.variant_id=pv.id
        JOIN stock_locations sl ON sl.id=il.location_id AND sl.active=1 WHERE pv.status='active' GROUP BY pv.product_id
      ) SELECT COUNT(*) AS tracked,COALESCE(SUM(ap.available_quantity),0) AS available,
        COALESCE(SUM(CASE WHEN ap.available_quantity=0 THEN 1 ELSE 0 END),0) AS empty,
        COALESCE(SUM(CASE WHEN ap.available_quantity BETWEEN 1 AND 3 THEN 1 ELSE 0 END),0) AS low,
        COALESCE(SUM(q.physical),0) AS physical,COALESCE(SUM(q.reserved),0) AS reserved,COALESCE(SUM(q.safety),0) AS safety
        FROM v_admin_product_catalog ap LEFT JOIN quantities q ON q.product_id=ap.id WHERE ap.has_untracked_inventory=0`),
    ]);
  const total = totals.results[0] ?? {};
  return {
    period,
    summary: {
      total: n(total, "total"),
      orders: n(total, "accepted"),
      websiteOrders: n(total, "website_orders"),
      cancelled: n(total, "cancelled"),
      customers: n(total, "customers"),
      returned: n(total, "returned"),
    },
    money: money.results.map((r) => ({
      currency: String(r.currency),
      orders: n(r, "orders"),
      ordered: n(r, "ordered"),
      collected: n(r, "collected"),
      refunded: n(r, "refunded"),
      discounts: n(r, "discounts"),
      shipping: n(r, "shipping"),
      knownCost: r.cost == null ? null : n(r, "cost"),
    })),
    daily: daily.results.map((r) => ({
      day: String(r.day),
      currency: String(r.currency),
      orders: n(r, "orders"),
      ordered: n(r, "ordered"),
    })),
    channels: channels.results.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      currency: String(r.currency),
      orders: n(r, "orders"),
      ordered: n(r, "ordered"),
    })),
    products: products.results.map((r) => ({
      id: String(r.id),
      name: String(r.name),
      currency: String(r.currency),
      units: n(r, "units"),
      value: n(r, "value"),
      knownCost: r.cost == null ? null : n(r, "cost"),
    })),
    delivery: delivery.results.map((r) => ({ name: String(r.name), orders: n(r, "orders") })),
    operations: operations.results[0] ?? {},
    inventory: inventory.results[0] ?? {},
  };
}
export async function readAnalyticsOverview(db: D1Database, days: AnalyticsDays, now = new Date()) {
  const [commerce, traffic, settings] = await Promise.all([
    readCommerceOverview(db, days, now),
    readTrafficOverview(db, now, days),
    readSetting(db, "traffic", trafficSettingsSchema),
  ]);
  // Historical properties remain in D1, but do not silently add to the selected property's totals.
  return {
    days,
    commerce,
    traffic: {
      ...traffic,
      imported: traffic.imported.filter(
        (r) =>
          r.property_id === (r.source === "gsc" ? settings.gscProperty : settings.gaPropertyId),
      ),
    },
    properties: { ga4: settings.gaPropertyId, gsc: settings.gscProperty },
    generatedAt: now.toISOString(),
  };
}
