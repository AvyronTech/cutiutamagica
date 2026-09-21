import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { assertPermission, requireAdminAuth } from "@/lib/admin-auth";
import { getBusinessHubData } from "@/server/db/business-hub.repository";
import { getAdminCommerceOperations } from "@/server/db/commerce-operations.repository";
import { issueFgoInvoiceForOrder } from "@/server/services/commerce-operations.service";
import type { CommerceEnv } from "@/server/integrations/provider-runtime";
import { credentialStatuses, credential } from "@/server/services/growth-settings";
import { ADMIN_ORDER_STATUSES } from "@/lib/admin-contracts";
import {
  getAdminDashboardData,
  getAdminIntegrationsData,
  getAdminSettingsData,
  getAdminStatisticsData,
  dismissAdminNotification,
  listAdminNotifications,
  listAdminOrders,
  listAdminProducts,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  saveAdminSettingsData,
  updateOrderStatus,
  updateProductStatus,
} from "@/server/db/admin.repository";

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    return { ...context.admin, userId: context.admin.id, isAdmin: true };
  });

export const completeAdminOnboarding = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    await env.DB.prepare(
      `
      UPDATE admin_users
      SET onboarding_status = 'complete',
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?1
    `,
    )
      .bind(context.admin.id)
      .run();
    return { ok: true };
  });

export const getAdminOrders = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "orders.read");
    return { orders: await listAdminOrders(env.DB) };
  });

export const getAdminProducts = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "catalog.read");
    return { products: await listAdminProducts(env.DB, env.PUBLIC_SITE_URL) };
  });

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "dashboard.read");
    return getAdminDashboardData(env.DB);
  });

export const getAdminNotifications = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "dashboard.read");
    return { notifications: await listAdminNotifications(env.DB) };
  });

export const getAdminStatistics = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "reports.read");
    return getAdminStatisticsData(env.DB);
  });

export const getAdminIntegrations = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "integrations.read");
    return getAdminIntegrationsData(env.DB);
  });

export const getAdminSettings = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "dashboard.read");
    return getAdminSettingsData(env.DB);
  });

export const getAdminBusinessHub = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "dashboard.read");
    return getBusinessHubData(env.DB);
  });

export const getCommerceOperations = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "dashboard.read");
    const data = await getAdminCommerceOperations(env.DB);
    const runtime = env as CommerceEnv;
    const configured = await credentialStatuses(runtime);
    return {
      ...data,
      trafficReadiness: data.trafficReadiness,
      providers: data.providers.map((provider) => ({
        ...provider,
        secretConfigured:
          provider.provider === "fgo"
            ? Boolean(runtime.FGO_PRIVATE_KEY)
            : configured.some((c) => c.provider === provider.provider && c.configured),
      })),
      financialAccounts: data.financialAccounts.map((account) => ({
        ...account,
        secretConfigured:
          account.provider === "fgo"
            ? Boolean(runtime.FGO_PRIVATE_KEY)
            : configured.some((c) => c.provider === account.provider && c.configured),
      })),
    };
  });

const invoiceOrderInput = z.object({ orderId: z.string().uuid() });

export const issueFgoInvoice = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(invoiceOrderInput)
  .handler(async ({ context, data }) => {
    assertPermission(context.admin, "orders.write");
    return issueFgoInvoiceForOrder(env as CommerceEnv, data.orderId, {
      id: context.admin.id,
      email: context.admin.email,
    });
  });

const legalEntityInput = z.object({
  registrationNumber: z.string().trim().max(80),
  registeredAddress: z.string().trim().max(500),
  publicEmail: z.union([z.literal(""), z.string().trim().email().max(254)]),
  publicPhone: z.string().trim().max(40),
  bankName: z.string().trim().max(120),
  ibanMasked: z.string().trim().max(50),
  markVerified: z.boolean(),
});

