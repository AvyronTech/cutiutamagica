import { z } from "zod";
import { bani } from "../integrations/trendyol";
import {
  emagAttachments,
  emagCredentials,
  emagId,
  emagRequest,
  getEmagOrder,
} from "../integrations/emag";
import { digestHex, ProviderError, type CommerceEnv } from "../integrations/provider-runtime";

const stamp = z.string().regex(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/);
const text = z.string().trim().max(300).nullish();
const zeroOrOne = z
  .union([z.literal(0), z.literal(1), z.literal("0"), z.literal("1")])
  .transform(Number);
const product = z.object({
  id: emagId,
  ext_part_number: z.string().regex(/^[\w.-]{1,100}$/),
  quantity: z.coerce.number().int().min(0).max(100),
  sale_price: z.union([z.string(), z.number()]),
  status: zeroOrOne,
  currency: z.literal("RON").optional(),
  product_voucher_split: z.array(z.unknown()).nullish(),
  recycle_warranties: z.array(z.unknown()).nullish(),
  campaign: z.object({ id: emagId, name: text }).nullish(),
});
const orderSchema = z.object({
  id: emagId,
  type: z.coerce.number().pipe(z.literal(3)),
  status: z.coerce.number().int().min(0).max(5),
  is_complete: zeroOrOne,
  payment_status: zeroOrOne,
  payment_mode_id: z.coerce.number().int().min(1).max(3),
  date: stamp,
  modified: stamp,
  shipping_tax: z.union([z.string(), z.number()]),
  delivery_mode: z.enum(["courier", "pickup"]),
  vouchers: z.array(z.unknown()).nullish(),
  shipping_tax_voucher_split: z.array(z.unknown()).nullish(),
  products: z.array(product).min(1).max(12),
  customer: z.object({
    name: text,
    phone_1: text,
    legal_entity: zeroOrOne.optional(),
    code: text,
    company: text,
    billing_name: text,
    billing_street: text,
    billing_city: text,
    billing_suburb: text,
    billing_country: text,
    billing_phone: text,
    billing_postal_code: text,
    shipping_contact: text,
    shipping_phone: text,
    shipping_street: text,
    shipping_city: text,
    shipping_suburb: text,
    shipping_postal_code: text,
    shipping_country: text,
  }),
});

export function normalizeEmagOrder(raw: unknown) {
  const o = orderSchema.parse(raw);
  if (
    o.vouchers?.length ||
    o.shipping_tax_voucher_split?.length ||
    o.products.some((line) => line.product_voucher_split?.length || line.recycle_warranties?.length)
  )
    throw new ProviderError(
      "Verifică baza de facturare pentru voucher, transport sau garanție înainte de import.",
      "EMAG_FINANCIAL_REVIEW",
      409,
    );
  const c = o.customer;
  const name = c.billing_name || c.name;
  const phone = c.billing_phone || c.phone_1 || c.shipping_phone || "";
  if (
    !o.is_complete ||
    !name ||
    !c.billing_street ||
    !c.billing_city ||
    (c.billing_country && !/^(RO|ROU|ROMANIA|ROMÂNIA)$/i.test(c.billing_country)) ||
    (c.legal_entity === 1 && (!c.code || !c.company))
  )
    throw new ProviderError(
      "Datele de facturare eMAG sunt incomplete sau cer verificare.",
      "EMAG_BILLING_REVIEW",
      409,
    );
  const lines = o.products
    .filter((p) => p.status === 1 && p.quantity > 0)
    .map((p) => ({
      id: p.id,
      sku: p.ext_part_number,
      quantity: p.quantity,
      unit: bani(p.sale_price),
      campaign: p.campaign ?? null,
    }))
    .sort((a, b) => a.id - b.id);
  if (!lines.length && o.status !== 0 && o.status !== 5)
    throw new ProviderError("Comanda eMAG nu are linii active.", "EMAG_LINES_REQUIRED", 409);
  if (new Set(lines.map((line) => line.id)).size !== lines.length)
    throw new ProviderError("eMAG a returnat linii duplicate.", "EMAG_DUPLICATE_LINES", 409);
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unit, 0);
  const shipping = bani(o.shipping_tax);
  const billing = {
    name,
    phone,
    street: c.billing_street,
    city: c.billing_city,
    county: c.billing_suburb ?? null,
    postal: c.billing_postal_code ?? null,
    company: c.company ?? null,
    taxId: c.code ?? null,
  };
  const delivery =
    c.shipping_street && c.shipping_city
      ? {
          name: c.shipping_contact || name,
          phone: c.shipping_phone || phone,
          street: c.shipping_street,
          city: c.shipping_city,
          county: c.shipping_suburb ?? null,
          postal: c.shipping_postal_code ?? null,
        }
      : null;
  return {
    ...o,
    customer: undefined,
    products: undefined,
    subtotal,
    shipping,
    lines,
    billing,
    delivery,
  };
}

