import { z } from "zod";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import {
  formatSku,
  gtinType,
  safePublicDestination,
  skuPrefix,
} from "@/lib/product-identification";
import { productPath } from "@/lib/product-url";
import { boundedJson } from "./bounded-json";

const id = z.string().min(1).max(128);
const importRowSchema = z.object({
  variantId: id,
  gtin: z.string().trim().max(14).default(""),
  source: z.enum(["gs1", "supplier", "manufacturer"]).default("supplier"),
  sourceReference: z.string().trim().max(240).default(""),
  lotQuantity: z.number().int().min(0).max(1_000_000).default(0),
  locationId: id.nullable().optional(),
  lotSourceKind: z.enum(["supplier", "in_house"]).default("supplier"),
  supplierReference: z.string().trim().max(240).default(""),
  receivedAt: z.string().date().optional(),
});
const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("variant.create"),
    productId: id,
    name: z.string().trim().min(2).max(120),
    priceBani: z.number().int().min(1).max(10_000_000),
  }),
  z.object({
    action: z.literal("sku.change"),
    variantId: id,
    expectedVersion: z.number().int().positive(),
    sku: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,80}$/),
  }),
  z.object({
    action: z.literal("lot.create"),
    variantId: id,
    locationId: id,
    sourceKind: z.enum(["supplier", "in_house"]),
    supplierReference: z.string().trim().max(240).optional(),
    documentId: z.string().trim().min(1).max(128).nullable().optional(),
    receivedAt: z.string().date(),
    quantity: z.number().int().min(1).max(1_000_000),
    notes: z.string().trim().max(1000).optional(),
  }),
  z.object({
    action: z.literal("lot.allocate"),
    lotId: id,
    orderItemId: id,
    quantity: z.number().int().min(1).max(1_000_000),
  }),
  z.object({ action: z.literal("lot.release"), allocationId: id }),
  z.object({ action: z.literal("serial.create"), variantId: id, lotId: id.nullable().optional() }),
  z.object({
    action: z.literal("personalization.assign"),
    requestId: id.optional(),
    orderItemId: id.optional(),
  }),
  z.object({
    action: z.literal("personalization.status"),
    requestId: id,
    status: z.enum(["approved", "in_production", "cancelled"]),
  }),
  z.object({
    action: z.literal("import"),
    mode: z.enum(["preview", "apply"]),
    rows: z.array(importRowSchema).min(1).max(30),
  }),
]);

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  published_at: string | null;
  storefront_state: string;
};
type VariantRow = {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  status: string;
  version: number;
  ean_gtin: string | null;
  source_type: string | null;
  verification_status: string | null;
  gtin_type: string | null;
  on_hand: number;
  reserved: number;
};

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7).replace("-", "");
}

async function createVariant(
  db: D1Database,
  adminId: string,
  adminEmail: string,
  input: Extract<z.infer<typeof actionSchema>, { action: "variant.create" }>,
) {
  const product = await db
    .prepare(
      "SELECT id,name,category FROM products WHERE id=?1 AND product_type='music_box' AND status!='archived'",
    )
    .bind(input.productId)
    .first<{ id: string; name: string; category: string }>();
  if (!product) return json({ error: { code: "PRODUCT_NOT_FOUND" } }, 404);
  const duplicateName = await db
    .prepare(
      "SELECT id FROM product_variants WHERE product_id=?1 AND name=?2 COLLATE NOCASE AND status!='archived'",
    )
    .bind(input.productId, input.name)
    .first();
  if (duplicateName)
    return json(
      { error: { code: "VARIANT_NAME_EXISTS", message: "Această variantă există deja." } },
      409,
    );
  const prefix = skuPrefix(product.category, product.name);
  for (let attempt = 0; attempt < 5; attempt++) {
    const next = await db
      .prepare(
        `SELECT COALESCE(MAX(COALESCE(sequence_number,
      CAST(substr(sku,length(?1)+5) AS INTEGER))),0)+1 AS n
      FROM product_sku_registry WHERE prefix=?1 OR sku LIKE ?2`,
      )
      .bind(prefix, `CM-${prefix}-%`)
      .first<{ n: number }>();
    const sku = formatSku(prefix, next?.n ?? 1),
      variantId = crypto.randomUUID(),
      now = new Date().toISOString();
    try {
      await db.batch([
        db
          .prepare(
            "INSERT INTO product_sku_registry(sku,variant_id,prefix,sequence_number,assigned_by) VALUES(?1,?2,?3,?4,?5)",
          )
          .bind(sku, variantId, prefix, next?.n ?? 1, adminId),
        db
          .prepare(
            `INSERT INTO product_variants(id,product_id,sku,name,status,inventory_policy,attributes_json,sort_order,created_at,updated_at)
          VALUES(?1,?2,?3,?4,'inactive','deny','{}',
          (SELECT COALESCE(MAX(sort_order),0)+1 FROM product_variants WHERE product_id=?2),?5,?5)`,
          )
          .bind(variantId, input.productId, sku, input.name, now),
        db
          .prepare(
            `INSERT INTO inventory_levels(id,variant_id,location_id,on_hand_quantity,reserved_quantity,safety_stock_quantity)
          VALUES(?1,?2,'location_main',0,0,0)`,
          )
          .bind(crypto.randomUUID(), variantId),
        db
          .prepare(
            `INSERT INTO price_list_items(id,price_list_id,variant_id,price_bani,min_quantity)
          VALUES(?1,'price_list_website_ron',?2,?3,1)`,
          )
          .bind(crypto.randomUUID(), variantId, input.priceBani),
        db
          .prepare(
            "INSERT INTO product_identifier_history(id,variant_id,action,new_value,actor_admin_user_id) VALUES(?1,?2,'sku_assigned',?3,?4)",
          )
          .bind(crypto.randomUUID(), variantId, sku, adminId),
        db
          .prepare(
            "INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json,metadata_json) VALUES(?1,?2,?3,'product.variant.create','product_variant',?4,?5,'{}')",
          )
          .bind(
            crypto.randomUUID(),
            adminId,
            adminEmail,
            variantId,
            JSON.stringify({
              sku,
              name: input.name,
              status: "inactive",
              priceBani: input.priceBani,
            }),
          ),
      ]);
      return json({ data: { id: variantId, sku, status: "inactive" } }, 201);
    } catch (error) {
      if (
        attempt === 4 ||
        !/UNIQUE constraint failed.*(?:sku_registry|product_variants)/i.test(String(error))
      )
        throw error;
    }
  }
  return json({ error: { code: "SKU_ALLOCATION_FAILED" } }, 409);
}

