import { emagAttachInvoice, emagAttachments, emagId, getEmagOrder } from "../integrations/emag";
import {
  getTrendyolOrder,
  inactiveTrendyolPackage,
  trendyolCredentials,
  uploadTrendyolInvoice,
} from "../integrations/trendyol";
import { digestHex, ProviderError, type CommerceEnv } from "../integrations/provider-runtime";
import { assertEmagConnection, normalizeEmagOrder } from "./emag-orders";
import { downloadOblioPdf, fiscalPdf, invoiceForOrder, officialOblioLink } from "./fiscal-pdf";

export type MarketplaceProvider = "trendyol" | "emag";

type Delivery = {
  status: string;
  error_code: string | null;
  external_target: string;
  updated_at: string;
};

export async function marketplaceInvoiceStatus(db: D1Database, orderId: string) {
  const invoice = await invoiceForOrder(db, orderId);
  if (!invoice) return null;
  const delivery = await db
    .prepare(
      `SELECT status,error_code,external_target,updated_at
    FROM marketplace_invoice_deliveries WHERE invoice_id=?`,
    )
    .bind(invoice.id)
    .first<Delivery>();
  return { number: invoice.invoice_number, delivery };
}

export async function verifyTrendyolFiscalOrder(
  env: CommerceEnv,
  orderId: string,
  externalId: string,
  total: number,
  currency: string,
) {
  const c = await trendyolCredentials(env);
  const packages = (await getTrendyolOrder(c, externalId)).filter(
    (p) => !inactiveTrendyolPackage(p.status),
  );
  const p = packages[0];
  const reject = () =>
    new ProviderError(
      "Verifică datele de facturare, valoarea și documentele existente în Trendyol.",
      "TRENDYOL_INVOICE_REVIEW",
      409,
    );
  if (
    packages.length !== 1 ||
    !p ||
    ["Returned", "UnDelivered", "Awaiting"].includes(p.status) ||
    currency !== "RON" ||
    p.net !== total ||
    p.invoiceNumber ||
    (p.invoiceStatus &&
      !/^(not.?sent|not.?uploaded|waiting|pending|not.?invoiced|none|false|0)$/i.test(
        p.invoiceStatus,
      ))
  )
    throw reject();
  const source = await env.DB.prepare(
    "SELECT snapshot_json,review_code FROM marketplace_order_sources WHERE order_id=? AND external_order_id=?",
  )
    .bind(orderId, externalId)
    .first<{ snapshot_json: string; review_code: string | null }>();
  if (!source || source.review_code) throw reject();
  const saved = (JSON.parse(source.snapshot_json) as (typeof p)[]).find(
    (value) => value.id === p.id,
  );
  const signature = (value: typeof p) =>
    JSON.stringify({
      net: value.net,
      billing: value.billing,
      customerName: value.customerName,
      lines: value.lines
        .map((l) => ({ id: l.id, sku: l.sku, quantity: l.quantity, net: l.net }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    });
  if (!saved || signature(saved) !== signature(p)) throw reject();
  return { c, p };
}

export async function verifyEmagFiscalOrder(
  env: CommerceEnv,
  orderId: string,
  externalId: string,
  total: number,
  currency: string,
) {
  const { c } = await assertEmagConnection(env);
  const id = emagId.parse(externalId);
  const [raw, attachments] = await Promise.all([getEmagOrder(c, id), emagAttachments(c, id)]);
  const live = normalizeEmagOrder(raw);
  const source = await env.DB.prepare(
    "SELECT financial_hash FROM emag_order_sources WHERE order_id=? AND external_id=? AND review_code IS NULL",
  )
    .bind(orderId, id)
    .first<{ financial_hash: string }>();
  const liveHash = await digestHex(
    "SHA-256",
    JSON.stringify({ lines: live.lines, shipping: live.shipping, billing: live.billing }),
  );
  if (
    !source ||
    source.financial_hash !== liveHash ||
    live.status === 0 ||
    live.status === 5 ||
    currency !== "RON" ||
    live.subtotal + live.shipping !== total ||
    attachments.some((a) => a.type === 1)
  )
    throw new ProviderError(
      "Verifică valoarea și facturile existente pentru comanda eMAG 3P.",
      "EMAG_INVOICE_REVIEW",
      409,
    );
  return { c, id };
}

export async function sendMarketplaceInvoice(
  env: CommerceEnv,
  orderId: string,
  actorId: string | null,
) {
  if (env.APP_ENV !== "production")
    throw new ProviderError(
      "Transmiterea fiscală este dezactivată în mediul de test.",
      "MARKETPLACE_LIVE_REQUIRED",
      409,
    );
  const invoice = await invoiceForOrder(env.DB, orderId);
  const provider: MarketplaceProvider | null =
    invoice?.channel_id === "channel_trendyol"
      ? "trendyol"
      : invoice?.channel_id === "channel_emag"
        ? "emag"
        : null;
  if (!invoice || !provider || !invoice.external_order_id)
    throw new ProviderError(
      "Comanda trebuie să aibă o factură emisă în Oblio și o referință marketplace.",
      "MARKETPLACE_INVOICE_REQUIRED",
      409,
    );
  if (["cancelled", "refunded", "returned"].includes(invoice.order_status))
    throw new ProviderError(
      "Comanda nu mai este eligibilă pentru transmiterea facturii.",
      "MARKETPLACE_ORDER_CLOSED",
      409,
    );
  const previous = await env.DB.prepare(
    "SELECT status,error_code,external_target,updated_at FROM marketplace_invoice_deliveries WHERE invoice_id=?",
  )
    .bind(invoice.id)
    .first<Delivery>();
  if (previous && previous.status !== "blocked") return previous;

  let send: () => Promise<void>;
  let confirm: (() => Promise<boolean>) | undefined;
  let target: string;
  if (provider === "trendyol") {
    const { c, p } = await verifyTrendyolFiscalOrder(
      env,
      orderId,
      invoice.external_order_id,
      invoice.total_bani,
      invoice.currency,
    );
    target = `${c.sellerId}:${p.id}`;
    const pdf = await fiscalPdf(env, invoice);
    send = () => uploadTrendyolInvoice(c, p.id, pdf);
  } else {
    const { c, id } = await verifyEmagFiscalOrder(
      env,
      orderId,
      invoice.external_order_id,
      invoice.total_bani,
      invoice.currency,
    );
    target = String(id);
    const link = await officialOblioLink(env, invoice);
    // Check that the original document really resolves to a PDF before supplying its provider link.
    await downloadOblioPdf(link);
    const name = `Factura ${invoice.invoice_number}.pdf`.slice(0, 60);
    send = async () => {
      await emagAttachInvoice(c, id, name, link);
    };
    confirm = async () =>
      (await emagAttachments(c, id)).some((a) => a.type === 1 && a.name === name);
  }
  const now = new Date().toISOString();
  const claim = await env.DB.prepare(
    `INSERT OR IGNORE INTO marketplace_invoice_deliveries(invoice_id,provider,external_target,status,updated_at)
      VALUES(?,?,?,'sending',?) ON CONFLICT(invoice_id) DO UPDATE
      SET external_target=excluded.external_target,status='sending',error_code=NULL,updated_at=excluded.updated_at
      WHERE marketplace_invoice_deliveries.status='blocked'`,
  )
    .bind(invoice.id, provider, target, now)
    .run();
  if (!claim.meta.changes)
    throw new ProviderError(
      "Acest colet are deja o transmitere inițiată. Verifică documentul în portal.",
      "MARKETPLACE_INVOICE_ALREADY_CLAIMED",
      409,
    );
  let status = "confirmed",
    errorCode: string | null = null;
  try {
    await send();
    if (confirm) {
      status = "accepted";
      try {
        if (await confirm()) status = "confirmed";
      } catch {
        /* Recheck from the portal. */
      }
    }
  } catch (error) {
    errorCode = error instanceof ProviderError ? error.code : "MARKETPLACE_INVOICE_UNKNOWN";
    status = /^(TRENDYOL_INVOICE|EMAG)_HTTP_(400|401|403|404|413|415|422)$/.test(errorCode)
      ? "rejected"
      : "review";
  }
  const updated = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE marketplace_invoice_deliveries SET status=?,error_code=?,updated_at=? WHERE invoice_id=? AND status='sending'",
    ).bind(status, errorCode, updated, invoice.id),
    env.DB.prepare(
      `INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json)
      VALUES(?,?,?,'marketplace.invoice.delivery','invoice',?,?)`,
    ).bind(
      crypto.randomUUID(),
      actorId,
      actorId ? "Administrator" : "Sincronizare marketplace",
      invoice.id,
      JSON.stringify({ provider, target, status, errorCode }),
    ),
  ]);
  return { status, error_code: errorCode, external_target: target, updated_at: updated };
}

