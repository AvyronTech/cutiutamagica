import {
  trendyolCredentials,
  trendyolRequest,
  TrendyolReviewError,
} from "../integrations/trendyol";
import { type CommerceEnv } from "../integrations/provider-runtime";
import { observeTrendyolInventory, syncTrendyolOrders } from "./trendyol-sync";

/** Publish absolute stock only, preserving marketplace campaign/list/sale prices. */
export async function reconcileTrendyolStock(
  env: CommerceEnv,
  sku: string,
  allowIncrease = false,
  actorId: string | null = null,
) {
  // Never raise the external quantity while a newly placed order is waiting to import.
  const orders = await syncTrendyolOrders(env);
  if (orders.hasMore || orders.results.some((r) => !r.replayed))
    throw new TrendyolReviewError("ORDER_CATCHUP_REQUIRED");
  const state = await env.DB.prepare(
    "SELECT seller_id,last_order_sync_at,stock_buffer FROM trendyol_sync_state WHERE id=1 AND verified_at IS NOT NULL",
  ).first<{ seller_id: string; last_order_sync_at: string; stock_buffer: number }>();
  const issue = await env.DB.prepare(
    "SELECT count(*) AS n FROM trendyol_sync_issues WHERE status='open'",
  ).first<{ n: number }>();
  if (!state || issue?.n) throw new TrendyolReviewError("RESOLVE_ORDER_ISSUES_FIRST");
  const v = await env.DB.prepare(
    `SELECT pv.inventory_policy,COALESCE(SUM(CASE WHEN sl.active=1 AND sl.location_type!='virtual' THEN MAX(0,il.on_hand_quantity-il.reserved_quantity-il.safety_stock_quantity) ELSE 0 END),0) AS available
    FROM product_variants pv LEFT JOIN inventory_levels il ON il.variant_id=pv.id LEFT JOIN stock_locations sl ON sl.id=il.location_id WHERE pv.sku=?1 AND pv.status='active' GROUP BY pv.id`,
  )
    .bind(sku)
    .first<{ inventory_policy: string; available: number }>();
  if (!v || v.inventory_policy !== "deny") throw new TrendyolReviewError("STOCK_BASELINE_REQUIRED");
  const observed = await observeTrendyolInventory(env, sku),
    target = Math.max(0, v.available - state.stock_buffer);
  const unresolved = await env.DB.prepare(
    "SELECT id,status,payload_json,batch_id FROM trendyol_stock_updates WHERE json_extract(payload_json,'$.sku')=?1 AND status IN ('sending','accepted','uncertain') ORDER BY created_at DESC LIMIT 1",
  )
    .bind(sku)
    .first<{ id: string; status: string; payload_json: string; batch_id: string | null }>();
  if (unresolved) {
    const expected = JSON.parse(unresolved.payload_json) as { quantity: number };
    if (observed.quantity === expected.quantity) {
      await env.DB.prepare(
        "UPDATE trendyol_stock_updates SET status='confirmed',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?1",
      )
        .bind(unresolved.id)
        .run();
    } else if (unresolved.batch_id && /^[\w-]{1,200}$/.test(unresolved.batch_id)) {
      const credentials = await trendyolCredentials(env);
      const batch = (await trendyolRequest(
        credentials,
        `/integration/product/sellers/${credentials.sellerId}/products/batch-requests/${unresolved.batch_id}`,
      )) as { items?: { status?: string }[] };
      if (
        batch.items?.length === 1 &&
        ["SUCCESS", "FAILED"].includes(batch.items[0].status || "")
      ) {
        const completed = batch.items[0].status === "SUCCESS";
        await env.DB.prepare(
          "UPDATE trendyol_stock_updates SET status=?1,error_code=?2,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?3",
        )
          .bind(
            completed ? "confirmed" : "failed",
            completed ? null : "PROVIDER_STOCK_BATCH_FAILED",
            unresolved.id,
          )
          .run();
        if (!completed) throw new TrendyolReviewError("PROVIDER_STOCK_BATCH_FAILED");
      } else throw new TrendyolReviewError("STOCK_UPDATE_AWAITING_CONFIRMATION");
    } else throw new TrendyolReviewError("STOCK_UPDATE_AWAITING_CONFIRMATION");
  }
  if (target === observed.quantity)
    return { status: "confirmed", quantity: target, changed: false };
  // Polling cannot atomically lock another platform's checkout. Automatic decreases
  // are conservative; increases/restocks always require an administrator's action.
  if (target > observed.quantity && !allowIncrease)
    throw new TrendyolReviewError("STOCK_INCREASE_REQUIRES_APPROVAL");
  const c = await trendyolCredentials(env);
  if (c.sellerId !== state.seller_id) throw new TrendyolReviewError("ACCOUNT_OR_MARKET_MISMATCH");
  const token = crypto.randomUUID(),
    now = Date.now();
  const lock = await env.DB.prepare(
    "UPDATE trendyol_sync_state SET lease_token=?1,lease_until_ms=?2 WHERE id=1 AND lease_until_ms<?3",
  )
    .bind(token, now + 120000, now)
    .run();
  if (!lock.meta.changes) throw new TrendyolReviewError("SYNC_BUSY");
  try {
    const pending = await env.DB.prepare(
      "SELECT count(*) AS n FROM trendyol_stock_updates WHERE json_extract(payload_json,'$.sku')=?1 AND status IN ('sending','accepted','uncertain')",
    )
      .bind(sku)
      .first<{ n: number }>();
    if (pending?.n) throw new TrendyolReviewError("STOCK_UPDATE_AWAITING_CONFIRMATION");
    // Recheck after obtaining the write lease. A concurrent local checkout must not
    // publish an older larger availability. A later decrease is picked up next poll.
    const fresh = await env.DB.prepare(
      `SELECT COALESCE(SUM(MAX(0,il.on_hand_quantity-il.reserved_quantity-il.safety_stock_quantity)),0) AS n FROM inventory_levels il JOIN product_variants pv ON pv.id=il.variant_id JOIN stock_locations sl ON sl.id=il.location_id WHERE pv.sku=?1 AND sl.active=1 AND sl.location_type!='virtual'`,
    )
      .bind(sku)
      .first<{ n: number }>();
    if (Math.max(0, (fresh?.n ?? 0) - state.stock_buffer) !== target)
      throw new TrendyolReviewError("LOCAL_STOCK_CHANGED_RETRY");
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO trendyol_stock_updates(id,payload_json,status) VALUES(?1,?2,'sending')",
      ).bind(token, JSON.stringify({ sku, barcode: observed.barcode, quantity: target })),
      env.DB.prepare(
        "INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json) VALUES(?1,?2,'Trendyol API','trendyol.stock.request','product_variant',?3,?4)",
      ).bind(
        token,
        actorId,
        sku,
        JSON.stringify({ quantity: target, previous: observed.quantity, allowIncrease }),
      ),
    ]);
    try {
      const r = (await trendyolRequest(
        c,
        `/integration/inventory/sellers/${c.sellerId}/products/price-and-inventory`,
        {},
        { items: [{ barcode: observed.barcode, quantity: target }] },
      )) as { batchRequestId?: unknown };
      if (
        typeof r.batchRequestId !== "string" ||
        !r.batchRequestId ||
        r.batchRequestId.length > 200
      )
        throw new TrendyolReviewError("INVALID_STOCK_BATCH_RESPONSE");
      await env.DB.prepare(
        "UPDATE trendyol_stock_updates SET status='accepted',batch_id=?1 WHERE id=?2",
      )
        .bind(r.batchRequestId, token)
        .run();
      return { status: "accepted", quantity: target, changed: true };
    } catch {
      await env.DB.prepare(
        "UPDATE trendyol_stock_updates SET status='uncertain',error_code='VERIFY_EXTERNAL_STOCK_BEFORE_RETRY' WHERE id=?1",
      )
        .bind(token)
        .run();
      throw new TrendyolReviewError("STOCK_UPDATE_AWAITING_CONFIRMATION");
    }
  } finally {
    await env.DB.prepare(
      "UPDATE trendyol_sync_state SET lease_token=NULL,lease_until_ms=0 WHERE id=1 AND lease_token=?1",
    )
      .bind(token)
      .run();
  }
}
