import type {
  AdminChannelMetric,
  AdminDashboardData,
  AdminDashboardStats,
  AdminDeliveryMetric,
  AdminGrowthMetric,
  AdminIntegrationAccount,
  AdminIntegrationsData,
  AdminNotification,
  AdminOrder,
  AdminOrderStatus,
  AdminProduct,
  AdminProductMetric,
  AdminShippingMethod,
  AdminSettingsData,
  AdminStatisticsData,
} from "@/lib/admin-contracts";
import {
  canTransitionOrderStatus,
  toAdminOrderStatus,
  toStoredOrderState,
} from "@/lib/order-status";

type DbValue = string | number | null;
type DbRow = Record<string, DbValue>;

const ORDER_SELECT = `
  SELECT
    vo.*,
    o.version,
    oa.line1,
    oa.line2,
    oa.city,
    oa.county,
    (
      SELECT sm.name
      FROM shipments sh
      LEFT JOIN shipping_methods sm ON sm.id = sh.shipping_method_id
      WHERE sh.order_id = vo.id
      ORDER BY sh.created_at DESC
      LIMIT 1
    ) AS shipping_method_name
  FROM v_admin_order_list vo
  JOIN orders o ON o.id = vo.id
  LEFT JOIN order_addresses oa
    ON oa.order_id = vo.id AND oa.address_type = 'shipping'
`;

const PLATFORM_LABELS: Record<string, string> = {
  website: "Cutiuța Magică",
  emag: "eMAG",
  olx: "OLX",
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  whatsapp: "WhatsApp",
};

function numberValue(value: DbValue | undefined): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function stringValue(value: DbValue | undefined): string {
  return value == null ? "" : String(value);
}

function nullableString(value: DbValue | undefined): string | null {
  return value == null ? null : String(value);
}

function integrationApiBaseUrl(value: DbValue | undefined): string | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as { api_base_url?: unknown };
    return typeof parsed.api_base_url === "string" && parsed.api_base_url
      ? parsed.api_base_url
      : null;
  } catch {
    return null;
  }
}

function baniToRon(value: DbValue | undefined): number {
  return numberValue(value) / 100;
}

function mapOrder(row: DbRow): AdminOrder {
  const channelCode = stringValue(row.channel_code);
  const line1 = stringValue(row.line1);
  const line2 = stringValue(row.line2);

  return {
    id: stringValue(row.id),
    orderNumber: stringValue(row.order_number),
    publicToken: stringValue(row.public_token),
    platform: PLATFORM_LABELS[channelCode] ?? stringValue(row.channel_name),
    channelCode,
    customer: stringValue(row.customer_name) || "Client",
    products: stringValue(row.products_summary) || "Fără produse",
    total: baniToRon(row.total_bani),
    currency: stringValue(row.currency) || "RON",
    status: toAdminOrderStatus({
      orderStatus: stringValue(row.order_status),
      fulfillmentStatus: stringValue(row.fulfillment_status),
    }),
    paymentStatus: stringValue(row.payment_status),
    fulfillmentStatus: stringValue(row.fulfillment_status),
    date: stringValue(row.placed_at).slice(0, 10),
    deliveryMethod: stringValue(row.shipping_method_name) || "Nealocata",
    awb: nullableString(row.awb) ?? undefined,
    phone: stringValue(row.customer_phone_e164),
    email: stringValue(row.customer_email),
    address: [line1, line2].filter(Boolean).join(", "),
    city: stringValue(row.city),
    county: stringValue(row.county),
    version: numberValue(row.version),
  };
}

function mapChannel(row: DbRow): AdminChannelMetric {
  return {
    id: stringValue(row.channel_id),
    code: stringValue(row.code),
    name: PLATFORM_LABELS[stringValue(row.code)] ?? stringValue(row.name),
    type: stringValue(row.channel_type),
    connectionMode: stringValue(row.connection_mode),
    status: stringValue(row.status),
    ordersCount: numberValue(row.orders_count),
    validOrdersCount: numberValue(row.valid_orders_count),
    revenue: baniToRon(row.revenue_bani),
    activeListings: numberValue(row.active_listings),
    openSyncFailures: numberValue(row.open_sync_failures),
    lastOrderAt: nullableString(row.last_order_at),
    lastHealthcheckAt: nullableString(row.last_healthcheck_at),
    lastHealthcheckStatus: nullableString(row.last_healthcheck_status),
  };
}

function mapDashboard(row: DbRow | null): AdminDashboardStats {
  const source = row ?? {};
  return {
    ordersTotal: numberValue(source.orders_total),
    ordersOpen: numberValue(source.orders_open),
    paymentsFailed: numberValue(source.payments_failed),
    fulfillmentOpen: numberValue(source.fulfillment_open),
    revenue30d: baniToRon(source.net_revenue_30d_bani),
    ordersCount30d: numberValue(source.orders_30d),
    productsTotal: numberValue(source.products_total),
    productsActive: numberValue(source.products_active),
    productsIncomplete: numberValue(source.products_incomplete),
    syncFailuresOpen: numberValue(source.sync_failures_open),
    notificationsUnread: numberValue(source.notifications_unread),
  };
}