type Source = {
  order_id: string;
  modified: string;
  financial_hash: string;
  mutation_token: string;
  status: number;
  payment_status: number;
  review_code: string | null;
};
type Variant = {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  location_id: string | null;
  tax_rate_bps: number;
  inventory_policy: string;
};
const sourceGate = "EXISTS(SELECT 1 FROM emag_order_sources WHERE order_id=? AND mutation_token=?)";

export async function importEmagOrder(
  db: D1Database,
  raw: unknown,
  existingInvoice: boolean,
  actorId: string | null = null,
) {
  const o = normalizeEmagOrder(raw);
  const source = await db
    .prepare("SELECT * FROM emag_order_sources WHERE external_id=?")
    .bind(o.id)
    .first<Source>();
  const orderId = source?.order_id || `emag-${o.id}`;
  const now = new Date().toISOString();
  const hash = await digestHex(
    "SHA-256",
    JSON.stringify({ lines: o.lines, shipping: o.shipping, billing: o.billing }),
  );
  const terminal = o.status === 0 || o.status === 5;
  if (source && source.modified > o.modified)
    return { orderId, status: "older" as const, reviewCode: source.review_code };
  if (source && source.financial_hash !== hash && !terminal) {
    await db
      .prepare(
        "UPDATE emag_order_sources SET review_code='EMAG_CHANGED_FINANCIALS',checked_at=?,modified=? WHERE order_id=? AND mutation_token=?",
      )
      .bind(now, o.modified, orderId, source.mutation_token)
      .run();
    return { orderId, status: "review" as const, reviewCode: "EMAG_CHANGED_FINANCIALS" };
  }
  if (!source && (terminal || o.status === 4))
    throw new ProviderError(
      "Comanda istorică eMAG necesită reconcilierea stocului și a documentelor.",
      "EMAG_HISTORICAL_REVIEW",
      409,
    );
  const skus = [...new Set(o.lines.map((l) => l.sku))];
  const variants =
    !terminal && skus.length
      ? (
          await db
            .prepare(
              `SELECT v.id,v.product_id,v.sku,p.tax_rate_bps,v.inventory_policy,p.name AS product_name,
      (SELECT il.location_id FROM inventory_levels il JOIN stock_locations sl ON sl.id=il.location_id WHERE il.variant_id=v.id AND sl.active=1 AND sl.location_type!='virtual' ORDER BY il.on_hand_quantity DESC,il.location_id LIMIT 1) AS location_id
      FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.status='active' AND v.sku IN (${skus.map(() => "?").join(",")})`,
            )
            .bind(...skus)
            .all<Variant>()
        ).results
      : [];
  if (
    !terminal &&
    skus.some((sku) => variants.filter((v) => v.sku === sku && v.tax_rate_bps === 0).length !== 1)
  )
    throw new ProviderError(
      "Mapează codurile produselor și confirmă regimul fiscal înainte de import.",
      "EMAG_SKU_REVIEW",
      409,
    );
  const needsStock =
    !terminal &&
    (variants.some((v) => v.inventory_policy !== "deny" || !v.location_id) ||
      (o.status === 4 && source?.review_code === "EMAG_STOCK_BASELINE_REQUIRED"));
  const review = terminal
    ? "EMAG_TERMINAL_ORDER"
    : needsStock
      ? "EMAG_STOCK_BASELINE_REQUIRED"
      : null;
  if (
    source &&
    source.modified === o.modified &&
    source.status === o.status &&
    source.payment_status === o.payment_status &&
    !source.review_code &&
    !review
  ) {
    await db
      .prepare(
        "UPDATE emag_order_sources SET checked_at=?,existing_invoice=? WHERE order_id=? AND mutation_token=?",
      )
      .bind(now, existingInvoice ? 1 : 0, orderId, source.mutation_token)
      .run();
    return { orderId, status: "synced" as const, reviewCode: null };
  }
  if (source && source.modified === o.modified && source.status !== o.status)
    throw new ProviderError(
      "eMAG a returnat două stări pentru aceeași revizie.",
      "EMAG_REVISION_CONFLICT",
      409,
    );
  if (source && source.status >= 4 && o.status > 0 && o.status < 4)
    throw new ProviderError(
      "Starea eMAG necesită verificarea stocului consumat.",
      "EMAG_STATUS_REGRESSION",
      409,
    );
  const batch: D1PreparedStatement[] = [];
  const add = (sql: string, ...args: (string | number | null)[]) =>
    batch.push(db.prepare(sql).bind(...args));
  const token = crypto.randomUUID();
  if (!source) {
    add(
      `INSERT INTO orders(id,order_number,public_token,idempotency_key,channel_id,external_order_id,order_status,payment_status,fulfillment_status,currency,subtotal_bani,shipping_bani,total_bani,customer_name,customer_phone_e164,payment_method_requested,shipping_option_requested,placed_at)
      VALUES(?,?,?,?,'channel_emag',?,'processing',?,'unfulfilled','RON',?,?,?,?,?,?,?,?)`,
      orderId,
      `EMAG-${o.id}`,
      crypto.randomUUID(),
      orderId,
      String(o.id),
      o.payment_status ? "authorized" : "unpaid",
      o.subtotal,
      o.shipping,
      o.subtotal + o.shipping,
      o.billing.name,
      o.billing.phone,
      o.payment_mode_id === 1
        ? "cash_on_delivery"
        : o.payment_mode_id === 3
          ? "card"
          : "bank_transfer",
      o.delivery_mode === "pickup" ? "easybox" : "home_delivery",
      o.date.replace(" ", "T"),
    );
    add(
      `INSERT INTO emag_order_sources(order_id,external_id,modified,financial_hash,mutation_token,status,payment_status,delivery_mode,existing_invoice,review_code,checked_at)
      VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
      orderId,
      o.id,
      o.modified,
      hash,
      token,
      o.status,
      o.payment_status,
      o.delivery_mode,
      existingInvoice ? 1 : 0,
      review,
      now,
    );
    for (const line of o.lines) {
      const v = variants.find((v) => v.sku === line.sku)!;
      add(
        `INSERT INTO order_items(id,order_id,product_id,variant_id,sku,product_name,quantity,unit_price_bani,tax_rate_bps,line_subtotal_bani,line_total_bani,personalization_json)
        VALUES(?,?,?,?,?,?,?,?,0,?,?,?)`,
        `${orderId}-${line.id}`,
        orderId,
        v.product_id,
        v.id,
        line.sku,
        v.product_name,
        line.quantity,
        line.unit,
        line.unit * line.quantity,
        line.unit * line.quantity,
        JSON.stringify({ campaign: line.campaign }),
      );
    }
    for (const [type, address] of [
      ["billing", o.billing],
      ["shipping", o.delivery],
    ] as const) {
      if (!address) continue;
      add(
        `INSERT INTO order_addresses(id,order_id,address_type,full_name,phone_e164,line1,city,county,postal_code,company_name,tax_id)
        VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
        `${orderId}-${type}`,
        orderId,
        type,
        address.name,
        address.phone,
        address.street,
        address.city,
        address.county,
        address.postal,
        type === "billing" ? o.billing.company : null,
        type === "billing" ? o.billing.taxId : null,
      );
    }
  } else {
    add(
      `UPDATE emag_order_sources SET modified=?,mutation_token=?,status=?,payment_status=?,delivery_mode=?,existing_invoice=?,review_code=?,checked_at=?
      WHERE order_id=? AND mutation_token=?`,
      o.modified,
      token,
      o.status,
      o.payment_status,
      o.delivery_mode,
      existingInvoice ? 1 : 0,
      review,
      now,
      orderId,
      source.mutation_token,
    );
  }
  const status = o.status === 0 ? "cancelled" : o.status >= 4 ? "completed" : "processing";
  const fulfillment =
    o.status === 5
      ? "returned"
      : o.status === 4
        ? "shipped"
        : terminal || needsStock
          ? "unfulfilled"
          : "reserved";
  add(
    `UPDATE orders SET order_status=?,fulfillment_status=?,payment_status=CASE WHEN payment_status IN('unpaid','authorized') THEN ? ELSE payment_status END,version=version+1,updated_at=? WHERE id=? AND ${sourceGate}`,
    status,
    fulfillment,
    o.payment_status ? "authorized" : "unpaid",
    now,
    orderId,
    orderId,
    token,
  );
  if (o.status === 0)
    add(
      `UPDATE inventory_reservations SET status='released',updated_at=? WHERE order_id=? AND status='active' AND ${sourceGate}`,
      now,
      orderId,
      orderId,
      token,
    );
  else if (o.status === 4 && !needsStock) {
    add(
      `INSERT INTO inventory_movements(id,variant_id,location_id,movement_type,quantity_delta,reference_type,reference_id,reason)
      SELECT 'sale-'||id,variant_id,location_id,'sale',-quantity,'emag',?,'Comandă eMAG finalizată' FROM inventory_reservations WHERE order_id=? AND status='active' AND ${sourceGate}`,
      orderId,
      orderId,
      orderId,
      token,
    );
    add(
      `UPDATE inventory_reservations SET status='consumed',updated_at=? WHERE order_id=? AND status='active' AND ${sourceGate}`,
      now,
      orderId,
      orderId,
      token,
    );
  } else if (
    !terminal &&
    !needsStock &&
    (!source || source.review_code === "EMAG_STOCK_BASELINE_REQUIRED")
  ) {
    for (const v of variants) {
      const quantity = o.lines
        .filter((line) => line.sku === v.sku)
        .reduce((sum, line) => sum + line.quantity, 0);
      add(
        `INSERT INTO inventory_reservations(id,variant_id,location_id,order_id,quantity,status,expires_at)
        SELECT ?,?,?,?,?,'active','9999-12-31T23:59:59Z' WHERE ${sourceGate}`,
        `${orderId}-${v.id}`,
        v.id,
        v.location_id,
        orderId,
        quantity,
        orderId,
        token,
      );
    }
  }
  add(
    `INSERT INTO order_events(id,order_id,event_type,actor_type,actor_id,message,metadata_json)
    SELECT ?,?,'emag.synced','integration',?,'Comandă citită din eMAG RO',? WHERE ${sourceGate}`,
    crypto.randomUUID(),
    orderId,
    actorId,
    JSON.stringify({ externalStatus: o.status, review }),
    orderId,
    token,
  );
  if (batch.length > 30)
    throw new ProviderError(
      "Comanda necesită import asistat din cauza numărului de linii.",
      "EMAG_ORDER_LIMIT",
      409,
    );
  const result = await db.batch(batch);
  if (!result[0].meta.changes)
    throw new ProviderError(
      "Comanda a fost sincronizată concomitent.",
      "EMAG_IMPORT_CONFLICT",
      409,
    );
  return { orderId, status: "synced" as const, reviewCode: review };
}

