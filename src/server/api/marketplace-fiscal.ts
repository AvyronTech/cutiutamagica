import { z } from "zod";
import { assertPermission, authenticateAdminRequest } from "@/lib/admin-auth";
import { AdminAuthError } from "@/lib/admin-password-auth-service";
import { boundedJson } from "./bounded-json";
import { emagAwbPdf, emagId } from "../integrations/emag";
import { trendyolCredentials } from "../integrations/trendyol";
import { ProviderError, type CommerceEnv } from "../integrations/provider-runtime";
import {
  assertEmagConnection,
  linkEmagAwb,
  syncEmagOrder,
  verifyEmagConnection,
} from "../services/emag-orders";
import { fiscalPdf, inlinePdf, invoiceForOrder, readFiscalPdf } from "../services/fiscal-pdf";
import { marketplaceInvoiceStatus, sendMarketplaceInvoice } from "../services/marketplace-invoices";

const base = "/api/v1/admin/marketplace-fiscal";
const id = z.string().regex(/^[\w-]{1,100}$/);
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send-invoice"), orderId: id }).strict(),
  z.object({ action: z.literal("issue-invoice"), orderId: id }).strict(),
  z.object({ action: z.literal("verify-emag") }).strict(),
  z.object({ action: z.literal("sync-emag"), externalId: emagId }).strict(),
  z.object({ action: z.literal("emag-automation"), enabled: z.boolean() }).strict(),
  z
    .object({
      action: z.literal("invoice-automation"),
      provider: z.enum(["trendyol", "emag"]),
      enabled: z.boolean(),
    })
    .strict(),
  z.object({ action: z.literal("link-emag-awb"), orderId: id, awbId: emagId }).strict(),
]);
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "private, no-store" } });

