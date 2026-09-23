import { z } from "zod";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { checkoutSettingsSchema, paymentProviders } from "@/lib/checkout-settings";
import { checkoutReadiness } from "../services/checkout-readiness";
import type { CommerceEnv } from "../integrations/provider-runtime";
import { boundedJson } from "./bounded-json";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store" } });
export async function handleCheckoutAdmin(
  request: Request,
  env: CommerceEnv,
): Promise<Response | null> {
  if (new URL(request.url).pathname !== "/api/v1/admin/checkout-settings") return null;
  try {
    const admin = await authenticateAdminRequest(
      request,
      env,
      request.method === "GET" ? "integrations.read" : "integrations.write",
    );
    if (request.method === "GET") {
      const ready = await checkoutReadiness(env);
      const row = await env.DB.prepare(
        "SELECT version FROM operational_settings WHERE key='commerce.checkout'",
      ).first<{ version: number }>();
      const paymentReview = await env.DB.prepare(
        "SELECT p.id,o.order_number AS orderNumber,p.provider,p.status,p.amount_bani AS amountBani,p.currency,p.failure_code AS failureCode,p.created_at AS createdAt FROM payment_attempts p JOIN orders o ON o.id=p.order_id WHERE p.idempotency_key LIKE 'website-checkout/%' AND p.status IN ('created','pending','authorized') ORDER BY p.created_at DESC LIMIT 25",
      ).all();
      return json({
        data: { ...ready, version: row?.version ?? 0, paymentReview: paymentReview.results },
      });
    }
    if (request.method !== "PUT") return json({ error: { message: "Metodă nepermisă." } }, 405);
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return json({ error: { message: "Origine nepermisă." } }, 403);
    const parsed = z
      .object({ settings: checkoutSettingsSchema, expectedVersion: z.number().int().nonnegative() })
      .safeParse(await boundedJson(request, 16384));
    if (!parsed.success) return json({ error: { message: "Verifică setările introduse." } }, 400);
    const { settings, expectedVersion } = parsed.data;
    const ready = await checkoutReadiness(env);
    for (const p of paymentProviders)
      if (
        settings[p].enabled &&
        (!ready.adapterReady[p] ||
          !ready.configured[p] ||
          !settings[p].acceptanceTestReference ||
          settings[p].environment !== ready.environment)
      )
        return json(
          {
            error: {
              message: `${p}: activarea necesită adaptor disponibil, cheile mediului curent și referința testului complet de acceptanță.`,
            },
          },
          409,
        );
    const now = new Date().toISOString();
    const result = await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO operational_settings(key,value_json,updated_by,updated_at) SELECT 'commerce.checkout',?1,?2,?3 WHERE ?4=0 OR EXISTS(SELECT 1 FROM operational_settings WHERE key='commerce.checkout' AND version=?4) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,version=version+1,updated_by=excluded.updated_by,updated_at=excluded.updated_at WHERE version=?4`,
      ).bind(JSON.stringify(settings), admin.id, now, expectedVersion),
      env.DB.prepare(
        "INSERT INTO business_activity(id,actor_id,action,entity_id,created_at) SELECT ?1,?2,'checkout.settings.saved','commerce.checkout',?3 WHERE changes()=1",
      ).bind(crypto.randomUUID(), admin.id, now),
    ]);
    if (!result[0].meta.changes)
      return json(
        {
          error: {
            message: "Setările au fost schimbate de un alt administrator. Reîncarcă pagina.",
          },
        },
        409,
      );
    return json({ data: { saved: true } });
  } catch (error) {
    const code =
      error && typeof error === "object" && "statusCode" in error ? Number(error.statusCode) : 500;
    return json(
      {
        error: {
          message:
            code === 401 || code === 403 ? "Acces nepermis." : "Setările nu au putut fi salvate.",
        },
      },
      code,
    );
  }
}
