import { MAX_CART_QUANTITY, STORE_CURRENCY } from "@/lib/pricing";
import type { WebsiteOrderInput, WebsiteOrderPublicResult } from "@/lib/order-contracts";

type DbValue = string | number | null;
type DbRow = Record<string, DbValue>;

export interface WebsiteOrderResult {
  orderId: string;
  orderNumber: string;
  publicToken: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  currency: string;
  shippingPending: boolean;
  replayed: boolean;
  outboxId: string | null;
}

interface CatalogItem {
  productId: string;
  slug: string;
  productName: string;
  variantId: string;
  variantName: string;
  sku: string;
  melodyName: string | null;
  unitPriceBani: number;
  taxRateBps: number;
  currency: string;
}

interface BasketPromotion {
  id: string;
  unitPriceBani: number;
}

interface ShippingPrice {
  amountBani: number;
  pending: boolean;
}

export class CheckoutError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 409 = 400,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

function stringValue(value: DbValue | undefined): string {
  return value == null ? "" : String(value);
}

function numberValue(value: DbValue | undefined): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function normalizePhone(phone: string): string {
  const compact = phone.replace(/[\s().-]/g, "");
  if (/^0\d{9}$/.test(compact)) return `+40${compact.slice(1)}`;
  if (/^40\d{9}$/.test(compact)) return `+${compact}`;
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  throw new CheckoutError("Numărul de telefon nu este valid.");
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createOrderNumber(now: Date): string {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `CM-${date}-${suffix}`;
}

function parseStoredResponse(value: DbValue | undefined): WebsiteOrderPublicResult | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as WebsiteOrderPublicResult;
    return parsed?.orderId ? parsed : null;
  } catch {
    return null;
  }
}

async function findExistingOrder(
  db: D1Database,
  idempotencyKey: string,
  requestHash: string,
): Promise<WebsiteOrderResult | null> {
  const existing = await db
    .prepare(
      `
    SELECT ik.request_hash, ik.response_json, o.id AS order_id,
      (
        SELECT oe.id
        FROM outbox_events oe
        WHERE oe.aggregate_type = 'order' AND oe.aggregate_id = o.id
          AND oe.event_type = 'order.created'
        LIMIT 1
      ) AS outbox_id
    FROM idempotency_keys ik
    LEFT JOIN orders o ON o.id = ik.resource_id
    WHERE ik.scope = 'website.checkout' AND ik.idempotency_key = ?1
  `,
    )
    .bind(idempotencyKey)
    .first<DbRow>();

  if (!existing) return null;
  if (stringValue(existing.request_hash) !== requestHash) {
    throw new CheckoutError("Cererea de comandă a fost deja folosită cu alte date.", 409);
  }

  const response = parseStoredResponse(existing.response_json);
  if (!response) throw new Error("Comanda există, dar răspunsul salvat este incomplet.");
  return {
    ...response,
    replayed: true,
    outboxId: existing.outbox_id == null ? null : stringValue(existing.outbox_id),
  };
}

async function loadCatalogItems(db: D1Database, slugs: string[]): Promise<CatalogItem[]> {
  const placeholders = slugs.map((_, index) => `?${index + 1}`).join(", ");
  const result = await db
    .prepare(
      `
    SELECT
      p.id AS product_id,
      p.slug,
      p.name AS product_name,
      p.tax_rate_bps,
      pv.id AS variant_id,
      pv.name AS variant_name,
      pv.sku,
      m.title AS melody_name,
      pli.price_bani,
      pl.currency
    FROM products p
    JOIN product_variants pv ON pv.id = (
      SELECT candidate.id
      FROM product_variants candidate
      WHERE candidate.product_id = p.id AND candidate.status = 'active'
      ORDER BY candidate.sort_order ASC, candidate.created_at ASC
      LIMIT 1
    )
    JOIN price_list_items pli ON pli.id = (
      SELECT candidate_price.id
      FROM price_list_items candidate_price
      JOIN price_lists candidate_list ON candidate_list.id = candidate_price.price_list_id
      JOIN sales_channels candidate_channel ON candidate_channel.id = candidate_list.channel_id
      WHERE candidate_price.variant_id = pv.id
        AND candidate_price.min_quantity = 1
        AND candidate_list.status = 'active'
        AND candidate_channel.code = 'website'
        AND candidate_channel.status = 'active'
        AND (candidate_list.starts_at IS NULL OR candidate_list.starts_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        AND (candidate_list.ends_at IS NULL OR candidate_list.ends_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ORDER BY candidate_list.priority DESC, candidate_list.created_at DESC
      LIMIT 1
    )
    JOIN price_lists pl ON pl.id = pli.price_list_id
    LEFT JOIN melodies m ON m.id = pv.melody_id
    WHERE p.slug IN (${placeholders})
      AND p.product_type = 'music_box'
      AND p.status = 'active'
      AND p.published_at IS NOT NULL
  `,
    )
    .bind(...slugs)
    .all<DbRow>();

  return result.results.map((row) => ({
    productId: stringValue(row.product_id),
    slug: stringValue(row.slug),
    productName: stringValue(row.product_name),
    variantId: stringValue(row.variant_id),
    variantName: stringValue(row.variant_name),
    sku: stringValue(row.sku),
    melodyName: row.melody_name == null ? null : stringValue(row.melody_name),
    unitPriceBani: numberValue(row.price_bani),
    taxRateBps: numberValue(row.tax_rate_bps),
    currency: stringValue(row.currency) || STORE_CURRENCY,
  }));
}