export async function handleMarketplaceFiscal(
  request: Request,
  env: CommerceEnv,
): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  const resource = path.match(
    /^\/api\/v1\/admin\/marketplace-fiscal\/orders\/([\w-]{1,100})(?:\/(invoice|emag-label))?$/,
  );
  if (path !== base && !resource) return null;
  try {
    const admin = await authenticateAdminRequest(request, env, "orders.read");
    if (resource) {
      if (request.method !== "GET") return json({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);
      const [, orderId, kind] = resource;
      if (kind === "invoice") {
        assertPermission(admin, "operations.read");
        const invoice = await invoiceForOrder(env.DB, orderId);
        if (!invoice) return json({ error: { code: "INVOICE_NOT_FOUND" } }, 404);
        const pdf = await fiscalPdf(env, invoice);
        return inlinePdf(pdf.bytes, pdf.filename);
      }
      const emag = await env.DB.prepare(
        `SELECT external_id,status,payment_status,delivery_mode,awb_id,awb_number,carrier,existing_invoice,review_code,checked_at
        FROM emag_order_sources WHERE order_id=?`,
      )
        .bind(orderId)
        .first<{ awb_id: number | null; awb_number: string | null }>();
      if (kind === "emag-label") {
        if (!emag?.awb_id) return json({ error: { code: "EMAG_AWB_NOT_FOUND" } }, 404);
        const { c } = await assertEmagConnection(env);
        return inlinePdf(
          await readFiscalPdf(await emagAwbPdf(c, emag.awb_id)),
          `eMAG-AWB-${emag.awb_id}.pdf`,
        );
      }
      const invoice = admin.permissions.includes("operations.read")
        ? await marketplaceInvoiceStatus(env.DB, orderId)
        : null;
      const trendyol = (
        await env.DB.prepare(
          "SELECT external_package_id,cargo_number,cargo_provider FROM marketplace_packages WHERE order_id=? AND provider='trendyol' AND cargo_number!='' ORDER BY source_modified_ms DESC LIMIT 8",
        )
          .bind(orderId)
          .all()
      ).results;
      return json({
        data: {
          invoice,
          emag,
          trendyol,
          canFinance: admin.permissions.includes("operations.read"),
          canWrite: admin.permissions.includes("orders.write"),
          canSend:
            admin.permissions.includes("orders.write") &&
            admin.permissions.includes("operations.read"),
        },
      });
    }
    if (request.method === "GET") {
      assertPermission(admin, "integrations.read");
      const [state, settings, issues] = await env.DB.batch([
        env.DB.prepare(
          "SELECT enabled,verified_at,last_sync_at,last_error_code FROM emag_sync_state WHERE id=1",
        ),
        env.DB.prepare("SELECT provider,enabled_at FROM marketplace_invoice_settings"),
        env.DB.prepare(
          "SELECT external_id,code,updated_at FROM emag_sync_issues ORDER BY updated_at DESC LIMIT 10",
        ),
      ]);
      return json({
        data: {
          emag: state.results[0] ?? null,
          settings: settings.results,
          issues: issues.results,
          canConfigure: admin.permissions.includes("integrations.write"),
          canConfigureInvoices:
            admin.permissions.includes("integrations.write") &&
            admin.permissions.includes("operations.read") &&
            admin.permissions.includes("orders.write"),
          canImport:
            admin.permissions.includes("orders.write") &&
            admin.permissions.includes("inventory.write"),
        },
      });
    }
    if (request.method !== "POST") return json({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);
    const result = input.safeParse(await boundedJson(request, 4096));
    if (!result.success)
      return json({ error: { code: "INVALID_INPUT", message: "Verifică datele operației." } }, 400);
    const a = result.data;
    if (a.action === "issue-invoice") {
      assertPermission(admin, "orders.write");
      assertPermission(admin, "operations.read");
      const { issueInvoiceForOrder } = await import("../services/commerce-operations.service");
      const invoice = await issueInvoiceForOrder(env, a.orderId, admin);
      return json({ data: { number: invoice.invoiceNumber } });
    }
    if (a.action === "send-invoice") {
      assertPermission(admin, "orders.write");
      assertPermission(admin, "operations.read");
      return json({ data: await sendMarketplaceInvoice(env, a.orderId, admin.id) });
    }
    if (a.action === "link-emag-awb") {
      assertPermission(admin, "orders.write");
      await linkEmagAwb(env, a.orderId, a.awbId);
      return json({ data: { saved: true } });
    }
    if (a.action === "sync-emag") {
      assertPermission(admin, "orders.write");
      assertPermission(admin, "inventory.write");
      return json({ data: await syncEmagOrder(env, a.externalId, admin.id) });
    }
    assertPermission(admin, "integrations.write");
    if (a.action === "verify-emag") return json({ data: await verifyEmagConnection(env) });
    const now = new Date().toISOString();
    if (a.action === "emag-automation") {
      if (a.enabled) {
        assertPermission(admin, "orders.write");
        assertPermission(admin, "inventory.write");
        await assertEmagConnection(env);
      }
      await env.DB.batch([
        env.DB.prepare("UPDATE emag_sync_state SET enabled=? WHERE id=1").bind(a.enabled ? 1 : 0),
        env.DB.prepare(
          `INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json)
          VALUES(?,?,?,'emag.automation','integration','emag',?)`,
        ).bind(crypto.randomUUID(), admin.id, admin.email, JSON.stringify({ enabled: a.enabled })),
      ]);
      return json({ data: { saved: true } });
    }
    assertPermission(admin, "operations.read");
    assertPermission(admin, "orders.write");
    if (a.enabled && a.provider === "emag") await assertEmagConnection(env);
    if (a.enabled && a.provider === "trendyol") {
      const c = await trendyolCredentials(env);
      const state = await env.DB.prepare(
        "SELECT 1 FROM trendyol_sync_state WHERE seller_id=? AND verified_at IS NOT NULL",
      )
        .bind(c.sellerId)
        .first();
      if (!state)
        throw new ProviderError(
          "Verifică mai întâi contul Trendyol RO.",
          "TRENDYOL_VERIFY_REQUIRED",
          409,
        );
    }
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO marketplace_invoice_settings(provider,enabled_at,updated_at) VALUES(?,?,?)
        ON CONFLICT(provider) DO UPDATE SET enabled_at=CASE WHEN excluded.enabled_at IS NULL THEN NULL ELSE COALESCE(marketplace_invoice_settings.enabled_at,excluded.enabled_at) END,updated_at=excluded.updated_at`,
      ).bind(a.provider, a.enabled ? now : null, now),
      env.DB.prepare(
        `INSERT INTO audit_log(id,actor_admin_user_id,actor_label,action,entity_type,entity_id,after_json)
        VALUES(?,?,?,'marketplace.invoice.automation','integration',?,?)`,
      ).bind(
        crypto.randomUUID(),
        admin.id,
        admin.email,
        a.provider,
        JSON.stringify({ enabled: a.enabled }),
      ),
    ]);
    return json({ data: { saved: true } });
  } catch (error) {
    if (error instanceof AdminAuthError)
      return json({ error: { code: "ACCESS_DENIED", message: error.message } }, error.statusCode);
    if (error instanceof ProviderError)
      return json(
        {
          error: {
            code: error.code,
            message: error.code.startsWith("PROVIDER_")
              ? "Furnizorul nu a putut fi contactat."
              : error.message,
          },
        },
        error.status,
      );
    return json(
      {
        error: {
          code: "MARKETPLACE_REVIEW",
          message: "Verifică datele și starea comenzii în portal.",
        },
      },
      409,
    );
  }
}