export async function assertEmagConnection(env: CommerceEnv) {
  const c = await emagCredentials(env);
  const fingerprint = await digestHex("SHA-256", c.username.toLowerCase());
  const state = await env.DB.prepare(
    "SELECT * FROM emag_sync_state WHERE id=1 AND account_fingerprint=?",
  )
    .bind(fingerprint)
    .first<{ enabled: number; cursor_at: string | null; page: number }>();
  if (!state)
    throw new ProviderError("Verifică întâi contul API eMAG RO.", "EMAG_VERIFY_REQUIRED", 409);
  return { c, state };
}

export async function verifyEmagConnection(env: CommerceEnv) {
  const c = await emagCredentials(env);
  await emagRequest(c, "order/read", { type: 3, currentPage: 1, itemsPerPage: 1 });
  const couriers = await emagRequest(c, "courier_accounts/read", {});
  const fingerprint = await digestHex("SHA-256", c.username.toLowerCase());
  const at = new Date().toISOString();
  const result = await env.DB.prepare(
    `INSERT INTO emag_sync_state(id,account_fingerprint,verified_at) VALUES(1,?,?)
    ON CONFLICT(id) DO UPDATE SET verified_at=excluded.verified_at WHERE account_fingerprint=excluded.account_fingerprint`,
  )
    .bind(fingerprint, at)
    .run();
  if (!result.meta.changes)
    throw new ProviderError(
      "Identitatea API eMAG diferă de contul verificat.",
      "EMAG_ACCOUNT_MISMATCH",
      409,
    );
  return { verifiedAt: at, courierAccounts: couriers.length };
}

