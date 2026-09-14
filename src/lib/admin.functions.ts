import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { assertPermission, requireAdminAuth } from "@/lib/admin-auth";
import { getBusinessHubData } from "@/server/db/business-hub.repository";
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