async function listProducts(db: D1Database, siteUrl: string) {
  const rows = (
    await db
      .prepare(
        `SELECT p.id,p.slug,p.name,p.category,p.status,p.published_at,p.storefront_state,
      pv.id AS variant_id,pv.name AS variant_name,pv.sku,pv.ean_gtin,pv.status AS variant_status,
      pis.source_type,pis.verification_status,pis.gtin_type,
      COALESCE((SELECT SUM(il.on_hand_quantity-il.reserved_quantity) FROM inventory_levels il WHERE il.variant_id=pv.id),0) AS available_stock,
      (SELECT COUNT(*) FROM product_lots l WHERE l.variant_id=pv.id) AS lot_count
     FROM products p JOIN product_variants pv ON pv.product_id=p.id
     LEFT JOIN product_identifier_sources pis ON pis.id=(SELECT x.id FROM product_identifier_sources x
       WHERE x.variant_id=pv.id AND x.identifier_type IN ('GTIN','EAN') AND x.identifier_value=pv.ean_gtin
       ORDER BY x.created_at DESC LIMIT 1)
     ORDER BY p.name,pv.sort_order,pv.created_at`,
      )
      .all()
  ).results as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    ...row,
    public_url:
      row.status === "active"
        ? safePublicDestination(siteUrl, productPath(String(row.slug)))
        : null,
  }));
}