export const saveLegalEntity = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(legalEntityInput)
  .handler(async ({ context, data }) => {
    assertPermission(context.admin, "team.write");
    if (
      data.markVerified &&
      (!data.registrationNumber || !data.registeredAddress || !data.publicEmail)
    ) {
      throw new Error(
        "Pentru verificare sunt obligatorii numărul de înregistrare, adresa și e-mailul.",
      );
    }
    const status = data.markVerified ? "verified" : "incomplete";
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE legal_entities SET registration_number = ?1, registered_address = ?2,
           public_email = ?3, public_phone = ?4, bank_name = ?5, iban_masked = ?6,
           status = ?7, verified_at = CASE WHEN ?7 = 'verified' THEN strftime('%Y-%m-%dT%H:%M:%fZ', 'now') END,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = 'legal_entity_main'`,
      ).bind(
        data.registrationNumber || null,
        data.registeredAddress || null,
        data.publicEmail || null,
        data.publicPhone || null,
        data.bankName || null,
        data.ibanMasked || null,
        status,
      ),
      env.DB.prepare(
        `INSERT INTO audit_log (
          id, actor_admin_user_id, actor_label, action, entity_type, entity_id,
          after_json, metadata_json
        ) VALUES (?1, ?2, ?3, 'legal_entity.update', 'legal_entity', 'legal_entity_main', ?4, '{}')`,
      ).bind(
        crypto.randomUUID(),
        context.admin.id,
        context.admin.email,
        JSON.stringify({ ...data, status, ibanMasked: data.ibanMasked ? "configured" : "missing" }),
      ),
    ]);
    return { ok: true, status };
  });

const invoiceSeriesInput = z.object({
  seriesId: z.string().min(1).max(128),
  prefix: z
    .string()
    .trim()
    .regex(/^[A-Z0-9_-]{1,20}$/),
  status: z.enum(["draft", "active", "closed"]),
});

export const saveInvoiceSeries = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(invoiceSeriesInput)
  .handler(async ({ context, data }) => {
    assertPermission(context.admin, "orders.write");
    await env.DB.prepare(
      `UPDATE invoice_series SET prefix = ?1, status = ?2,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?3`,
    )
      .bind(data.prefix, data.status, data.seriesId)
      .run();
    return { ok: true };
  });

const nullableMoney = z.union([z.number().min(0).max(100_000), z.null()]);
const shippingPolicyInput = z.object({
  standardPrice: nullableMoney,
  lockerPrice: nullableMoney,
  freeOver: nullableMoney,
  defaultWeightG: z.number().int().min(100).max(10_000),
  defaultLengthCm: z.number().int().min(1).max(500),
  defaultWidthCm: z.number().int().min(1).max(500),
  defaultHeightCm: z.number().int().min(1).max(500),
  allowedCountries: z.string().max(800).default("RO"),
  internationalReady: z.boolean(),
  easyboxEnabled: z.boolean(),
  useLiveQuotes: z.boolean(),
  markVerified: z.boolean(),
});

function parseCountryList(input: string): string[] {
  const countries = (input ?? "")
    .split(/[;,\n\r]+/)
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
  if (countries.some((value) => !/^[A-Z]{2}$/.test(value)))
    throw new Error("Folosește coduri de țară ISO din două litere.");
  const uniqueCountries = Array.from(new Set(countries));
  return uniqueCountries.length ? uniqueCountries : ["RO"];
}

export const saveShippingPolicy = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(shippingPolicyInput)
  .handler(async ({ context, data }) => {
    const request = getRequest();
    if (request.headers.get("origin") !== new URL(request.url).origin)
      throw new Error("Origine nepermisă.");
    assertPermission(context.admin, "integrations.write");
    const allowedCountries = parseCountryList(data.allowedCountries);
    if (data.useLiveQuotes && !(await credential(env as CommerceEnv, "smartship")))
      throw new Error("Configurează cheia SmartShip înainte de activarea cotațiilor.");
    if (!allowedCountries.includes("RO")) {
      throw new Error("RO este obligatoriu pentru transportul de bază.");
    }
    if (data.internationalReady && allowedCountries.length <= 1) {
      throw new Error("Pentru livrare internațională setează cel puțin două țări în listă.");
    }
    if (!data.internationalReady) {
      allowedCountries.length = 1;
      allowedCountries[0] = "RO";
    }
    if (data.markVerified && !data.useLiveQuotes && data.standardPrice == null) {
      throw new Error("Completează costul standard sau activează cotațiile SmartShip.");
    }
    if (data.easyboxEnabled && !data.useLiveQuotes && data.lockerPrice == null) {
      throw new Error("Completează costul Easybox sau activează cotațiile SmartShip.");
    }
    await env.DB.prepare(
      `UPDATE shipping_policy_configs SET default_weight_g = ?1, default_length_cm = ?2, default_width_cm = ?3,
       default_height_cm = ?4, allowed_countries_json = ?5,
       standard_price_bani = ?6, locker_price_bani = ?7,
       free_over_bani = ?8, easybox_enabled = ?9, use_live_quotes = ?10,
       validation_status = ?11, updated_by = ?12,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE code = 'RO_STANDARD'`,
    )
      .bind(
        data.defaultWeightG,
        data.defaultLengthCm,
        data.defaultWidthCm,
        data.defaultHeightCm,
        JSON.stringify(allowedCountries),
        data.standardPrice == null ? null : Math.round(data.standardPrice * 100),
        data.lockerPrice == null ? null : Math.round(data.lockerPrice * 100),
        data.freeOver == null ? null : Math.round(data.freeOver * 100),
        data.easyboxEnabled ? 1 : 0,
        data.useLiveQuotes ? 1 : 0,
        data.markVerified ? "verified" : "requires_approval",
        context.admin.id,
      )
      .run();
    await env.CACHE.delete("commerce:public-config:v1");
    return { ok: true };
  });

const returnStatusInput = z.object({
  returnId: z.string().uuid(),
  status: z.enum([
    "submitted",
    "eligibility_review",
    "approved",
    "rejected",
    "in_transit",
    "received",
    "inspecting",
    "refund_pending",
    "refunded",
    "closed",
    "cancelled",
  ]),
});

export const updateReturnStatus = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(returnStatusInput)
  .handler(async ({ context, data }) => {
    assertPermission(context.admin, "orders.write");
    const current = await env.DB.prepare("SELECT status FROM return_requests WHERE id = ?1")
      .bind(data.returnId)
      .first<{ status: string }>();
    if (!current) throw new Error("Cererea de retur nu există.");
    const nowIso = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE return_requests SET status = ?1,
         approved_at = CASE WHEN ?1 = 'approved' THEN ?2 ELSE approved_at END,
         received_at = CASE WHEN ?1 = 'received' THEN ?2 ELSE received_at END,
         closed_at = CASE WHEN ?1 IN ('closed', 'cancelled', 'rejected') THEN ?2 ELSE closed_at END,
         updated_at = ?2 WHERE id = ?3`,
      ).bind(data.status, nowIso, data.returnId),
      env.DB.prepare(
        `INSERT INTO return_events (
          id, return_request_id, event_type, from_status, to_status, actor_type,
          actor_id, message, metadata_json, created_at
        ) VALUES (?1, ?2, 'return.status_changed', ?3, ?4, 'admin', ?5, ?6, '{}', ?7)`,
      ).bind(
        crypto.randomUUID(),
        data.returnId,
        current.status,
        data.status,
        context.admin.id,
        `Status schimbat în ${data.status}.`,
        nowIso,
      ),
    ]);
    return { ok: true };
  });

