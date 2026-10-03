import { z } from "zod";
import { boundedJson } from "./bounded-json";
import { credential } from "../services/growth-settings";
import { checkoutReadiness, paymentEnvironment } from "../services/checkout-readiness";
import {
  constantTimeEqual,
  digestHex,
  ProviderError,
  type CommerceEnv,
} from "../integrations/provider-runtime";
import { createStripeCheckoutSession, verifyStripeWebhook } from "../integrations/stripe";
import {
  createRevolutCheckout,
  getRevolutOrder,
  verifyRevolutWebhook,
} from "../integrations/revolut-merchant";
import type { PaymentProvider } from "@/lib/checkout-settings";
const capability = z.object({ orderId: z.string().uuid(), publicToken: z.string().uuid() });
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" },
  });
type Order = {
  id: string;
  order_number: string;
  public_token: string;
  customer_email: string;
  total_bani: number;
  currency: string;
  order_status: string;
  payment_status: string;
  paid_bani: number;
  payment_provider_requested: PaymentProvider | null;
  payment_method_requested: string;
  shipping_pending: number;
};
type Attempt = {
  id: string;
  order_id: string;
  provider: PaymentProvider;
  external_payment_id: string | null;
  provider_metadata_json: string;
  status: string;
  amount_bani: number;
  currency: string;
  environment: string;
  created_at: string;
};
export function safeCheckoutUrl(url: string, provider: PaymentProvider, environment: string) {
  const parsed = new URL(url);
  const host =
    provider === "stripe"
      ? "checkout.stripe.com"
      : environment === "production"
        ? "checkout.revolut.com"
        : "sandbox-checkout.revolut.com";
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== host ||
    parsed.port ||
    parsed.username ||
    parsed.password
  )
    throw new ProviderError("Adresa de plată nu este disponibilă.", "INVALID_CHECKOUT_URL", 502);
  return parsed.href;
}
async function orderFor(request: Request, env: CommerceEnv) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    throw new ProviderError("Cerere nepermisă.", "ORIGIN_NOT_ALLOWED", 403);
  const input = capability.parse(await boundedJson(request, 2048));
  const order = await env.DB.prepare(
    `SELECT *, EXISTS(SELECT 1 FROM order_tags t WHERE t.order_id=orders.id AND t.tag='shipping_quote_required') AS shipping_pending FROM orders WHERE id=?1`,
  )
    .bind(input.orderId)
    .first<Order>();
  if (!order || !constantTimeEqual(order.public_token, input.publicToken))
    throw new ProviderError("Comanda nu a fost găsită.", "ORDER_NOT_FOUND", 404);
  return order;
}
async function attemptFor(env: CommerceEnv, orderId: string) {
  return env.DB.prepare("SELECT * FROM payment_attempts WHERE order_id=?1 AND idempotency_key=?2")
    .bind(orderId, `website-checkout/${orderId}`)
    .first<Attempt>();
}
async function checkout(request: Request, env: CommerceEnv) {
  const order = await orderFor(request, env);
  if (
    ["cancelled", "completed"].includes(order.order_status) ||
    ["paid", "authorized", "refunded", "partially_refunded"].includes(order.payment_status) ||
    order.paid_bani > 0 ||
    order.shipping_pending ||
    order.payment_method_requested !== "card" ||
    !order.customer_email ||
    order.total_bani <= 0
  )
    throw new ProviderError(
      "Această comandă nu poate fi plătită online acum.",
      "ORDER_NOT_PAYABLE",
      409,
    );
  const provider = order.payment_provider_requested ?? "stripe";
  const readiness = await checkoutReadiness(env);
  if (!readiness.options.some((o) => o.id === provider))
    throw new ProviderError(
      "Metoda de plată nu este disponibilă momentan. Comanda ta este păstrată.",
      "PAYMENT_UNAVAILABLE",
      409,
    );
  let attempt = await attemptFor(env, order.id);
  if (
    !attempt &&
    (await env.DB.prepare(
      "SELECT id FROM payment_attempts WHERE order_id=?1 AND status IN ('created','pending','authorized','captured') LIMIT 1",
    )
      .bind(order.id)
      .first())
  )
    throw new ProviderError(
      "Comanda are deja o plată în verificare.",
      "LEGACY_PAYMENT_REQUIRES_REVIEW",
      409,
    );
  if (
    attempt &&
    (attempt.amount_bani !== order.total_bani ||
      attempt.currency !== order.currency ||
      attempt.provider !== provider ||
      attempt.environment !== readiness.environment)
  )
    throw new ProviderError(
      "Comanda necesită verificare înainte de plată.",
      "PAYMENT_CHANGED",
      409,
    );
  if (attempt?.status === "pending") {
    const metadata = JSON.parse(attempt.provider_metadata_json) as { checkoutUrl?: string };
    if (metadata.checkoutUrl)
      return json({
        data: {
          checkoutUrl: safeCheckoutUrl(metadata.checkoutUrl, provider, readiness.environment),
        },
      });
  }
  if (
    attempt &&
    (provider !== "stripe" ||
      attempt.status !== "created" ||
      Date.now() - Date.parse(attempt.created_at) > 23 * 3600_000)
  )
    throw new ProviderError(
      "Verificăm starea plății. Te rugăm să revii în câteva momente sau să ne contactezi.",
      "PAYMENT_RECONCILIATION_REQUIRED",
      409,
    );
  if (!attempt) {
    const id = crypto.randomUUID();
    const claim = await env.DB.prepare(
      `INSERT OR IGNORE INTO payment_attempts(id,order_id,provider,payment_method,idempotency_key,status,amount_bani,currency,environment) VALUES(?1,?2,?3,'card',?4,'created',?5,?6,?7)`,
    )
      .bind(
        id,
        order.id,
        provider,
        `website-checkout/${order.id}`,
        order.total_bani,
        order.currency,
        readiness.environment,
      )
      .run();
    if (!claim.meta.changes)
      throw new ProviderError(
        "Plata este în curs de pregătire. Reîncearcă în câteva secunde.",
        "PAYMENT_IN_PROGRESS",
        409,
      );
    attempt = await attemptFor(env, order.id);
  }
  const input = {
    orderId: order.id,
    orderNumber: order.order_number,
    customerEmail: order.customer_email,
    amountBani: order.total_bani,
    currency: order.currency,
    description: `Cutiuța Magică · ${order.order_number}`,
  };
  try {
    const session =
      provider === "stripe"
        ? await createStripeCheckoutSession(env, input)
        : await createRevolutCheckout(env, input);
    const checkoutUrl = safeCheckoutUrl(session.url, provider, readiness.environment);
    await env.DB.prepare(
      `UPDATE payment_attempts SET external_payment_id=?1,status='pending',provider_metadata_json=?2,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?3 AND status='created'`,
    )
      .bind(session.id, JSON.stringify({ checkoutUrl }), attempt!.id)
      .run();
    return json({ data: { checkoutUrl } });
  } catch (error) {
    await env.DB.prepare(
      "UPDATE payment_attempts SET failure_code=?1,failure_message='Inițierea necesită verificare sau reluare.',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?2 AND status='created'",
    )
      .bind(
        error instanceof ProviderError ? error.code : "PAYMENT_INITIALIZATION_FAILED",
        attempt!.id,
      )
      .run();
    throw error;
  }
}
/** The signed event alone is insufficient: match the exact attempt, environment, amount and currency. */
async function settle(
  env: CommerceEnv,
  provider: PaymentProvider,
  externalId: string,
  amount: unknown,
  currency: unknown,
  eventId: string,
) {
  const attempt = await env.DB.prepare(
    "SELECT * FROM payment_attempts WHERE provider=?1 AND external_payment_id=?2",
  )
    .bind(provider, externalId)
    .first<Attempt>();
  if (!attempt) throw new ProviderError("Confirmare în așteptare.", "ATTEMPT_NOT_READY", 503);
  const order = await env.DB.prepare("SELECT * FROM orders WHERE id=?1")
    .bind(attempt.order_id)
    .first<Order>();
  if (
    !order ||
    amount !== attempt.amount_bani ||
    amount !== order.total_bani ||
    typeof currency !== "string" ||
    currency.toUpperCase() !== attempt.currency ||
    attempt.currency !== order.currency ||
    attempt.environment !== paymentEnvironment(env) ||
    order.order_status === "cancelled" ||
    ["refunded", "partially_refunded"].includes(order.payment_status)
  )
    throw new ProviderError("Confirmarea necesită verificare.", "PAYMENT_MISMATCH", 409);
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE payment_attempts SET status='captured',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?1 AND status IN ('created','pending','authorized','captured') AND EXISTS(SELECT 1 FROM orders WHERE id=?2 AND total_bani=?3 AND currency=?4 AND order_status!='cancelled' AND payment_status NOT IN ('refunded','partially_refunded'))`,
    ).bind(attempt.id, order.id, amount as number, attempt.currency),
    env.DB.prepare(
      `UPDATE orders SET payment_status='paid',paid_bani=total_bani,version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?1 AND payment_status!='paid' AND EXISTS(SELECT 1 FROM payment_attempts WHERE id=?2 AND status='captured')`,
    ).bind(order.id, attempt.id),
    env.DB.prepare(
      `INSERT OR IGNORE INTO order_events(id,order_id,event_type,to_status,actor_type,actor_id,message,metadata_json) SELECT ?1,?2,'payment.captured','paid','integration',?3,'Plata online a fost confirmată.',?4 WHERE EXISTS(SELECT 1 FROM payment_attempts WHERE id=?5 AND status='captured')`,
    ).bind(`payment/${attempt.id}`, order.id, provider, JSON.stringify({ eventId }), attempt.id),
    env.DB.prepare(
      `UPDATE webhook_events SET status='processed',processed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE provider=?1 AND external_event_id=?2`,
    ).bind(provider, eventId),
  ]);
}
async function expireAttempt(
  env: CommerceEnv,
  provider: PaymentProvider,
  externalId: string,
  eventId: string,
) {
  const attempt = await env.DB.prepare(
    "SELECT * FROM payment_attempts WHERE provider=?1 AND external_payment_id=?2",
  )
    .bind(provider, externalId)
    .first<Attempt>();
  if (!attempt || attempt.environment !== paymentEnvironment(env))
    throw new ProviderError("Confirmare în așteptare.", "ATTEMPT_NOT_READY", 503);
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE payment_attempts SET status='expired',updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?1 AND status IN ('created','pending')",
    ).bind(attempt.id),
    env.DB.prepare(
      "UPDATE orders SET order_status='cancelled',version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?1 AND payment_status='unpaid' AND order_status='pending' AND EXISTS(SELECT 1 FROM payment_attempts WHERE id=?2 AND status='expired')",
    ).bind(attempt.order_id, attempt.id),
    env.DB.prepare(
      "INSERT OR IGNORE INTO order_events(id,order_id,event_type,actor_type,actor_id,message) SELECT ?1,?2,'payment.expired','integration',?3,'Sesiunea de plată a expirat; comanda neplătită a fost anulată.' WHERE EXISTS(SELECT 1 FROM orders WHERE id=?2 AND order_status='cancelled')",
    ).bind(`expiry/${attempt.id}`, attempt.order_id, provider),
    env.DB.prepare(
      "UPDATE webhook_events SET status='processed',processed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE provider=?1 AND external_event_id=?2",
    ).bind(provider, eventId),
  ]);
}
async function webhook(request: Request, env: CommerceEnv, provider: "stripe" | "revolut_pay") {
  // Keep exact bytes for signature verification, with an enforced streaming size limit.
  const reader = request.body?.getReader();
  if (!reader) return json({ error: { code: "INVALID_EVENT" } }, 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      length += part.value.length;
      if (length > 131072) {
        void reader.cancel();
        return json({ error: { code: "PAYLOAD_TOO_LARGE" } }, 413);
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const payload = new TextDecoder().decode(bytes);
  const valid =
    provider === "stripe"
      ? await verifyStripeWebhook(
          payload,
          request.headers.get("stripe-signature"),
          (await credential(env, "stripe_webhook")) ?? undefined,
        )
      : await verifyRevolutWebhook(
          payload,
          request.headers,
          await credential(env, "revolut_merchant_webhook"),
        );
  if (!valid) return json({ error: { code: "INVALID_SIGNATURE" } }, 401);
  const event = JSON.parse(payload) as Record<string, unknown>;
  const type = String(provider === "stripe" ? (event.type ?? "") : (event.event ?? ""));
  const eventId =
    provider === "stripe" ? String(event.id ?? "") : `${String(event.order_id ?? "")}/${type}`;
  if (!eventId || !type || eventId.length > 200)
    return json({ error: { code: "INVALID_EVENT" } }, 400);
  const old = await env.DB.prepare(
    "SELECT status FROM webhook_events WHERE provider=?1 AND external_event_id=?2",
  )
    .bind(provider, eventId)
    .first<{ status: string }>();
  if (old?.status === "processed") return json({ received: true });
  await env.DB.prepare(
    `INSERT OR IGNORE INTO webhook_events(id,provider,external_event_id,event_type,signature_valid,payload_hash,payload_json,status) VALUES(?1,?2,?3,?4,1,?5,?6,'received')`,
  )
    .bind(
      crypto.randomUUID(),
      provider,
      eventId,
      type,
      await digestHex("SHA-256", payload),
      JSON.stringify({ eventId, type }),
    )
    .run();
  if (
    provider === "stripe" &&
    [
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.expired",
    ].includes(type)
  ) {
    if (event.livemode !== (paymentEnvironment(env) === "production"))
      return json({ error: { code: "ENVIRONMENT_MISMATCH" } }, 400);
    const object = (event.data as { object?: Record<string, unknown> })?.object;
    if (!object || typeof object.id !== "string")
      return json({ error: { code: "INVALID_EVENT" } }, 400);
    if (type === "checkout.session.expired") await expireAttempt(env, provider, object.id, eventId);
    else if (object.payment_status === "paid")
      await settle(env, provider, object.id, object.amount_total, object.currency, eventId);
  } else if (
    provider === "revolut_pay" &&
    ["ORDER_COMPLETED", "ORDER_CANCELLED", "ORDER_FAILED"].includes(type)
  ) {
    const externalId = String(event.order_id ?? "");
    const result = await getRevolutOrder(env, externalId);
    if (result.id !== externalId)
      throw new ProviderError("Referință neconfirmată.", "PAYMENT_MISMATCH", 409);
    const metadata = result.metadata as { order_id?: string } | undefined;
    // Recover a successful create whose HTTP response was lost, using authenticated provider data.
    if (
      metadata?.order_id &&
      typeof result.amount === "number" &&
      typeof result.currency === "string"
    ) {
      await env.DB.prepare(
        "UPDATE payment_attempts SET external_payment_id=?1,status='pending' WHERE order_id=?2 AND provider='revolut_pay' AND status='created' AND external_payment_id IS NULL AND amount_bani=?3 AND currency=?4 AND environment=?5",
      )
        .bind(
          externalId,
          metadata.order_id,
          result.amount,
          result.currency.toUpperCase(),
          paymentEnvironment(env),
        )
        .run();
    }
    if (
      result.state === "completed" &&
      (result.outstanding_amount == null || result.outstanding_amount === 0)
    ) {
      await settle(env, provider, externalId, result.amount, result.currency, eventId);
    } else if (["cancelled", "failed"].includes(String(result.state))) {
      await expireAttempt(env, provider, externalId, eventId);
    } else throw new ProviderError("Plata este încă în curs.", "PAYMENT_PENDING", 503);
  }
  await env.DB.prepare(
    "UPDATE webhook_events SET status='processed',processed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE provider=?1 AND external_event_id=?2",
  )
    .bind(provider, eventId)
    .run();
  return json({ received: true });
}
export async function handlePayments(request: Request, env: CommerceEnv): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (
    ![
      "/api/v1/payments/checkout",
      "/api/v1/payments/stripe/checkout",
      "/api/v1/payments/status",
      "/api/v1/webhooks/stripe",
      "/api/v1/webhooks/revolut",
    ].includes(path)
  )
    return null;
  if (request.method !== "POST") return json({ error: { code: "METHOD_NOT_ALLOWED" } }, 405);
  try {
    if (path.includes("/webhooks/"))
      return await webhook(request, env, path.endsWith("/stripe") ? "stripe" : "revolut_pay");
    if (path.endsWith("/status")) {
      const order = await orderFor(request, env);
      const status =
        order.payment_status === "paid"
          ? "paid"
          : order.payment_status === "refunded" || order.payment_status === "partially_refunded"
            ? "refunded"
            : order.order_status === "cancelled"
              ? "cancelled"
              : "pending";
      const attempt = await attemptFor(env, order.id);
      return json({
        data: {
          orderNumber: order.order_number,
          total: order.total_bani / 100,
          currency: order.currency,
          status,
          canResume:
            status === "pending" &&
            !order.shipping_pending &&
            order.paid_bani === 0 &&
            order.payment_status !== "authorized" &&
            order.payment_method_requested === "card" &&
            (!attempt ||
              attempt.status === "pending" ||
              (attempt.provider === "stripe" && attempt.status === "created")),
        },
      });
    }
    return await checkout(request, env);
  } catch (error) {
    const status =
      error instanceof ProviderError
        ? error.status
        : error instanceof z.ZodError
          ? 400
          : error && typeof error === "object" && "statusCode" in error
            ? Number(error.statusCode)
            : 500;
    const code = error instanceof ProviderError ? error.code : "PAYMENT_REQUEST_FAILED";
    // Never send raw processor errors, credentials or infrastructure details to a buyer.
    console.error("payment.operation_failed", { path, code });
    return json(
      {
        error: {
          code,
          message:
            status === 404
              ? "Comanda nu a fost găsită."
              : status === 409
                ? "Plata nu poate fi reluată momentan. Comanda este păstrată; contactează-ne dacă problema persistă."
                : "Nu am putut verifica plata acum. Comanda este păstrată. Încearcă din nou.",
        },
      },
      status,
    );
  }
}
