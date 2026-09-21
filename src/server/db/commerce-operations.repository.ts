import type {
  AdminCommerceOperations,
  CommercePublicConfig,
  ReturnRequestInput,
  ReturnRequestPublicResult,
} from "@/lib/commerce-operations-contracts";
import { digestHex, ProviderError } from "@/server/integrations/provider-runtime";

type DbValue = string | number | null;
type DbRow = Record<string, DbValue>;

function stringValue(value: DbValue | undefined): string {
  return value == null ? "" : String(value);
}

function nullableString(value: DbValue | undefined): string | null {
  return value == null ? null : String(value);
}

function numberValue(value: DbValue | undefined): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

function parseJson<T>(value: DbValue | undefined, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
function countryList(value: DbValue | undefined): string[] {
  const parsed = parseJson<unknown>(value, ["RO"]);
  return Array.isArray(parsed) &&
    parsed.length &&
    parsed.every((v) => typeof v === "string" && /^[A-Z]{2}$/.test(v))
    ? parsed
    : ["RO"];
}

function normalizePhone(phone: string): string | null {
  if (!phone.trim()) return null;
  const compact = phone.replace(/[\s().-]/g, "");
  if (/^0\d{9}$/.test(compact)) return `+40${compact.slice(1)}`;
  if (/^40\d{9}$/.test(compact)) return `+${compact}`;
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  return null;
}

export async function getCommercePublicConfig(
  db: D1Database,
  availability: { stripe: boolean; smartship: boolean },
): Promise<CommercePublicConfig> {
  const results = await db.batch<DbRow>([
    db.prepare("SELECT * FROM legal_entities WHERE id = 'legal_entity_main'"),
    db.prepare("SELECT * FROM shipping_policy_configs WHERE code = 'RO_STANDARD'"),
    db.prepare(
      `SELECT policy_type, version, content_json FROM policy_versions
       WHERE policy_type IN ('returns', 'warranty') AND locale = 'ro-RO' AND status = 'active'`,
    ),
    db.prepare(
      `SELECT version, text FROM consent_templates
       WHERE purpose = 'contract_and_privacy' AND channel = 'checkout' AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
    ),
    db.prepare("SELECT value_json FROM site_settings WHERE key = 'commerce.supported_currencies'"),
  ]);
  const entity = results[0].results[0] ?? {};
  const shipping = results[1].results[0] ?? {};
  const policies = new Map(
    results[2].results.map((row) => [stringValue(row.policy_type), row] as const),
  );
  const consent = results[3].results[0] ?? {};
  const currencies = parseJson<{ active: string[]; planned: string[] }>(
    results[4].results[0]?.value_json,
    { active: ["RON"], planned: ["EUR"] },
  );
  const returns = policies.get("returns");
  const warranty = policies.get("warranty");
  const returnRules = parseJson<{ withdrawal_days?: number }>(returns?.content_json, {});
  const warrantyRules = parseJson<{ legal_guarantee_months?: number }>(warranty?.content_json, {});
  const shippingVerified = shipping.validation_status === "verified";
  const allowedCountries = countryList(shipping.allowed_countries_json);

  return {
    seller: {
      legalName: stringValue(entity.legal_name),
      taxId: stringValue(entity.tax_id),
      vatStatus: stringValue(entity.vat_status),
      countryCode: stringValue(entity.country_code) || "RO",
      profileComplete: entity.status === "verified",
    },
    currencies,
    payments: {
      card: { enabled: availability.stripe, provider: "stripe" },
      cashOnDelivery: { enabled: true, reviewMayApply: true },
      bankTransfer: { enabled: false },
    },
    shipping: {
      liveQuotesEnabled:
        availability.smartship && shippingVerified && numberValue(shipping.use_live_quotes) === 1,
      easyboxEnabled:
        availability.smartship && shippingVerified && numberValue(shipping.easybox_enabled) === 1,
      standardPrice:
        shippingVerified && shipping.standard_price_bani != null
          ? numberValue(shipping.standard_price_bani) / 100
          : null,
      lockerPrice:
        shippingVerified && shipping.locker_price_bani != null
          ? numberValue(shipping.locker_price_bani) / 100
          : null,
      freeOver:
        shippingVerified && shipping.free_over_bani != null
          ? numberValue(shipping.free_over_bani) / 100
          : null,
      defaultWeightG: numberValue(shipping.default_weight_g),
      defaultLengthCm: numberValue(shipping.default_length_cm),
      defaultWidthCm: numberValue(shipping.default_width_cm),
      defaultHeightCm: numberValue(shipping.default_height_cm),
      allowedCountries,
      internationalReady:
        Array.isArray(allowedCountries) && allowedCountries.some((country) => country !== "RO"),
      currency: stringValue(shipping.currency) || "RON",
      requiresConfirmation: !shippingVerified,
    },
    policies: {
      checkoutConsentVersion: stringValue(consent.version),
      checkoutConsentText: stringValue(consent.text),
      returnsVersion: stringValue(returns?.version),
      warrantyVersion: stringValue(warranty?.version),
      withdrawalDays: returnRules.withdrawal_days ?? 14,
      legalGuaranteeMonths: warrantyRules.legal_guarantee_months ?? 24,
    },
  };
}

function returnNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return `RET-${date}-${suffix}`;
}

export async function createReturnRequest(
  db: D1Database,
  input: ReturnRequestInput,
): Promise<ReturnRequestPublicResult & { returnId: string }> {
  const phone = normalizePhone(input.phone);
  const order = await db
    .prepare(
      `
      SELECT o.id, o.order_number, o.public_token, o.customer_id, o.customer_name,
             o.customer_email, o.customer_phone_e164, o.currency, o.total_bani,
             MAX(s.delivered_at) AS delivered_at,
             MAX(CASE WHEN oi.personalization_json != '{}' THEN 1 ELSE 0 END) AS personalized
      FROM orders o
      LEFT JOIN shipments s ON s.order_id = o.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.order_number = ?1
        AND (
          (o.customer_email IS NOT NULL AND lower(o.customer_email) = lower(?2))
          OR (o.customer_phone_e164 IS NOT NULL AND o.customer_phone_e164 = ?3)
        )
      GROUP BY o.id
    `,
    )
    .bind(input.orderNumber, input.email, phone)
    .first<DbRow>();
  if (!order) {
    throw new ProviderError(
      "Comanda nu a fost găsită pentru datele furnizate.",
      "ORDER_NOT_FOUND",
      404,
    );
  }

  const orderItems = await db
    .prepare(`SELECT id, quantity FROM order_items WHERE order_id = ?1 ORDER BY created_at`)
    .bind(order.id)
    .all<{ id: string; quantity: number }>();
  const selected = input.itemIds.length
    ? orderItems.results.filter((item) => input.itemIds.includes(item.id))
    : orderItems.results;
  if (!selected.length) {
    throw new ProviderError(
      "Selectează cel puțin un produs din comandă.",
      "RETURN_ITEMS_REQUIRED",
      400,
    );
  }

  const now = new Date();
  const deliveredAt = nullableString(order.delivered_at);
  const deliveredDate = deliveredAt ? new Date(deliveredAt) : null;
  const withdrawalDeadline = deliveredDate
    ? new Date(deliveredDate.getTime() + 14 * 86_400_000)
    : null;
  const guaranteeDeadline = deliveredDate ? new Date(deliveredDate) : null;
  guaranteeDeadline?.setUTCMonth(guaranteeDeadline.getUTCMonth() + 24);
  let eligibility: "eligible" | "manual_review" | "not_eligible" = "manual_review";
  if (input.requestType === "withdrawal" && withdrawalDeadline) {
    eligibility = now <= withdrawalDeadline ? "eligible" : "not_eligible";
  } else if (
    ["nonconformity", "damaged", "wrong_item"].includes(input.requestType) &&
    guaranteeDeadline
  ) {
    eligibility = now <= guaranteeDeadline ? "eligible" : "manual_review";
  }
  if (numberValue(order.personalized) === 1 && input.requestType === "withdrawal") {
    eligibility = "manual_review";
  }

  const id = crypto.randomUUID();
  const publicToken = crypto.randomUUID();
  const number = returnNumber();
  const shippingPayer = ["nonconformity", "damaged", "wrong_item"].includes(input.requestType)
    ? "merchant"
    : "customer";
  const nowIso = now.toISOString();
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `
        INSERT INTO return_requests (
          id, return_number, public_token_hash, order_id, customer_id, request_type,
          status, customer_name, customer_email, customer_phone_e164, reason, details,
          preferred_resolution, delivery_date, withdrawal_deadline, eligibility_status,
          personalized_items_present, return_shipping_payer, currency, submitted_at,
          created_at, updated_at
        ) VALUES (
          ?1, ?2, ?3, ?4, ?5, ?6, 'submitted', ?7, ?8, ?9, ?10, ?11,
          ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?19, ?19
        )
      `,
      )
      .bind(
        id,
        number,
        await digestHex("SHA-256", publicToken),
        order.id,
        order.customer_id,
        input.requestType,
        input.customerName,
        input.email.toLowerCase(),
        phone,
        input.reason,
        input.details || null,
        input.preferredResolution,
        deliveredAt,
        withdrawalDeadline?.toISOString() ?? null,
        eligibility,
        numberValue(order.personalized) === 1 ? 1 : 0,
        shippingPayer,
        stringValue(order.currency) || "RON",
        nowIso,
      ),
    db
      .prepare(
        `INSERT INTO return_events (
          id, return_request_id, event_type, to_status, actor_type, message, metadata_json, created_at
        ) VALUES (?1, ?2, 'return.submitted', 'submitted', 'customer', ?3, ?4, ?5)`,
      )
      .bind(
        crypto.randomUUID(),
        id,
        "Cererea de retur a fost transmisă electronic.",
        JSON.stringify({ eligibility, requestType: input.requestType }),
        nowIso,
      ),
    db
      .prepare(
        `INSERT INTO admin_notifications (
          id, notification_type, severity, title, message, entity_type, entity_id,
          deduplication_key, action_url, created_at
        ) VALUES (?1, 'order', 'warning', ?2, ?3, 'return_request', ?4, ?5, '/admin/returns', ?6)`,
      )
      .bind(
        crypto.randomUUID(),
        `Cerere de retur ${number}`,
        `${input.orderNumber} · ${input.requestType} · ${eligibility}`,
        id,
        `return:${id}`,
        nowIso,
      ),
  ];
  for (const item of selected) {
    statements.push(
      db
        .prepare(
          `INSERT INTO return_request_items (
            id, return_request_id, order_item_id, quantity, condition_code
          ) VALUES (?1, ?2, ?3, ?4, 'unverified')`,
        )
        .bind(crypto.randomUUID(), id, item.id, item.quantity),
    );
  }
  await db.batch(statements);
  return {
    returnId: id,
    returnNumber: number,
    publicToken,
    status: "submitted",
    eligibilityStatus: eligibility,
    message:
      eligibility === "not_eligible"
        ? "Cererea a fost înregistrată și necesită verificare deoarece termenul standard pare depășit."
        : "Cererea a fost înregistrată. Vei primi instrucțiunile după verificare.",
  };
}

export async function getAdminCommerceOperations(db: D1Database): Promise<AdminCommerceOperations> {
  const results = await db.batch<DbRow>([
    db.prepare("SELECT * FROM legal_entities WHERE id = 'legal_entity_main'"),
    db.prepare("SELECT * FROM invoice_series ORDER BY document_type, code"),
    db.prepare("SELECT * FROM provider_configurations ORDER BY capability, provider, environment"),
    db.prepare(
      `SELECT o.id, o.order_number, o.customer_name, o.total_bani, o.currency, o.placed_at
       FROM orders o
       WHERE o.order_status != 'cancelled'
         AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.order_id = o.id AND i.status != 'cancelled')
       ORDER BY o.placed_at DESC LIMIT 100`,
    ),
    db.prepare(
      `SELECT i.*, o.order_number,
              (SELECT bd.id FROM business_documents bd
               WHERE bd.entity_type = 'invoice' AND bd.entity_id = i.id AND bd.status = 'active'
               ORDER BY bd.created_at DESC LIMIT 1) AS document_id
       FROM invoices i LEFT JOIN orders o ON o.id = i.order_id
       ORDER BY i.created_at DESC LIMIT 100`,
    ),
    db.prepare(
      `SELECT rr.*, o.order_number FROM return_requests rr JOIN orders o ON o.id = rr.order_id
       ORDER BY rr.submitted_at DESC LIMIT 100`,
    ),
    db.prepare("SELECT * FROM shipping_policy_configs WHERE code = 'RO_STANDARD'"),
    db.prepare("SELECT * FROM financial_accounts ORDER BY provider, account_type, currency"),
    db.prepare(
      `SELECT source,MAX(imported_at) AS last_sync FROM traffic_daily_metrics GROUP BY source`,
    ),
  ]);
  const entity = results[0].results[0] ?? {};
  const shipping = results[6].results[0] ?? {};
  const shippingCountries = countryList(shipping.allowed_countries_json);
  return {
    legalEntity: {
      legalName: stringValue(entity.legal_name),
      taxId: stringValue(entity.tax_id),
      vatStatus: stringValue(entity.vat_status),
      registrationNumber: nullableString(entity.registration_number),
      registeredAddress: nullableString(entity.registered_address),
      publicEmail: nullableString(entity.public_email),
      publicPhone: nullableString(entity.public_phone),
      bankName: nullableString(entity.bank_name),
      ibanMasked: nullableString(entity.iban_masked),
      status: stringValue(entity.status),
    },
    invoiceSeries: results[1].results.map((row) => ({
      id: stringValue(row.id),
      code: stringValue(row.code),
      prefix: stringValue(row.prefix),
      nextNumber: numberValue(row.next_number),
      documentType: stringValue(row.document_type),
      status: stringValue(row.status),
    })),
    providers: results[2].results.map((row) => ({
      id: stringValue(row.id),
      provider: stringValue(row.provider),
      capability: stringValue(row.capability),
      environment: stringValue(row.environment),
      status: stringValue(row.status),
      secretConfigured: false,
      lastHealthcheckAt: nullableString(row.last_healthcheck_at),
      lastError: nullableString(row.last_error_message),
    })),
    financialAccounts: results[7].results.map((row) => ({
      id: stringValue(row.id),
      provider: stringValue(row.provider),
      accountType: stringValue(row.account_type),
      label: stringValue(row.label),
      currency: stringValue(row.currency),
      maskedIdentifier: nullableString(row.masked_identifier),
      secretConfigured: false,
      status: stringValue(row.status),
      lastSyncedAt: nullableString(row.last_synced_at),
    })),
    trafficReadiness: {
      googleAnalyticsReady: results[8].results.some((row) => row.source === "ga4"),
      gscReady: results[8].results.some((row) => row.source === "gsc"),
      socialReady: results[8].results.some((row) =>
        ["facebook", "instagram", "tiktok"].includes(stringValue(row.source)),
      ),
      lastSyncAt:
        results[8].results
          .map((row) => stringValue(row.last_sync))
          .sort()
          .at(-1) ?? null,
    },
    pendingInvoiceOrders: results[3].results.map((row) => ({
      id: stringValue(row.id),
      orderNumber: stringValue(row.order_number),
      customerName: stringValue(row.customer_name),
      total: numberValue(row.total_bani) / 100,
      currency: stringValue(row.currency),
      placedAt: stringValue(row.placed_at),
    })),
    invoices: results[4].results.map((row) => ({
      id: stringValue(row.id),
      orderNumber: nullableString(row.order_number),
      invoiceNumber: nullableString(row.invoice_number),
      status: stringValue(row.status),
      total: numberValue(row.total_bani) / 100,
      currency: stringValue(row.currency),
      provider: nullableString(row.external_provider),
      issuedAt: nullableString(row.issued_at),
      documentId: nullableString(row.document_id),
    })),
    returnRequests: results[5].results.map((row) => ({
      id: stringValue(row.id),
      returnNumber: stringValue(row.return_number),
      orderNumber: stringValue(row.order_number),
      customerName: stringValue(row.customer_name),
      requestType: stringValue(row.request_type),
      status: stringValue(row.status),
      eligibilityStatus: stringValue(row.eligibility_status),
      submittedAt: stringValue(row.submitted_at),
    })),
    shippingPolicy: {
      standardPriceBani:
        shipping.standard_price_bani == null ? null : numberValue(shipping.standard_price_bani),
      lockerPriceBani:
        shipping.locker_price_bani == null ? null : numberValue(shipping.locker_price_bani),
      freeOverBani: shipping.free_over_bani == null ? null : numberValue(shipping.free_over_bani),
      defaultWeightG: numberValue(shipping.default_weight_g),
      defaultLengthCm: numberValue(shipping.default_length_cm),
      defaultWidthCm: numberValue(shipping.default_width_cm),
      defaultHeightCm: numberValue(shipping.default_height_cm),
      allowedCountries: shippingCountries,
      internationalReady: shippingCountries.some((country) => country !== "RO"),
      easyboxEnabled: numberValue(shipping.easybox_enabled) === 1,
      useLiveQuotes: numberValue(shipping.use_live_quotes) === 1,
      validationStatus: stringValue(shipping.validation_status),
    },
  };
}
