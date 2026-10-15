import { checkoutReadiness, paymentEnvironment } from "./checkout-readiness";
import { credential } from "./growth-settings";
import {
  fetchWithTimeout,
  ProviderError,
  readProviderJson,
  requiredSecret,
  type CommerceEnv,
} from "../integrations/provider-runtime";

type StripeObject = Record<string, unknown>;

async function stripe(
  env: CommerceEnv,
  path: string,
  init: { method?: "GET" | "POST"; body?: URLSearchParams; idempotencyKey?: string } = {},
): Promise<StripeObject> {
  const key = requiredSecret((await credential(env, "stripe")) ?? undefined, "STRIPE_SECRET_KEY");
  const response = await fetchWithTimeout(`https://api.stripe.com/v1/${path}`, {
    method: init.method ?? "GET",
    redirect: "manual",
    headers: {
      authorization: `Bearer ${key}`,
      ...(init.body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      ...(init.idempotencyKey ? { "idempotency-key": init.idempotencyKey } : {}),
    },
    body: init.body,
  });
  const payload = (await readProviderJson(response).catch(() => null)) as StripeObject | null;
  if (!response.ok || !payload) {
    throw new ProviderError(
      "Stripe nu a putut finaliza operațiunea.",
      "STRIPE_CARD_FAILED",
      response.status >= 500 ? 502 : 409,
    );
  }
  return payload;
}

export async function stripeCardReady(env: CommerceEnv) {
  const ready = await checkoutReadiness(env);
  return ready.options.some((option) => option.id === "stripe");
}

export async function createStripeCardSetup(
  env: CommerceEnv,
  account: { id: string; email: string; customerId: string },
) {
  if (!(await stripeCardReady(env)))
    throw new ProviderError(
      "Salvarea cardurilor prin Stripe nu este activă momentan.",
      "STRIPE_CARD_NOT_READY",
      409,
    );
  const environment = paymentEnvironment(env);
  let billing = await env.DB.prepare(
    `SELECT id,external_customer_id AS externalCustomerId FROM billing_customers
     WHERE customer_id=?1 AND provider='stripe' AND environment=?2 AND status='active'`,
  )
    .bind(account.customerId, environment)
    .first<{ id: string; externalCustomerId: string }>();
  if (!billing) {
    const customer = await stripe(env, "customers", {
      method: "POST",
      idempotencyKey: `customer/${environment}/${account.customerId}`,
      body: new URLSearchParams({
        email: account.email,
        "metadata[customer_id]": account.customerId,
      }),
    });
    if (typeof customer.id !== "string" || !customer.id.startsWith("cus_"))
      throw new ProviderError("Clientul Stripe nu a fost creat.", "STRIPE_CUSTOMER_INVALID", 502);
    await env.DB.prepare(
      `INSERT OR IGNORE INTO billing_customers(id,customer_id,provider,environment,external_customer_id)
       VALUES(?1,?2,'stripe',?3,?4)`,
    )
      .bind(crypto.randomUUID(), account.customerId, environment, customer.id)
      .run();
    billing = await env.DB.prepare(
      `SELECT id,external_customer_id AS externalCustomerId FROM billing_customers
       WHERE customer_id=?1 AND provider='stripe' AND environment=?2 AND status='active'`,
    )
      .bind(account.customerId, environment)
      .first<{ id: string; externalCustomerId: string }>();
  }
  if (!billing)
    throw new ProviderError("Clientul Stripe nu poate fi citit.", "STRIPE_CUSTOMER_MISSING", 502);
  const setupId = crypto.randomUUID();
  const consentId = crypto.randomUUID();
  const params = new URLSearchParams({
    mode: "setup",
    customer: billing.externalCustomerId,
    success_url: `${env.PUBLIC_SITE_URL}/cont?card=return`,
    cancel_url: `${env.PUBLIC_SITE_URL}/cont?card=cancelled`,
    client_reference_id: setupId,
    "payment_method_types[0]": "card",
    "metadata[card_setup_id]": setupId,
    locale: "ro",
  });
  const session = await stripe(env, "checkout/sessions", {
    method: "POST",
    body: params,
    idempotencyKey: `card-setup/${setupId}`,
  });
  if (typeof session.id !== "string" || typeof session.url !== "string")
    throw new ProviderError("Sesiunea de salvare nu a fost creată.", "STRIPE_SETUP_INVALID", 502);
  const url = new URL(session.url);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "checkout.stripe.com" ||
    url.port ||
    url.username ||
    url.password
  )
    throw new ProviderError("Adresa Stripe nu este validă.", "STRIPE_SETUP_URL_INVALID", 502);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO payment_consents(
         id,customer_id,provider,scope,state,policy_version,consent_text,source,request_id,granted_at
       ) VALUES(?1,?2,'stripe','save_method','granted','2026-10-16',?3,'account',?4,strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
    ).bind(
      consentId,
      account.customerId,
      "Solicit salvarea cardului la Stripe pentru plăți viitoare inițiate de mine.",
      setupId,
    ),
    env.DB.prepare(
      `INSERT INTO customer_card_setups(
         id,review_account_id,customer_id,billing_customer_id,consent_id,stripe_session_id
       ) VALUES(?1,?2,?3,?4,?5,?6)`,
    ).bind(setupId, account.id, account.customerId, billing.id, consentId, session.id),
  ]);
  return { url: url.href };
}

