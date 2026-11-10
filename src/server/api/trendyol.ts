import { z } from "zod";
import { authenticateAdminRequest, assertPermission } from "@/lib/admin-auth";
import { AdminAuthError } from "@/lib/admin-password-auth-service";
import { boundedJson } from "./bounded-json";
import { type CommerceEnv, ProviderError } from "../integrations/provider-runtime";
import { trendyolCredentials, TrendyolReviewError } from "../integrations/trendyol";
import {
  verifyTrendyolConnection,
  syncTrendyolOrders,
  syncTrendyolFinancials,
  observeTrendyolInventory,
  trendyolReviewCode,
} from "../services/trendyol-sync";
import { trendyolLabel, trendyolPrintPreview } from "../services/trendyol-documents";
import { reconcileTrendyolStock } from "../services/trendyol-stock";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "private, no-store" } });
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("verify") }).strict(),
  z
    .object({
      action: z.literal("sync-orders"),
      orderNumber: z
        .string()
        .regex(/^[\w-]{1,100}$/)
        .optional(),
    })
    .strict(),
  z.object({ action: z.literal("sync-finance") }).strict(),
  z
    .object({ action: z.literal("observe-inventory"), sku: z.string().regex(/^[\w-]{1,100}$/) })
    .strict(),
  z.object({ action: z.literal("automation"), enabled: z.boolean() }).strict(),
  z
    .object({
      action: z.literal("sync-stock"),
      sku: z.string().regex(/^[\w-]{1,100}$/),
      allowIncrease: z.boolean().default(false),
    })
    .strict(),
]);
export async function handleTrendyol(request: Request, env: CommerceEnv): Promise<Response | null> {
  const path = new URL(request.url).pathname,
    match = path.match(
      /^\/api\/v1\/admin\/trendyol\/orders\/([\w-]+)\/(invoice-preview|packing|label)(?:\/([\w-]+))?$/,
    );
  if (path !== "/api/v1/admin/trendyol" && !match) return null;
  try {
    const admin = await authenticateAdminRequest(request, env, "orders.read");
    if (match) {
      if (request.method !== "GET") return json({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);
      if (match[2] === "invoice-preview") assertPermission(admin, "operations.read");
      return match[2] === "label"
        ? await trendyolLabel(env, match[1], match[3] || "")
        : await trendyolPrintPreview(env, match[1], match[2] === "packing" ? "packing" : "invoice");
    }
    if (request.method === "GET") {
      const canFinance = admin.permissions.includes("operations.read");
      const state = await env.DB.prepare(
        "SELECT seller_id,enabled,verified_at,last_order_sync_at,last_finance_sync_at,last_error_code,stock_buffer,finance_cursor_json IS NOT NULL AS finance_has_more FROM trendyol_sync_state WHERE id=1",
      ).first();
      const packages = (
        await env.DB.prepare(
          `SELECT p.*,o.order_number,o.external_order_id,o.customer_name,s.review_code,json_extract(s.snapshot_json,'$[0].isCod') AS platform_collects_cod,
        (SELECT json_group_array(DISTINCT json_extract(l.value,'$.commissionRate')) FROM json_each(s.snapshot_json) pkg,json_each(pkg.value,'$.lines') l WHERE json_extract(l.value,'$.commissionRate') IS NOT NULL) AS commission_rates_json
        FROM marketplace_packages p JOIN orders o ON o.id=p.order_id JOIN marketplace_order_sources s ON s.order_id=p.order_id ORDER BY o.placed_at DESC LIMIT 100`,
        ).all()
      ).results;
      const issues = (
        await env.DB.prepare(
          "SELECT external_order_id,code,updated_at FROM trendyol_sync_issues WHERE status='open' ORDER BY updated_at DESC LIMIT 30",
        ).all()
      ).results;
      const inventory = (
        await env.DB.prepare(
          `SELECT m.*,p.name,p.id AS product_id,v.inventory_policy,CASE WHEN v.inventory_policy='deny' THEN (SELECT SUM(MAX(0,i.on_hand_quantity-i.reserved_quantity-i.safety_stock_quantity)) FROM inventory_levels i JOIN stock_locations sl ON sl.id=i.location_id WHERE i.variant_id=v.id AND sl.active=1 AND sl.location_type!='virtual') ELSE NULL END AS central_available FROM marketplace_inventory_snapshots m LEFT JOIN product_variants v ON v.sku=m.sku LEFT JOIN products p ON p.id=v.product_id`,
        ).all()
      ).results;
      const finance = canFinance
        ? (
            await env.DB.prepare(
              "SELECT * FROM marketplace_financial_entries ORDER BY occurred_at_ms DESC LIMIT 100",
            ).all()
          ).results
        : [];
      return json({
        data: {
          state,
          packages,
          issues,
          inventory,
          finance,
          canFinance,
          canSync:
            admin.permissions.includes("orders.write") &&
            admin.permissions.includes("inventory.write"),
          canConfigure: admin.permissions.includes("integrations.write"),
        },
      });
    }
    if (request.method !== "POST") return json({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);
    const d = input.safeParse(await boundedJson(request, 4096));
    if (!d.success) return json({ error: { code: "INVALID_INPUT" } }, 400);
    const a = d.data;
    if (a.action === "verify") {
      assertPermission(admin, "integrations.write");
      return json({ data: await verifyTrendyolConnection(env) });
    }
    if (a.action === "automation") {
      assertPermission(admin, "integrations.write");
      await trendyolCredentials(env);
      const result = await env.DB.prepare(
        "UPDATE trendyol_sync_state SET enabled=?1 WHERE id=1 AND verified_at IS NOT NULL",
      )
        .bind(a.enabled ? 1 : 0)
        .run();
      if (!result.meta.changes) throw new TrendyolReviewError("CONNECTOR_NOT_VERIFIED");
      await env.DB.prepare(
        "INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json) VALUES(?1,?2,?3,'trendyol.automation','integration','trendyol',?4)",
      )
        .bind(crypto.randomUUID(), admin.id, admin.email, JSON.stringify({ enabled: a.enabled }))
        .run();
      let initialPollQueued: boolean | undefined;
      if (a.enabled) {
        try {
          await env.COMMERCE_EVENTS.send({ version: 5, type: "trendyol.poll" });
          initialPollQueued = true;
        } catch {
          initialPollQueued = false;
          await env.DB.prepare(
            "UPDATE trendyol_sync_state SET last_error_code='QUEUE_ENQUEUE_FAILED' WHERE id=1",
          ).run();
        }
      }
      return json({ data: { saved: true, initialPollQueued } });
    }
    if (a.action === "sync-finance") {
      assertPermission(admin, "operations.read");
      assertPermission(admin, "integrations.write");
      return json({ data: await syncTrendyolFinancials(env) });
    }
    assertPermission(admin, "orders.write");
    assertPermission(admin, "inventory.write");
    if (a.action === "sync-stock")
      return json({ data: await reconcileTrendyolStock(env, a.sku, a.allowIncrease, admin.id) });
    return json({
      data:
        a.action === "observe-inventory"
          ? await observeTrendyolInventory(env, a.sku)
          : await syncTrendyolOrders(env, a.orderNumber, admin.id),
    });
  } catch (e) {
    if (e instanceof AdminAuthError)
      return json({ error: { code: "ACCESS_DENIED", message: e.message } }, e.statusCode);
    const code = trendyolReviewCode(e);
    return json(
      {
        error: {
          code,
          message:
            e instanceof ProviderError
              ? e.message
              : "Operațiunea Trendyol necesită verificare. Datele financiare și stocul nu au fost presupuse.",
        },
      },
      e instanceof ProviderError ? e.status : e instanceof TrendyolReviewError ? 409 : 500,
    );
  }
}