async function details(db: D1Database, productId: string, siteUrl: string, includeOrders: boolean) {
  const product = await db
    .prepare(
      "SELECT id,slug,name,status,published_at,storefront_state FROM products WHERE id=?1 AND product_type='music_box'",
    )
    .bind(productId)
    .first<ProductRow>();
  if (!product) return null;
  const [variants, lots, history, documents, serials, personalizations, orderItems, locations] =
    await Promise.all([
      db
        .prepare(
          `SELECT pv.id,pv.product_id,pv.sku,pv.name,pv.status,pv.version,pv.ean_gtin,
        pis.source_type,pis.verification_status,pis.gtin_type,
        COALESCE((SELECT SUM(il.on_hand_quantity) FROM inventory_levels il WHERE il.variant_id=pv.id),0) AS on_hand,
        COALESCE((SELECT SUM(il.reserved_quantity) FROM inventory_levels il WHERE il.variant_id=pv.id),0) AS reserved
       FROM product_variants pv LEFT JOIN product_identifier_sources pis ON pis.id=(SELECT x.id FROM product_identifier_sources x WHERE x.variant_id=pv.id AND x.identifier_type IN ('EAN','GTIN') AND x.identifier_value=pv.ean_gtin ORDER BY x.created_at DESC LIMIT 1)
       WHERE pv.product_id=?1 ORDER BY pv.sort_order,pv.created_at`,
        )
        .bind(productId)
        .all<VariantRow>(),
      db
        .prepare(
          `SELECT l.id,l.lot_code,l.variant_id,l.location_id,sl.name AS location_name,l.source_kind,
        l.supplier_reference,l.document_id,l.received_at,l.initial_quantity,l.notes,
        l.initial_quantity-COALESCE((SELECT SUM(a.quantity) FROM product_lot_allocations a WHERE a.lot_id=l.id AND a.status='allocated'),0) AS available_quantity
       FROM product_lots l JOIN stock_locations sl ON sl.id=l.location_id
       WHERE l.variant_id IN (SELECT id FROM product_variants WHERE product_id=?1)
       ORDER BY l.received_at DESC,l.created_at DESC`,
        )
        .bind(productId)
        .all(),
      db
        .prepare(
          `SELECT id,variant_id,action,old_value,new_value,metadata_json,created_at FROM product_identifier_history
       WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id=?1)
       ORDER BY created_at DESC LIMIT 100`,
        )
        .bind(productId)
        .all(),
      db
        .prepare(
          `SELECT pd.id,pd.document_type,pd.document_number,
       '/media/'||pm.id AS url
       FROM product_documents pd JOIN product_media pm ON pm.id=pd.media_id
       WHERE pd.product_id=?1 AND pd.review_status='verified' AND pm.status='active'
         AND pm.public_access=1 AND pm.marketing_approved=1 AND pm.rights_status='cleared'
         AND pm.r2_key IS NOT NULL AND pd.document_type IN ('instructions','safety','warranty')
       ORDER BY pd.created_at DESC`,
        )
        .bind(productId)
        .all(),
      db
        .prepare(
          "SELECT id,variant_id,lot_id,serial_code,order_item_id,created_at FROM product_serials WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id=?1) ORDER BY created_at DESC LIMIT 100",
        )
        .bind(productId)
        .all(),
      includeOrders
        ? db
            .prepare(
              `SELECT pi.code,pi.request_id,pi.order_item_id,pi.variant_id,
            COALESCE(pr.status,o.fulfillment_status) AS production_status,pi.created_at
           FROM personalization_identifiers pi
           LEFT JOIN personalization_requests pr ON pr.id=pi.request_id
           LEFT JOIN order_items oi ON oi.id=pi.order_item_id
           LEFT JOIN orders o ON o.id=oi.order_id
           WHERE pi.product_id=?1 ORDER BY pi.created_at DESC LIMIT 100`,
            )
            .bind(productId)
            .all()
        : Promise.resolve({ results: [] }),
      includeOrders
        ? db
            .prepare(
              `SELECT oi.id,oi.variant_id,oi.quantity,oi.product_name,o.order_number,o.fulfillment_status,
        oi.quantity-COALESCE((SELECT SUM(a.quantity) FROM product_lot_allocations a WHERE a.order_item_id=oi.id AND a.status='allocated'),0) AS unallocated
       FROM order_items oi JOIN orders o ON o.id=oi.order_id
       WHERE oi.product_id=?1 AND o.order_status!='cancelled' AND o.fulfillment_status IN ('packed','shipped','delivered')
       ORDER BY o.created_at DESC LIMIT 100`,
            )
            .bind(productId)
            .all()
        : Promise.resolve({ results: [] }),
      db.prepare("SELECT id,name FROM stock_locations WHERE active=1 ORDER BY name").all(),
    ]);
  const publicUrl =
    product.status === "active" ? safePublicDestination(siteUrl, productPath(product.slug)) : null;
  return {
    product,
    publicUrl,
    variants: variants.results,
    lots: lots.results,
    history: history.results,
    documents: documents.results
      .map((row) => ({ ...row, url: safePublicDestination(siteUrl, String(row.url)) }))
      .filter((row) => row.url),
    serials: serials.results,
    personalizations: personalizations.results,
    orderItems: orderItems.results,
    locations: locations.results,
  };
}

async function changeSku(
  db: D1Database,
  adminId: string,
  adminEmail: string,
  input: Extract<z.infer<typeof actionSchema>, { action: "sku.change" }>,
) {
  const variant = await db
    .prepare(
      `SELECT pv.id,pv.sku,pv.version,p.published_at FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE pv.id=?1`,
    )
    .bind(input.variantId)
    .first<{ id: string; sku: string; version: number; published_at: string | null }>();
  if (!variant) return json({ error: { code: "NOT_FOUND" } }, 404);
  if (variant.published_at)
    return json(
      { error: { code: "PUBLISHED_SKU_IMMUTABLE", message: "SKU-ul publicat nu se mai schimbă." } },
      409,
    );
  if (variant.version !== input.expectedVersion)
    return json({ error: { code: "VERSION_CONFLICT" } }, 409);
  if (variant.sku === input.sku)
    return json({ data: { sku: input.sku, version: variant.version } });
  const reserved = await db
    .prepare("SELECT variant_id FROM product_sku_registry WHERE sku=?1")
    .bind(input.sku)
    .first<{ variant_id: string }>();
  if (reserved && reserved.variant_id !== input.variantId)
    return json(
      {
        error: {
          code: "SKU_RESERVED",
          message: "Codul a fost deja folosit, inclusiv de un produs arhivat.",
        },
      },
      409,
    );
  const historyId = crypto.randomUUID();
  const result = await db.batch([
    db
      .prepare(
        "UPDATE product_variants SET sku=?1,version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?2 AND version=?3 AND EXISTS(SELECT 1 FROM products p WHERE p.id=product_id AND p.published_at IS NULL)",
      )
      .bind(input.sku, input.variantId, input.expectedVersion),
    db
      .prepare(
        "INSERT INTO product_identifier_history(id,variant_id,action,old_value,new_value,actor_admin_user_id) SELECT ?1,?2,'sku_changed',?3,?4,?5 WHERE changes()=1",
      )
      .bind(historyId, input.variantId, variant.sku, input.sku, adminId),
    db
      .prepare(
        "INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,before_json,after_json,metadata_json) SELECT ?1,?2,?3,'product.sku.change','product_variant',?4,?5,?6,'{}' WHERE EXISTS(SELECT 1 FROM product_identifier_history WHERE id=?7)",
      )
      .bind(
        crypto.randomUUID(),
        adminId,
        adminEmail,
        input.variantId,
        JSON.stringify({ sku: variant.sku }),
        JSON.stringify({ sku: input.sku }),
        historyId,
      ),
  ]);
  if (Number(result[0].meta.changes) !== 1)
    return json({ error: { code: "VERSION_CONFLICT" } }, 409);
  return json({ data: { sku: input.sku, version: input.expectedVersion + 1 } });
}

