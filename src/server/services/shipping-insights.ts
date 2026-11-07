import type { AdminShippingInsights, AdminShippingShipment } from "@/lib/admin-contracts";
import { getSmartShipTracking, smartShipTrackingUrl } from "@/server/integrations/smartship";
import { digestHex, type CommerceEnv } from "@/server/integrations/provider-runtime";

type DbRow = Record<string, string | number | null>;

const SUMMARY_SQL = `SELECT COUNT(*) AS total,
  COALESCE(SUM(status='label_created'),0) AS labels,
  COALESCE(SUM(status IN ('picked_up','in_transit')),0) AS in_transit,
  COALESCE(SUM(status='delivered'),0) AS delivered,
  COALESCE(SUM(status IN ('exception','returned')),0) AS exceptions,
  COALESCE(SUM(status='cancelled'),0) AS cancelled,
  COALESCE(SUM(status IN ('label_created','picked_up','in_transit')
    AND julianday('now')-julianday(updated_at)>2),0) AS stale,
  ROUND(AVG(CASE WHEN delivered_at IS NOT NULL AND shipped_at IS NOT NULL
    THEN (julianday(delivered_at)-julianday(shipped_at))*24 END),1) AS delivery_hours
  FROM shipments WHERE provider='smartship' AND awb IS NOT NULL`;

const QUOTES_SQL = `SELECT COUNT(*) AS quotes_30d,
  COALESCE(SUM(selected_at IS NOT NULL),0) AS selected_30d,
  ROUND(AVG(amount_bani)/100.0,2) AS average_quote_ron
  FROM shipping_quotes WHERE provider='smartship'
    AND julianday(created_at)>=julianday('now')-30`;

function mapSummary(
  summary: Record<string, unknown>,
  quotes: Record<string, unknown>,
): AdminShippingInsights["summary"] {
  const count = (key: string) => Number(summary[key] ?? 0);
  return {
    total: count("total"),
    labels: count("labels"),
    inTransit: count("in_transit"),
    delivered: count("delivered"),
    exceptions: count("exceptions"),
    cancelled: count("cancelled"),
    stale: count("stale"),
    averageDeliveryHours: summary.delivery_hours == null ? null : count("delivery_hours"),
    quotes30d: Number(quotes.quotes_30d ?? 0),
    selectedQuotes30d: Number(quotes.selected_30d ?? 0),
    averageQuoteRon: quotes.average_quote_ron == null ? null : Number(quotes.average_quote_ron),
  };
}

export async function getAdminShippingSummary(db: D1Database) {
  const [summary, quotes] = await db.batch<DbRow>([
    db.prepare(SUMMARY_SQL),
    db.prepare(QUOTES_SQL),
  ]);
  return mapSummary(summary.results[0] ?? {}, quotes.results[0] ?? {});
}

