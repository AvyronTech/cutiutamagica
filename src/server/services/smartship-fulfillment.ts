import {
  createSmartShipAwb,
  findSmartShipAwbByOrderId,
  resolveSmartShipCity,
} from "@/server/integrations/smartship";
import { credential } from "@/server/services/growth-settings";
import type { CommerceEnv } from "@/server/integrations/provider-runtime";

type Row = Record<string, string | number | null>;

export class FulfillmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FulfillmentError";
  }
}

async function orderForAwb(env: CommerceEnv, orderId: string, mode: "issue" | "reconcile") {
  const row = await env.DB.prepare(
    `SELECT o.id,o.order_number,o.order_status,o.payment_status,
            o.payment_method_requested AS payment_method,
            o.shipping_option_requested,o.total_bani,o.customer_name,o.customer_email,
            o.customer_phone_e164,a.line1,a.city,a.county,a.postal_code,
            q.courier_id,q.own_contract,q.locker_id,
            p.validation_status,p.sender_name,p.sender_address,p.sender_email,p.sender_phone,
            p.sender_city_id,p.sender_sector,p.default_weight_g,p.default_length_cm,
            p.default_width_cm,p.default_height_cm,
            (SELECT COALESCE(SUM(quantity),0) FROM order_items WHERE order_id=o.id) AS quantity
     FROM orders o
     JOIN order_addresses a ON a.order_id=o.id AND a.address_type='shipping'
     JOIN shipping_quotes q ON q.id=o.shipping_quote_id AND q.order_id=o.id
     JOIN shipping_policy_configs p ON p.code='RO_STANDARD'
     WHERE o.id=?1 AND o.channel_id='channel_website' AND q.provider='smartship'`,
  )
    .bind(orderId)
    .first<Row>();
  if (!row) throw new FulfillmentError("Comanda nu are o ofertă SmartShip selectată.");
  if (
    mode === "issue" &&
    !["pending", "confirmed", "processing"].includes(String(row.order_status))
  )
    throw new FulfillmentError("Comanda nu este eligibilă pentru expediere.");
  if (mode === "issue" && row.payment_method === "card" && row.payment_status !== "paid")
    throw new FulfillmentError("Plata online trebuie confirmată înainte de AWB.");
  if (
    mode === "issue" &&
    row.payment_method !== "card" &&
    row.payment_method !== "cash_on_delivery"
  )
    throw new FulfillmentError("Metoda de plată necesită verificare manuală înainte de AWB.");
  if (
    mode === "issue" &&
    (row.validation_status !== "verified" ||
      !row.sender_name ||
      !row.sender_address ||
      !row.sender_phone ||
      !row.sender_city_id ||
      Number(row.courier_id) <= 0 ||
      Number(row.quantity) <= 0)
  )
    throw new FulfillmentError("Oferta sau datele expeditorului SmartShip sunt incomplete.");
  if (!(await credential(env, "smartship")))
    throw new FulfillmentError("Cheia SmartShip nu este configurată.");
  const existing = await env.DB.prepare(
    "SELECT awb FROM shipments WHERE order_id=?1 AND provider='smartship' AND awb IS NOT NULL LIMIT 1",
  )
    .bind(orderId)
    .first<{ awb: string }>();
  if (existing) throw new FulfillmentError(`AWB-ul ${existing.awb} există deja pentru comandă.`);
  return row;
}