export async function enqueueMarketplaceInvoices(env: CommerceEnv) {
  const { results } = await env.DB.prepare(
    `SELECT DISTINCT i.order_id FROM invoices i
    JOIN orders o ON o.id=i.order_id
    JOIN marketplace_invoice_settings s ON o.channel_id='channel_'||s.provider
    WHERE s.enabled_at IS NOT NULL AND i.issued_at>=s.enabled_at AND i.external_provider='oblio'
      AND i.invoice_type='invoice' AND i.status IN ('issued','paid') AND o.order_status!='cancelled'
      AND NOT EXISTS(SELECT 1 FROM marketplace_invoice_deliveries d WHERE d.invoice_id=i.id)
    ORDER BY i.issued_at DESC LIMIT 8`,
  ).all<{ order_id: string }>();
  if (results.length)
    await env.COMMERCE_EVENTS.sendBatch(
      results.map((r) => ({
        body: { version: 7, type: "marketplace.invoice", orderId: r.order_id },
      })),
    );
}

export async function queueMarketplaceInvoice(env: CommerceEnv, orderId: string) {
  const enabled = await env.DB.prepare(
    `SELECT s.enabled_at FROM orders o JOIN marketplace_invoice_settings s
    ON o.channel_id='channel_'||s.provider WHERE o.id=? AND s.enabled_at IS NOT NULL`,
  )
    .bind(orderId)
    .first();
  if (enabled) await env.COMMERCE_EVENTS.send({ version: 7, type: "marketplace.invoice", orderId });
}

