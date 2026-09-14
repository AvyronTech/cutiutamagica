import {
  constantTimeEqual,
  fetchWithTimeout,
  hmacHex,
  ProviderError,
  requiredSecret,
  type CommerceEnv,
} from "@/server/integrations/provider-runtime";

export interface StripeCheckoutInput {
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  amountBani: number;
  currency: string;
  description: string;
  publicToken: string;
}

type StripeSession = { id?: string; url?: string; payment_intent?: string };

export async function createStripeCheckoutSession(
  env: CommerceEnv,
  input: StripeCheckoutInput,
): Promise<{ id: string; url: string; paymentIntentId: string | null }> {
  const key = requiredSecret(env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY");
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set(
    "success_url",
    `${env.PUBLIC_SITE_URL}/comanda?payment=success&order=${input.orderNumber}`,
  );
  params.set(
    "cancel_url",
    `${env.PUBLIC_SITE_URL}/comanda?payment=cancelled&order=${input.orderNumber}`,
  );
  params.set("customer_email", input.customerEmail);
  params.set("client_reference_id", input.orderId);
  params.set("metadata[order_id]", input.orderId);
  params.set("metadata[order_number]", input.orderNumber);
  params.set("metadata[public_token]", input.publicToken);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
  params.set("line_items[0][price_data][unit_amount]", String(input.amountBani));
  params.set("line_items[0][price_data][product_data][name]", input.description);
  params.set("payment_intent_data[metadata][order_id]", input.orderId);
  const response = await fetchWithTimeout("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/x-www-form-urlencoded",
      "idempotency-key": `checkout/${input.orderId}`,
    },
    body: params,
  });
  const result = (await response.json().catch(() => null)) as StripeSession & {
    error?: { message?: string; code?: string };
  };
  if (!response.ok || !result?.id || !result.url) {
    throw new ProviderError(
      result?.error?.message || `Stripe a răspuns cu HTTP ${response.status}.`,
      result?.error?.code || "STRIPE_SESSION_FAILED",
      response.status >= 500 ? 502 : 409,
      response.status >= 500,
    );
  }
  return {
    id: result.id,
    url: result.url,
    paymentIntentId: typeof result.payment_intent === "string" ? result.payment_intent : null,
  };
}

export async function verifyStripeWebhook(
  payload: string,
  signatureHeader: string | null,
  secret: string | undefined,
): Promise<boolean> {
  const webhookSecret = requiredSecret(secret, "STRIPE_WEBHOOK_SECRET");
  if (!signatureHeader) return false;
  const values = Object.fromEntries(
    signatureHeader.split(",").map((entry) => {
      const [key, value] = entry.split("=", 2);
      return [key, value];
    }),
  );
  if (!values.t || !values.v1) return false;
  const timestamp = Number(values.t);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const expected = await hmacHex(webhookSecret, `${values.t}.${payload}`);
  return constantTimeEqual(expected, values.v1);
}
