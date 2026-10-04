import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { assertPermission, requireAdminAuth } from "./admin-auth";
import {
  credentialProviderSchema,
  financeSettingsSchema,
  reportSettingsSchema,
  researchSettingsSchema,
  trafficSettingsSchema,
} from "./growth-contracts";
import {
  activity,
  credentialStatuses,
  readSetting,
  saveSetting,
  storeCredential,
} from "@/server/services/growth-settings";
import { buildOwnerReport } from "@/server/services/owner-reports";
import { researchProduct } from "@/server/services/supplier-research";
import { checkConnection, syncTraffic } from "@/server/services/traffic-integrations";
import type { CommerceEnv } from "@/server/integrations/provider-runtime";

function sameOrigin() {
  const request = getRequest(),
    origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new Error("Cerere de administrare nepermisă.");
}
export const getGrowthSettings = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "integrations.read");
    return {
      reports: await readSetting(env.DB, "owner_reports", reportSettingsSchema),
      traffic: await readSetting(env.DB, "traffic", trafficSettingsSchema),
      research: await readSetting(env.DB, "supplier_research", researchSettingsSchema),
      finance: await readSetting(env.DB, "finance", financeSettingsSchema),
      credentials: await credentialStatuses(env as CommerceEnv),
      secureStorageReady: Boolean((env as CommerceEnv).INTEGRATION_ENCRYPTION_KEY),
    };
  });
const settingInput = z.discriminatedUnion("section", [
  z.object({ section: z.literal("owner_reports"), value: reportSettingsSchema }),
  z.object({ section: z.literal("traffic"), value: trafficSettingsSchema }),
  z.object({ section: z.literal("supplier_research"), value: researchSettingsSchema }),
  z.object({ section: z.literal("finance"), value: financeSettingsSchema }),
]);
export const saveGrowthSettings = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(settingInput)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "integrations.write");
    if (data.section === "owner_reports") {
      assertPermission(context.admin, "team.write");
      const owners = await env.DB.prepare(
        `SELECT DISTINCT au.email FROM admin_users au JOIN admin_user_roles ur ON ur.admin_user_id=au.id JOIN roles r ON r.id=ur.role_id WHERE r.code='owner' AND au.status!='suspended'`,
      ).all<{ email: string }>();
      if (
        data.value.recipients.some(
          (email) => !owners.results.some((o) => o.email.toLowerCase() === email),
        )
      )
        throw new Error("Rapoartele pot fi trimise numai adreselor conturilor super admin.");
    }
    await saveSetting(env.DB, data.section, data.value, context.admin.id);
    return { ok: true };
  });
export const saveIntegrationCredential = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(
    z.object({ provider: credentialProviderSchema, value: z.string().trim().min(8).max(8192) }),
  )
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "integrations.write");
    await storeCredential(env as CommerceEnv, data.provider, data.value, context.admin.id);
    return { ok: true };
  });
export const verifyIntegration = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(z.object({ provider: credentialProviderSchema }))
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "integrations.write");
    return checkConnection(env as CommerceEnv, data.provider);
  });
export const previewOwnerReport = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "reports.read");
    return buildOwnerReport(env.DB);
  });
export const getSupplierResearch = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .validator(z.object({ productId: z.string().min(1).max(100) }))
  .handler(async ({ context, data }) => {
    assertPermission(context.admin, "catalog.read");
    const runs = await env.DB.prepare(
      "SELECT * FROM supplier_research_runs WHERE product_id=?1 ORDER BY created_at DESC LIMIT 10",
    )
      .bind(data.productId)
      .all<Record<string, string | number | null>>();
    const suggestions = await env.DB.prepare(
      `SELECT * FROM supplier_suggestions WHERE run_id=(SELECT id FROM supplier_research_runs WHERE product_id=?1 AND status='success' ORDER BY created_at DESC LIMIT 1) ORDER BY rank`,
    )
      .bind(data.productId)
      .all<Record<string, string | number | null>>();
    return { runs: runs.results, suggestions: suggestions.results };
  });
export const runSupplierResearch = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(z.object({ productId: z.string().min(1).max(100) }))
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "catalog.write");
    assertPermission(context.admin, "integrations.write");
    await activity(env.DB, context.admin.id, "supplier.research_requested", data.productId).run();
    return researchProduct(env as CommerceEnv, data.productId);
  });
export const getTrafficMetrics = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "reports.read");
    return (
      await env.DB.prepare(
        "SELECT source,property_id,metric,SUM(value) AS value,MAX(imported_at) AS updated_at,MIN(day) AS first_day,MAX(day) AS last_day FROM traffic_daily_metrics WHERE day>=date('now','-30 days') GROUP BY source,property_id,metric",
      ).all<Record<string, string | number | null>>()
    ).results;
  });
export const importTrafficMetrics = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(z.object({ source: z.enum(["ga4", "gsc"]) }))
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "integrations.write");
    return syncTraffic(env as CommerceEnv, data.source);
  });