async function loadBasketPromotion(
  db: D1Database,
  totalQuantity: number,
): Promise<BasketPromotion | null> {
  const row = await db
    .prepare(
      `
    SELECT p.id, p.value
    FROM promotions p
    JOIN promotion_rules pr ON pr.promotion_id = p.id
      AND pr.rule_type = 'min_quantity'
      AND pr.operator = 'gte'
    JOIN promotion_targets pt ON pt.promotion_id = p.id
      AND pt.target_type = 'channel'
      AND pt.target_id = 'channel_website'
      AND pt.exclusion = 0
    WHERE p.promotion_type = 'tiered'
      AND p.status = 'active'
      AND CAST(json_extract(pr.value_json, '$') AS INTEGER) <= ?1
      AND (p.starts_at IS NULL OR p.starts_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      AND (p.ends_at IS NULL OR p.ends_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ORDER BY p.priority DESC, CAST(json_extract(pr.value_json, '$') AS INTEGER) DESC
    LIMIT 1
  `,
    )
    .bind(totalQuantity)
    .first<DbRow>();

  if (!row) return null;
  return { id: stringValue(row.id), unitPriceBani: numberValue(row.value) };
}

async function loadShippingPrice(
  db: D1Database,
  subtotalAfterDiscountBani: number,
  option: WebsiteOrderInput["shippingOption"],
): Promise<ShippingPrice> {
  if (option === "manual_confirmation") return { amountBani: 0, pending: true };
  const row = await db
    .prepare(
      `SELECT standard_price_bani, locker_price_bani, free_over_bani,
              easybox_enabled, validation_status
       FROM shipping_policy_configs WHERE code = 'RO_STANDARD'`,
    )
    .first<DbRow>();
  if (!row || row.validation_status !== "verified") return { amountBani: 0, pending: true };
  if (row.free_over_bani != null && subtotalAfterDiscountBani >= numberValue(row.free_over_bani)) {
    return { amountBani: 0, pending: false };
  }
  const amount =
    option === "easybox" && numberValue(row.easybox_enabled) === 1
      ? row.locker_price_bani
      : option === "home_delivery"
        ? row.standard_price_bani
        : null;
  if (amount == null) return { amountBani: 0, pending: true };
  return { amountBani: numberValue(amount), pending: false };
}