async function createLot(
  db: D1Database,
  adminId: string,
  adminEmail: string,
  input: Extract<z.infer<typeof actionSchema>, { action: "lot.create" }>,
) {
  const variant = await db
    .prepare("SELECT id,product_id FROM product_variants WHERE id=?1 AND status!='archived'")
    .bind(input.variantId)
    .first<{ id: string; product_id: string }>();
  const location = await db
    .prepare("SELECT id FROM stock_locations WHERE id=?1 AND active=1")
    .bind(input.locationId)
    .first();
  if (!variant || !location) return json({ error: { code: "INVALID_VARIANT_OR_LOCATION" } }, 404);
  if (input.documentId) {
    const doc = await db
      .prepare("SELECT id FROM product_documents WHERE id=?1 AND product_id=?2")
      .bind(input.documentId, variant.product_id)
      .first();
    if (!doc) return json({ error: { code: "INVALID_DOCUMENT" } }, 400);
  }
  const month = currentMonth();
  for (let attempt = 0; attempt < 5; attempt++) {
    const next = await db
      .prepare(
        "SELECT COALESCE(MAX(CAST(substr(lot_code,12) AS INTEGER)),0)+1 AS n FROM product_lots WHERE lot_code LIKE ?1",
      )
      .bind(`LOT-${month}-%`)
      .first<{ n: number }>();
    const code = `LOT-${month}-${String(next?.n ?? 1).padStart(3, "0")}`;
    const lotId = crypto.randomUUID(),
      movementId = crypto.randomUUID(),
      auditId = crypto.randomUUID();
    try {
      await db.batch([
        db
          .prepare(
            `INSERT INTO inventory_movements(id,variant_id,location_id,movement_type,quantity_delta,reference_type,reference_id,reason,actor_admin_user_id) VALUES(?1,?2,?3,'receipt',?4,'lot',?5,'Recepție lot',?6)`,
          )
          .bind(movementId, input.variantId, input.locationId, input.quantity, lotId, adminId),
        db
          .prepare(
            `INSERT INTO product_lots(id,lot_code,variant_id,location_id,source_kind,supplier_reference,document_id,received_at,initial_quantity,receipt_movement_id,notes,created_by) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)`,
          )
          .bind(
            lotId,
            code,
            input.variantId,
            input.locationId,
            input.sourceKind,
            input.supplierReference || null,
            input.documentId || null,
            input.receivedAt,
            input.quantity,
            movementId,
            input.notes || "",
            adminId,
          ),
        db
          .prepare(
            `INSERT INTO inventory_levels(id,variant_id,location_id,on_hand_quantity,reserved_quantity,safety_stock_quantity) VALUES(?1,?2,?3,?4,0,0) ON CONFLICT(variant_id,location_id) DO UPDATE SET on_hand_quantity=inventory_levels.on_hand_quantity+excluded.on_hand_quantity,version=inventory_levels.version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
          )
          .bind(crypto.randomUUID(), input.variantId, input.locationId, input.quantity),
        db
          .prepare(
            `INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json,metadata_json) VALUES(?1,?2,?3,'inventory.lot.receive','product_lot',?4,?5,'{}')`,
          )
          .bind(
            auditId,
            adminId,
            adminEmail,
            lotId,
            JSON.stringify({
              code,
              variantId: input.variantId,
              quantity: input.quantity,
              locationId: input.locationId,
            }),
          ),
      ]);
      return json({ data: { id: lotId, lotCode: code } }, 201);
    } catch (error) {
      if (attempt === 4 || !/UNIQUE constraint failed.*product_lots/i.test(String(error)))
        throw error;
    }
  }
  return json({ error: { code: "LOT_ALLOCATION_FAILED" } }, 409);
}

async function allocateLot(
  db: D1Database,
  adminId: string,
  adminEmail: string,
  input: Extract<z.infer<typeof actionSchema>, { action: "lot.allocate" }>,
) {
  const allocationId = crypto.randomUUID();
  const result = await db.batch([
    db
      .prepare(
        `INSERT INTO product_lot_allocations(id,lot_id,order_item_id,quantity,actor_admin_user_id)
    SELECT ?1,l.id,oi.id,?4,?5 FROM product_lots l JOIN order_items oi ON oi.id=?3 JOIN orders o ON o.id=oi.order_id
    WHERE l.id=?2 AND oi.variant_id=l.variant_id AND o.order_status!='cancelled'
      AND o.fulfillment_status IN ('packed','shipped','delivered')
      AND l.initial_quantity-COALESCE((SELECT SUM(a.quantity) FROM product_lot_allocations a WHERE a.lot_id=l.id AND a.status='allocated'),0)>=?4
      AND oi.quantity-COALESCE((SELECT SUM(a.quantity) FROM product_lot_allocations a WHERE a.order_item_id=oi.id AND a.status='allocated'),0)>=?4`,
      )
      .bind(allocationId, input.lotId, input.orderItemId, input.quantity, adminId),
    db
      .prepare(
        `INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json,metadata_json)
       SELECT ?1,?2,?3,'inventory.lot.allocate','lot_allocation',?4,?5,'{}' WHERE changes()=1`,
      )
      .bind(crypto.randomUUID(), adminId, adminEmail, allocationId, JSON.stringify(input)),
  ]);
  if (!result[0].meta.changes)
    return json(
      {
        error: {
          code: "LOT_ALLOCATION_CONFLICT",
          message: "Verifică varianta, starea comenzii și cantitățile disponibile.",
        },
      },
      409,
    );
  return json({ data: { id: allocationId } }, 201);
}

async function releaseLot(
  db: D1Database,
  adminId: string,
  adminEmail: string,
  allocationId: string,
) {
  const result = await db.batch([
    db
      .prepare(
        "UPDATE product_lot_allocations SET status='released',released_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?1 AND status='allocated'",
      )
      .bind(allocationId),
    db
      .prepare(
        `INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json,metadata_json)
       SELECT ?1,?2,?3,'inventory.lot.release','lot_allocation',?4,'{}','{}' WHERE changes()=1`,
      )
      .bind(crypto.randomUUID(), adminId, adminEmail, allocationId),
  ]);
  if (!result[0].meta.changes) return json({ error: { code: "NOT_FOUND" } }, 404);
  return json({ data: { released: true } });
}

async function createSerial(
  db: D1Database,
  adminId: string,
  adminEmail: string,
  input: Extract<z.infer<typeof actionSchema>, { action: "serial.create" }>,
) {
  const variant = await db
    .prepare("SELECT sku FROM product_variants WHERE id=?1 AND status!='archived'")
    .bind(input.variantId)
    .first<{ sku: string }>();
  if (!variant) return json({ error: { code: "VARIANT_NOT_FOUND" } }, 404);
  if (input.lotId) {
    const lot = await db
      .prepare("SELECT id FROM product_lots WHERE id=?1 AND variant_id=?2")
      .bind(input.lotId, input.variantId)
      .first();
    if (!lot) return json({ error: { code: "LOT_NOT_FOUND" } }, 404);
  }
  const month = currentMonth();
  for (let attempt = 0; attempt < 5; attempt++) {
    const prefix = `${variant.sku}-S${month}-`;
    const next = await db
      .prepare(
        "SELECT COALESCE(MAX(CAST(substr(serial_code,length(?1)+1) AS INTEGER)),0)+1 AS n FROM product_serials WHERE serial_code LIKE ?2",
      )
      .bind(prefix, `${prefix}%`)
      .first<{ n: number }>();
    const code = `${prefix}${String(next?.n ?? 1).padStart(4, "0")}`;
    try {
      const serialId = crypto.randomUUID();
      await db.batch([
        db
          .prepare(
            "INSERT INTO product_serials(id,variant_id,lot_id,serial_code,created_by) VALUES(?1,?2,?3,?4,?5)",
          )
          .bind(serialId, input.variantId, input.lotId ?? null, code, adminId),
        db
          .prepare(
            "INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json,metadata_json) VALUES(?1,?2,?3,'inventory.serial.create','product_serial',?4,?5,'{}')",
          )
          .bind(
            crypto.randomUUID(),
            adminId,
            adminEmail,
            serialId,
            JSON.stringify({ code, variantId: input.variantId, lotId: input.lotId ?? null }),
          ),
      ]);
      return json({ data: { serialCode: code } }, 201);
    } catch (error) {
      if (attempt === 4 || !/UNIQUE constraint failed.*product_serials/i.test(String(error)))
        throw error;
    }
  }
  return json({ error: { code: "SERIAL_ALLOCATION_FAILED" } }, 409);
}

async function assignPersonalization(
  db: D1Database,
  adminId: string,
  adminEmail: string,
  input: Extract<z.infer<typeof actionSchema>, { action: "personalization.assign" }>,
) {
  if (Boolean(input.requestId) === Boolean(input.orderItemId))
    return json({ error: { code: "ONE_SOURCE_REQUIRED" } }, 400);
  const existing = await db
    .prepare("SELECT code FROM personalization_identifiers WHERE request_id=?1 OR order_item_id=?2")
    .bind(input.requestId ?? null, input.orderItemId ?? null)
    .first<{ code: string }>();
  if (existing) return json({ data: { code: existing.code } });
  let productId: string | null = null;
  let variantId: string | null = null;
  if (input.requestId) {
    const request = await db
      .prepare("SELECT id FROM personalization_requests WHERE id=?1")
      .bind(input.requestId)
      .first();
    if (!request) return json({ error: { code: "REQUEST_NOT_FOUND" } }, 404);
  } else {
    const item = await db
      .prepare("SELECT id,product_id,variant_id,personalization_json FROM order_items WHERE id=?1")
      .bind(input.orderItemId)
      .first<{
        id: string;
        product_id: string;
        variant_id: string;
        personalization_json: string;
      }>();
    if (!item || !item.personalization_json || item.personalization_json === "{}")
      return json({ error: { code: "PERSONALIZATION_NOT_FOUND" } }, 404);
    productId = item.product_id;
    variantId = item.variant_id;
  }
  const month = currentMonth();
  for (let attempt = 0; attempt < 5; attempt++) {
    const next = await db
      .prepare(
        "SELECT COALESCE(MAX(CAST(substr(code,12) AS INTEGER)),0)+1 AS n FROM personalization_identifiers WHERE code LIKE ?1",
      )
      .bind(`PER-${month}-%`)
      .first<{ n: number }>();
    const code = `PER-${month}-${String(next?.n ?? 1).padStart(4, "0")}`;
    try {
      const identifierId = crypto.randomUUID();
      await db.batch([
        db
          .prepare(
            "INSERT INTO personalization_identifiers(id,code,request_id,order_item_id,product_id,variant_id,created_by) VALUES(?1,?2,?3,?4,?5,?6,?7)",
          )
          .bind(
            identifierId,
            code,
            input.requestId ?? null,
            input.orderItemId ?? null,
            productId,
            variantId,
            adminId,
          ),
        db
          .prepare(
            "INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json,metadata_json) VALUES(?1,?2,?3,'personalization.code.assign','personalization_identifier',?4,?5,'{}')",
          )
          .bind(
            crypto.randomUUID(),
            adminId,
            adminEmail,
            identifierId,
            JSON.stringify({
              code,
              requestId: input.requestId ?? null,
              orderItemId: input.orderItemId ?? null,
            }),
          ),
      ]);
      return json({ data: { code } }, 201);
    } catch (error) {
      if (
        attempt === 4 ||
        !/UNIQUE constraint failed.*personalization_identifiers/i.test(String(error))
      )
        throw error;
    }
  }
  return json({ error: { code: "PERSONALIZATION_ALLOCATION_FAILED" } }, 409);
}

async function updatePersonalizationStatus(
  db: D1Database,
  adminId: string,
  adminEmail: string,
  input: Extract<z.infer<typeof actionSchema>, { action: "personalization.status" }>,
) {
  const current = await db
    .prepare(
      `SELECT pi.id,pr.status FROM personalization_identifiers pi
    JOIN personalization_requests pr ON pr.id=pi.request_id WHERE pi.request_id=?1`,
    )
    .bind(input.requestId)
    .first<{ id: string; status: string }>();
  if (!current)
    return json(
      { error: { code: "CODE_NOT_ASSIGNED", message: "Alocă mai întâi un cod intern." } },
      404,
    );
  const transitions: Record<string, string[]> = {
    received: ["approved", "cancelled"],
    contacted: ["approved", "cancelled"],
    approved: ["in_production", "cancelled"],
    in_production: ["cancelled"],
  };
  if (!transitions[current.status]?.includes(input.status))
    return json(
      {
        error: {
          code: "INVALID_PRODUCTION_TRANSITION",
          message: "Starea de producție nu poate fi schimbată astfel.",
        },
      },
      409,
    );
  const result = await db.batch([
    db
      .prepare(
        "UPDATE personalization_requests SET status=?1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?2 AND status=?3",
      )
      .bind(input.status, input.requestId, current.status),
    db
      .prepare(
        "INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,before_json,after_json,metadata_json) SELECT ?1,?2,?3,'personalization.production.status','personalization_request',?4,?5,?6,'{}' WHERE changes()=1",
      )
      .bind(
        crypto.randomUUID(),
        adminId,
        adminEmail,
        input.requestId,
        JSON.stringify({ status: current.status }),
        JSON.stringify({ status: input.status }),
      ),
  ]);
  if (!result[0].meta.changes) return json({ error: { code: "VERSION_CONFLICT" } }, 409);
  return json({ data: { status: input.status } });
}

async function importIdentities(
  db: D1Database,
  adminId: string,
  adminEmail: string,
  input: Extract<z.infer<typeof actionSchema>, { action: "import" }>,
) {
  const errors: Array<{ row: number; message: string }> = [];
  const seenGtins = new Set<string>(),
    seenVariants = new Set<string>();
  const prepared: Array<{
    row: z.infer<typeof importRowSchema>;
    currentGtin: string | null;
    productId: string;
    version: number;
    locationId: string | null;
  }> = [];
  for (let index = 0; index < input.rows.length; index++) {
    const row = input.rows[index];
    if (seenVariants.has(row.variantId)) {
      errors.push({
        row: index + 1,
        message: "Varianta apare de mai multe ori. Combină loturile separat.",
      });
      continue;
    }
    seenVariants.add(row.variantId);
    const variant = await db
      .prepare(
        "SELECT id,product_id,ean_gtin,version FROM product_variants WHERE id=?1 AND status!='archived'",
      )
      .bind(row.variantId)
      .first<{ id: string; product_id: string; ean_gtin: string | null; version: number }>();
    if (!variant) {
      errors.push({ row: index + 1, message: "Varianta nu există sau este arhivată." });
      continue;
    }
    if (row.gtin) {
      if (!gtinType(row.gtin))
        errors.push({ row: index + 1, message: "GTIN invalid: lungime sau cifră de control." });
      const generatedSample = await db
        .prepare(
          `SELECT product_id FROM product_barcode_test_samples
           WHERE ean13_sample=?1 OR ean8_sample=?1 LIMIT 1`,
        )
        .bind(row.gtin)
        .first();
      if (generatedSample)
        errors.push({
          row: index + 1,
          message:
            "Codul generat pe generate.plus este doar pentru test, nu pentru import comercial.",
        });
      if (seenGtins.has(row.gtin))
        errors.push({ row: index + 1, message: "GTIN repetat în fișier." });
      seenGtins.add(row.gtin);
      if (variant.ean_gtin && variant.ean_gtin !== row.gtin)
        errors.push({
          row: index + 1,
          message: "Produsul are deja alt GTIN; importul nu suprascrie.",
        });
      const reserved = await db
        .prepare("SELECT variant_id FROM product_gtin_registry WHERE gtin=?1")
        .bind(row.gtin)
        .first<{ variant_id: string }>();
      if (reserved && reserved.variant_id !== row.variantId)
        errors.push({ row: index + 1, message: "GTIN rezervat altui produs, inclusiv arhivat." });
    }
    let locationId: string | null = null;
    if (row.lotQuantity > 0) {
      locationId = row.locationId ?? null;
      if (!locationId)
        errors.push({
          row: index + 1,
          message: "Pentru recepția lotului, completează location_id.",
        });
      else if (
        !(await db
          .prepare("SELECT id FROM stock_locations WHERE id=?1 AND active=1")
          .bind(locationId)
          .first())
      )
        errors.push({ row: index + 1, message: "Locația de stoc nu există sau este inactivă." });
    }
    if (!row.gtin && !row.lotQuantity)
      errors.push({
        row: index + 1,
        message: "Rândul nu conține GTIN sau cantitate de lot de adăugat.",
      });
    prepared.push({
      row,
      currentGtin: variant.ean_gtin,
      productId: variant.product_id,
      version: variant.version,
      locationId,
    });
  }
  const summary = {
    gtinAssignments: prepared.filter((entry) => entry.row.gtin && !entry.currentGtin).length,
    lotReceipts: prepared.filter((entry) => entry.row.lotQuantity > 0).length,
  };
  if (input.mode === "preview" || errors.length)
    return json(
      { data: { valid: errors.length === 0, errors, summary, rows: input.rows.length } },
      errors.length && input.mode === "apply" ? 409 : 200,
    );
  const month = currentMonth();
  const next = await db
    .prepare(
      "SELECT COALESCE(MAX(CAST(substr(lot_code,12) AS INTEGER)),0)+1 AS n FROM product_lots WHERE lot_code LIKE ?1",
    )
    .bind(`LOT-${month}-%`)
    .first<{ n: number }>();
  let lotSequence = next?.n ?? 1;
  const statements: D1PreparedStatement[] = [];
  for (const { row, currentGtin, version, locationId } of prepared) {
    if (row.gtin && !currentGtin) {
      statements.push(
        db
          .prepare(
            "UPDATE product_variants SET ean_gtin=?1,version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?2 AND version=?3 AND ean_gtin IS NULL",
          )
          .bind(row.gtin, row.variantId, version),
      );
      statements.push(
        db
          .prepare(
            `INSERT INTO product_identifier_sources(id,variant_id,identifier_type,identifier_value,source_type,source_reference,verification_status,gtin_type,assigned_at)
        VALUES(?1,?2,'GTIN',?3,?4,?5,'pending',?6,strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
          )
          .bind(
            crypto.randomUUID(),
            row.variantId,
            row.gtin,
            row.source,
            row.sourceReference || null,
            gtinType(row.gtin),
          ),
      );
      statements.push(
        db
          .prepare(
            "INSERT INTO product_identifier_history(id,variant_id,action,new_value,metadata_json,actor_admin_user_id) VALUES(?1,?2,'gtin_assigned',?3,?4,?5)",
          )
          .bind(
            crypto.randomUUID(),
            row.variantId,
            row.gtin,
            JSON.stringify({
              source: row.source,
              sourceReference: row.sourceReference,
              import: true,
            }),
            adminId,
          ),
      );
    }
    if (row.lotQuantity > 0 && locationId) {
      const lotId = crypto.randomUUID(),
        movementId = crypto.randomUUID(),
        code = `LOT-${month}-${String(lotSequence++).padStart(3, "0")}`;
      statements.push(
        db
          .prepare(
            "INSERT INTO inventory_movements(id,variant_id,location_id,movement_type,quantity_delta,reference_type,reference_id,reason,actor_admin_user_id) VALUES(?1,?2,?3,'receipt',?4,'lot',?5,'Import lot verificat',?6)",
          )
          .bind(movementId, row.variantId, locationId, row.lotQuantity, lotId, adminId),
      );
      statements.push(
        db
          .prepare(
            "INSERT INTO product_lots(id,lot_code,variant_id,location_id,source_kind,supplier_reference,received_at,initial_quantity,receipt_movement_id,created_by) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
          )
          .bind(
            lotId,
            code,
            row.variantId,
            locationId,
            row.lotSourceKind,
            row.supplierReference || null,
            row.receivedAt ?? new Date().toISOString().slice(0, 10),
            row.lotQuantity,
            movementId,
            adminId,
          ),
      );
      statements.push(
        db
          .prepare(
            "INSERT INTO inventory_levels(id,variant_id,location_id,on_hand_quantity,reserved_quantity,safety_stock_quantity) VALUES(?1,?2,?3,?4,0,0) ON CONFLICT(variant_id,location_id) DO UPDATE SET on_hand_quantity=inventory_levels.on_hand_quantity+excluded.on_hand_quantity,version=inventory_levels.version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')",
          )
          .bind(crypto.randomUUID(), row.variantId, locationId, row.lotQuantity),
      );
    }
  }
  statements.push(
    db
      .prepare(
        "INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json,metadata_json) VALUES(?1,?2,?3,'product.identification.import','product_identification',?4,?5,'{}')",
      )
      .bind(crypto.randomUUID(), adminId, adminEmail, crypto.randomUUID(), JSON.stringify(summary)),
  );
  await db.batch(statements);
  return json({ data: { applied: true, summary } });
}

