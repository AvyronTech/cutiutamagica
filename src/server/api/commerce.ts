import { z } from "zod";
import { returnRequestInputSchema } from "@/lib/commerce-operations-contracts";
import {
  createReturnRequest,
  getCommercePublicConfig,
} from "@/server/db/commerce-operations.repository";
import { sendReturnAcknowledgement } from "@/server/integrations/resend";
import {
  constantTimeEqual,
  digestHex,
  logProviderOperation,
  ProviderError,
  type CommerceEnv,
} from "@/server/integrations/provider-runtime";
import { createStripeCheckoutSession, verifyStripeWebhook } from "@/server/integrations/stripe";
import { credential, credentialStatuses } from "@/server/services/growth-settings";

const stripeCheckoutSchema = z.object({
  orderId: z.string().uuid(),
  publicToken: z.string().uuid(),
});

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "no-store");
  return Response.json(data, { ...init, headers });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function readJson(request: Request, maxBytes = 32_768): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes)
    throw new ProviderError("Cererea este prea mare.", "PAYLOAD_TOO_LARGE", 413);
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new ProviderError("Conținutul trebuie trimis ca JSON.", "UNSUPPORTED_MEDIA_TYPE", 415);
  }
  return request.json().catch(() => {
    throw new ProviderError("Cererea JSON nu este validă.", "INVALID_JSON", 400);
  });
}

async function enforceReturnRateLimit(request: Request, env: CommerceEnv): Promise<void> {
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const bucket = new Date().toISOString().slice(0, 13);
  const key = `rate:return:${await digestHex("SHA-256", ip)}:${bucket}`;
  const count = Number((await env.CACHE.get(key)) ?? 0);
  if (count >= 5) {
    throw new ProviderError(
      "Ai trimis prea multe cereri. Încearcă din nou mai târziu.",
      "RATE_LIMITED",
      429,
    );
  }
  await env.CACHE.put(key, String(count + 1), { expirationTtl: 3_900 });
}

async function handleCreateReturn(
  request: Request,
  env: CommerceEnv,
  ctx: ExecutionContext,
): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: { code: "ORIGIN_NOT_ALLOWED" } }, { status: 403 });
  await enforceReturnRateLimit(request, env);
  const parsed = returnRequestInputSchema.safeParse(await readJson(request));
  if (!parsed.success || parsed.data.website) {
    return json(
      { error: { code: "INVALID_RETURN_REQUEST", issues: parsed.error?.flatten() } },
      { status: 400 },
    );
  }
  const result = await createReturnRequest(env.DB, parsed.data);
  if ((await credentialStatuses(env)).some((c) => c.provider === "resend" && c.configured)) {
    ctx.waitUntil(
      sendReturnAcknowledgement(env, {
        returnId: result.returnId,
        returnNumber: result.returnNumber,
        customerName: parsed.data.customerName,
        email: parsed.data.email,
      }).catch((error) =>
        console.error("return.email_failed", { returnId: result.returnId, error }),
      ),
    );
  }
  const { returnId: _returnId, ...publicResult } = result;
  return json({ data: publicResult }, { status: 201 });
}

