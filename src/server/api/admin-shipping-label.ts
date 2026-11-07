import { authenticateAdminRequest } from "@/lib/admin-auth";
import { AdminAuthError } from "@/lib/admin-password-auth-service";
import { getSmartShipLabel } from "@/server/integrations/smartship";
import { ProviderError, type CommerceEnv } from "@/server/integrations/provider-runtime";

export async function handleAdminShippingLabel(
  request: Request,
  env: CommerceEnv,
): Promise<Response | null> {
  const match = new URL(request.url).pathname.match(
    /^\/api\/v1\/admin\/shipping\/orders\/([a-f0-9-]{36})\/label$/i,
  );
  if (!match) return null;
  if (request.method !== "GET")
    return Response.json(
      { error: { message: "Metodă nepermisă." } },
      { status: 405, headers: { "cache-control": "no-store" } },
    );
  try {
    await authenticateAdminRequest(request, env, "orders.read");
    const shipment = await env.DB.prepare(
      `SELECT s.awb FROM shipments s JOIN orders o ON o.id=s.order_id
       WHERE s.order_id=?1 AND s.provider='smartship' AND s.awb IS NOT NULL
       ORDER BY s.created_at DESC LIMIT 1`,
    )
      .bind(match[1])
      .first<{ awb: string }>();
    if (!shipment)
      return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });
    return await getSmartShipLabel(env, shipment.awb);
  } catch (error) {
    const status =
      error instanceof ProviderError
        ? error.status
        : error instanceof AdminAuthError
          ? error.statusCode
          : 500;
    if (status === 500) console.error("shipping.label_failed", { orderId: match[1] });
    return Response.json(
      {
        error: {
          message:
            status === 401 || status === 403 ? "Acces interzis." : "Eticheta nu este disponibilă.",
        },
      },
      { status, headers: { "cache-control": "no-store" } },
    );
  }
}
