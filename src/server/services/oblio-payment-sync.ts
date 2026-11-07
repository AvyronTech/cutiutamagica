import { checkoutSettingsSchema } from "@/lib/checkout-settings";
import { collectOblioCardPayment } from "@/server/integrations/oblio";
import { ProviderError, type CommerceEnv } from "@/server/integrations/provider-runtime";

type PendingCollection = {
  invoice_id: string;
  invoice_number: string;
  series_prefix: string;
  total_bani: number;
  tax_id: string;
  attempt_id: string;
  payment_reference: string;
  amount_bani: number;
  captured_at: string;
};

/** Synchronize only a signed, captured online payment against an issued Oblio invoice. */
export async function syncPaidInvoiceCollection(env: CommerceEnv, orderId: string): Promise<void> {
  const row = await env.DB.prepare(
    `SELECT i.id AS invoice_id, i.invoice_number, s.prefix AS series_prefix,
            i.total_bani, l.tax_id, p.id AS attempt_id,
            p.external_payment_id AS payment_reference, p.amount_bani,
            COALESCE((SELECT e.created_at FROM order_events e
              WHERE e.id='payment/' || p.id), p.updated_at) AS captured_at
     FROM orders o
     JOIN invoices i ON i.order_id=o.id AND i.invoice_type='invoice'
       AND i.status='issued' AND i.external_provider='oblio'
     JOIN invoice_series s ON s.id=i.series_id
     JOIN legal_entities l ON l.id='legal_entity_main' AND l.status='verified'
     JOIN payment_attempts p ON p.order_id=o.id AND p.status='captured'
       AND p.provider IN ('stripe','revolut_pay')
     WHERE o.id=?1 AND o.payment_status='paid' AND o.paid_bani=o.total_bani
       AND i.total_bani=o.total_bani AND p.amount_bani=o.total_bani
     ORDER BY i.created_at DESC LIMIT 1`,
  )
    .bind(orderId)
    .first<PendingCollection>();
  if (!row) return;
  const number = row.invoice_number.slice(row.series_prefix.length + 1);
  if (
    !row.invoice_number.startsWith(`${row.series_prefix}-`) ||
    !/^\d{1,12}$/.test(number) ||
    !row.payment_reference
  )
    throw new ProviderError(
      "Referința fiscală nu poate fi verificată.",
      "OBLIO_REFERENCE_MISMATCH",
      409,
    );
  const settingsRow = await env.DB.prepare(
    "SELECT value_json FROM operational_settings WHERE key='commerce.checkout'",
  ).first<{ value_json: string }>();
  const settings = checkoutSettingsSchema.parse(
    settingsRow ? JSON.parse(settingsRow.value_json) : {},
  );
  if (settings.invoiceProvider !== "oblio" || !settings.oblioEmail) return;

  const idempotencyKey = `invoice.collect/${row.invoice_id}/${row.attempt_id}`;
  const environment = env.APP_ENV === "production" ? "production" : "sandbox";
  const claim = await env.DB.prepare(
    `INSERT OR IGNORE INTO provider_operations(
      id,provider,operation_type,entity_type,entity_id,idempotency_key,
      environment,status,attempt_count
    ) VALUES(?1,'oblio','invoice.collect','invoice',?2,?3,?4,'processing',1)`,
  )
    .bind(crypto.randomUUID(), row.invoice_id, idempotencyKey, environment)
    .run();
  if (claim.meta.changes !== 1) {
    // Retry only after a previous attempt ended or became stale. The adapter reads
    // the remote invoice first, including when the prior PUT had an unknown result.
    const retry = await env.DB.prepare(
      `UPDATE provider_operations SET status='processing',attempt_count=attempt_count+1,
       error_code=NULL,error_message=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE provider='oblio' AND idempotency_key=?1 AND (
         (status='failed' AND error_code!='OBLIO_COLLECTION_CONFLICT' AND attempt_count<5) OR
         (status='processing' AND updated_at < strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 minutes'))
       )`,
    )
      .bind(idempotencyKey)
      .run();
    if (retry.meta.changes !== 1) return;
  }
  try {
    const result = await collectOblioCardPayment(env, {
      accountEmail: settings.oblioEmail,
      taxId: row.tax_id,
      series: row.series_prefix,
      number,
      reference: row.payment_reference,
      amountBani: row.amount_bani,
      capturedAt: row.captured_at,
    });
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE invoices SET status='paid',paid_at=?1,version=version+1,updated_at=?1
         WHERE id=?2 AND status='issued'`,
      ).bind(now, row.invoice_id),
      env.DB.prepare(
        `UPDATE provider_operations SET status='succeeded',external_id=?1,response_code=200,
         response_summary_json=?2,error_code=NULL,error_message=NULL,completed_at=?3,updated_at=?3
         WHERE provider='oblio' AND idempotency_key=?4 AND status='processing'`,
      ).bind(
        row.invoice_number,
        JSON.stringify({ result, paymentReference: row.payment_reference }),
        now,
        idempotencyKey,
      ),
      env.DB.prepare(
        `INSERT OR IGNORE INTO audit_log(
          id,actor_label,action,entity_type,entity_id,after_json,metadata_json,created_at
        ) VALUES(?1,'payment_sync','invoice.collect','invoice',?2,?3,?4,?5)`,
      ).bind(
        `invoice-collect/${row.invoice_id}/${row.attempt_id}`,
        row.invoice_id,
        JSON.stringify({ status: "paid", provider: "oblio" }),
        JSON.stringify({ orderId, paymentReference: row.payment_reference, result }),
        now,
      ),
    ]);
  } catch (error) {
    await env.DB.prepare(
      `UPDATE provider_operations SET status='failed',error_code=?1,error_message=?2,
       completed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now'),
       updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE provider='oblio' AND idempotency_key=?3 AND status='processing'`,
    )
      .bind(
        error instanceof ProviderError ? error.code : "OBLIO_COLLECTION_FAILED",
        error instanceof Error ? error.message.slice(0, 500) : "Oblio unavailable",
        idempotencyKey,
      )
      .run();
    throw error;
  }
}

/** Repair a missed webhook-to-accounting handoff without creating new invoices. */
export async function reconcilePaidInvoiceCollections(env: CommerceEnv): Promise<void> {
  const rows = await env.DB.prepare(
    `SELECT DISTINCT o.id FROM orders o
     JOIN invoices i ON i.order_id=o.id AND i.status='issued' AND i.external_provider='oblio'
     WHERE o.payment_status='paid' AND o.paid_bani=o.total_bani
       AND NOT EXISTS (
         SELECT 1 FROM provider_operations po
         WHERE po.provider='oblio' AND po.operation_type='invoice.collect'
           AND po.entity_id=i.id AND po.status='failed'
           AND (po.error_code='OBLIO_COLLECTION_CONFLICT' OR po.attempt_count>=5)
       )
     ORDER BY o.updated_at ASC LIMIT 5`,
  ).all<{ id: string }>();
  for (const row of rows.results) {
    try {
      await syncPaidInvoiceCollection(env, row.id);
    } catch (error) {
      console.error("oblio.collection_sync_failed", {
        orderId: row.id,
        code: error instanceof ProviderError ? error.code : "UNKNOWN",
      });
    }
  }
}