async function handleStripeCheckout(request: Request, env: CommerceEnv): Promise<Response> {
  if (!sameOrigin(request)) return json({ error: { code: "ORIGIN_NOT_ALLOWED" } }, { status: 403 });
  const parsed = stripeCheckoutSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: { code: "INVALID_PAYMENT_REQUEST" } }, { status: 400 });
  const order = await env.DB.prepare(
    `SELECT id, order_number, public_token, customer_email, total_bani, currency, payment_status,
            payment_method_requested,
            EXISTS(SELECT 1 FROM order_tags t WHERE t.order_id = orders.id AND t.tag = 'shipping_quote_required') AS shipping_pending
     FROM orders WHERE id = ?1`,
  )
    .bind(parsed.data.orderId)
    .first<{
      id: string;
      order_number: string;
      public_token: string;
      customer_email: string | null;
      total_bani: number;
      currency: string;
      payment_status: string;
      payment_method_requested: string;
      shipping_pending: number;
    }>();
  if (!order || !constantTimeEqual(order.public_token, parsed.data.publicToken)) {
    return json({ error: { code: "ORDER_NOT_FOUND" } }, { status: 404 });
  }
  if (!order.customer_email) {
    return json(
      {
        error: {
          code: "EMAIL_REQUIRED",
          message: "Adresa de e-mail este necesară pentru plata online.",
        },
      },
      { status: 409 },
    );
  }
  if (["paid", "refunded"].includes(order.payment_status)) {
    return json({ error: { code: "ORDER_ALREADY_PAID" } }, { status: 409 });
  }
  if (order.payment_method_requested !== "card" || order.shipping_pending === 1) {
    return json(
      {
        error: {
          code: "ORDER_NOT_READY_FOR_CARD",
          message: "Comanda nu este pregătită pentru plata online.",
        },
      },
      { status: 409 },
    );
  }
  const environment = env.APP_ENV === "production" ? "production" : "sandbox";
  const idempotencyKey = `checkout/${order.id}`;
  try {
    const session = await createStripeCheckoutSession(env, {
      orderId: order.id,
      orderNumber: order.order_number,
      customerEmail: order.customer_email,
      amountBani: order.total_bani,
      currency: order.currency,
      description: `Comandă Cutiuța Magică ${order.order_number}`,
      publicToken: order.public_token,
    });
    await env.DB.prepare(
      `
      INSERT INTO payment_attempts (
        id, order_id, provider, payment_method, external_payment_id, idempotency_key,
        status, amount_bani, currency, provider_metadata_json
      ) VALUES (?1, ?2, 'stripe', 'card', ?3, ?4, 'pending', ?5, ?6, ?7)
      ON CONFLICT(idempotency_key) DO UPDATE SET
        external_payment_id = excluded.external_payment_id,
        status = 'pending', provider_metadata_json = excluded.provider_metadata_json,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    `,
    )
      .bind(
        crypto.randomUUID(),
        order.id,
        session.paymentIntentId ?? session.id,
        `stripe/${order.id}`,
        order.total_bani,
        order.currency,
        JSON.stringify({ checkoutSessionId: session.id }),
      )
      .run();
    await logProviderOperation(env.DB, {
      provider: "stripe",
      operationType: "checkout.session.create",
      entityType: "order",
      entityId: order.id,
      idempotencyKey,
      environment,
      status: "succeeded",
      externalId: session.id,
      responseCode: 200,
      responseSummary: { checkoutSessionId: session.id },
    });
    return json({ data: { checkoutUrl: session.url } });
  } catch (error) {
    const providerError = error instanceof ProviderError ? error : null;
    await logProviderOperation(env.DB, {
      provider: "stripe",
      operationType: "checkout.session.create",
      entityType: "order",
      entityId: order.id,
      idempotencyKey,
      environment,
      status: "failed",
      errorCode: providerError?.code ?? "STRIPE_UNKNOWN_ERROR",
      errorMessage: error instanceof Error ? error.message : "Unknown Stripe error",
    });
    throw error;
  }
}

type StripeEvent = {
  id?: string;
  type?: string;
  data?: { object?: Record<string, unknown> };
};

