import { safeErrorMetadata } from "@/server/security/logging";
import { emitOblioInvoice } from "@/server/integrations/oblio";
import { checkoutSettingsSchema } from "@/lib/checkout-settings";
import { archiveFiscalPdf } from "./fiscal-pdf";
import { syncPaidInvoiceCollection } from "@/server/services/oblio-payment-sync";
import {
  logProviderOperation,
  ProviderError,
  type CommerceEnv,
} from "@/server/integrations/provider-runtime";

type DbValue = string | number | null;
type DbRow = Record<string, DbValue>;

function value(row: DbRow, key: string): string {
  return row[key] == null ? "" : String(row[key]);
}

function amount(row: DbRow, key: string): number {
  return typeof row[key] === "number" ? row[key] : Number(row[key] ?? 0);
}

export async function issueInvoiceForOrder(
  env: CommerceEnv,
  orderId: string,
  admin: { id: string; email: string },
): Promise<{ invoiceId: string; invoiceNumber: string; pdfUrl: string | null }> {
  const existing = await env.DB.prepare(
    `SELECT id, invoice_number FROM invoices
     WHERE order_id = ?1 AND invoice_type = 'invoice' AND status NOT IN ('cancelled', 'error')
     ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(orderId)
    .first<{ id: string; invoice_number: string | null }>();
  if (existing) {
    return { invoiceId: existing.id, invoiceNumber: existing.invoice_number ?? "", pdfUrl: null };
  }

  const [orderResult, lineResult, seriesResult, entityResult] = await env.DB.batch<DbRow>([
    env.DB.prepare(
      `SELECT o.*, COALESCE(ba.full_name,o.customer_name) AS billing_full_name,
              COALESCE(ba.line1,oa.line1) AS line1,COALESCE(ba.line2,oa.line2) AS line2,
              COALESCE(ba.city,oa.city) AS city,COALESCE(ba.county,oa.county) AS county,
              COALESCE(ba.country_code,oa.country_code) AS country_code,
              COALESCE(ba.company_name,oa.company_name) AS company_name,
              COALESCE(ba.tax_id,oa.tax_id) AS tax_id,COALESCE(ba.postal_code,oa.postal_code) AS postal_code
       FROM orders o
       LEFT JOIN order_addresses oa ON oa.order_id = o.id AND oa.address_type = 'shipping'
       LEFT JOIN order_addresses ba ON ba.order_id = o.id AND ba.address_type = 'billing'
       WHERE o.id = ?1 AND o.order_status != 'cancelled'`,
    ).bind(orderId),
    env.DB.prepare("SELECT * FROM order_items WHERE order_id = ?1 ORDER BY created_at").bind(
      orderId,
    ),
    env.DB.prepare(
      `SELECT * FROM invoice_series WHERE document_type = 'invoice' AND status = 'active'
       ORDER BY updated_at DESC LIMIT 1`,
    ),
    env.DB.prepare("SELECT * FROM legal_entities WHERE id = 'legal_entity_main'"),
  ]);
  const order = orderResult.results[0];
  const series = seriesResult.results[0];
  const entity = entityResult.results[0];
  if (!order)
    throw new ProviderError("Comanda nu există sau este anulată.", "ORDER_NOT_INVOICEABLE", 404);
  const marketplace = ["channel_trendyol", "channel_emag"].includes(String(order.channel_id));
  if (marketplace) {
    if (env.APP_ENV !== "production")
      throw new ProviderError(
        "Emiterea fiscală marketplace este dezactivată în mediul de test.",
        "MARKETPLACE_LIVE_REQUIRED",
        409,
      );
    const externalId = value(order, "external_order_id");
    if (!externalId)
      throw new ProviderError(
        "Comanda nu are o referință marketplace verificată.",
        "MARKETPLACE_INVOICE_REVIEW",
        409,
      );
    const { verifyTrendyolFiscalOrder, verifyEmagFiscalOrder } =
      await import("./marketplace-invoices");
    const verify =
      order.channel_id === "channel_trendyol" ? verifyTrendyolFiscalOrder : verifyEmagFiscalOrder;
    await verify(env, orderId, externalId, amount(order, "total_bani"), value(order, "currency"));
    const localTotal = lineResult.results.reduce(
      (sum, line) => sum + amount(line, "line_total_bani"),
      amount(order, "shipping_bani"),
    );
    if (localTotal !== amount(order, "total_bani"))
      throw new ProviderError(
        "Liniile facturii nu însumează valoarea marketplace.",
        "MARKETPLACE_INVOICE_TOTAL_MISMATCH",
        409,
      );
  }
  if (!series) {
    throw new ProviderError(
      "Activează în admin seria Oblio confirmată înainte de emitere.",
      "INVOICE_SERIES_NOT_ACTIVE",
      409,
    );
  }
  if (!entity || entity.status !== "verified") {
    throw new ProviderError(
      "Completează și verifică adresa și datele firmei înainte de emitere.",
      "LEGAL_ENTITY_INCOMPLETE",
      409,
    );
  }
  if (value(entity, "vat_status") !== "non_vat_payer") {
    throw new ProviderError(
      "Verifică regimul TVA al firmei înainte de emiterea în Oblio.",
      "LEGAL_VAT_STATUS_MISMATCH",
      409,
    );
  }
  if (!lineResult.results.length) {
    throw new ProviderError("Comanda nu conține linii facturabile.", "ORDER_ITEMS_MISSING", 409);
  }

  const settingsRow = await env.DB.prepare(
    "SELECT value_json FROM operational_settings WHERE key='commerce.checkout'",
  ).first<{ value_json: string }>();
  const settings = checkoutSettingsSchema.parse(
    settingsRow ? JSON.parse(settingsRow.value_json) : {},
  );
  if (settings.invoiceProvider !== "oblio" || !settings.oblioEmail || !value(entity, "tax_id")) {
    throw new ProviderError(
      "Configurează contul Oblio și confirmă profilul juridic și seria de facturi.",
      "OBLIO_SETTINGS_INCOMPLETE",
      409,
    );
  }
  const environment = env.APP_ENV === "production" ? "production" : "sandbox";
  const idempotencyKey = `invoice/${orderId}/v1`;
  const claim = await env.DB.prepare(
    `INSERT OR IGNORE INTO provider_operations(
       id,provider,operation_type,entity_type,entity_id,idempotency_key,
       environment,status,attempt_count
     ) VALUES(?1,'oblio','invoice.issue','order',?2,?3,?4,'processing',1)`,
  )
    .bind(crypto.randomUUID(), orderId, idempotencyKey, environment)
    .run();
  if (claim.meta.changes !== 1) {
    const retry = await env.DB.prepare(
      `UPDATE provider_operations SET status='processing',attempt_count=attempt_count+1,
       error_code=NULL,error_message=NULL,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE provider='oblio' AND idempotency_key=?1 AND status='failed'
       AND error_code IN (
         'OBLIO_AUTH_FAILED','OBLIO_SETUP_UNVERIFIED','OBLIO_COMPANY_MISMATCH',
         'OBLIO_SERIES_MISMATCH','OBLIO_VAT_MISMATCH','OBLIO_NON_VAT_RATE_MISSING'
       )`,
    )
      .bind(idempotencyKey)
      .run();
    if (retry.meta.changes !== 1)
      throw new ProviderError(
        "Emiterea a fost deja inițiată. Verifică factura în Oblio după numărul comenzii înainte de o nouă încercare.",
        "OBLIO_RECONCILIATION_REQUIRED",
        409,
      );
  }
  try {
    const result = await emitOblioInvoice(env, {
      orderId,
      accountEmail: settings.oblioEmail,
      taxId: value(entity, "tax_id"),
      series: value(series, "prefix"),
      expectedNextNumber: amount(series, "next_number"),
      currency: value(order, "currency") || "RON",
      customer: {
        name:
          value(order, "company_name") ||
          value(order, "billing_full_name") ||
          value(order, "customer_name"),
        email: value(order, "customer_email") || null,
        phone: value(order, "customer_phone_e164"),
        country: value(order, "country_code") || "RO",
        county: value(order, "county") || null,
        city: value(order, "city"),
        address: [value(order, "line1"), value(order, "line2"), value(order, "postal_code")]
          .filter(Boolean)
          .join(", "),
        companyTaxId: value(order, "tax_id") || null,
      },
      lines: [
        ...lineResult.results.flatMap((line) => {
          const quantity = Math.max(1, amount(line, "quantity"));
          const total = amount(line, "line_total_bani");
          const base = {
            name: value(line, "product_name"),
            sku: value(line, "sku"),
            vatRate: amount(line, "tax_rate_bps") / 100,
            itemType: (value(line, "item_type") === "service" ? "service" : "product") as
              "service" | "product",
          };
          const remainder = marketplace ? total % quantity : 0;
          return remainder
            ? [
                {
                  ...base,
                  quantity: quantity - remainder,
                  unitPrice: Math.floor(total / quantity) / 100,
                },
                {
                  ...base,
                  quantity: remainder,
                  unitPrice: (Math.floor(total / quantity) + 1) / 100,
                },
              ]
            : [{ ...base, quantity, unitPrice: total / quantity / 100 }];
        }),
        ...(amount(order, "shipping_bani") > 0
          ? [
              {
                name: "Livrare",
                sku: "TRANSPORT",
                quantity: 1,
                unitPrice: amount(order, "shipping_bani") / 100,
                vatRate: 0,
                itemType: "service" as const,
              },
            ]
          : []),
      ],
    });
    const verifiedAt = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE integration_credentials SET checked_at=?1,check_status='verified' WHERE provider='oblio'",
      ).bind(verifiedAt),
      env.DB.prepare(
        `UPDATE provider_configurations SET status='active',last_healthcheck_at=?1,
         last_error_code=NULL,last_error_message=NULL,updated_at=?1 WHERE provider='oblio'`,
      ).bind(verifiedAt),
      env.DB.prepare(
        `UPDATE connector_secret_refs SET status='configured',last_verified_at=?1,updated_at=?1
         WHERE provider='oblio'`,
      ).bind(verifiedAt),
    ]);
    const invoiceId = crypto.randomUUID();
    const invoiceNumber = `${result.series}-${result.number}`;
    const nowIso = new Date().toISOString();
    const statements: D1PreparedStatement[] = [
      env.DB.prepare(
        `INSERT INTO invoices (
          id, order_id, customer_id, series_id, invoice_number, invoice_type, status,
          currency, subtotal_bani, tax_bani, total_bani, issuer_snapshot_json,
          customer_snapshot_json, issued_at, external_provider, external_id, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, 'invoice', 'issued', ?6, ?7, ?8, ?9, ?10, ?11,
          ?12, 'oblio', ?13, ?12, ?12)`,
      ).bind(
        invoiceId,
        orderId,
        order.customer_id,
        series.id,
        invoiceNumber,
        order.currency,
        order.total_bani,
        order.tax_bani,
        order.total_bani,
        JSON.stringify({
          legalName: entity.legal_name,
          taxId: entity.tax_id,
          vatStatus: entity.vat_status,
          address: entity.registered_address,
        }),
        JSON.stringify({
          name:
            value(order, "company_name") ||
            value(order, "billing_full_name") ||
            value(order, "customer_name"),
          taxId: value(order, "tax_id") || null,
          email: value(order, "customer_email") || null,
          address: value(order, "line1"),
          city: value(order, "city"),
          county: value(order, "county"),
        }),
        nowIso,
        invoiceNumber,
      ),
      env.DB.prepare(
        `INSERT INTO audit_log (
          id, actor_admin_user_id, actor_label, action, entity_type, entity_id,
          after_json, metadata_json, created_at
        ) VALUES (?1, ?2, ?3, 'invoice.issue', 'invoice', ?4, ?5, ?6, ?7)`,
      ).bind(
        crypto.randomUUID(),
        admin.id,
        admin.email,
        invoiceId,
        JSON.stringify({ invoiceNumber, provider: "oblio" }),
        JSON.stringify({ orderId, pdfUrl: result.pdfUrl }),
        nowIso,
      ),
      env.DB.prepare(
        `UPDATE invoice_series SET next_number = ?1,
         updated_at = ?2 WHERE id = ?3 AND next_number = ?4`,
      ).bind(Number(result.number) + 1, nowIso, series.id, series.next_number),
    ];
    for (const line of lineResult.results) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO invoice_lines (
            id, invoice_id, order_item_id, name, quantity, unit, unit_price_bani,
            tax_rate_bps, subtotal_bani, tax_bani, total_bani, sort_order
          ) VALUES (?1, ?2, ?3, ?4, ?5, 'buc', ?6, ?7, ?8, 0, ?8, ?9)`,
        ).bind(
          crypto.randomUUID(),
          invoiceId,
          line.id,
          line.product_name,
          line.quantity,
          Math.round(amount(line, "line_total_bani") / Math.max(1, amount(line, "quantity"))),
          line.tax_rate_bps,
          line.line_total_bani,
          statements.length,
        ),
      );
    }
    if (amount(order, "shipping_bani") > 0) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO invoice_lines (
            id, invoice_id, order_item_id, name, quantity, unit, unit_price_bani,
            tax_rate_bps, subtotal_bani, tax_bani, total_bani, sort_order
          ) VALUES (?1, ?2, NULL, 'Livrare', 1, 'serv', ?3, 0, ?3, 0, ?3, ?4)`,
        ).bind(crypto.randomUUID(), invoiceId, amount(order, "shipping_bani"), statements.length),
      );
    }
    await env.DB.batch(statements);
    if (result.pdfUrl) {
      try {
        await archiveFiscalPdf(
          env,
          { id: invoiceId, invoice_number: invoiceNumber },
          new URL(result.pdfUrl),
        );
      } catch (error) {
        console.error("invoice.pdf_archive_failed", { invoiceId, error: safeErrorMetadata(error) });
      }
    }
    await logProviderOperation(env.DB, {
      provider: "oblio",
      operationType: "invoice.issue",
      entityType: "order",
      entityId: orderId,
      idempotencyKey,
      environment,
      status: "succeeded",
      externalId: invoiceNumber,
      responseCode: 200,
      responseSummary: { invoiceNumber },
    });
    try {
      await syncPaidInvoiceCollection(env, orderId);
    } catch (error) {
      console.error("invoice.collection_sync_pending", {
        orderId,
        code: error instanceof ProviderError ? error.code : "UNKNOWN",
      });
    }
    if (marketplace) {
      try {
        const { queueMarketplaceInvoice } = await import("./marketplace-invoices");
        await queueMarketplaceInvoice(env, orderId);
      } catch (error) {
        console.error("marketplace.invoice_queue_failed", safeErrorMetadata(error));
      }
    }
    return { invoiceId, invoiceNumber, pdfUrl: result.pdfUrl };
  } catch (error) {
    if (
      error instanceof ProviderError &&
      [
        "OBLIO_AUTH_FAILED",
        "OBLIO_INVOICE_FAILED",
        "PROVIDER_TIMEOUT",
        "PROVIDER_NETWORK_ERROR",
      ].includes(error.code)
    ) {
      const failedAt = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE integration_credentials SET checked_at=?1,check_status='failed' WHERE provider='oblio'",
        ).bind(failedAt),
        env.DB.prepare(
          `UPDATE provider_configurations SET status='degraded',last_healthcheck_at=?1,
           last_error_code=?2,last_error_message=?3,updated_at=?1 WHERE provider='oblio'`,
        ).bind(failedAt, error.code, error.message.slice(0, 500)),
      ]);
    }
    await logProviderOperation(env.DB, {
      provider: "oblio",
      operationType: "invoice.issue",
      entityType: "order",
      entityId: orderId,
      idempotencyKey,
      environment,
      status: "failed",
      errorCode: error instanceof ProviderError ? error.code : "OBLIO_UNKNOWN_ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown Oblio error",
    });
    throw error;
  }
}