export async function syncEmagOrder(env: CommerceEnv, id: number, actorId: string | null = null) {
  const { c } = await assertEmagConnection(env);
  const [raw, attachments] = await Promise.all([getEmagOrder(c, id), emagAttachments(c, id)]);
  const result = await importEmagOrder(
    env.DB,
    raw,
    attachments.some((a) => a.type === 1),
    actorId,
  );
  await env.DB.prepare("DELETE FROM emag_sync_issues WHERE external_id=?").bind(id).run();
  return result;
}

function bucharestTimestamp(value: Date) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const part = (name: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
}

export async function pollEmagOrders(env: CommerceEnv) {
  const current = await env.DB.prepare("SELECT enabled FROM emag_sync_state WHERE id=1").first<{
    enabled: number;
  }>();
  if (!current?.enabled) return;
  const { c } = await assertEmagConnection(env);
  const now = Date.now();
  const token = crypto.randomUUID();
  const lease = await env.DB.prepare(
    `UPDATE emag_sync_state SET lease_token=?,lease_until_ms=?
    WHERE id=1 AND enabled=1 AND lease_until_ms<?`,
  )
    .bind(token, now + 5 * 60_000, now)
    .run();
  if (!lease.meta.changes) return;
  try {
    const end = bucharestTimestamp(new Date(now - 15_000));
    const start = bucharestTimestamp(new Date(now - 2 * 86_400_000));
    const cursor = await env.DB.prepare(
      "SELECT cursor_at,window_end,page FROM emag_sync_state WHERE id=1",
    ).first<{ cursor_at: string | null; window_end: string | null; page: number }>();
    const from = cursor?.cursor_at || start;
    const until = cursor?.window_end || end;
    if (from > until) return;
    const page = cursor?.page || 1;
    await env.DB.prepare("UPDATE emag_sync_state SET cursor_at=?,window_end=? WHERE lease_token=?")
      .bind(from, until, token)
      .run();
    const orders = await emagRequest(c, "order/read", {
      type: 3,
      modifiedAfter: from,
      modifiedBefore: until,
      currentPage: page,
      itemsPerPage: 8,
    });
    for (const raw of orders) {
      const id = emagId.parse((raw as { id?: unknown })?.id);
      // Attachment lookup failures stop the page so it can be resumed.
      const attachments = await emagAttachments(c, id);
      try {
        const result = await importEmagOrder(
          env.DB,
          raw,
          attachments.some((a) => a.type === 1),
        );
        if (!result.reviewCode)
          await env.DB.prepare("DELETE FROM emag_sync_issues WHERE external_id=?").bind(id).run();
      } catch (error) {
        const code =
          error instanceof ProviderError
            ? error.code
            : error instanceof z.ZodError
              ? "EMAG_PAYLOAD_REVIEW"
              : "EMAG_IMPORT_REVIEW";
        await env.DB.prepare(
          `INSERT INTO emag_sync_issues(external_id,code,updated_at) VALUES(?,?,?)
          ON CONFLICT(external_id) DO UPDATE SET code=excluded.code,updated_at=excluded.updated_at`,
        )
          .bind(id, code, new Date().toISOString())
          .run();
      }
    }
    await env.DB.prepare(
      `UPDATE emag_sync_state SET cursor_at=?,window_end=?,page=?,last_sync_at=?,last_error_code=NULL
      WHERE lease_token=?`,
    )
      .bind(
        orders.length < 8 ? until : from,
        orders.length < 8 ? null : until,
        orders.length < 8 ? 1 : page + 1,
        new Date().toISOString(),
        token,
      )
      .run();
  } catch (error) {
    await env.DB.prepare("UPDATE emag_sync_state SET last_error_code=? WHERE lease_token=?")
      .bind(error instanceof ProviderError ? error.code : "EMAG_POLL_FAILED", token)
      .run();
    throw error;
  } finally {
    await env.DB.prepare(
      "UPDATE emag_sync_state SET lease_token=NULL,lease_until_ms=0 WHERE lease_token=?",
    )
      .bind(token)
      .run();
  }
}

