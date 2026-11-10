import { digestHex } from "../integrations/provider-runtime";
import {
  consumedTrendyolPackage,
  inactiveTrendyolPackage,
  TrendyolReviewError,
  type TrendyolPackage,
} from "../integrations/trendyol";

type Variant = {
  id: string;
  product_id: string;
  name: string;
  product_name: string;
  sku: string;
  inventory_policy: string;
  tax_rate_bps: number;
  location_id: string | null;
};
type Source = {
  order_id: string;
  source_hash: string;
  source_modified_ms: number;
  version: number;
  review_code: string | null;
  snapshot_json: string;
};
type Reservation = { variant_id: string; quantity: number; status: string; location_id: string };
/** One central order per seller/orderNumber. A full V2 snapshot contains all shipment packages. */
export async function importTrendyolOrder(
  db: D1Database,
  packages: TrendyolPackage[],
  actorId: string | null = null,
) {
  if (!packages.length || packages.length > 20) throw new TrendyolReviewError("PACKAGE_LIMIT");
  packages = [...packages].sort((a, b) => a.id.localeCompare(b.id));
  const first = packages[0];
  if (
    packages.some((p) => p.sellerId !== first.sellerId || p.orderNumber !== first.orderNumber) ||
    new Set(packages.map((p) => p.id)).size !== packages.length
  )
    throw new TrendyolReviewError("ORDER_ID_MISMATCH");
  const snapshot = JSON.stringify(packages),
    hash = await digestHex("SHA-256", snapshot),
    modified = Math.max(...packages.map((p) => p.lastModified));
  const existing = await db
    .prepare(
      "SELECT * FROM marketplace_order_sources WHERE provider='trendyol' AND seller_id=?1 AND external_order_id=?2",
    )
    .bind(first.sellerId, first.orderNumber)
    .first<Source>();
  if (existing) {
    if (existing.source_modified_ms > modified)
      return { orderId: existing.order_id, replayed: true, reviewCode: existing.review_code };
    const old = JSON.parse(existing.snapshot_json) as TrendyolPackage[];
    if (
      old.some(
        (p) =>
          !packages.some((n) => n.id === p.id) ||
          packages.some((n) => n.id === p.id && n.lastModified < p.lastModified),
      )
    )
      throw new TrendyolReviewError("INCOMPLETE_OR_OLDER_PACKAGE_SET");
    if (existing.source_hash === hash && !existing.review_code)
      return { orderId: existing.order_id, replayed: true, reviewCode: null };
    if (existing.source_hash !== hash && existing.source_modified_ms === modified)
      throw new TrendyolReviewError("SOURCE_REVISION_CONFLICT");
  }
  const skus = [...new Set(packages.flatMap((p) => p.lines.map((l) => l.sku)))];
  const variants = (
    await db
      .prepare(
        `SELECT pv.id,pv.product_id,pv.name,p.name AS product_name,pv.sku,pv.inventory_policy,p.tax_rate_bps,
    (SELECT il.location_id FROM inventory_levels il JOIN stock_locations sl ON sl.id=il.location_id WHERE il.variant_id=pv.id AND sl.active=1 AND sl.location_type!='virtual' ORDER BY il.on_hand_quantity DESC,il.location_id LIMIT 1) AS location_id
    FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE pv.sku IN (${skus.map((_, i) => `?${i + 1}`).join(",")}) AND pv.status='active'`,
      )
      .bind(...skus)
      .all<Variant>()
  ).results;
  if (skus.some((s) => variants.filter((v) => v.sku === s).length !== 1))
    throw new TrendyolReviewError("SKU_MAPPING_REQUIRED");
  if (
    existing?.source_hash === hash &&
    existing.review_code === "STOCK_BASELINE_REQUIRED" &&
    variants.some((v) => v.inventory_policy !== "deny" || !v.location_id)
  )
    return { orderId: existing.order_id, replayed: true, reviewCode: existing.review_code };
  const active = packages.filter((p) => !inactiveTrendyolPackage(p.status));
  const itemSignature = (rows: TrendyolPackage[]) =>
    JSON.stringify(
      rows
        .filter((p) => !inactiveTrendyolPackage(p.status))
        .map((p) => ({
          id: p.id,
          lines: p.lines
            .map((l) => ({
              id: l.id,
              sku: l.sku,
              quantity: l.quantity,
              gross: l.gross,
              sellerDiscount: l.sellerDiscount,
              platformDiscount: l.platformDiscount,
              net: l.net,
            }))
            .sort((a, b) => a.id.localeCompare(b.id)),
        })),
    );
  const rewriteItems =
    !existing ||
    itemSignature(JSON.parse(existing.snapshot_json) as TrendyolPackage[]) !==
      itemSignature(packages);
  const gross = active.reduce((n, p) => n + p.gross, 0),
    total = active.reduce((n, p) => n + p.net, 0),
    discount = gross - total;
  const orderId =
    existing?.order_id ||
    `ty-${(await digestHex("SHA-256", first.sellerId + ":" + first.orderNumber)).slice(0, 28)}`;
  const current = await db
    .prepare("SELECT total_bani,paid_bani,refunded_bani FROM orders WHERE id=?1")
    .bind(orderId)
    .first<{ total_bani: number; paid_bani: number; refunded_bani: number }>();
  const invoiced = await db
    .prepare(
      "SELECT count(*) AS n FROM invoices WHERE order_id=?1 AND status NOT IN ('cancelled','error','draft')",
    )
    .bind(orderId)
    .first<{ n: number }>();
  if (
    current &&
    ((invoiced?.n && (current.total_bani !== total || rewriteItems)) ||
      current.paid_bani > total ||
      current.refunded_bani > 0)
  )
    throw new TrendyolReviewError("FINANCIAL_RECONCILIATION_REQUIRED");
  const existingReservations = (
    await db
      .prepare(
        "SELECT variant_id,quantity,status,location_id FROM inventory_reservations WHERE order_id=?1 AND status IN ('active','consumed')",
      )
      .bind(orderId)
      .all<Reservation>()
  ).results;
  const reviewCode = variants.some((v) => v.inventory_policy !== "deny" || !v.location_id)
    ? "STOCK_BASELINE_REQUIRED"
    : null;
  const now = new Date().toISOString(),
    token = crypto.randomUUID();
  const status =
    active.length === 0
      ? "cancelled"
      : active.every((p) => p.status === "Delivered")
        ? "completed"
        : active.some((p) => p.status === "Awaiting")
          ? "pending"
          : "processing";
  const fulfillment =
    active.length === 0
      ? "unfulfilled"
      : active.every((p) => p.status === "Returned")
        ? "returned"
        : active.every((p) => p.status === "Delivered")
          ? "delivered"
          : active.some((p) => consumedTrendyolPackage(p.status))
            ? "shipped"
            : reviewCode
              ? "unfulfilled"
              : "reserved";
  const statements: D1PreparedStatement[] = [];
  const push = (sql: string, ...args: (string | number | null)[]) =>
    statements.push(db.prepare(sql).bind(...args));
  push(
    `INSERT OR IGNORE INTO orders(id,order_number,public_token,idempotency_key,channel_id,external_order_id,order_status,payment_status,fulfillment_status,currency,subtotal_bani,discount_bani,total_bani,customer_name,customer_email,customer_phone_e164,placed_at,confirmed_at,payment_method_requested,shipping_option_requested)
    VALUES(?1,?2,?3,?4,'channel_trendyol',?5,?6,'authorized',?7,'RON',?8,?9,?10,?11,?12,?13,?14,?15,'bank_transfer','home_delivery')`,
    orderId,
    `TY-${first.orderNumber}`,
    crypto.randomUUID(),
    `trendyol:${first.sellerId}:${first.orderNumber}`,
    first.orderNumber,
    status,
    fulfillment,
    gross,
    discount,
    total,
    first.customerName || first.shipping.name,
    first.customerEmail || null,
    first.shipping.phone,
    new Date(Math.min(...packages.map((p) => p.orderDate))).toISOString(),
    now,
  );
  push(
    `INSERT INTO marketplace_order_sources(order_id,provider,seller_id,external_order_id,source_modified_ms,source_hash,snapshot_json,mutation_token,review_code)
    SELECT ?1,'trendyol',?2,?3,?4,?5,?6,?7,?8 WHERE EXISTS(SELECT 1 FROM orders WHERE id=?1)
    ON CONFLICT(order_id) DO UPDATE SET source_modified_ms=excluded.source_modified_ms,source_hash=excluded.source_hash,snapshot_json=excluded.snapshot_json,mutation_token=excluded.mutation_token,review_code=excluded.review_code,version=marketplace_order_sources.version+1,updated_at=excluded.imported_at
    WHERE marketplace_order_sources.version=?9 AND marketplace_order_sources.source_modified_ms<=excluded.source_modified_ms`,
    orderId,
    first.sellerId,
    first.orderNumber,
    modified,
    hash,
    snapshot,
    token,
    reviewCode,
    existing?.version ?? 0,
  );
  const gate = `EXISTS(SELECT 1 FROM marketplace_order_sources WHERE order_id='${orderId}' AND mutation_token='${token}')`;
  push(
    `UPDATE orders SET order_status=?1,fulfillment_status=?2,subtotal_bani=?3,discount_bani=?4,total_bani=?5,customer_name=?6,customer_email=?7,customer_phone_e164=?8,version=version+1,updated_at=?9 WHERE id=?10 AND ${gate}`,
    status,
    fulfillment,
    gross,
    discount,
    total,
    first.customerName || first.shipping.name,
    first.customerEmail || null,
    first.shipping.phone,
    now,
    orderId,
  );
  if (rewriteItems) push(`DELETE FROM order_items WHERE order_id=?1 AND ${gate}`, orderId);
  for (const p of rewriteItems ? active : [])
    for (const line of p.lines) {
      const v = variants.find((v) => v.sku === line.sku)!;
      push(
        `INSERT INTO order_items(id,order_id,product_id,variant_id,sku,product_name,variant_name,quantity,unit_price_bani,unit_discount_bani,tax_rate_bps,line_subtotal_bani,line_discount_bani,line_total_bani,personalization_json)
      SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15 WHERE ${gate}`,
        `${orderId}-${p.id}-${line.id}`,
        orderId,
        v.product_id,
        v.id,
        v.sku,
        v.product_name,
        v.name,
        line.quantity,
        Math.round(line.gross / line.quantity),
        Math.round((line.gross - line.net) / line.quantity),
        v.tax_rate_bps,
        line.gross,
        line.gross - line.net,
        line.net,
        JSON.stringify({
          source: "trendyol",
          packageId: p.id,
          lineId: line.id,
          sourceName: line.sourceName,
          sourceVatRate: line.sourceVatRate,
          sellerDiscountBani: line.sellerDiscount,
          platformDiscountBani: line.platformDiscount,
        }),
      );
    }
  for (const [kind, a] of [
    ["shipping", first.shipping],
    ["billing", first.billing],
  ] as const)
    push(
      `INSERT INTO order_addresses(id,order_id,address_type,full_name,phone_e164,line1,line2,city,county,postal_code,country_code,company_name,tax_id)
    SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13 WHERE ${gate}
    ON CONFLICT(order_id,address_type) DO UPDATE SET full_name=excluded.full_name,phone_e164=excluded.phone_e164,line1=excluded.line1,line2=excluded.line2,city=excluded.city,county=excluded.county,postal_code=excluded.postal_code,country_code=excluded.country_code,company_name=excluded.company_name,tax_id=excluded.tax_id`,
      `${orderId}-${kind}`,
      orderId,
      kind,
      a.name,
      a.phone,
      a.line1,
      a.line2,
      a.city,
      a.county,
      a.postalCode,
      a.country || "RO",
      a.companyName || null,
      a.taxId || null,
    );
  if (!reviewCode) {
    // Existing triggers own the counters. Release+replace occurs inside one atomic D1 batch.
    push(
      `UPDATE inventory_reservations SET status='released',updated_at=?1 WHERE order_id=?2 AND status='active' AND ${gate}`,
      now,
      orderId,
    );
    for (const v of variants) {
      const consumed = existingReservations
        .filter((r) => r.variant_id === v.id && r.status === "consumed")
        .reduce((n, r) => n + r.quantity, 0);
      const shipped = active
        .filter((p) => consumedTrendyolPackage(p.status))
        .reduce(
          (n, p) => n + p.lines.filter((l) => l.sku === v.sku).reduce((n, l) => n + l.quantity, 0),
          0,
        );
      const held = active
        .filter((p) => !consumedTrendyolPackage(p.status))
        .reduce(
          (n, p) => n + p.lines.filter((l) => l.sku === v.sku).reduce((n, l) => n + l.quantity, 0),
          0,
        );
      if (shipped < consumed)
        throw new TrendyolReviewError("PHYSICAL_STOCK_RECONCILIATION_REQUIRED");
      for (const [purpose, quantity] of [
        ["held", held],
        ["consumed", shipped - consumed],
      ] as const)
        if (quantity > 0) {
          const rid = `ty-${token}-${v.id}-${purpose}`;
          push(
            `INSERT INTO inventory_reservations(id,variant_id,location_id,order_id,quantity,status,expires_at) SELECT ?1,?2,?3,?4,?5,'active','9999-12-31T23:59:59Z' WHERE ${gate}`,
            rid,
            v.id,
            v.location_id,
            orderId,
            quantity,
          );
          if (purpose === "consumed") {
            push(
              `UPDATE inventory_reservations SET status='consumed',updated_at=?1 WHERE id=?2 AND status='active' AND ${gate}`,
              now,
              rid,
            );
            push(
              `INSERT INTO inventory_movements(id,variant_id,location_id,movement_type,quantity_delta,reference_type,reference_id,reason) SELECT ?1,?2,?3,'sale',?4,'trendyol',?5,'Predare confirmată de Trendyol' WHERE ${gate}`,
              rid,
              v.id,
              v.location_id,
              -quantity,
              orderId,
            );
          }
        }
    }
  }
  for (const p of packages) {
    push(
      `INSERT INTO marketplace_packages(id,order_id,provider,external_package_id,status,cargo_provider,cargo_number,shipment_number,invoice_status,invoice_number,gross_bani,seller_discount_bani,platform_discount_bani,invoice_total_bani,campaigns_json,source_modified_ms)
      SELECT ?1,?2,'trendyol',?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15 WHERE ${gate}
      ON CONFLICT(id) DO UPDATE SET status=excluded.status,cargo_provider=excluded.cargo_provider,cargo_number=excluded.cargo_number,shipment_number=excluded.shipment_number,invoice_status=excluded.invoice_status,invoice_number=excluded.invoice_number,gross_bani=excluded.gross_bani,seller_discount_bani=excluded.seller_discount_bani,platform_discount_bani=excluded.platform_discount_bani,invoice_total_bani=excluded.invoice_total_bani,campaigns_json=excluded.campaigns_json,source_modified_ms=excluded.source_modified_ms`,
      `${orderId}-${p.id}`,
      orderId,
      p.id,
      p.status,
      p.carrier,
      p.cargoNumber,
      p.shipmentNumber,
      p.invoiceStatus,
      p.invoiceNumber,
      p.gross,
      p.sellerDiscount,
      p.platformDiscount,
      p.net,
      JSON.stringify(p.campaigns),
      p.lastModified,
    );
  }
  push(
    `INSERT INTO order_events(id,order_id,event_type,actor_type,actor_id,message,metadata_json) SELECT ?1,?2,'trendyol.synced','integration',?3,'Comandă reconciliată prin API Trendyol V2',?4 WHERE ${gate}`,
    crypto.randomUUID(),
    orderId,
    actorId,
    JSON.stringify({ sourceHash: hash, sourceModified: modified, reviewCode }),
  );
  push(
    `INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json,metadata_json) SELECT ?1,?2,'Trendyol API','trendyol.order.sync','order',?3,?4,'{}' WHERE ${gate}`,
    crypto.randomUUID(),
    actorId,
    orderId,
    JSON.stringify({ grossBani: gross, discountBani: discount, totalBani: total, reviewCode }),
  );
  if (statements.length > 30) throw new TrendyolReviewError("ORDER_EXCEEDS_FREE_REQUEST_BUDGET");
  const results = await db.batch(statements);
  if (!results[1].meta.changes) throw new TrendyolReviewError("CONCURRENT_IMPORT_RETRY");
  return { orderId, replayed: false, reviewCode };
}