const trimmedString = (max: number) => z.string().trim().max(max);
const adminSettingsInput = z.object({
  business: z.object({
    name: trimmedString(120),
    description: trimmedString(1_000),
    email: z.union([z.literal(""), z.string().trim().email().max(254)]),
    phone: trimmedString(40),
    website: z.union([z.literal(""), z.string().trim().url().max(500)]),
    address: trimmedString(500),
    taxId: trimmedString(40),
    registrationNumber: trimmedString(80),
  }),
  social: z.object({
    instagram: trimmedString(200),
    facebook: trimmedString(200),
    tiktok: trimmedString(200),
    pinterest: trimmedString(200),
    youtube: trimmedString(500),
  }),
  notifications: z.object({
    newOrder: z.boolean(),
    paymentFailed: z.boolean(),
    orderShipped: z.boolean(),
    orderDelivered: z.boolean(),
    returnRequest: z.boolean(),
    integrationFailure: z.boolean(),
    dailyReport: z.boolean(),
  }),
  fulfillment: z.object({
    defaultShippingMethod: trimmedString(100),
    defaultDeliveryType: trimmedString(100),
  }),
});

export const saveAdminSettings = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(adminSettingsInput)
  .handler(async ({ context, data }) => {
    assertPermission(context.admin, "team.write");
    const requestId = getRequest().headers.get("x-request-id") ?? crypto.randomUUID();
    return saveAdminSettingsData(env.DB, data, context.admin.id, requestId);
  });

const notificationIdInput = z.object({ notificationId: z.string().min(1).max(128) });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(notificationIdInput)
  .handler(async ({ context, data }) => {
    assertPermission(context.admin, "dashboard.read");
    await markAdminNotificationRead(env.DB, data.notificationId);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "dashboard.read");
    await markAllAdminNotificationsRead(env.DB);
    return { ok: true };
  });

export const dismissNotification = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(notificationIdInput)
  .handler(async ({ context, data }) => {
    assertPermission(context.admin, "dashboard.read");
    await dismissAdminNotification(env.DB, data.notificationId);
    return { ok: true };
  });

const updateOrderStatusInput = z.object({
  orderId: z.string().min(1).max(128),
  status: z.enum(ADMIN_ORDER_STATUSES),
  expectedVersion: z.number().int().positive(),
});

export const updateAdminOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(updateOrderStatusInput)
  .handler(async ({ context, data }) => {
    assertPermission(context.admin, "orders.write");
    const request = getRequest();
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
    return {
      order: await updateOrderStatus(env.DB, {
        ...data,
        actorId: context.admin.id,
        requestId,
      }),
    };
  });

const updateProductStatusInput = z.object({
  productId: z.string().min(1).max(128),
  status: z.enum(["activ", "inactiv"]),
  expectedVersion: z.number().int().positive(),
});

export const updateAdminProductStatus = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(updateProductStatusInput)
  .handler(async ({ context, data }) => {
    assertPermission(context.admin, "catalog.write");
    const request = getRequest();
    const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
    const product = await updateProductStatus(env.DB, env.PUBLIC_SITE_URL, {
      ...data,
      actorId: context.admin.id,
      requestId,
    });
    await env.CACHE.delete("catalog:public:v1");
    return { product };
  });