async function saveIssued(
  env: CommerceEnv,
  row: Row,
  actorId: string,
  awb: string,
  trackingUrl: string | null,
) {
  const orderId = String(row.id);
  const shipmentId = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO shipments(id,order_id,shipping_method_id,provider,external_shipment_id,awb,
        status,tracking_url,parcel_count,weight_g,created_at,updated_at)
       VALUES(?1,?2,?3,'smartship',?4,?4,'label_created',?5,1,?6,?7,?7)`,
    ).bind(
      shipmentId,
      orderId,
      row.shipping_option_requested === "easybox"
        ? "shipping_smartship_locker"
        : "shipping_smartship_home",
      awb,
      trackingUrl,
      Number(row.default_weight_g) * Number(row.quantity),
      now,
    ),
    env.DB.prepare(
      `UPDATE smartship_awb_requests SET status='issued',awb=?2,last_error_code=NULL,updated_at=?3
       WHERE order_id=?1 AND status IN ('issuing','needs_review')`,
    ).bind(orderId, awb, now),
    env.DB.prepare(
      `INSERT INTO order_events(id,order_id,event_type,actor_type,actor_id,message,metadata_json)
       VALUES(?1,?2,'shipping.awb.issued','admin',?3,'AWB SmartShip emis',?4)`,
    ).bind(crypto.randomUUID(), orderId, actorId, JSON.stringify({ awb, shipmentId })),
    env.DB.prepare(
      `INSERT INTO audit_log(id,actor_admin_user_id,action,entity_type,entity_id,after_json,metadata_json)
       VALUES(?1,?2,'shipping.awb.issue','shipment',?3,?4,?5)`,
    ).bind(
      crypto.randomUUID(),
      actorId,
      shipmentId,
      JSON.stringify({ orderId, awb }),
      JSON.stringify({ provider: "smartship" }),
    ),
  ]);
  return { awb, trackingUrl };
}

export async function issueSmartShipAwb(env: CommerceEnv, orderId: string, actorId: string) {
  const row = await orderForAwb(env, orderId, "issue");
  const cityId = await resolveSmartShipCity(env, String(row.county ?? ""), String(row.city));
  const claim = await env.DB.prepare(
    `INSERT INTO smartship_awb_requests(order_id,status,requested_by)
     VALUES(?1,'issuing',?2) ON CONFLICT(order_id) DO NOTHING`,
  )
    .bind(orderId, actorId)
    .run();
  if (claim.meta.changes !== 1)
    throw new FulfillmentError(
      "Emiterea AWB a fost deja inițiată. Verifică starea înainte de o nouă acțiune.",
    );
  try {
    const quantity = Number(row.quantity);
    const result = await createSmartShipAwb(env, {
      courierId: Number(row.courier_id),
      useOwnContract: Number(row.own_contract) === 1,
      sender: {
        name: String(row.sender_name),
        address: String(row.sender_address),
        email: String(row.sender_email ?? ""),
        phone: String(row.sender_phone),
        cityId: Number(row.sender_city_id),
        sector: Number(row.sender_sector ?? 0),
      },
      recipient: {
        name: String(row.customer_name),
        address: String(row.line1),
        email: String(row.customer_email ?? ""),
        phone: String(row.customer_phone_e164),
        cityId,
        sector: /^0[1-6]\d{4}$/.test(String(row.postal_code ?? ""))
          ? Number(String(row.postal_code)[1])
          : 0,
      },
      content: {
        packageContent: "Cutiuțe muzicale",
        parcels: 1,
        weightKg: (Number(row.default_weight_g) * quantity) / 1000,
        lengthCm: Number(row.default_length_cm),
        widthCm: Number(row.default_width_cm),
        heightCm: Number(row.default_height_cm) * quantity,
        cashOnDeliveryRon:
          row.payment_method === "cash_on_delivery" ? Number(row.total_bani) / 100 : 0,
        lockerId: row.shipping_option_requested === "easybox" ? Number(row.locker_id) : undefined,
        orderId: String(row.order_number),
      },
    });
    return await saveIssued(env, row, actorId, result.awb, result.trackingUrl);
  } catch (error) {
    await env.DB.prepare(
      `UPDATE smartship_awb_requests SET status='needs_review',last_error_code=?2,
       updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE order_id=?1 AND status='issuing'`,
    )
      .bind(orderId, error instanceof Error ? error.name : "UNKNOWN")
      .run();
    throw new FulfillmentError(
      "Nu am confirmarea emiterii AWB. Verifică la SmartShip după numărul comenzii; nu relansa emiterea.",
    );
  }
}

export async function reconcileSmartShipAwb(env: CommerceEnv, orderId: string, actorId: string) {
  const row = await orderForAwb(env, orderId, "reconcile");
  const request = await env.DB.prepare(
    "SELECT status FROM smartship_awb_requests WHERE order_id=?1",
  )
    .bind(orderId)
    .first<{ status: string }>();
  if (!request) throw new FulfillmentError("Nu există o cerere AWB de verificat.");
  const result = await findSmartShipAwbByOrderId(env, String(row.order_number));
  if (!result)
    throw new FulfillmentError(
      "SmartShip nu confirmă încă un AWB. Verifică manual înainte de orice reemitere.",
    );
  return saveIssued(env, row, actorId, result.awb, result.trackingUrl);
}