export async function listAdminOrders(db: D1Database, limit = 200): Promise<AdminOrder[]> {
  const result = await db
    .prepare(`${ORDER_SELECT} ORDER BY vo.placed_at DESC LIMIT ?1`)
    .bind(Math.min(Math.max(limit, 1), 500))
    .all<DbRow>();
  return result.results.map(mapOrder);
}

export interface CreateAdminOrderInput {
  channelCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  productId: string;
  quantity: number;
  shippingBani: number;
  externalOrderId?: string;
  internalNote?: string;
  actorId: string;
  requestId: string;
}

function normalizeAdminPhone(value: string): string {
  const compact = value.replace(/[\s().-]/g, "");
  if (/^0\d{9}$/.test(compact)) return `+40${compact.slice(1)}`;
  if (/^40\d{9}$/.test(compact)) return `+${compact}`;
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  throw new Error("PHONE_INVALID");
}

export async function createAdminOrder(
  db: D1Database,
  input: CreateAdminOrderInput,
): Promise<AdminOrder> {
  const catalog = await db
    .prepare(
      `SELECT p.id AS product_id,p.name,p.tax_rate_bps,pv.id AS variant_id,pv.sku,pv.name AS variant_name,
        sc.id AS channel_id,sc.name AS channel_name,
        (SELECT pli.price_bani FROM price_list_items pli
          JOIN price_lists pl ON pl.id=pli.price_list_id
          WHERE pli.variant_id=pv.id AND pl.status='active' AND pli.min_quantity=1
          ORDER BY CASE
            WHEN pl.channel_id=(SELECT id FROM sales_channels WHERE code=?1) THEN 0
            WHEN pl.channel_id='channel_website' THEN 1
            ELSE 2
          END,
            pl.priority DESC LIMIT 1) AS price_bani
       FROM products p
       JOIN product_variants pv ON pv.product_id=p.id AND pv.status='active'
       JOIN sales_channels sc ON sc.code=?1
       WHERE p.id=?2 AND p.product_type='music_box' AND p.status='active'
       ORDER BY pv.sort_order,pv.created_at LIMIT 1`,
    )
    .bind(input.channelCode, input.productId)
    .first<DbRow>();
  if (!catalog) throw new Error("ORDER_PRODUCT_OR_CHANNEL_NOT_FOUND");
  const unitPriceBani = numberValue(catalog.price_bani);
  if (unitPriceBani <= 0) throw new Error("ORDER_PRODUCT_PRICE_MISSING");

  const now = new Date();
  const nowIso = now.toISOString();
  const orderId = crypto.randomUUID();
  const orderNumber = `CM-${nowIso.slice(0, 10).replaceAll("-", "")}-${orderId.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  const quantity = input.quantity;
  const subtotalBani = unitPriceBani * quantity;
  const totalBani = subtotalBani + input.shippingBani;
  const phone = normalizeAdminPhone(input.customerPhone);
  const orderItemId = crypto.randomUUID();

  await db.batch([
    db
      .prepare(
        `INSERT INTO orders(
          id,order_number,public_token,idempotency_key,channel_id,external_order_id,
          order_status,payment_status,fulfillment_status,currency,subtotal_bani,shipping_bani,
          total_bani,customer_name,customer_email,customer_phone_e164,internal_note,placed_at,created_at,updated_at
        ) VALUES(?1,?2,?3,?4,?5,?6,'pending','unpaid','unfulfilled','RON',?7,?8,?9,?10,?11,?12,?13,?14,?14,?14)`,
      )
      .bind(
        orderId,
        orderNumber,
        crypto.randomUUID(),
        `admin:${input.requestId}`,
        stringValue(catalog.channel_id),
        input.externalOrderId || null,
        subtotalBani,
        input.shippingBani,
        totalBani,
        input.customerName,
        input.customerEmail || null,
        phone,
        input.internalNote || null,
        nowIso,
      ),
    db
      .prepare(
        `INSERT INTO order_items(
          id,order_id,product_id,variant_id,sku,product_name,variant_name,quantity,
          unit_price_bani,tax_rate_bps,line_subtotal_bani,line_total_bani
        ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?11)`,
      )
      .bind(
        orderItemId,
        orderId,
        stringValue(catalog.product_id),
        stringValue(catalog.variant_id),
        stringValue(catalog.sku),
        stringValue(catalog.name),
        stringValue(catalog.variant_name),
        quantity,
        unitPriceBani,
        numberValue(catalog.tax_rate_bps),
        subtotalBani,
      ),
    db
      .prepare(
        `INSERT INTO order_events(id,order_id,event_type,to_status,actor_type,actor_id,message,metadata_json,created_at)
         VALUES(?1,?2,'order.created','pending/unfulfilled','admin',?3,'Comandă adăugată manual din dashboard',?4,?5)`,
      )
      .bind(
        crypto.randomUUID(),
        orderId,
        input.actorId,
        JSON.stringify({ requestId: input.requestId, channelCode: input.channelCode }),
        nowIso,
      ),
    db
      .prepare(
        `INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,request_id,channel_id,after_json,metadata_json,created_at)
         VALUES(?1,?2,?2,'order.manual.create','order',?3,?4,?5,?6,'{}',?7)`,
      )
      .bind(
        crypto.randomUUID(),
        input.actorId,
        orderId,
        input.requestId,
        stringValue(catalog.channel_id),
        JSON.stringify({ orderNumber, totalBani, channelCode: input.channelCode }),
        nowIso,
      ),
  ]);

  const created = await db
    .prepare(`${ORDER_SELECT} WHERE vo.id=?1 LIMIT 1`)
    .bind(orderId)
    .first<DbRow>();
  if (!created) throw new Error("ORDER_NOT_FOUND");
  return mapOrder(created);
}

export async function listAdminProducts(
  db: D1Database,
  publicSiteUrl: string,
): Promise<AdminProduct[]> {
  const result = await db
    .prepare(
      `
    SELECT
      ap.*,
      p.short_description,
      p.storefront_state,
      p.release_note,
      p.version,
      COALESCE(pc.missing_fields_count, 0) AS missing_fields_count,
      pv.sku,
      COALESCE((
        SELECT COALESCE(pm.source_url, '/media/' || pm.id)
        FROM product_media pm
        WHERE pm.product_id = ap.id
          AND pm.media_type = 'image'
          AND pm.status != 'archived'
        ORDER BY pm.is_primary DESC, pm.sort_order ASC
        LIMIT 1
      ), '') AS image_url,
      COALESCE((
        SELECT SUM(oi.quantity)
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.product_id = ap.id AND o.order_status != 'cancelled'
      ), 0) AS units_sold,
      (
        SELECT AVG(CAST(r.rating AS REAL))
        FROM product_reviews r
        WHERE r.product_id = ap.id AND r.status = 'approved'
      ) AS average_rating
    FROM v_admin_product_catalog ap
    JOIN products p ON p.id = ap.id
    LEFT JOIN v_product_completeness pc ON pc.product_id = ap.id
    LEFT JOIN product_variants pv ON pv.product_id = ap.id AND pv.status = 'active'
    WHERE p.product_type = 'music_box'
    GROUP BY ap.id
    ORDER BY p.updated_at DESC, p.name ASC
  `,
    )
    .all<DbRow>();

  const normalizedSiteUrl = publicSiteUrl.replace(/\/$/, "");
  return result.results.map((row) => ({
    id: stringValue(row.id),
    slug: stringValue(row.slug),
    name: stringValue(row.name),
    description: stringValue(row.short_description),
    price: baniToRon(row.min_price_bani),
    currency: "RON",
    category: "cutiute-muzicale",
    catalogCategory: stringValue(row.category),
    status: row.status === "active" ? "activ" : "inactiv",
    stock:
      numberValue(row.has_untracked_inventory) === 1 ? null : numberValue(row.available_quantity),
    inventoryTracked: numberValue(row.has_untracked_inventory) !== 1,
    sales: numberValue(row.units_sold),
    rating: row.average_rating == null ? null : numberValue(row.average_rating),
    image: "CM",
    imageUrl: stringValue(row.image_url),
    url: `${normalizedSiteUrl}/produs/${stringValue(row.slug)}`,
    sku: stringValue(row.sku),
    mechanismType: stringValue(row.mechanism_type),
    rightsStatus: stringValue(row.rights_status),
    missingFieldsCount: numberValue(row.missing_fields_count),
    listingCount: numberValue(row.listing_count),
    storefrontState: (stringValue(row.storefront_state) ||
      "coming_soon") as AdminProduct["storefrontState"],
    releaseNote: stringValue(row.release_note),
    updatedAt: stringValue(row.updated_at),
    version: numberValue(row.version),
  }));
}

export interface CreateAdminProductInput {
  name: string;
  slug: string;
  sku: string;
  category: string;
  priceBani: number;
  actorId: string;
  requestId: string;
}

export async function createAdminProduct(
  db: D1Database,
  input: CreateAdminProductInput,
): Promise<{ id: string }> {
  const productId = crypto.randomUUID();
  const variantId = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `INSERT INTO products(
          id,slug,status,name,short_name,category,storefront_state,release_note,rights_status,
          tax_class,tax_rate_bps,created_at,updated_at
        ) VALUES(?1,?2,'draft',?3,?3,?4,'coming_soon','În pregătire','review_required','review_required',0,?5,?5)`,
      )
      .bind(productId, input.slug, input.name, input.category, nowIso),
    db
      .prepare(
        `INSERT INTO product_variants(
          id,product_id,sku,name,status,inventory_policy,attributes_json,created_at,updated_at
        ) VALUES(?1,?2,?3,'Standard','active','deny','{"mechanism":"manual_crank"}',?4,?4)`,
      )
      .bind(variantId, productId, input.sku, nowIso),
    db
      .prepare(
        `INSERT INTO inventory_levels(
          id,variant_id,location_id,on_hand_quantity,reserved_quantity,safety_stock_quantity,updated_at
        ) VALUES(?1,?2,'location_main',0,0,0,?3)`,
      )
      .bind(crypto.randomUUID(), variantId, nowIso),
    db
      .prepare(
        `INSERT INTO price_list_items(
          id,price_list_id,variant_id,price_bani,min_quantity,created_at,updated_at
        ) VALUES(?1,'price_list_website_ron',?2,?3,1,?4,?4)`,
      )
      .bind(crypto.randomUUID(), variantId, input.priceBani, nowIso),
    db
      .prepare(
        `INSERT INTO audit_log(
          id,actor_admin_user_id,actor_label,action,entity_type,entity_id,request_id,after_json,metadata_json,created_at
        ) VALUES(?1,?2,?2,'product.draft.create','product',?3,?4,?5,'{}',?6)`,
      )
      .bind(
        crypto.randomUUID(),
        input.actorId,
        productId,
        input.requestId,
        JSON.stringify({ name: input.name, slug: input.slug, sku: input.sku }),
        nowIso,
      ),
  ]);
  return { id: productId };
}

export interface UpdateProductStatusInput {
  productId: string;
  status: "activ" | "inactiv";
  expectedVersion: number;
  actorId: string;
  requestId: string;
}

export async function updateProductStatus(
  db: D1Database,
  publicSiteUrl: string,
  input: UpdateProductStatusInput,
): Promise<AdminProduct> {
  const nextStatus = input.status === "activ" ? "active" : "draft";
  const mutationMarker = new Date().toISOString();
  const auditId = crypto.randomUUID();
  const [updateResult] = await db.batch<DbRow>([
    db
      .prepare(
        `
      UPDATE products
      SET status = ?1,
          version = version + 1,
          updated_at = ?2,
          published_at = CASE
            WHEN ?1 = 'active' THEN COALESCE(published_at, ?2)
            ELSE published_at
          END
      WHERE id = ?3 AND product_type = 'music_box' AND version = ?4
    `,
      )
      .bind(nextStatus, mutationMarker, input.productId, input.expectedVersion),
    db
      .prepare(
        `
      INSERT INTO audit_log (
        id, actor_label, action, entity_type, entity_id, request_id,
        after_json, metadata_json
      )
      SELECT ?1, ?2, 'product.status.update', 'product', id, ?3, ?4, '{}'
      FROM products
      WHERE id = ?5 AND updated_at = ?6
    `,
      )
      .bind(
        auditId,
        input.actorId,
        input.requestId,
        JSON.stringify({ status: nextStatus }),
        input.productId,
        mutationMarker,
      ),
  ]);

  if (numberValue(updateResult.meta.changes) !== 1) {
    const exists = await db
      .prepare("SELECT 1 AS found FROM products WHERE id = ?1 AND product_type = 'music_box'")
      .bind(input.productId)
      .first<number>("found");
    throw new Error(exists ? "PRODUCT_VERSION_CONFLICT" : "PRODUCT_NOT_FOUND");
  }

  const products = await listAdminProducts(db, publicSiteUrl);
  const product = products.find((entry) => entry.id === input.productId);
  if (!product) throw new Error("PRODUCT_NOT_FOUND");
  return product;
}

export async function getAdminDashboardData(db: D1Database): Promise<AdminDashboardData> {
  const [dashboardResult, ordersResult, channelsResult] = await db.batch<DbRow>([
    db.prepare("SELECT * FROM v_admin_dashboard LIMIT 1"),
    db.prepare(`${ORDER_SELECT} ORDER BY vo.placed_at DESC LIMIT 7`),
    db.prepare("SELECT * FROM v_admin_channel_metrics ORDER BY name ASC"),
  ]);

  return {
    stats: mapDashboard(dashboardResult.results[0] ?? null),
    recentOrders: ordersResult.results.map(mapOrder),
    channels: channelsResult.results.map(mapChannel),
  };
}

export async function listAdminNotifications(
  db: D1Database,
  limit = 30,
): Promise<AdminNotification[]> {
  const result = await db
    .prepare(
      `
    SELECT id, notification_type, severity, title, message, action_url, created_at, read_at
    FROM admin_notifications
    WHERE dismissed_at IS NULL
    ORDER BY read_at IS NULL DESC, created_at DESC
    LIMIT ?1
  `,
    )
    .bind(Math.min(Math.max(limit, 1), 100))
    .all<DbRow>();

  return result.results.map((row) => ({
    id: stringValue(row.id),
    type: stringValue(row.notification_type),
    severity: stringValue(row.severity),
    title: stringValue(row.title),
    message: stringValue(row.message),
    actionUrl: nullableString(row.action_url),
    createdAt: stringValue(row.created_at),
    read: row.read_at != null,
  }));
}

export async function markAdminNotificationRead(
  db: D1Database,
  notificationId: string,
): Promise<void> {
  await db
    .prepare(
      `
    UPDATE admin_notifications
    SET read_at = COALESCE(read_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    WHERE id = ?1 AND dismissed_at IS NULL
  `,
    )
    .bind(notificationId)
    .run();
}

export async function markAllAdminNotificationsRead(db: D1Database): Promise<void> {
  await db
    .prepare(
      `
    UPDATE admin_notifications
    SET read_at = COALESCE(read_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    WHERE dismissed_at IS NULL AND read_at IS NULL
  `,
    )
    .run();
}

export async function dismissAdminNotification(
  db: D1Database,
  notificationId: string,
): Promise<void> {
  await db
    .prepare(
      `
    UPDATE admin_notifications
    SET dismissed_at = COALESCE(dismissed_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    WHERE id = ?1
  `,
    )
    .bind(notificationId)
    .run();
}

export async function getAdminStatisticsData(db: D1Database): Promise<AdminStatisticsData> {
  const [
    summaryResult,
    monthlyResult,
    channelsResult,
    productsResult,
    deliveriesResult,
    growthResult,
    inventoryResult,
  ] = await db.batch<DbRow>([
    db.prepare(`
        SELECT
          COUNT(*) AS orders_total,
          COALESCE(SUM(CASE WHEN order_status != 'cancelled' THEN total_bani - refunded_bani ELSE 0 END), 0) AS net_revenue_bani,
          COALESCE(SUM(CASE WHEN order_status != 'cancelled' THEN paid_bani - refunded_bani ELSE 0 END), 0) AS paid_revenue_bani,
          COUNT(DISTINCT CASE
            WHEN customer_id IS NOT NULL THEN 'id:' || customer_id
            WHEN customer_email IS NOT NULL THEN 'email:' || lower(customer_email)
            ELSE 'phone:' || customer_phone_e164
          END) AS customers_unique,
          COALESCE(SUM(CASE WHEN fulfillment_status = 'returned' THEN 1 ELSE 0 END), 0) AS returned_orders,
          COALESCE(SUM(discount_bani), 0) AS discount_bani,
          COALESCE(SUM(refunded_bani), 0) AS refunded_bani,
          COALESCE(SUM(shipping_bani), 0) AS shipping_bani,
          SUM(estimated_cost_bani) AS estimated_cost_bani,
          COUNT(estimated_cost_bani) AS orders_with_cost
        FROM orders
      `),
    db.prepare(`
        SELECT
          month,
          SUM(revenue_bani) AS revenue_bani,
          SUM(orders_count) AS orders_count,
          SUM(units_count) AS units_count,
          SUM(discount_bani) AS discount_bani,
          SUM(refunded_bani) AS refunded_bani
        FROM v_admin_monthly_sales
        GROUP BY month
        ORDER BY month ASC
      `),
    db.prepare("SELECT * FROM v_admin_channel_metrics ORDER BY valid_orders_count DESC, name ASC"),
    db.prepare(`
        SELECT
          COALESCE(p.id, oi.product_id, oi.sku) AS id,
          COALESCE(p.name, oi.product_name) AS name,
          SUM(oi.quantity) AS units_count,
          SUM(oi.line_total_bani) AS revenue_bani,
          SUM(CASE WHEN oi.unit_cost_bani IS NOT NULL THEN oi.unit_cost_bani * oi.quantity END) AS known_cost_bani
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        LEFT JOIN products p ON p.id = oi.product_id
        WHERE o.order_status != 'cancelled'
        GROUP BY COALESCE(p.id, oi.product_id, oi.sku), COALESCE(p.name, oi.product_name)
        ORDER BY units_count DESC, revenue_bani DESC
        LIMIT 10
      `),
    db.prepare(`
        SELECT delivery_method, COUNT(*) AS orders_count
        FROM (
          SELECT
            o.id,
            COALESCE((
              SELECT COALESCE(sm.name, s.provider)
              FROM shipments s
              LEFT JOIN shipping_methods sm ON sm.id = s.shipping_method_id
              WHERE s.order_id = o.id
              ORDER BY s.created_at DESC
              LIMIT 1
            ), 'Nealocata') AS delivery_method
          FROM orders o
          WHERE o.order_status != 'cancelled'
        ) latest_delivery
        GROUP BY delivery_method
        ORDER BY orders_count DESC
      `),
    db.prepare(`
        SELECT event_name,SUM(event_count) AS event_count,
          SUM(value_total) AS value_total,SUM(quantity_total) AS quantity_total
        FROM growth_event_daily
        WHERE event_day >= date('now','-29 days')
        GROUP BY event_name
        ORDER BY event_count DESC,event_name ASC
      `),
    db.prepare(`
        SELECT
          COALESCE(SUM(on_hand),0) AS on_hand,
          COALESCE(SUM(reserved),0) AS reserved,
          COALESCE(SUM(safety),0) AS safety,
          COALESCE(SUM(available),0) AS available,
          COUNT(DISTINCT product_id) AS tracked_products,
          COUNT(DISTINCT CASE WHEN available BETWEEN 1 AND 3 THEN product_id END) AS low_stock_products,
          COUNT(DISTINCT CASE WHEN available=0 THEN product_id END) AS out_of_stock_products
        FROM (
          SELECT pv.product_id,pv.id,
            COALESCE(SUM(CASE WHEN sl.active=1 THEN il.on_hand_quantity ELSE 0 END),0) AS on_hand,
            COALESCE(SUM(CASE WHEN sl.active=1 THEN il.reserved_quantity ELSE 0 END),0) AS reserved,
            COALESCE(SUM(CASE WHEN sl.active=1 THEN il.safety_stock_quantity ELSE 0 END),0) AS safety,
            COALESCE(SUM(CASE WHEN sl.active=1 THEN MAX(0,il.on_hand_quantity-il.reserved_quantity-il.safety_stock_quantity) ELSE 0 END),0) AS available
          FROM product_variants pv
          LEFT JOIN inventory_levels il ON il.variant_id=pv.id
          LEFT JOIN stock_locations sl ON sl.id=il.location_id
          WHERE pv.status='active' AND pv.inventory_policy='deny'
          GROUP BY pv.product_id,pv.id
        ) tracked_inventory
      `),
  ]);

  const summary = summaryResult.results[0] ?? {};
  const ordersTotal = numberValue(summary.orders_total);
  const returnedOrders = numberValue(summary.returned_orders);
  const products: AdminProductMetric[] = productsResult.results.map((row) => ({
    id: stringValue(row.id),
    name: stringValue(row.name),
    units: numberValue(row.units_count),
    revenue: baniToRon(row.revenue_bani),
    knownCost: row.known_cost_bani == null ? null : baniToRon(row.known_cost_bani),
  }));
  const deliveries: AdminDeliveryMetric[] = deliveriesResult.results.map((row) => ({
    name: stringValue(row.delivery_method),
    orders: numberValue(row.orders_count),
  }));
  const growth: AdminGrowthMetric[] = growthResult.results.map((row) => ({
    event: stringValue(row.event_name),
    count: numberValue(row.event_count),
    value: numberValue(row.value_total),
    quantity: numberValue(row.quantity_total),
  }));
  const inventory = inventoryResult.results[0] ?? {};

  return {
    summary: {
      netRevenue: baniToRon(summary.net_revenue_bani),
      paidRevenue: baniToRon(summary.paid_revenue_bani),
      ordersTotal,
      customersUnique: numberValue(summary.customers_unique),
      returnedOrders,
      returnRate: ordersTotal > 0 ? (returnedOrders / ordersTotal) * 100 : 0,
      discounts: baniToRon(summary.discount_bani),
      refunds: baniToRon(summary.refunded_bani),
      shippingRevenue: baniToRon(summary.shipping_bani),
      estimatedCost:
        numberValue(summary.orders_with_cost) === ordersTotal && ordersTotal > 0
          ? baniToRon(summary.estimated_cost_bani)
          : null,
    },
    inventory: {
      onHand: numberValue(inventory.on_hand),
      reserved: numberValue(inventory.reserved),
      safety: numberValue(inventory.safety),
      available: numberValue(inventory.available),
      trackedProducts: numberValue(inventory.tracked_products),
      lowStockProducts: numberValue(inventory.low_stock_products),
      outOfStockProducts: numberValue(inventory.out_of_stock_products),
    },
    monthly: monthlyResult.results.map((row) => ({
      month: stringValue(row.month),
      revenue: baniToRon(row.revenue_bani),
      orders: numberValue(row.orders_count),
      units: numberValue(row.units_count),
      discounts: baniToRon(row.discount_bani),
      refunds: baniToRon(row.refunded_bani),
    })),
    channels: channelsResult.results.map(mapChannel),
    topProducts: products,
    deliveries,
    growth,
  };
}

export async function getAdminIntegrationsData(db: D1Database): Promise<AdminIntegrationsData> {
  const [channelsResult, accountsResult, shippingResult] = await db.batch<DbRow>([
    db.prepare("SELECT * FROM v_admin_channel_metrics ORDER BY name ASC"),
    db.prepare(`
      SELECT ia.*, sc.code AS channel_code
      FROM integration_accounts ia
      JOIN sales_channels sc ON sc.id = ia.channel_id
      ORDER BY sc.name ASC, ia.provider ASC
    `),
    db.prepare(
      "SELECT id, code, name, provider, method_type, status FROM shipping_methods ORDER BY name ASC",
    ),
  ]);

  const accounts: AdminIntegrationAccount[] = accountsResult.results.map((row) => ({
    id: stringValue(row.id),
    channelCode: stringValue(row.channel_code),
    provider: stringValue(row.provider),
    environment: stringValue(row.environment),
    label: stringValue(row.account_label),
    externalAccountId: nullableString(row.external_account_id),
    apiBaseUrl: integrationApiBaseUrl(row.config_json),
    secretReference: nullableString(row.secret_reference),
    status: stringValue(row.status),
    lastHealthcheckAt: nullableString(row.last_healthcheck_at),
    lastSuccessAt: nullableString(row.last_success_at),
    lastErrorCode: nullableString(row.last_error_code),
    lastErrorMessage: nullableString(row.last_error_message),
  }));
  const shippingMethods: AdminShippingMethod[] = shippingResult.results.map((row) => ({
    id: stringValue(row.id),
    code: stringValue(row.code),
    name: stringValue(row.name),
    provider: stringValue(row.provider),
    type: stringValue(row.method_type),
    status: stringValue(row.status),
  }));

  return {
    channels: channelsResult.results.map(mapChannel),
    accounts,
    shippingMethods,
  };
}

const DEFAULT_ADMIN_SETTINGS: AdminSettingsData = {
  business: {
    name: "Cutiuța Magică",
    description: "",
    email: "",
    phone: "",
    website: "https://cutiutamagica.eu",
    address: "",
    taxId: "",
    registrationNumber: "",
  },
  social: {
    instagram: "",
    facebook: "",
    tiktok: "",
    pinterest: "",
    youtube: "",
  },
  notifications: {
    newOrder: true,
    paymentFailed: true,
    orderShipped: true,
    orderDelivered: false,
    returnRequest: true,
    integrationFailure: true,
    dailyReport: false,
  },
  fulfillment: {
    defaultShippingMethod: "",
    defaultDeliveryType: "",
  },
  updatedAt: null,
};

function parseObject(value: DbValue | undefined): Record<string, unknown> {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function mergeKnownFields<T extends Record<string, string | boolean>>(
  defaults: T,
  value: Record<string, unknown>,
): T {
  const merged = { ...defaults };
  for (const key of Object.keys(defaults) as Array<keyof T>) {
    if (typeof value[String(key)] === typeof defaults[key]) {
      merged[key] = value[String(key)] as T[keyof T];
    }
  }
  return merged;
}

export async function getAdminSettingsData(db: D1Database): Promise<AdminSettingsData> {
  const result = await db
    .prepare(
      `
    SELECT key, value_json, updated_at
    FROM site_settings
    WHERE key IN ('admin.business', 'admin.social', 'admin.notifications', 'admin.fulfillment')
  `,
    )
    .all<DbRow>();
  const byKey = new Map(result.results.map((row) => [stringValue(row.key), row]));
  const updatedAt =
    result.results
      .map((row) => nullableString(row.updated_at))
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  return {
    business: mergeKnownFields(
      DEFAULT_ADMIN_SETTINGS.business,
      parseObject(byKey.get("admin.business")?.value_json),
    ),
    social: mergeKnownFields(
      DEFAULT_ADMIN_SETTINGS.social,
      parseObject(byKey.get("admin.social")?.value_json),
    ),
    notifications: mergeKnownFields(
      DEFAULT_ADMIN_SETTINGS.notifications,
      parseObject(byKey.get("admin.notifications")?.value_json),
    ),
    fulfillment: mergeKnownFields(
      DEFAULT_ADMIN_SETTINGS.fulfillment,
      parseObject(byKey.get("admin.fulfillment")?.value_json),
    ),
    updatedAt,
  };
}

export async function saveAdminSettingsData(
  db: D1Database,
  settings: Omit<AdminSettingsData, "updatedAt">,
  actorId: string,
  requestId: string,
): Promise<AdminSettingsData> {
  const now = new Date().toISOString();
  const records = [
    { key: "admin.business", value: settings.business, validation: "review_required" },
    { key: "admin.social", value: settings.social, validation: "review_required" },
    { key: "admin.notifications", value: settings.notifications, validation: "verified" },
    { key: "admin.fulfillment", value: settings.fulfillment, validation: "review_required" },
  ];
  const statements = records.map((record) =>
    db
      .prepare(
        `
    INSERT INTO site_settings (key, value_json, visibility, validation_status, updated_at)
    VALUES (?1, ?2, 'private', ?3, ?4)
    ON CONFLICT(key) DO UPDATE SET
      value_json = excluded.value_json,
      visibility = excluded.visibility,
      validation_status = excluded.validation_status,
      updated_at = excluded.updated_at
  `,
      )
      .bind(record.key, JSON.stringify(record.value), record.validation, now),
  );
  statements.push(
    db
      .prepare(
        `
    INSERT INTO audit_log (
      id, actor_label, action, entity_type, entity_id, request_id, after_json, metadata_json
    ) VALUES (?1, ?2, 'settings.update', 'site_settings', 'admin', ?3, ?4, '{}')
  `,
      )
      .bind(crypto.randomUUID(), actorId, requestId, JSON.stringify(settings)),
  );
  await db.batch(statements);
  return getAdminSettingsData(db);
}

export interface UpdateOrderStatusInput {
  orderId: string;
  status: AdminOrderStatus;
  expectedVersion: number;
  actorId: string;
  requestId: string;
}

export async function updateOrderStatus(
  db: D1Database,
  input: UpdateOrderStatusInput,
): Promise<AdminOrder> {
  const current = await db
    .prepare(
      `
    SELECT order_status, fulfillment_status, version
    FROM orders
    WHERE id = ?1
  `,
    )
    .bind(input.orderId)
    .first<DbRow>();

  if (!current) throw new Error("ORDER_NOT_FOUND");
  if (numberValue(current.version) !== input.expectedVersion) {
    throw new Error("ORDER_VERSION_CONFLICT");
  }

  const currentState = {
    orderStatus: stringValue(current.order_status),
    fulfillmentStatus: stringValue(current.fulfillment_status),
  };
  const currentAdminStatus = toAdminOrderStatus(currentState);
  if (!canTransitionOrderStatus(currentAdminStatus, input.status)) {
    throw new Error(`ORDER_STATUS_TRANSITION_INVALID:${currentAdminStatus}:${input.status}`);
  }
  if (currentAdminStatus === input.status) {
    const existing = await db
      .prepare(`${ORDER_SELECT} WHERE vo.id = ?1 LIMIT 1`)
      .bind(input.orderId)
      .first<DbRow>();
    if (!existing) throw new Error("ORDER_NOT_FOUND");
    return mapOrder(existing);
  }

  const nextState = toStoredOrderState(input.status, currentState);
  const mutationMarker = new Date().toISOString();
  const eventId = crypto.randomUUID();
  const auditId = crypto.randomUUID();
  const beforeJson = JSON.stringify(currentState);
  const afterJson = JSON.stringify(nextState);

  const [updateResult] = await db.batch<DbRow>([
    db
      .prepare(
        `
      UPDATE orders
      SET order_status = ?1,
          fulfillment_status = ?2,
          version = version + 1,
          updated_at = ?3,
          completed_at = CASE WHEN ?1 = 'completed' THEN COALESCE(completed_at, ?3) ELSE completed_at END,
          cancelled_at = CASE WHEN ?1 = 'cancelled' THEN COALESCE(cancelled_at, ?3) ELSE cancelled_at END
      WHERE id = ?4 AND version = ?5
    `,
      )
      .bind(
        nextState.orderStatus,
        nextState.fulfillmentStatus,
        mutationMarker,
        input.orderId,
        input.expectedVersion,
      ),
    db
      .prepare(
        `
      INSERT INTO order_events (
        id, order_id, event_type, from_status, to_status,
        actor_type, actor_id, message, metadata_json
      )
      SELECT ?1, id, 'status.changed', ?2, ?3, 'admin', ?4, ?5, ?6
      FROM orders
      WHERE id = ?7 AND updated_at = ?8
    `,
      )
      .bind(
        eventId,
        `${currentState.orderStatus}/${currentState.fulfillmentStatus}`,
        `${nextState.orderStatus}/${nextState.fulfillmentStatus}`,
        input.actorId,
        `Status actualizat: ${currentAdminStatus} -> ${input.status}`,
        JSON.stringify({ requestId: input.requestId }),
        input.orderId,
        mutationMarker,
      ),
    db
      .prepare(
        `
      INSERT INTO audit_log (
        id, actor_label, action, entity_type, entity_id, request_id,
        before_json, after_json, metadata_json
      )
      SELECT ?1, ?2, 'order.status.update', 'order', id, ?3, ?4, ?5, '{}'
      FROM orders
      WHERE id = ?6 AND updated_at = ?7
    `,
      )
      .bind(
        auditId,
        input.actorId,
        input.requestId,
        beforeJson,
        afterJson,
        input.orderId,
        mutationMarker,
      ),
  ]);

  if (numberValue(updateResult.meta.changes) !== 1) {
    throw new Error("ORDER_VERSION_CONFLICT");
  }

  const updated = await db
    .prepare(`${ORDER_SELECT} WHERE vo.id = ?1 LIMIT 1`)
    .bind(input.orderId)
    .first<DbRow>();
  if (!updated) throw new Error("ORDER_NOT_FOUND");
  return mapOrder(updated);
}