async function handleStripeWebhook(request: Request, env: CommerceEnv): Promise<Response> {
  const payload = await request.text();
  const valid = await verifyStripeWebhook(
    payload,
    request.headers.get("stripe-signature"),
    (await credential(env, "stripe_webhook")) ?? undefined,
  );
  if (!valid) return json({ error: { code: "INVALID_SIGNATURE" } }, { status: 401 });
  const event = JSON.parse(payload) as StripeEvent;
  if (!event.id || !event.type || !event.data?.object) {
    return json({ error: { code: "INVALID_EVENT" } }, { status: 400 });
  }
  const object = event.data.object;
  const metadata =
    object.metadata && typeof object.metadata === "object"
      ? (object.metadata as Record<string, unknown>)
      : {};
  const orderId = typeof metadata.order_id === "string" ? metadata.order_id : null;
  const payloadHash = await digestHex("SHA-256", payload);
  const inserted = await env.DB.prepare(
    `INSERT OR IGNORE INTO webhook_events (
      id, provider, external_event_id, event_type, signature_valid, payload_hash,
      payload_json, status, received_at
    ) VALUES (?1, 'stripe', ?2, ?3, 1, ?4, ?5, 'received', ?6)`,
  )
    .bind(crypto.randomUUID(), event.id, event.type, payloadHash, payload, new Date().toISOString())
    .run();
  if (Number(inserted.meta.changes) === 0) return json({ received: true, duplicate: true });

  if (orderId && ["payment_intent.succeeded", "checkout.session.completed"].includes(event.type)) {
    const externalId = typeof object.id === "string" ? object.id : null;
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE orders SET payment_status = 'paid', paid_bani = total_bani,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), version = version + 1 WHERE id = ?1`,
      ).bind(orderId),
      env.DB.prepare(
        `UPDATE payment_attempts SET status = 'captured', external_payment_id = COALESCE(?1, external_payment_id),
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE order_id = ?2 AND provider = 'stripe'`,
      ).bind(externalId, orderId),
      env.DB.prepare(
        `INSERT INTO order_events (
          id, order_id, event_type, to_status, actor_type, actor_id, message, metadata_json
        ) VALUES (?1, ?2, 'payment.captured', 'paid', 'integration', 'stripe',
          'Plata online a fost confirmată de Stripe.', ?3)`,
      ).bind(crypto.randomUUID(), orderId, JSON.stringify({ stripeEventId: event.id })),
    ]);
  }
  await env.DB.prepare(
    `UPDATE webhook_events SET status = 'processed', processed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE provider = 'stripe' AND external_event_id = ?1`,
  )
    .bind(event.id)
    .run();
  return json({ received: true });
}

export async function handleCommerceApi(
  request: Request,
  env: CommerceEnv,
  ctx: ExecutionContext,
): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  try {
    if (path === "/api/v1/commerce/config") {
      if (request.method !== "GET")
        return json({ error: { code: "METHOD_NOT_ALLOWED" } }, { status: 405 });
      const configured = await credentialStatuses(env);
      const config = await getCommercePublicConfig(env.DB, {
        stripe: Boolean(
          configured.some((c) => c.provider === "stripe" && c.configured) &&
          configured.some((c) => c.provider === "stripe_webhook" && c.configured),
        ),
        smartship: configured.some((c) => c.provider === "smartship" && c.configured),
      });
      return json(
        { data: config },
        { headers: { "cache-control": "public, max-age=60, s-maxage=300" } },
      );
    }
    if (path === "/api/v1/returns") {
      if (request.method !== "POST")
        return json({ error: { code: "METHOD_NOT_ALLOWED" } }, { status: 405 });
      return await handleCreateReturn(request, env, ctx);
    }
    if (path === "/api/v1/payments/stripe/checkout") {
      if (request.method !== "POST")
        return json({ error: { code: "METHOD_NOT_ALLOWED" } }, { status: 405 });
      return await handleStripeCheckout(request, env);
    }
    if (path === "/api/v1/webhooks/stripe") {
      if (request.method !== "POST")
        return json({ error: { code: "METHOD_NOT_ALLOWED" } }, { status: 405 });
      return await handleStripeWebhook(request, env);
    }
    return null;
  } catch (error) {
    const status = error instanceof ProviderError ? error.status : 500;
    const code = error instanceof ProviderError ? error.code : "COMMERCE_OPERATION_FAILED";
    console.error("commerce.api_failed", { path, error });
    return json(
      {
        error: { code, message: error instanceof Error ? error.message : "Operația nu a reușit." },
      },
      { status },
    );
  }
}