function riskAssessmentStatement(
  db: D1Database,
  orderId: string,
  score: number,
  decision: string,
  incidents: Array<{ incident_type: string; severity: number }>,
  nowIso: string,
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO order_risk_assessments (
        id, order_id, score, decision, factors_json, policy_version, assessed_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, '2026.09', ?6)`,
    )
    .bind(
      crypto.randomUUID(),
      orderId,
      score,
      decision,
      JSON.stringify(
        incidents.map((incident) => ({
          type: incident.incident_type,
          severity: incident.severity,
        })),
      ),
      nowIso,
    );
}

export async function createWebsiteOrder(
  db: D1Database,
  input: WebsiteOrderInput,
): Promise<WebsiteOrderResult> {
  const itemsBySlug = new Map<string, number>();
  for (const item of input.items) {
    itemsBySlug.set(item.productId, (itemsBySlug.get(item.productId) ?? 0) + item.quantity);
  }
  const normalizedItems = Array.from(itemsBySlug, ([productId, quantity]) => ({
    productId,
    quantity,
  })).sort((left, right) => left.productId.localeCompare(right.productId));
  const totalQuantity = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
  if (totalQuantity < 1 || totalQuantity > MAX_CART_QUANTITY) {
    throw new CheckoutError("Cantitatea totală din coș nu este validă.");
  }

  const phoneE164 = normalizePhone(input.customer.phone);
  const normalizedRequest = {
    customer: {
      name: input.customer.name.trim(),
      email: input.customer.email.trim().toLowerCase(),
      phone: phoneE164,
      address: input.customer.address.trim(),
      city: input.customer.city.trim(),
      county: input.customer.county.trim(),
      postalCode: input.customer.postalCode.trim(),
      notes: input.customer.notes.trim(),
    },
    paymentMethod: input.paymentMethod,
    shippingOption: input.shippingOption,
    checkoutConsentVersion: input.checkoutConsentVersion,
    items: normalizedItems,
  };
  const requestHash = await sha256(JSON.stringify(normalizedRequest));
  const existing = await findExistingOrder(db, input.idempotencyKey, requestHash);
  if (existing) return existing;

  const catalogItems = await loadCatalogItems(
    db,
    normalizedItems.map((item) => item.productId),
  );
  if (catalogItems.length !== normalizedItems.length) {
    throw new CheckoutError("Unul dintre produsele din coș nu mai este disponibil.", 409);
  }
  const catalogBySlug = new Map(catalogItems.map((item) => [item.slug, item]));
  if (catalogItems.some((item) => item.currency !== STORE_CURRENCY)) {
    throw new CheckoutError("Produsele din coș nu folosesc aceeași monedă.", 409);
  }

  const basketPromotion = await loadBasketPromotion(db, totalQuantity);
  const pricedItems = normalizedItems.map((requested) => {
    const catalog = catalogBySlug.get(requested.productId);
    if (!catalog)
      throw new CheckoutError("Unul dintre produsele din coș nu mai este disponibil.", 409);
    const effectiveUnitBani =
      basketPromotion == null
        ? catalog.unitPriceBani
        : Math.min(catalog.unitPriceBani, basketPromotion.unitPriceBani);
    const unitDiscountBani = catalog.unitPriceBani - effectiveUnitBani;
    return {
      ...catalog,
      quantity: requested.quantity,
      effectiveUnitBani,
      unitDiscountBani,
      lineSubtotalBani: catalog.unitPriceBani * requested.quantity,
      lineDiscountBani: unitDiscountBani * requested.quantity,
      lineTotalBani: effectiveUnitBani * requested.quantity,
    };
  });

  const subtotalBani = pricedItems.reduce((sum, item) => sum + item.lineSubtotalBani, 0);
  const discountBani = pricedItems.reduce((sum, item) => sum + item.lineDiscountBani, 0);
  const productsTotalBani = subtotalBani - discountBani;
  const shipping = await loadShippingPrice(db, productsTotalBani, input.shippingOption);
  const totalBani = productsTotalBani + shipping.amountBani;
  const now = new Date();
  const nowIso = now.toISOString();
  const orderId = crypto.randomUUID();
  const orderNumber = createOrderNumber(now);
  const publicToken = crypto.randomUUID();
  const customerId = crypto.randomUUID();
  const addressId = crypto.randomUUID();
  const eventId = crypto.randomUUID();
  const outboxId = crypto.randomUUID();
  const idempotencyId = crypto.randomUUID();
  const response: WebsiteOrderPublicResult = {
    orderId,
    orderNumber,
    publicToken,
    subtotal: subtotalBani / 100,
    discount: discountBani / 100,
    shipping: shipping.amountBani / 100,
    total: totalBani / 100,
    currency: STORE_CURRENCY,
    shippingPending: shipping.pending,
  };
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const existingCustomer = await db
    .prepare(
      `
    SELECT id FROM customers
    WHERE status = 'active'
      AND (phone_e164 = ?1 OR email_normalized = ?2 OR lower(email) = ?2)
    ORDER BY updated_at DESC LIMIT 1
  `,
    )
    .bind(phoneE164, normalizedRequest.customer.email)
    .first<DbRow>();
  const resolvedCustomerId = existingCustomer ? stringValue(existingCustomer.id) : customerId;

  const statements: D1PreparedStatement[] = [];
  if (existingCustomer) {
    statements.push(
      db
        .prepare(
          `
      UPDATE customers
      SET full_name = ?1, email = ?2, email_normalized = ?2,
          last_order_at = ?3,
          order_count = order_count + 1,
          lifetime_value_bani = lifetime_value_bani + ?4,
          updated_at = ?3
      WHERE id = ?5
    `,
        )
        .bind(
          normalizedRequest.customer.name,
          normalizedRequest.customer.email,
          nowIso,
          totalBani,
          resolvedCustomerId,
        ),
    );
  } else {
    statements.push(
      db
        .prepare(
          `
      INSERT INTO customers (
        id, phone_e164, email, email_normalized, full_name, customer_type, status, first_order_at,
        last_order_at, order_count, lifetime_value_bani, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?3, ?4, 'guest', 'active', ?5, ?5, 1, ?6, ?5, ?5)
    `,
        )
        .bind(
          customerId,
          phoneE164,
          normalizedRequest.customer.email,
          normalizedRequest.customer.name,
          nowIso,
          totalBani,
        ),
    );
  }

  statements.push(
    db
      .prepare(
        `
      INSERT INTO orders (
        id, order_number, public_token, idempotency_key, channel_id, customer_id,
        order_status, payment_status, fulfillment_status, currency,
        subtotal_bani, discount_bani, shipping_bani, tax_bani, total_bani,
        customer_name, customer_email, customer_phone_e164, customer_note, internal_note,
        payment_method_requested, shipping_option_requested, checkout_consent_version,
        placed_at, created_at, updated_at
      ) VALUES (
        ?1, ?2, ?3, ?4, 'channel_website', ?5,
        'pending', 'unpaid', 'unfulfilled', ?6,
        ?7, ?8, ?9, 0, ?10,
        ?11, ?12, ?13, ?14, ?15,
        ?16, ?17, ?18,
        ?19, ?19, ?19
      )
    `,
      )
      .bind(
        orderId,
        orderNumber,
        publicToken,
        input.idempotencyKey,
        resolvedCustomerId,
        STORE_CURRENCY,
        subtotalBani,
        discountBani,
        shipping.amountBani,
        totalBani,
        normalizedRequest.customer.name,
        normalizedRequest.customer.email,
        phoneE164,
        normalizedRequest.customer.notes || null,
        shipping.pending
          ? "Costul livrării și totalul final trebuie confirmate înainte de plată."
          : "Costul livrării a fost calculat conform politicii comerciale active.",
        input.paymentMethod,
        input.shippingOption,
        input.checkoutConsentVersion,
        nowIso,
      ),
    db
      .prepare(
        `
      INSERT INTO order_addresses (
        id, order_id, address_type, full_name, phone_e164, line1, city, county,
        postal_code, country_code, created_at
      ) VALUES (?1, ?2, 'shipping', ?3, ?4, ?5, ?6, ?7, ?8, 'RO', ?9)
    `,
      )
      .bind(
        addressId,
        orderId,
        normalizedRequest.customer.name,
        phoneE164,
        normalizedRequest.customer.address,
        normalizedRequest.customer.city,
        normalizedRequest.customer.county || null,
        normalizedRequest.customer.postalCode || null,
        nowIso,
      ),
  );

  for (const item of pricedItems) {
    statements.push(
      db
        .prepare(
          `
      INSERT INTO order_items (
        id, order_id, product_id, variant_id, sku, product_name, variant_name,
        melody_name, quantity, unit_price_bani, unit_discount_bani, tax_rate_bps,
        line_subtotal_bani, line_discount_bani, line_total_bani, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
    `,
        )
        .bind(
          crypto.randomUUID(),
          orderId,
          item.productId,
          item.variantId,
          item.sku,
          item.productName,
          item.variantName,
          item.melodyName,
          item.quantity,
          item.unitPriceBani,
          item.unitDiscountBani,
          item.taxRateBps,
          item.lineSubtotalBani,
          item.lineDiscountBani,
          item.lineTotalBani,
          nowIso,
        ),
    );
  }

  if (basketPromotion && discountBani > 0) {
    statements.push(
      db
        .prepare(
          `
      INSERT INTO promotion_redemptions (
        id, promotion_id, customer_id, order_id, status, discount_bani, reserved_at
      ) VALUES (?1, ?2, ?3, ?4, 'reserved', ?5, ?6)
    `,
        )
        .bind(
          crypto.randomUUID(),
          basketPromotion.id,
          resolvedCustomerId,
          orderId,
          discountBani,
          nowIso,
        ),
    );
  }

  const incidentRows = existingCustomer
    ? await db
        .prepare(
          `SELECT incident_type, severity FROM cod_delivery_incidents
           WHERE customer_id = ?1 AND resolved_at IS NULL
           AND created_at >= datetime('now', '-730 days')`,
        )
        .bind(resolvedCustomerId)
        .all<{ incident_type: string; severity: number }>()
    : { results: [] as Array<{ incident_type: string; severity: number }> };
  const riskPoints: Record<string, number> = {
    unclaimed: 35,
    refused: 25,
    invalid_address: 15,
    unreachable: 10,
    fraud_suspected: 60,
  };
  const riskScore = Math.min(
    100,
    incidentRows.results.reduce(
      (score, incident) =>
        score + (riskPoints[incident.incident_type] ?? 0) * Math.max(1, incident.severity),
      0,
    ),
  );
  const riskDecision =
    input.paymentMethod === "card"
      ? "allow"
      : riskScore >= 90
        ? "block"
        : riskScore >= 60
          ? "require_prepaid"
          : riskScore >= 35
            ? "review"
            : "allow";

  statements.push(
    db
      .prepare(
        `
      INSERT INTO order_events (
        id, order_id, event_type, to_status, actor_type, message, metadata_json, created_at
      ) VALUES (?1, ?2, 'order.created', 'pending', 'customer', ?3, ?4, ?5)
    `,
      )
      .bind(
        eventId,
        orderId,
        "Comandă înregistrată pe website; livrarea și plata necesită confirmare.",
        JSON.stringify({ source: "website.checkout", idempotencyKey: input.idempotencyKey }),
        nowIso,
      ),
    ...(shipping.pending
      ? [
          db
            .prepare(
              `INSERT INTO order_tags (order_id, tag, created_at)
               VALUES (?1, 'shipping_quote_required', ?2)`,
            )
            .bind(orderId, nowIso),
        ]
      : []),
    ...(riskDecision !== "allow"
      ? [
          db
            .prepare(
              `INSERT INTO order_tags (order_id, tag, created_at)
               VALUES (?1, ?2, ?3)`,
            )
            .bind(orderId, `risk_${riskDecision}`, nowIso),
        ]
      : []),
    riskAssessmentStatement(db, orderId, riskScore, riskDecision, incidentRows.results, nowIso),
    db
      .prepare(
        `
      INSERT INTO outbox_events (
        id, aggregate_type, aggregate_id, event_type, destination,
        payload_json, status, available_at, created_at, updated_at
      ) VALUES (?1, 'order', ?2, 'order.created', 'admin.notification', ?3, 'pending', ?4, ?4, ?4)
    `,
      )
      .bind(
        outboxId,
        orderId,
        JSON.stringify({
          type: "order",
          severity: "info",
          title: `Comandă nouă ${orderNumber}`,
          message: `${totalQuantity} produse, ${totalBani / 100} RON; ${shipping.pending ? "livrarea necesită confirmare" : "livrare calculată"}.`,
          actionUrl: "/admin/orders",
        }),
        nowIso,
      ),
    db
      .prepare(
        `
      INSERT INTO idempotency_keys (
        id, scope, idempotency_key, request_hash, response_status, response_json,
        resource_type, resource_id, expires_at, created_at
      ) VALUES (?1, 'website.checkout', ?2, ?3, 201, ?4, 'order', ?5, ?6, ?7)
    `,
      )
      .bind(
        idempotencyId,
        input.idempotencyKey,
        requestHash,
        JSON.stringify(response),
        orderId,
        expiresAt,
        nowIso,
      ),
  );

  try {
    await db.batch(statements);
  } catch (error) {
    const racedOrder = await findExistingOrder(db, input.idempotencyKey, requestHash);
    if (racedOrder) return racedOrder;
    throw error;
  }

  return { ...response, replayed: false, outboxId };
}

export async function markOrderNotificationQueued(db: D1Database, outboxId: string): Promise<void> {
  await db
    .prepare(
      `
    UPDATE outbox_events
    SET status = 'queued', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?1 AND status IN ('pending', 'failed')
  `,
    )
    .bind(outboxId)
    .run();
}
