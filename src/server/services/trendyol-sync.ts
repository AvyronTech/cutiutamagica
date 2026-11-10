import {
  trendyolCredentials,
  trendyolRequest,
  getTrendyolOrder,
  getTrendyolStream,
  bani,
  TrendyolReviewError,
  type TrendyolCredentials,
} from "../integrations/trendyol";
import { type CommerceEnv } from "../integrations/provider-runtime";
import { importTrendyolOrder } from "./trendyol-orders";

type SyncState = {
  seller_id: string;
  enabled: number;
  verified_at: string | null;
  last_order_sync_at: string | null;
  window_start_ms: number | null;
  window_end_ms: number | null;
  cursor: string | null;
  finance_cursor_json: string | null;
};
export const trendyolReviewCode = (e: unknown) =>
  e instanceof TrendyolReviewError
    ? e.code
    : e && typeof e === "object" && "code" in e && /^TRENDYOL_HTTP_\d+$/.test(String(e.code))
      ? String(e.code)
      : "TRENDYOL_SYNC_FAILED";
export async function verifyTrendyolConnection(env: CommerceEnv) {
  const c = await trendyolCredentials(env);
  const state = await env.DB.prepare("SELECT seller_id FROM trendyol_sync_state WHERE id=1").first<{
    seller_id: string;
  }>();
  if (state && state.seller_id !== c.sellerId)
    throw new TrendyolReviewError("SELLER_CHANGE_REQUIRES_REVIEW");
  await getTrendyolStream(c, Date.now() - 86400000, Date.now());
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO trendyol_sync_state(id,seller_id,verified_at) VALUES(1,?1,?2) ON CONFLICT(id) DO UPDATE SET verified_at=excluded.verified_at,updated_at=excluded.verified_at`,
    ).bind(c.sellerId, now),
    env.DB.prepare(
      "UPDATE integration_credentials SET check_status='verified',checked_at=?1 WHERE provider='trendyol'",
    ).bind(now),
    env.DB.prepare(
      "UPDATE sales_channels SET status='active',last_healthcheck_at=?1,last_healthcheck_status='ok',updated_at=?1 WHERE code='trendyol'",
    ).bind(now),
    env.DB.prepare(
      "UPDATE integration_accounts SET external_account_id=?1,status='connected',last_healthcheck_at=?2,last_success_at=?2,last_error_code=NULL,last_error_message=NULL,updated_at=?2 WHERE id='integration_trendyol_production'",
    ).bind(c.sellerId, now),
  ]);
  return {
    ok: true,
    sellerId: c.sellerId,
    message: "API Trendyol RO verificat prin citire oficială; nu s-a modificat comanda externă.",
  };
}
async function connected(env: CommerceEnv) {
  const c = await trendyolCredentials(env),
    s = await env.DB.prepare("SELECT * FROM trendyol_sync_state WHERE id=1").first<SyncState>();
  if (!s?.verified_at || s.seller_id !== c.sellerId)
    throw new TrendyolReviewError("CONNECTOR_NOT_VERIFIED");
  return { c, s };
}
async function locked<T>(env: CommerceEnv, run: () => Promise<T>): Promise<T> {
  const token = crypto.randomUUID(),
    now = Date.now();
  const r = await env.DB.prepare(
    "UPDATE trendyol_sync_state SET lease_token=?1,lease_until_ms=?2 WHERE id=1 AND lease_until_ms<?3",
  )
    .bind(token, now + 120000, now)
    .run();
  if (!r.meta.changes) throw new TrendyolReviewError("SYNC_BUSY");
  try {
    return await run();
  } finally {
    await env.DB.prepare(
      "UPDATE trendyol_sync_state SET lease_token=NULL,lease_until_ms=0 WHERE id=1 AND lease_token=?1",
    )
      .bind(token)
      .run();
  }
}
async function importOne(
  env: CommerceEnv,
  c: TrendyolCredentials,
  number: string,
  actor: string | null,
) {
  try {
    const result = await importTrendyolOrder(env.DB, await getTrendyolOrder(c, number), actor);
    await env.DB.prepare(
      `INSERT INTO trendyol_sync_issues(external_order_id,code,status) VALUES(?1,?2,?3) ON CONFLICT(external_order_id) DO UPDATE SET code=excluded.code,status=excluded.status,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
    )
      .bind(number, result.reviewCode || "OK", result.reviewCode ? "open" : "resolved")
      .run();
    return result;
  } catch (e) {
    const code = trendyolReviewCode(e);
    if (code === "TRENDYOL_SYNC_FAILED" || /^TRENDYOL_HTTP_/.test(code)) throw e;
    await env.DB.prepare(
      `INSERT INTO trendyol_sync_issues(external_order_id,code) VALUES(?1,?2) ON CONFLICT(external_order_id) DO UPDATE SET code=excluded.code,status='open',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
    )
      .bind(number, code)
      .run();
    return { orderId: null, reviewCode: code, replayed: false };
  }
}
export async function syncTrendyolOrders(
  env: CommerceEnv,
  orderNumber?: string,
  actor: string | null = null,
) {
  const { c, s } = await connected(env);
  return locked(env, async () => {
    if (orderNumber)
      return { results: [await importOne(env, c, orderNumber, actor)], hasMore: false };
    const now = Date.now(),
      start =
        s.cursor && s.window_start_ms
          ? s.window_start_ms
          : Math.max(
              now - 14 * 86400000,
              s.last_order_sync_at
                ? Date.parse(s.last_order_sync_at) - 3600000
                : now - 7 * 86400000,
            ),
      end = s.cursor && s.window_end_ms ? s.window_end_ms : now;
    const page = await getTrendyolStream(c, start, end, s.cursor || undefined);
    const results = [];
    for (const number of page.orders) results.push(await importOne(env, c, number, actor));
    await env.DB.prepare(
      `UPDATE trendyol_sync_state SET cursor=?1,window_start_ms=?2,window_end_ms=?3,last_order_sync_at=CASE WHEN ?4=0 THEN ?5 ELSE last_order_sync_at END,last_error_code=NULL,updated_at=?5 WHERE id=1`,
    )
      .bind(
        page.hasMore ? page.nextCursor : null,
        page.hasMore ? start : null,
        page.hasMore ? end : null,
        page.hasMore ? 1 : 0,
        new Date(end).toISOString(),
      )
      .run();
    if (page.hasMore)
      await env.COMMERCE_EVENTS.send({ version: 5, type: "trendyol.poll" }, { delaySeconds: 30 });
    return { results, hasMore: page.hasMore };
  });
}
export async function observeTrendyolInventory(env: CommerceEnv, sku: string) {
  if (!/^[\w-]{1,100}$/.test(sku)) throw new TrendyolReviewError("INVALID_SKU");
  const { c } = await connected(env);
  const result = (await trendyolRequest(
    c,
    `/integration/product/sellers/${c.sellerId}/products/approved/inventory-and-price`,
    { stockCode: sku, size: "20" },
  )) as { content?: { variants?: Record<string, unknown>[] }[]; totalPages?: number };
  if (!Array.isArray(result.content) || Number(result.totalPages) > 1)
    throw new TrendyolReviewError("INVENTORY_RESPONSE_REQUIRES_REVIEW");
  const rows = result.content.flatMap((p) => p.variants || []).filter((v) => v.stockCode === sku);
  if (
    rows.length !== 1 ||
    !/^\w[\w-]{0,99}$/.test(String(rows[0].barcode)) ||
    !Number.isInteger(rows[0].quantity) ||
    Number(rows[0].quantity) < 0
  )
    throw new TrendyolReviewError("SKU_BARCODE_MAPPING_REQUIRED");
  const row = rows[0],
    value = {
      sku,
      barcode: String(row.barcode),
      quantity: Number(row.quantity),
      salePriceBani: bani(row.salePrice),
      listPriceBani: bani(row.listPrice),
      observedAt: new Date().toISOString(),
    };
  await env.DB.prepare(
    `INSERT INTO marketplace_inventory_snapshots(provider,sku,barcode,quantity,sale_price_bani,list_price_bani,source_modified_ms,observed_at) VALUES('trendyol',?1,?2,?3,?4,?5,?6,?7) ON CONFLICT(provider,barcode) DO UPDATE SET sku=excluded.sku,quantity=excluded.quantity,sale_price_bani=excluded.sale_price_bani,list_price_bani=excluded.list_price_bani,source_modified_ms=excluded.source_modified_ms,observed_at=excluded.observed_at`,
  )
    .bind(
      sku,
      value.barcode,
      value.quantity,
      value.salePriceBani,
      value.listPriceBani,
      typeof row.stockLastModifiedDate === "number" ? row.stockLastModifiedDate : null,
      value.observedAt,
    )
    .run();
  return value;
}
export async function syncTrendyolFinancials(env: CommerceEnv) {
  const { c, s } = await connected(env);
  return locked(env, async () => {
    const saved = s.finance_cursor_json
      ? (JSON.parse(s.finance_cursor_json) as {
          kind: number;
          page: number;
          start: number;
          end: number;
        })
      : null;
    const cur = saved || { kind: 0, page: 0, start: Date.now() - 14 * 86400000, end: Date.now() };
    const kinds = [
        "Sale",
        "Return",
        "PaymentOrder",
        "DeductionInvoices",
        "CreditNote",
        "CommissionInvoice",
      ] as const,
      kind = kinds[cur.kind];
    if (!kind) throw new TrendyolReviewError("INVALID_FINANCE_CURSOR");
    const route = kind === "Sale" || kind === "Return" ? "settlements" : "otherfinancials";
    const data = (await trendyolRequest(
      c,
      `/integration/finance/che/sellers/${c.sellerId}/${route}`,
      {
        transactionType: kind,
        startDate: String(cur.start),
        endDate: String(cur.end),
        page: String(cur.page),
        size: "500",
        supplierId: c.sellerId,
      },
    )) as { content?: Record<string, unknown>[]; totalPages?: number };
    if (!Array.isArray(data.content) || data.content.length > 500)
      throw new TrendyolReviewError("INVALID_FINANCE_RESPONSE");
    const rows = data.content.map((r) => {
      if (r.sellerId != null && String(r.sellerId) !== c.sellerId)
        throw new TrendyolReviewError("FINANCE_SELLER_MISMATCH");
      if (r.currencyCode != null && r.currencyCode !== "RON")
        throw new TrendyolReviewError("FINANCE_CURRENCY_MISMATCH");
      const id = String(r.id),
        date = Number(r.transactionDate);
      if (!/^[\w-]{1,100}$/.test(id) || !Number.isSafeInteger(date))
        throw new TrendyolReviewError("INVALID_FINANCE_ID");
      return {
        id,
        type: kind,
        order: r.orderNumber == null ? null : String(r.orderNumber),
        package: r.shipmentPackageId == null ? null : String(r.shipmentPackageId),
        date,
        credit: bani(r.credit ?? 0),
        debt: bani(r.debt ?? 0),
        commission: r.commissionAmount == null ? null : bani(r.commissionAmount),
        revenue: r.sellerRevenue == null ? null : bani(r.sellerRevenue),
        commissionExact: r.commissionAmount == null ? null : String(r.commissionAmount),
        revenueExact: r.sellerRevenue == null ? null : String(r.sellerRevenue),
        payment: r.paymentOrderId == null ? null : String(r.paymentOrderId),
      };
    });
    // Bulk insert is bounded; no PII, arbitrary provider fields, card data or banking secrets retained.
    if (rows.length)
      await env.DB.prepare(
        `INSERT INTO marketplace_financial_entries(id,provider,external_id,transaction_type,external_order_id,external_package_id,occurred_at_ms,credit_bani,debit_bani,commission_bani,seller_revenue_bani,payment_order_id,currency,source_json)
      SELECT 'ty-fin-'||json_extract(j.value,'$.type')||'-'||json_extract(j.value,'$.id'),'trendyol',json_extract(j.value,'$.id'),json_extract(j.value,'$.type'),json_extract(j.value,'$.order'),json_extract(j.value,'$.package'),json_extract(j.value,'$.date'),json_extract(j.value,'$.credit'),json_extract(j.value,'$.debt'),json_extract(j.value,'$.commission'),json_extract(j.value,'$.revenue'),json_extract(j.value,'$.payment'),'RON',j.value FROM json_each(?1) j WHERE 1
      ON CONFLICT(provider,transaction_type,external_id) DO UPDATE SET credit_bani=excluded.credit_bani,debit_bani=excluded.debit_bani,commission_bani=excluded.commission_bani,seller_revenue_bani=excluded.seller_revenue_bani,payment_order_id=excluded.payment_order_id,source_json=excluded.source_json`,
      )
        .bind(JSON.stringify(rows))
        .run();
    const next =
      cur.page + 1 < Number(data.totalPages ?? 0)
        ? { ...cur, page: cur.page + 1 }
        : cur.kind + 1 < kinds.length
          ? { ...cur, kind: cur.kind + 1, page: 0 }
          : null;
    await env.DB.prepare(
      `UPDATE trendyol_sync_state SET finance_cursor_json=?1,last_finance_sync_at=CASE WHEN ?1 IS NULL THEN ?2 ELSE last_finance_sync_at END WHERE id=1`,
    )
      .bind(next ? JSON.stringify(next) : null, new Date().toISOString())
      .run();
    return { imported: rows.length, hasMore: !!next, transactionType: kind };
  });
}
export type TrendyolPollMessage = {
  version: 5;
  type: "trendyol.poll" | "trendyol.finance" | "trendyol.stock";
};
export function isTrendyolPoll(v: unknown): v is TrendyolPollMessage {
  if (!v || typeof v !== "object") return false;
  const x = v as Record<string, unknown>;
  return (
    Object.keys(x).length === 2 &&
    x.version === 5 &&
    ["trendyol.poll", "trendyol.finance", "trendyol.stock"].includes(String(x.type))
  );
}
export async function enqueueTrendyolPolls(env: Pick<Env, "COMMERCE_EVENTS">) {
  await env.COMMERCE_EVENTS.sendBatch(
    [300, 1200, 2100, 3000].map((delaySeconds) => ({
      body: { version: 5, type: "trendyol.poll" } satisfies TrendyolPollMessage,
      contentType: "json" as const,
      delaySeconds,
    })),
  );
}
export async function processTrendyolPoll(env: CommerceEnv, message: TrendyolPollMessage) {
  const state = await env.DB.prepare("SELECT enabled FROM trendyol_sync_state WHERE id=1").first<{
    enabled: number;
  }>();
  if (!state?.enabled) return;
  try {
    if (message.type === "trendyol.finance") {
      const result = await syncTrendyolFinancials(env);
      if (result.hasMore) await env.COMMERCE_EVENTS.send(message, { delaySeconds: 30 });
    } else if (message.type === "trendyol.stock") {
      const rows = (
        await env.DB.prepare(
          `SELECT DISTINCT v.sku,COALESCE(m.observed_at,'') AS observed FROM product_variants v
        JOIN order_items oi ON oi.variant_id=v.id JOIN marketplace_order_sources s ON s.order_id=oi.order_id
        LEFT JOIN marketplace_inventory_snapshots m ON m.sku=v.sku AND m.provider='trendyol'
        WHERE v.inventory_policy='deny' AND v.status='active' ORDER BY observed LIMIT 1`,
        ).all<{ sku: string }>()
      ).results;
      if (rows[0]) {
        const { reconcileTrendyolStock } = await import("./trendyol-stock");
        await reconcileTrendyolStock(env, rows[0].sku);
      }
    } else {
      const result = await syncTrendyolOrders(env);
      if (!result.hasMore)
        await env.COMMERCE_EVENTS.send(
          { version: 5, type: "trendyol.stock" },
          { delaySeconds: 60 },
        );
      if (!result.hasMore)
        await env.COMMERCE_EVENTS.send(
          { version: 5, type: "trendyol.finance" },
          { delaySeconds: 180 },
        );
    }
  } catch (e) {
    const code = trendyolReviewCode(e);
    await env.DB.prepare("UPDATE trendyol_sync_state SET last_error_code=?1 WHERE id=1")
      .bind(code)
      .run();
    throw new TrendyolReviewError(code);
  }
}
