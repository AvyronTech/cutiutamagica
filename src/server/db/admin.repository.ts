import type {
  AdminChannelMetric,
  AdminDashboardData,
  AdminDashboardStats,
  AdminDeliveryMetric,
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
        FROM reviews r
        WHERE r.product_id = ap.id AND r.status = 'published'
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
    updatedAt: stringValue(row.updated_at),
    version: numberValue(row.version),
  }));
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
  const [summaryResult, monthlyResult, channelsResult, productsResult, deliveriesResult] =
    await db.batch<DbRow>([
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
      db.prepare(
        "SELECT * FROM v_admin_channel_metrics ORDER BY valid_orders_count DESC, name ASC",
      ),
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