export async function completeStripeCardSetup(env: CommerceEnv, session: StripeObject) {
  if (session.mode !== "setup" || typeof session.id !== "string") return false;
  const setup = await env.DB.prepare(
    `SELECT s.id,s.customer_id AS customerId,s.billing_customer_id AS billingCustomerId,
            s.consent_id AS consentId,s.status,b.external_customer_id AS externalCustomerId
     FROM customer_card_setups s JOIN billing_customers b ON b.id=s.billing_customer_id
     WHERE s.stripe_session_id=?1`,
  )
    .bind(session.id)
    .first<{
      id: string;
      customerId: string;
      billingCustomerId: string;
      consentId: string;
      status: string;
      externalCustomerId: string;
    }>();
  if (!setup || setup.status === "completed") return true;
  if (session.customer !== setup.externalCustomerId || typeof session.setup_intent !== "string")
    throw new ProviderError(
      "Sesiunea Stripe nu corespunde clientului.",
      "STRIPE_SETUP_MISMATCH",
      409,
    );
  const intent = await stripe(env, `setup_intents/${encodeURIComponent(session.setup_intent)}`);
  if (
    intent.status !== "succeeded" ||
    intent.customer !== setup.externalCustomerId ||
    typeof intent.payment_method !== "string"
  )
    throw new ProviderError(
      "Cardul nu a fost confirmat de Stripe.",
      "STRIPE_SETUP_PENDING",
      503,
      true,
    );
  const method = await stripe(env, `payment_methods/${encodeURIComponent(intent.payment_method)}`);
  const card = method.card as StripeObject | undefined;
  if (
    method.customer !== setup.externalCustomerId ||
    method.type !== "card" ||
    !card ||
    typeof card.last4 !== "string" ||
    typeof method.id !== "string"
  )
    throw new ProviderError("Metoda de plată nu a fost confirmată.", "STRIPE_METHOD_INVALID", 409);
  if (method.allow_redisplay !== "always") {
    const redisplay = await stripe(env, `payment_methods/${encodeURIComponent(method.id)}`, {
      method: "POST",
      body: new URLSearchParams({ allow_redisplay: "always" }),
      idempotencyKey: `card-redisplay/${setup.id}`,
    });
    if (
      redisplay.id !== method.id ||
      redisplay.customer !== setup.externalCustomerId ||
      redisplay.allow_redisplay !== "always"
    )
      throw new ProviderError(
        "Cardul nu poate fi afișat pentru plăți viitoare.",
        "STRIPE_REDISPLAY_INVALID",
        502,
      );
  }
  const environment = paymentEnvironment(env);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT OR IGNORE INTO customer_payment_methods(
         id,customer_id,billing_customer_id,consent_id,provider,environment,
         external_payment_method_id,method_type,display_label,brand,last4,expiry_month,expiry_year
       ) VALUES(?1,?2,?3,?4,'stripe',?5,?6,'card',?7,?8,?9,?10,?11)`,
    ).bind(
      crypto.randomUUID(),
      setup.customerId,
      setup.billingCustomerId,
      setup.consentId,
      environment,
      method.id,
      `${String(card.brand ?? "Card")} •••• ${card.last4}`,
      String(card.brand ?? "Card"),
      card.last4,
      Number(card.exp_month),
      Number(card.exp_year),
    ),
    env.DB.prepare(
      `UPDATE customer_card_setups SET status='completed',completed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id=?1 AND status='pending'`,
    ).bind(setup.id),
  ]);
  return true;
}

export async function removeStripeCard(env: CommerceEnv, customerId: string, methodId: string) {
  const environment = paymentEnvironment(env);
  const method = await env.DB.prepare(
    `SELECT external_payment_method_id AS externalId FROM customer_payment_methods
     WHERE id=?1 AND customer_id=?2 AND provider='stripe' AND environment=?3 AND status='active'`,
  )
    .bind(methodId, customerId, environment)
    .first<{ externalId: string }>();
  if (!method) throw new ProviderError("Cardul nu a fost găsit.", "STRIPE_CARD_NOT_FOUND", 404);
  await stripe(env, `payment_methods/${encodeURIComponent(method.externalId)}/detach`, {
    method: "POST",
    idempotencyKey: `detach/${methodId}`,
  });
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE customer_payment_methods SET status='deleted',is_default=0,
       updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?1 AND customer_id=?2`,
    ).bind(methodId, customerId),
    env.DB.prepare(
      `UPDATE payment_consents SET state='withdrawn',withdrawn_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id=(SELECT consent_id FROM customer_payment_methods WHERE id=?1)`,
    ).bind(methodId),
  ]);
}
