import { emitFgoInvoice } from "@/server/integrations/fgo";
import {
  digestHex,
  fetchWithTimeout,
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

export async function issueFgoInvoiceForOrder(
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
      `SELECT o.*, oa.line1, oa.line2, oa.city, oa.county, oa.country_code,
              oa.company_name, oa.tax_id, oa.postal_code
       FROM orders o
       LEFT JOIN order_addresses oa ON oa.order_id = o.id AND oa.address_type = 'shipping'
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
  if (!series) {
    throw new ProviderError(
      "Activează în admin seria FGO confirmată înainte de emitere.",
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
  if (!lineResult.results.length) {
    throw new ProviderError("Comanda nu conține linii facturabile.", "ORDER_ITEMS_MISSING", 409);
  }

  const environment = env.APP_ENV === "production" ? "production" : "sandbox";
  const idempotencyKey = `invoice/${orderId}/v1`;
  await logProviderOperation(env.DB, {
    provider: "fgo",
    operationType: "invoice.issue",
    entityType: "order",
    entityId: orderId,
    idempotencyKey,
    environment,
    status: "processing",
  });
  try {
    const result = await emitFgoInvoice(env, {
      orderId,
      series: value(series, "prefix"),
      currency: value(order, "currency") || "RON",
      customer: {
        name: value(order, "company_name") || value(order, "customer_name"),
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
        ...lineResult.results.map((line) => ({
          name: value(line, "product_name"),
          sku: value(line, "sku"),
          quantity: amount(line, "quantity"),
          unitPrice: amount(line, "line_total_bani") / Math.max(1, amount(line, "quantity")) / 100,
          vatRate: amount(line, "tax_rate_bps") / 100,
        })),
        ...(amount(order, "shipping_bani") > 0
          ? [
              {
                name: "Livrare",
                sku: "TRANSPORT",
                quantity: 1,
                unitPrice: amount(order, "shipping_bani") / 100,
                vatRate: 0,
              },
            ]
          : []),
      ],
    });
    const verifiedAt = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE integration_credentials SET checked_at=?1,check_status='verified' WHERE provider='fgo'",
      ).bind(verifiedAt),
      env.DB.prepare(
        `UPDATE provider_configurations SET status='active',last_healthcheck_at=?1,
         last_error_code=NULL,last_error_message=NULL,updated_at=?1 WHERE provider='fgo'`,
      ).bind(verifiedAt),
      env.DB.prepare(
        `UPDATE connector_secret_refs SET status='configured',last_verified_at=?1,updated_at=?1
         WHERE provider='fgo'`,
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
          ?12, 'fgo', ?13, ?12, ?12)`,
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
          name: value(order, "company_name") || value(order, "customer_name"),
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
        JSON.stringify({ invoiceNumber, provider: "fgo" }),
        JSON.stringify({ orderId, pdfUrl: result.pdfUrl }),
        nowIso,
      ),
      env.DB.prepare(
        `UPDATE invoice_series SET next_number = next_number + 1,
         updated_at = ?1 WHERE id = ?2`,
      ).bind(nowIso, series.id),
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
        const response = await fetchWithTimeout(
          result.pdfUrl,
          { headers: { accept: "application/pdf" } },
          15_000,
        );
        const declaredSize = Number(response.headers.get("content-length") ?? 0);
        if (!response.ok || (declaredSize > 0 && declaredSize > 10_000_000)) {
          throw new Error(`PDF FGO indisponibil (${response.status}).`);
        }
        const bytes = await response.arrayBuffer();
        if (
          bytes.byteLength > 10_000_000 ||
          new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-"
        ) {
          throw new Error("Fișierul FGO nu este un PDF valid.");
        }
        const documentId = crypto.randomUUID();
        const r2Key = `invoices/${nowIso.slice(0, 4)}/${invoiceId}.pdf`;
        const checksum = await digestHex("SHA-256", bytes);
        await env.MEDIA.put(r2Key, bytes, {
          httpMetadata: { contentType: "application/pdf", cacheControl: "private, no-store" },
          customMetadata: { invoiceId, invoiceNumber },
        });
        await env.DB.prepare(
          `INSERT INTO business_documents (
             id, document_type, entity_type, entity_id, r2_key, filename, mime_type,
             size_bytes, checksum_sha256, retention_class, created_by, created_at
           ) VALUES (?1, 'invoice_pdf', 'invoice', ?2, ?3, ?4, 'application/pdf', ?5, ?6, 'fiscal', ?7, ?8)`,
        )
          .bind(
            documentId,
            invoiceId,
            r2Key,
            `${invoiceNumber}.pdf`,
            bytes.byteLength,
            checksum,
            admin.id,
            nowIso,
          )
          .run();
      } catch (error) {
        console.error("invoice.pdf_archive_failed", { invoiceId, error });
      }
    }
    await logProviderOperation(env.DB, {
      provider: "fgo",
      operationType: "invoice.issue",
      entityType: "order",
      entityId: orderId,
      idempotencyKey,
      environment,
      status: "succeeded",
      externalId: invoiceNumber,
      responseCode: 200,
      responseSummary: { invoiceNumber, pdfUrl: result.pdfUrl, paymentUrl: result.paymentUrl },
    });
    return { invoiceId, invoiceNumber, pdfUrl: result.pdfUrl };
  } catch (error) {
    if (
      error instanceof ProviderError &&
      ["FGO_INVOICE_FAILED", "PROVIDER_TIMEOUT", "PROVIDER_NETWORK_ERROR"].includes(error.code)
    ) {
      const failedAt = new Date().toISOString();
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE integration_credentials SET checked_at=?1,check_status='failed' WHERE provider='fgo'",
        ).bind(failedAt),
        env.DB.prepare(
          `UPDATE provider_configurations SET status='degraded',last_healthcheck_at=?1,
           last_error_code=?2,last_error_message=?3,updated_at=?1 WHERE provider='fgo'`,
        ).bind(failedAt, error.code, error.message.slice(0, 500)),
      ]);
    }
    await logProviderOperation(env.DB, {
      provider: "fgo",
      operationType: "invoice.issue",
      entityType: "order",
      entityId: orderId,
      idempotencyKey,
      environment,
      status: "failed",
      errorCode: error instanceof ProviderError ? error.code : "FGO_UNKNOWN_ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown FGO error",
    });
    throw error;
  }
}