export async function linkEmagAwb(env: CommerceEnv, orderId: string, awbId: number) {
  const { c } = await assertEmagConnection(env);
  const source = await env.DB.prepare("SELECT external_id FROM emag_order_sources WHERE order_id=?")
    .bind(orderId)
    .first<{ external_id: number }>();
  if (!source)
    throw new ProviderError("Importă mai întâi comanda eMAG.", "EMAG_ORDER_REQUIRED", 409);
  const response = await emagRequest(c, "awb/read", { emag_id: awbId });
  const row = z
    .object({
      emag_id: emagId,
      order_id: emagId,
      type: z.coerce.number(),
      awb_type: z.coerce.number(),
      awb: z.array(z.object({ awb_number: z.union([z.number(), z.string().max(80)]) })).min(1),
      courier: z.array(z.object({ courier_name: z.string().max(100) })).min(1),
    })
    .safeParse(response[0]);
  if (
    response.length !== 1 ||
    !row.success ||
    row.data.order_id !== source.external_id ||
    row.data.emag_id !== awbId ||
    row.data.type !== 3 ||
    row.data.awb_type !== 1
  )
    throw new ProviderError(
      "AWB-ul de livrare nu aparține comenzii eMAG selectate.",
      "EMAG_AWB_MISMATCH",
      409,
    );
  await env.DB.prepare(
    "UPDATE emag_order_sources SET awb_id=?,awb_number=?,carrier=? WHERE order_id=?",
  )
    .bind(awbId, String(row.data.awb[0].awb_number), row.data.courier[0].courier_name, orderId)
    .run();
}
