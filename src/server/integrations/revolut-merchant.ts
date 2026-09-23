import { credential } from "../services/growth-settings";
import { paymentEnvironment } from "../services/checkout-readiness";
import {
  constantTimeEqual,
  fetchWithTimeout,
  hmacHex,
  ProviderError,
  readProviderJson,
  requiredSecret,
  type CommerceEnv,
} from "./provider-runtime";
import type { StripeCheckoutInput } from "./stripe";
async function merchant(env: CommerceEnv, path: string, init: RequestInit = {}) {
  const base =
    paymentEnvironment(env) === "production"
      ? "https://merchant.revolut.com"
      : "https://sandbox-merchant.revolut.com";
  const response = await fetchWithTimeout(`${base}/api${path}`, {
    ...init,
    redirect: "error",
    headers: {
      authorization: `Bearer ${requiredSecret((await credential(env, "revolut_merchant")) ?? undefined, "REVOLUT_MERCHANT_SECRET_KEY")}`,
      "Revolut-Api-Version": "2026-08-17",
      "content-type": "application/json",
    },
  });
  const result = (await readProviderJson(response)) as Record<string, unknown>;
  if (!response.ok)
    throw new ProviderError(
      "Serviciul de plată nu este disponibil momentan.",
      "REVOLUT_REQUEST_FAILED",
      502,
    );
  return result;
}
export async function createRevolutCheckout(env: CommerceEnv, input: StripeCheckoutInput) {
  // A durable local claim permits exactly one create call. An ambiguous timeout requires reconciliation,
  // since the Merchant Create Order endpoint does not document idempotent retries.
  const address = await env.DB.prepare(
    "SELECT * FROM order_addresses WHERE order_id=?1 AND address_type='shipping'",
  )
    .bind(input.orderId)
    .first<{
      line1: string;
      line2: string | null;
      city: string;
      county: string;
      postal_code: string;
      country_code: string;
      full_name: string;
      phone_e164: string;
    }>();
  const items = await env.DB.prepare(
    "SELECT product_name,quantity,unit_price_bani,unit_discount_bani,line_total_bani,sku FROM order_items WHERE order_id=?1 ORDER BY id",
  )
    .bind(input.orderId)
    .all<{
      product_name: string;
      quantity: number;
      unit_price_bani: number;
      unit_discount_bani: number;
      line_total_bani: number;
      sku: string;
    }>();
  if (!address?.postal_code || !items.results.length)
    throw new ProviderError(
      "Completează codul poștal pentru această metodă de plată.",
      "PAYMENT_ADDRESS_REQUIRED",
      409,
    );
  const lineItems = items.results.map((i) => ({
    name: i.product_name,
    type: "physical",
    quantity: { value: i.quantity },
    unit_price_amount: i.unit_price_bani - i.unit_discount_bani,
    total_amount: i.line_total_bani,
    external_id: i.sku,
  }));
  const shippingAmount = input.amountBani - lineItems.reduce((sum, i) => sum + i.total_amount, 0);
  if (shippingAmount < 0)
    throw new ProviderError("Totalul comenzii necesită verificare.", "PAYMENT_TOTAL_INVALID", 409);
  if (shippingAmount > 0)
    lineItems.push({
      name: "Livrare",
      type: "service",
      quantity: { value: 1 },
      unit_price_amount: shippingAmount,
      total_amount: shippingAmount,
      external_id: "shipping",
    });
  const result = await merchant(env, "/orders", {
    method: "POST",
    body: JSON.stringify({
      line_items: lineItems,
      shipping: {
        address: {
          street_line_1: address.line1,
          street_line_2: address.line2 || undefined,
          city: address.city,
          region: address.county,
          country_code: address.country_code,
          postcode: address.postal_code,
        },
        contact: { name: address.full_name, email: input.customerEmail, phone: address.phone_e164 },
      },
      amount: input.amountBani,
      currency: input.currency,
      capture_mode: "automatic",
      description: input.description,
      customer: { email: input.customerEmail },
      metadata: { order_id: input.orderId },
      merchant_order_data: { reference: input.orderNumber },
      redirect_url: `${env.PUBLIC_SITE_URL}/comanda?payment=return`,
      expire_pending_after: "PT1H",
    }),
  });
  if (typeof result.id !== "string" || typeof result.checkout_url !== "string")
    throw new ProviderError("Plata nu a putut fi inițiată.", "REVOLUT_INVALID_RESPONSE", 502);
  return { id: result.id, url: result.checkout_url };
}
export async function getRevolutOrder(env: CommerceEnv, id: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id))
    throw new ProviderError("Referință invalidă.", "INVALID_REFERENCE", 400);
  return merchant(env, `/orders/${id}`);
}
export async function verifyRevolutWebhook(
  payload: string,
  headers: Headers,
  secret: string | null,
) {
  const timestamp = headers.get("revolut-request-timestamp") ?? "";
  if (!secret || !/^\d+$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp)) > 300_000)
    return false;
  const expected = await hmacHex(secret, `v1.${timestamp}.${payload}`);
  return (headers.get("revolut-signature") ?? "").split(",").some((part) => {
    const [version, signature] = part.trim().split("=", 2);
    return (
      version === "v1" &&
      /^[a-f0-9]{64}$/.test(signature ?? "") &&
      constantTimeEqual(expected, signature)
    );
  });
}