export async function getAdminShippingInsightsData(db: D1Database): Promise<AdminShippingInsights> {
  const [summaryResult, quoteResult, shipmentResult, eventResult, courierResult] =
    await db.batch<DbRow>([
      db.prepare(SUMMARY_SQL),
      db.prepare(QUOTES_SQL),
      db.prepare(`SELECT s.id,s.order_id,o.order_number,s.awb,s.status,s.tracking_url,
        q.courier_name,s.created_at,s.updated_at,s.delivered_at
      FROM shipments s JOIN orders o ON o.id=s.order_id
      LEFT JOIN shipping_quotes q ON q.id=o.shipping_quote_id
      WHERE s.provider='smartship' AND s.awb IS NOT NULL
      ORDER BY CASE WHEN s.status IN ('label_created','picked_up','in_transit','exception') THEN 0 ELSE 1 END,
        s.updated_at DESC LIMIT 20`),
      db.prepare(`SELECT e.shipment_id,e.status,e.description,e.location,e.occurred_at
      FROM shipment_events e JOIN shipments s ON s.id=e.shipment_id
      WHERE s.provider='smartship' AND s.id IN (
        SELECT id FROM shipments WHERE provider='smartship' AND awb IS NOT NULL
        ORDER BY CASE WHEN status IN ('label_created','picked_up','in_transit','exception')
          THEN 0 ELSE 1 END, updated_at DESC LIMIT 20
      )
      ORDER BY e.occurred_at DESC LIMIT 100`),
      db.prepare(`SELECT COALESCE(q.courier_name,'Curier necunoscut') AS name, COUNT(*) AS count
      FROM shipments s JOIN orders o ON o.id=s.order_id
      LEFT JOIN shipping_quotes q ON q.id=o.shipping_quote_id
      WHERE s.provider='smartship' AND s.awb IS NOT NULL
      GROUP BY COALESCE(q.courier_name,'Curier necunoscut')
      ORDER BY count DESC, name ASC LIMIT 10`),
    ]);
  const summary = summaryResult.results[0] ?? {};
  const eventsByShipment = new Map<string, AdminShippingShipment["events"]>();
  for (const event of eventResult.results) {
    const id = String(event.shipment_id ?? "");
    const entries = eventsByShipment.get(id) ?? [];
    if (entries.length >= 5) continue;
    entries.push({
      status: String(event.status ?? ""),
      description: String(event.description ?? ""),
      location: String(event.location ?? ""),
      occurredAt: String(event.occurred_at ?? ""),
    });
    eventsByShipment.set(id, entries);
  }
  return {
    summary: mapSummary(summary, quoteResult.results[0] ?? {}),
    couriers: courierResult.results.map((row) => ({
      name: String(row.name ?? "Curier necunoscut"),
      count: Number(row.count ?? 0),
    })),
    shipments: shipmentResult.results.map((row) => ({
      id: String(row.id ?? ""),
      orderId: String(row.order_id ?? ""),
      orderNumber: String(row.order_number ?? ""),
      awb: String(row.awb ?? ""),
      status: String(row.status ?? ""),
      trackingUrl: smartShipTrackingUrl(row.tracking_url),
      courier: String(row.courier_name || "SmartShip"),
      createdAt: String(row.created_at ?? ""),
      updatedAt: String(row.updated_at ?? ""),
      deliveredAt: row.delivered_at == null ? null : String(row.delivered_at),
      events: eventsByShipment.get(String(row.id ?? "")) ?? [],
    })),
  };
}

export async function refreshSmartShipTracking(
  env: CommerceEnv,
  shipmentId: string,
  actorId: string,
) {
  const shipment = await env.DB.prepare(
    `SELECT id,order_id,awb,status FROM shipments
     WHERE id=?1 AND provider='smartship' AND awb IS NOT NULL`,
  )
    .bind(shipmentId)
    .first<{ id: string; order_id: string; awb: string; status: string }>();
  if (!shipment) throw new Error("Expedierea SmartShip nu există în magazin.");
  const tracking = await getSmartShipTracking(env, shipment.awb);
  const now = new Date().toISOString();
  const eventStatements = await Promise.all(
    tracking.events.map(async (event) => {
      const providerEventId = await digestHex(
        "SHA-256",
        `${shipment.id}|${event.date}|${event.eventId}|${event.description}|${event.locality}`,
      );
      return env.DB.prepare(
        `INSERT OR IGNORE INTO shipment_events
       (id,shipment_id,provider_event_id,status,description,location,occurred_at)
       VALUES(?1,?2,?3,?4,?5,?6,?7)`,
      ).bind(
        crypto.randomUUID(),
        shipment.id,
        providerEventId,
        "smartship_event",
        event.description,
        event.locality,
        event.date,
      );
    }),
  );
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE shipments SET status=?2,tracking_url=COALESCE(?3,tracking_url),
       shipped_at=CASE WHEN ?2='in_transit'
         THEN COALESCE(shipped_at,?4) ELSE shipped_at END,
       delivered_at=CASE WHEN ?2='delivered' THEN COALESCE(delivered_at,?4)
         ELSE delivered_at END,updated_at=?4 WHERE id=?1`,
    ).bind(shipment.id, tracking.status, tracking.trackingUrl, now),
    ...eventStatements,
    env.DB.prepare(
      `INSERT INTO audit_log(id,actor_admin_user_id,action,entity_type,entity_id,before_json,
       after_json,metadata_json) VALUES(?1,?2,'shipping.smartship_tracking.refresh',
       'shipment',?3,?4,?5,?6)`,
    ).bind(
      crypto.randomUUID(),
      actorId,
      shipment.id,
      JSON.stringify({ status: shipment.status }),
      JSON.stringify({ status: tracking.status, checkedAt: now }),
      JSON.stringify({ awb: shipment.awb, eventsReceived: tracking.events.length }),
    ),
  ]);
  return {
    shipmentId: shipment.id,
    status: tracking.status,
    checkedAt: now,
    eventsReceived: tracking.events.length,
  };
}