export async function handleProductIdentification(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/v1/admin/product-identification") return null;
  if (!["GET", "POST"].includes(request.method))
    return json({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);
  try {
    if (request.method === "GET") {
      const admin = await authenticateAdminRequest(request, env, "catalog.read");
      await authenticateAdminRequest(request, env, "inventory.read");
      if (url.searchParams.get("export") === "1") {
        const [products, lots, personalizations] = await Promise.all([
          listProducts(env.DB, env.PUBLIC_SITE_URL),
          env.DB.prepare(
            `SELECT l.variant_id,l.lot_code,l.source_kind,l.supplier_reference,l.location_id,l.initial_quantity,
            l.initial_quantity-COALESCE((SELECT SUM(a.quantity) FROM product_lot_allocations a WHERE a.lot_id=l.id AND a.status='allocated'),0) AS available_quantity
            FROM product_lots l ORDER BY l.created_at DESC`,
          ).all(),
          admin.permissions.includes("orders.read")
            ? env.DB.prepare(
                `SELECT pi.code,pi.product_id,pi.variant_id,
              COALESCE(pr.status,o.fulfillment_status) AS production_status
             FROM personalization_identifiers pi
             LEFT JOIN personalization_requests pr ON pr.id=pi.request_id
             LEFT JOIN order_items oi ON oi.id=pi.order_item_id
             LEFT JOIN orders o ON o.id=oi.order_id
             ORDER BY pi.created_at DESC LIMIT 1000`,
              ).all()
            : Promise.resolve({ results: [] }),
        ]);
        return json({
          data: { products, lots: lots.results, personalizations: personalizations.results },
        });
      }
      const productId = url.searchParams.get("product");
      if (productId) {
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(productId))
          return json({ error: { code: "INVALID_PRODUCT" } }, 400);
        const data = await details(
          env.DB,
          productId,
          env.PUBLIC_SITE_URL,
          admin.permissions.includes("orders.read"),
        );
        return data ? json({ data }) : json({ error: { code: "PRODUCT_NOT_FOUND" } }, 404);
      }
      return json({ data: { products: await listProducts(env.DB, env.PUBLIC_SITE_URL) } });
    }
    const origin = request.headers.get("origin");
    if (origin && origin !== url.origin)
      return json({ error: { code: "ORIGIN_NOT_ALLOWED" } }, 403);
    if (Number(request.headers.get("content-length") ?? 0) > 65536)
      return json({ error: { code: "PAYLOAD_TOO_LARGE" } }, 413);
    const parsed = actionSchema.safeParse(await boundedJson(request, 65536));
    if (!parsed.success)
      return json({ error: { code: "INVALID_INPUT", issues: parsed.error.flatten() } }, 400);
    const input = parsed.data;
    const permission = input.action.startsWith("personalization.")
      ? "orders.write"
      : input.action.startsWith("lot.") || input.action === "serial.create"
        ? "inventory.write"
        : "catalog.write";
    const admin = await authenticateAdminRequest(request, env, permission);
    if (input.action === "lot.allocate" || input.action === "lot.release")
      await authenticateAdminRequest(request, env, "orders.read");
    if (input.action === "import" && input.rows.some((row) => row.lotQuantity > 0))
      await authenticateAdminRequest(request, env, "inventory.write");
    switch (input.action) {
      case "variant.create":
        return await createVariant(env.DB, admin.id, admin.email, input);
      case "sku.change":
        return await changeSku(env.DB, admin.id, admin.email, input);
      case "lot.create":
        return await createLot(env.DB, admin.id, admin.email, input);
      case "lot.allocate":
        return await allocateLot(env.DB, admin.id, admin.email, input);
      case "lot.release":
        return await releaseLot(env.DB, admin.id, admin.email, input.allocationId);
      case "serial.create":
        return await createSerial(env.DB, admin.id, admin.email, input);
      case "personalization.assign":
        return await assignPersonalization(env.DB, admin.id, admin.email, input);
      case "personalization.status":
        return await updatePersonalizationStatus(env.DB, admin.id, admin.email, input);
      case "import":
        return await importIdentities(env.DB, admin.id, admin.email, input);
    }
  } catch (error) {
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? Number(error.statusCode) || 500
        : 500;
    if (status >= 500) console.error("admin.product_identification.failed", error);
    return json(
      {
        error: {
          code:
            status === 401
              ? "UNAUTHORIZED"
              : status === 403
                ? "FORBIDDEN"
                : "IDENTIFICATION_FAILED",
          message:
            status >= 500
              ? "Operația nu a putut fi finalizată."
              : error instanceof Error
                ? error.message
                : "Acces refuzat.",
        },
      },
      status,
    );
  }
}
