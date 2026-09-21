import type {
  BusinessArea,
  BusinessAreaMetric,
  BusinessHubData,
  BusinessSystemStatus,
} from "@/lib/business-hub-contracts";

type DbValue = string | number | null;
type DbRow = Record<string, DbValue>;

function numberValue(value: DbValue | undefined): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function stringValue(value: DbValue | undefined): string {
  return value == null ? "" : String(value);
}

function metrics(
  row: DbRow | undefined,
  definitions: Array<[string, string, string?]>,
): BusinessAreaMetric[] {
  return definitions.map(([key, label, unit]) => {
    const value = numberValue(row?.[key]);
    return { label, value, unit, attention: key.includes("attention") && value > 0 };
  });
}

export async function getBusinessHubData(db: D1Database): Promise<BusinessHubData> {
  const results = await db.batch<DbRow>([
    db.prepare(`
      SELECT
        COUNT(DISTINCT sl.id) AS locations,
        COALESCE(SUM(il.on_hand_quantity), 0) AS on_hand,
        COALESCE(SUM(il.reserved_quantity), 0) AS reserved,
        COALESCE(SUM(CASE WHEN va.available_quantity <= 3 THEN 1 ELSE 0 END), 0) AS attention_low_stock
      FROM stock_locations sl
      LEFT JOIN inventory_levels il ON il.location_id = sl.id
      LEFT JOIN v_inventory_available va ON va.variant_id = il.variant_id
    `),
    db.prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END), 0) AS issued,
        COALESCE(SUM(CASE WHEN status IN ('draft', 'error') THEN 1 ELSE 0 END), 0) AS attention_pending,
        COALESCE(SUM(total_bani), 0) AS total_bani
      FROM invoices
    `),
    db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM delivery_provider_accounts WHERE status = 'active') AS active_providers,
        (SELECT COUNT(*) FROM shipments WHERE status IN ('pending', 'label_created', 'in_transit')) AS open_shipments,
        (SELECT COUNT(*) FROM orders WHERE fulfillment_status IN ('unfulfilled', 'partial')) AS attention_unfulfilled,
        (SELECT COUNT(*) FROM fulfillment_locations WHERE status = 'active') AS active_locations
    `),
    db.prepare(`
      SELECT
        COUNT(*) AS channels,
        COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active,
        COALESCE(SUM(CASE WHEN status IN ('degraded', 'setup_required') THEN 1 ELSE 0 END), 0) AS attention_setup,
        (SELECT COUNT(*) FROM sync_jobs WHERE status IN ('queued', 'running', 'retrying')) AS sync_jobs
      FROM sales_channels
    `),
    db.prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END), 0) AS published,
        COALESCE(SUM(CASE WHEN status IN ('review', 'approved', 'scheduled') THEN 1 ELSE 0 END), 0) AS scheduled,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS attention_failed
      FROM social_posts
    `),
    db.prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN customer_type = 'registered' THEN 1 ELSE 0 END), 0) AS registered,
        COALESCE(SUM(order_count), 0) AS orders,
        COALESCE(SUM(lifetime_value_bani), 0) AS lifetime_value_bani
      FROM customers WHERE status != 'anonymized'
    `),
    db.prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN read_at IS NULL AND dismissed_at IS NULL THEN 1 ELSE 0 END), 0) AS attention_unread,
        (SELECT COUNT(*) FROM notification_deliveries WHERE status = 'failed') AS attention_failed,
        (SELECT COUNT(*) FROM push_subscriptions WHERE status = 'active') AS push_devices
      FROM admin_notifications
      WHERE dismissed_at IS NULL
    `),
    db.prepare(`
      SELECT
        COUNT(*) AS subscribers,
        COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active,
        (SELECT COUNT(*) FROM newsletter_campaigns WHERE status IN ('approved', 'scheduled', 'sending')) AS scheduled,
        COALESCE(SUM(CASE WHEN status IN ('bounced', 'complained') THEN 1 ELSE 0 END), 0) AS attention_delivery
      FROM newsletter_subscribers
    `),
    db.prepare(`
      SELECT
        COUNT(*) AS agents,
        COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active,
        (SELECT COUNT(*) FROM ai_runs WHERE status IN ('queued', 'running')) AS runs,
        (SELECT COUNT(*) FROM approval_requests WHERE status = 'pending') AS attention_approvals
      FROM ai_agents
    `),
    db.prepare(`
      SELECT id, 'shipping' AS area, provider, label, status,
             CASE WHEN last_error_message IS NOT NULL THEN last_error_message ELSE environment END AS detail
      FROM delivery_provider_accounts
      UNION ALL
      SELECT id, 'platforms', provider, account_label, status, environment
      FROM integration_accounts
      UNION ALL
      SELECT id, 'posts', provider, label, status, account_type
      FROM social_accounts
      UNION ALL
      SELECT id, 'ai', code, name, status, approval_policy
      FROM ai_agents
      ORDER BY area, label
    `),
  ]);

  const areas: BusinessArea[] = [
    "inventory",
    "billing",
    "shipping",
    "platforms",
    "posts",
    "customers",
    "notifications",
    "newsletter",
    "ai",
  ];
  const definitions: Record<BusinessArea, Array<[string, string, string?]>> = {
    traffic: [],
    inventory: [
      ["locations", "Locații"],
      ["on_hand", "În stoc"],
      ["reserved", "Rezervate"],
      ["attention_low_stock", "Stoc critic"],
    ],
    billing: [
      ["total", "Documente"],
      ["issued", "Emise"],
      ["attention_pending", "De procesat"],
      ["total_bani", "Valoare", "bani"],
    ],
    shipping: [
      ["active_providers", "Curieri activi"],
      ["open_shipments", "Livrări deschise"],
      ["attention_unfulfilled", "Fără livrare"],
      ["active_locations", "Puncte active"],
    ],
    platforms: [
      ["channels", "Canale"],
      ["active", "Active"],
      ["attention_setup", "Necesită atenție"],
      ["sync_jobs", "Sincronizări"],
    ],
    posts: [
      ["total", "Postări"],
      ["published", "Publicate"],
      ["scheduled", "Planificate"],
      ["attention_failed", "Eșuate"],
    ],
    customers: [
      ["total", "Clienți"],
      ["registered", "Conturi"],
      ["orders", "Comenzi"],
      ["lifetime_value_bani", "Valoare", "bani"],
    ],
    notifications: [
      ["total", "Alerte"],
      ["attention_unread", "Necitite"],
      ["attention_failed", "Livrări eșuate"],
      ["push_devices", "Dispozitive push"],
    ],
    newsletter: [
      ["subscribers", "Abonați"],
      ["active", "Activi"],
      ["scheduled", "Campanii active"],
      ["attention_delivery", "Probleme livrare"],
    ],
    ai: [
      ["agents", "Agenți"],
      ["active", "Activi"],
      ["runs", "Rulări"],
      ["attention_approvals", "Aprobări"],
    ],
  };

  const metricMap = Object.fromEntries(
    areas.map((area, index) => [area, metrics(results[index].results[0], definitions[area])]),
  ) as Record<BusinessArea, BusinessAreaMetric[]>;
  const systems: BusinessSystemStatus[] = results[9].results.map((row) => ({
    id: stringValue(row.id),
    area: stringValue(row.area) as BusinessArea,
    provider: stringValue(row.provider),
    label: stringValue(row.label),
    status: stringValue(row.status),
    detail: stringValue(row.detail),
  }));
  metricMap.traffic = [];

  return { metrics: metricMap, systems, generatedAt: new Date().toISOString() };
}