export async function processMarketplaceInvoice(env: CommerceEnv, orderId: string) {
  const eligible = await env.DB.prepare(
    `SELECT 1 FROM orders o JOIN invoices i ON i.order_id=o.id
    JOIN marketplace_invoice_settings s ON o.channel_id='channel_'||s.provider
    WHERE o.id=? AND s.enabled_at IS NOT NULL AND i.issued_at>=s.enabled_at AND o.order_status!='cancelled'
    AND i.invoice_type='invoice' AND i.status IN('issued','paid') LIMIT 1`,
  )
    .bind(orderId)
    .first();
  if (!eligible) return;
  try {
    await sendMarketplaceInvoice(env, orderId, null);
  } catch (error) {
    if (
      !(error instanceof ProviderError) ||
      error.retryable ||
      error.status !== 409 ||
      error.code === "MARKETPLACE_INVOICE_ALREADY_CLAIMED"
    )
      throw error;
    const invoice = await invoiceForOrder(env.DB, orderId);
    const provider =
      invoice?.channel_id === "channel_trendyol"
        ? "trendyol"
        : invoice?.channel_id === "channel_emag"
          ? "emag"
          : null;
    if (!invoice || !provider) throw error;
    // Record preflight failures separately from uncertain transmissions; a manual retry
    // may only replace a blocker that never attempted a provider write.
    await env.DB.prepare(
      `INSERT OR IGNORE INTO marketplace_invoice_deliveries
      (invoice_id,provider,external_target,status,error_code,updated_at) VALUES(?,?,?,'blocked',?,?)`,
    )
      .bind(invoice.id, provider, `preflight:${invoice.id}`, error.code, new Date().toISOString())
      .run();
  }
}
