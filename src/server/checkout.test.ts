import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createWebsiteOrder, checkoutSubtotal } from "./db/order.repository";
import { websiteOrderInputSchema } from "@/lib/order-contracts";
import { handlePayments, safeCheckoutUrl } from "./api/payments";
import { handleCommerceApi } from "./api/commerce";
import { handleCheckoutAdmin } from "./api/checkout-admin";
import { handleShippingCheckout } from "./api/shipping-checkout";
import type { CommercePublicConfig } from "@/lib/commerce-operations-contracts";
import type { CheckoutSettings } from "@/lib/checkout-settings";
import { checkoutSettingsSchema } from "@/lib/checkout-settings";
import { shippingFingerprint } from "./services/shipping-fingerprint";
import { hmacHex, type CommerceEnv } from "./integrations/provider-runtime";
import { verifyStripeWebhook } from "./integrations/stripe";
vi.mock("@/lib/admin-auth", () => ({
  authenticateAdminRequest: vi.fn(async () => ({ id: "test-admin", email: "test@example.test" })),
}));
let sqlite: DatabaseSync;
class Statement {
  private args: Record<string, SQLInputValue> = {};
  constructor(private sql: string) {}
  bind(...args: SQLInputValue[]) {
    this.args = Object.fromEntries(args.map((v, i) => [`?${i + 1}`, v]));
    return this;
  }
  execute() {
    const q = sqlite.prepare(this.sql);
    if (/^\s*SELECT/i.test(this.sql))
      return { success: true, results: q.all(this.args), meta: { changes: 0 } };
    const result = q.run(this.args);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
  async run() {
    return this.execute();
  }
  async all() {
    return { results: sqlite.prepare(this.sql).all(this.args) };
  }
  async first() {
    return sqlite.prepare(this.sql).get(this.args) ?? null;
  }
}
function bindings() {
  const cache = new Map<string, string>();
  return {
    DB: {
      prepare: (sql: string) => new Statement(sql),
      async batch(statements: Statement[]) {
        sqlite.exec("BEGIN");
        try {
          const results = statements.map((s) => s.execute());
          sqlite.exec("COMMIT");
          return results;
        } catch (e) {
          sqlite.exec("ROLLBACK");
          throw e;
        }
      },
    },
    CACHE: {
      async get(k: string) {
        return cache.get(k) ?? null;
      },
      async put(k: string, v: string) {
        cache.set(k, v);
      },
      async delete(k: string) {
        cache.delete(k);
      },
    },
    MEDIA: {
      async put(_key: string, body: ReadableStream) {
        return { size: (await new Response(body).arrayBuffer()).byteLength };
      },
      async delete() {},
    },
  } as unknown as Env;
}

let env: CommerceEnv;
beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  const files = readdirSync(resolve("cloudflare/d1/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files.filter((f) => f < "0019"))
    sqlite.exec(readFileSync(resolve("cloudflare/d1/migrations", f), "utf8"));
  for (const f of ["0001_music_boxes.sql", "0002_vinted_catalog.sql", "0003_vinted_prices.sql"])
    sqlite.exec(readFileSync(resolve("cloudflare/d1/seed", f), "utf8"));
  for (const f of files.filter((f) => f >= "0019"))
    sqlite.exec(readFileSync(resolve("cloudflare/d1/migrations", f), "utf8"));
  sqlite.exec(
    "INSERT INTO admin_users(id,external_subject,email) VALUES('test-admin','test-admin','test@example.test')",
  );
  sqlite.exec(
    "UPDATE shipping_policy_configs SET validation_status='verified',standard_price_bani=1900,free_over_bani=NULL WHERE code='RO_STANDARD'",
  );
  const settings = checkoutSettingsSchema.parse({
    stripe: { enabled: true, acceptanceTestReference: "local-test" },
  });
  sqlite
    .prepare(
      "INSERT INTO operational_settings(key,value_json,updated_at) VALUES('commerce.checkout',?,strftime('%Y-%m-%dT%H:%M:%fZ','now'))",
    )
    .run(JSON.stringify(settings));
  env = {
    ...bindings(),
    APP_ENV: "development",
    PUBLIC_SITE_URL: "https://shop.test",
    STRIPE_SECRET_KEY: "sk_test_fixture",
    STRIPE_WEBHOOK_SECRET: "whsec_fixture",
  } as unknown as CommerceEnv;
});
afterEach(() => {
  sqlite.close();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function input() {
  return websiteOrderInputSchema.parse({
    idempotencyKey: crypto.randomUUID(),
    customer: {
      name: "Test Local",
      email: "test@example.test",
      phone: "0712345678",
      address: "Strada Test 10",
      city: "Cluj-Napoca",
      county: "Cluj",
      postalCode: "400001",
      notes: "",
    },
    paymentMethod: "card",
    paymentProvider: "stripe",
    shippingOption: "home_delivery",
    checkoutConsentAccepted: true,
    checkoutConsentVersion: "2026.09",
    items: [{ productId: "hp-keeper", quantity: 1 }],
  });
}
function request(path: string, body: unknown, method = "POST") {
  return new Request(`https://shop.test${path}`, {
    method,
    headers: { origin: "https://shop.test", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
async function order() {
  return createWebsiteOrder(env.DB, input());
}
function stripeFetch(url = "https://checkout.stripe.com/c/pay/cs_test_local") {
  const fetcher = vi.fn(async () => Response.json({ id: "cs_test_local", url }));
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
async function start() {
  const created = await order();
  stripeFetch();
  const response = await handlePayments(request("/api/v1/payments/checkout", created), env);
  expect(response!.status).toBe(200);
  return created;
}
async function event(
  created: Awaited<ReturnType<typeof order>>,
  extra: Record<string, unknown> = {},
  id = "evt_local",
  live = false,
) {
  const body = JSON.stringify({
    id,
    type: "checkout.session.completed",
    livemode: live,
    data: {
      object: {
        id: "cs_test_local",
        payment_status: "paid",
        amount_total: Math.round(created.total * 100),
        currency: "ron",
        ...extra,
      },
    },
  });
  const t = String(Math.floor(Date.now() / 1000));
  const signature = await hmacHex(env.STRIPE_WEBHOOK_SECRET!, `${t}.${body}`);
  return handlePayments(
    new Request("https://shop.test/api/v1/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": `t=${t},v1=${signature}`, "content-type": "application/json" },
      body,
    }),
    env,
  );
}
function storedPayment(id: string) {
  return sqlite.prepare("SELECT payment_status FROM orders WHERE id=?").get(id)!.payment_status;
}

describe("secure checkout", () => {
  it("reuses one hosted session; sends authoritative amount and no order access token", async () => {
    const created = await order();
    const fetcher = stripeFetch();
    const a = await handlePayments(request("/api/v1/payments/checkout", created), env);
    const b = await handlePayments(request("/api/v1/payments/checkout", created), env);
    expect(a!.status).toBe(200);
    expect(b!.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const init = (fetcher.mock.calls as unknown as Array<[string, RequestInit]>)[0][1];
    const body = String(init.body);
    expect(body).toContain(String(Math.round(created.total * 100)));
    expect(body).not.toContain(created.publicToken);
    expect(sqlite.prepare("SELECT count(*) AS n FROM payment_attempts").get()!.n).toBe(1);
  });
  it("accepts only paid exact-amount, exact-currency events and handles replay once", async () => {
    const created = await start();
    expect((await event(created, { payment_status: "unpaid" }, "evt_unpaid"))!.status).toBe(200);
    expect(storedPayment(created.orderId)).toBe("unpaid");
    expect((await event(created, { amount_total: 1 }, "evt_wrong_amount"))!.status).toBe(409);
    expect((await event(created, { currency: "eur" }, "evt_wrong_currency"))!.status).toBe(409);
    expect(storedPayment(created.orderId)).toBe("unpaid");
    expect((await event(created))!.status).toBe(200);
    expect((await event(created))!.status).toBe(200);
    expect(storedPayment(created.orderId)).toBe("paid");
    expect(
      sqlite
        .prepare("SELECT count(*) AS n FROM order_events WHERE event_type='payment.captured'")
        .get()!.n,
    ).toBe(1);
    const status = await handlePayments(request("/api/v1/payments/status", created), env);
    expect(((await status!.json()) as { data: unknown }).data).toMatchObject({
      status: "paid",
      canResume: false,
    });
  });
  it("retries an early webhook after the attempt becomes known", async () => {
    const created = await order();
    expect((await event(created))!.status).toBe(503);
    stripeFetch();
    await handlePayments(request("/api/v1/payments/checkout", created), env);
    expect((await event(created))!.status).toBe(200);
    expect(storedPayment(created.orderId)).toBe("paid");
  });
  it("rejects cancelled orders, environment mismatch, changed totals and unauthenticated capabilities", async () => {
    const created = await start();
    expect((await event(created, {}, "evt_live", true))!.status).toBe(400);
    expect(
      (await handlePayments(
        request("/api/v1/payments/status", { ...created, publicToken: crypto.randomUUID() }),
        env,
      ))!.status,
    ).toBe(404);
    sqlite.prepare("UPDATE orders SET order_status='cancelled' WHERE id=?").run(created.orderId);
    expect((await event(created))!.status).toBe(409);
    expect(storedPayment(created.orderId)).toBe("unpaid");
    expect((await handlePayments(request("/api/v1/payments/checkout", created), env))!.status).toBe(
      409,
    );
  });
  it("rejects hostile redirect hosts and signatures; accepts any valid rotation signature", async () => {
    expect(() =>
      safeCheckoutUrl("https://checkout.stripe.com.evil.test/pay", "stripe", "production"),
    ).toThrow();
    expect(() =>
      safeCheckoutUrl("https://evil@checkout.stripe.com/pay", "stripe", "production"),
    ).toThrow();
    const t = String(Math.floor(Date.now() / 1000)),
      payload = "{}",
      sig = await hmacHex("secret", `${t}.${payload}`);
    expect(
      await verifyStripeWebhook(payload, `t=${t},v1=${sig},v1=${"0".repeat(64)}`, "secret"),
    ).toBe(true);
    expect(await verifyStripeWebhook(payload, `t=1,v1=${sig}`, "secret")).toBe(false);
  });
  it("does not expose setup information or enable payments from credentials alone", async () => {
    sqlite
      .prepare("UPDATE operational_settings SET value_json='{}' WHERE key='commerce.checkout'")
      .run();
    const response = await handleCommerceApi(
      new Request("https://shop.test/api/v1/commerce/config"),
      env,
      {} as ExecutionContext,
    );
    const config = ((await response!.json()) as { data: CommercePublicConfig }).data;
    expect(config.payments.options).toEqual([]);
    expect(config.payments.card.enabled).toBe(false);
    expect(config.seller).not.toHaveProperty("profileComplete");
    expect(config.shipping).not.toHaveProperty("defaultWeightG");
    expect(config.currencies).not.toHaveProperty("planned");
    expect(response!.headers.get("cache-control")).toBe("no-store");
    const created = await order();
    stripeFetch();
    expect((await handlePayments(request("/api/v1/payments/checkout", created), env))!.status).toBe(
      409,
    );
  });
  it("does not permit online orders with an unknown delivery cost", async () => {
    sqlite.exec("UPDATE shipping_policy_configs SET validation_status='requires_approval'");
    await expect(order()).rejects.toThrow("Costul livrării");
  });
});
describe("delivery quote integrity", () => {
  async function savedQuote(body = input()) {
    const id = crypto.randomUUID(),
      hash = await shippingFingerprint(body, await checkoutSubtotal(env.DB, body.items));
    sqlite
      .prepare(
        "INSERT INTO shipping_quotes(id,provider,method_code,amount_bani,request_hash,expires_at) VALUES(?,'smartship','home_delivery',1234,?,?)",
      )
      .run(id, hash, new Date(Date.now() + 600000).toISOString());
    return { id, body };
  }
  it("uses the stored offer price, claims it atomically and permits an order retry", async () => {
    const { id, body } = await savedQuote();
    body.shippingQuoteId = id;
    const a = await createWebsiteOrder(env.DB, body),
      b = await createWebsiteOrder(env.DB, body);
    expect(a.shipping).toBe(12.34);
    expect(b.orderId).toBe(a.orderId);
    expect(
      sqlite.prepare("SELECT order_id FROM shipping_quotes WHERE id=?").get(id)!.order_id,
    ).toBe(a.orderId);
    await expect(
      createWebsiteOrder(env.DB, { ...body, idempotencyKey: crypto.randomUUID() }),
    ).rejects.toThrow("Oferta de livrare");
  });
  it("rejects changed destination, quantity, method and expired quotes", async () => {
    const { id, body } = await savedQuote();
    await expect(
      createWebsiteOrder(env.DB, {
        ...body,
        shippingQuoteId: id,
        customer: { ...body.customer, city: "Brasov" },
      }),
    ).rejects.toThrow("Oferta de livrare");
    await expect(
      createWebsiteOrder(env.DB, {
        ...body,
        shippingQuoteId: id,
        paymentMethod: "cash_on_delivery",
      }),
    ).rejects.toThrow("Oferta de livrare");
    sqlite.prepare("UPDATE shipping_quotes SET expires_at='2000-01-01' WHERE id=?").run(id);
    await expect(createWebsiteOrder(env.DB, { ...body, shippingQuoteId: id })).rejects.toThrow(
      "Oferta de livrare",
    );
  });
  it("obtains offers with a server-resolved destination and returns no integration internals", async () => {
    env.SMARTSHIP_API_KEY = "private";
    sqlite.exec(
      "UPDATE shipping_policy_configs SET use_live_quotes=1,sender_name='Atelier',sender_address='Strada Test 2',sender_phone='0712345678',sender_city_id=1",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        Response.json(
          url.includes("/counties")
            ? { counties: [{ id: 13, county: "Cluj" }] }
            : url.includes("/cities")
              ? { cities: [{ id: 256212, city: "Cluj-Napoca" }] }
              : {
                  costs: [
                    { courier_id: 1, courier_name: "Curier test", cost: 17.55, own_contract: true },
                    { courier_id: 2, courier_name: "Invalid", cost: -1 },
                  ],
                },
        ),
      ),
    );
    const response = await handleShippingCheckout(request("/api/v1/shipping/quotes", input()), env);
    expect(response!.status).toBe(200);
    const data = ((await response!.json()) as { data: Array<{ price: number }> }).data;
    expect(data).toHaveLength(1);
    expect(data[0].price).toBe(17.55);
    expect(data[0]).not.toHaveProperty("ownContract");
  });
});
describe("internal checkout configuration", () => {
  it("saves configuration with a version guard and cannot activate unfinished NETOPIA", async () => {
    const current = await handleCheckoutAdmin(
      new Request("https://shop.test/api/v1/admin/checkout-settings"),
      env,
    );
    const data = (
      (await current!.json()) as { data: { version: number; settings: CheckoutSettings } }
    ).data;
    const settings = {
      ...data.settings,
      invoiceProvider: "oblio" as const,
      oblioEmail: "billing@example.test",
    };
    expect(
      (await handleCheckoutAdmin(
        request(
          "/api/v1/admin/checkout-settings",
          { settings, expectedVersion: data.version },
          "PUT",
        ),
        env,
      ))!.status,
    ).toBe(200);
    expect(
      (await handleCheckoutAdmin(
        request(
          "/api/v1/admin/checkout-settings",
          { settings, expectedVersion: data.version },
          "PUT",
        ),
        env,
      ))!.status,
    ).toBe(409);
    settings.netopia = {
      enabled: true,
      environment: "sandbox",
      acceptanceTestReference: "not-verified",
    };
    expect(
      (await handleCheckoutAdmin(
        request(
          "/api/v1/admin/checkout-settings",
          { settings, expectedVersion: data.version + 1 },
          "PUT",
        ),
        env,
      ))!.status,
    ).toBe(409);
  });
});

describe("Revolut Merchant and interrupted payments", () => {
  function enableRevolut() {
    env.REVOLUT_MERCHANT_SECRET_KEY = "merchant_fixture";
    env.REVOLUT_MERCHANT_WEBHOOK_SECRET = "merchant_webhook_fixture";
    const settings = checkoutSettingsSchema.parse({
      revolut_pay: { enabled: true, acceptanceTestReference: "sandbox-test" },
    });
    sqlite
      .prepare("UPDATE operational_settings SET value_json=? WHERE key='commerce.checkout'")
      .run(JSON.stringify(settings));
  }
  async function revolutEvent(id: string) {
    const payload = JSON.stringify({ event: "ORDER_COMPLETED", order_id: id });
    const t = String(Date.now()),
      signature = await hmacHex(env.REVOLUT_MERCHANT_WEBHOOK_SECRET!, `v1.${t}.${payload}`);
    return handlePayments(
      new Request("https://shop.test/api/v1/webhooks/revolut", {
        method: "POST",
        headers: { "revolut-request-timestamp": t, "revolut-signature": `v1=${signature}` },
        body: payload,
      }),
      env,
    );
  }
  it("creates one hosted order with item and address data, then verifies the captured provider order", async () => {
    enableRevolut();
    const data = input();
    data.paymentProvider = "revolut_pay";
    const created = await createWebsiteOrder(env.DB, data),
      external = crypto.randomUUID();
    const fetcher = vi.fn(async (_url: string, init: RequestInit) =>
      Response.json(
        init.method === "POST"
          ? {
              id: external,
              checkout_url: `https://sandbox-checkout.revolut.com/payment-link/${external}`,
            }
          : {
              id: external,
              state: "completed",
              outstanding_amount: 0,
              amount: Math.round(created.total * 100),
              currency: "RON",
              metadata: { order_id: created.orderId },
            },
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    expect((await handlePayments(request("/api/v1/payments/checkout", created), env))!.status).toBe(
      200,
    );
    expect((await handlePayments(request("/api/v1/payments/checkout", created), env))!.status).toBe(
      200,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    const outgoing = JSON.parse(String(fetcher.mock.calls[0][1].body));
    expect(
      outgoing.line_items.reduce(
        (sum: number, item: { total_amount: number }) => sum + item.total_amount,
        0,
      ),
    ).toBe(Math.round(created.total * 100));
    expect(outgoing.shipping.address.postcode).toBe(data.customer.postalCode);
    expect((await revolutEvent(external))!.status).toBe(200);
    expect(storedPayment(created.orderId)).toBe("paid");
  });
  it("never repeats an ambiguous create; recovers from authenticated webhook data", async () => {
    enableRevolut();
    const data = input();
    data.paymentProvider = "revolut_pay";
    const created = await createWebsiteOrder(env.DB, data);
    const fetcher = vi.fn(async () => {
      throw new Error("network timeout");
    });
    vi.stubGlobal("fetch", fetcher);
    expect((await handlePayments(request("/api/v1/payments/checkout", created), env))!.status).toBe(
      502,
    );
    expect((await handlePayments(request("/api/v1/payments/checkout", created), env))!.status).toBe(
      409,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    const external = crypto.randomUUID();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          id: external,
          state: "completed",
          outstanding_amount: 0,
          amount: Math.round(created.total * 100),
          currency: "RON",
          metadata: { order_id: created.orderId },
        }),
      ),
    );
    expect((await revolutEvent(external))!.status).toBe(200);
    expect(storedPayment(created.orderId)).toBe("paid");
  });
  it("rejects a forged Revolut notification without fetching provider data", async () => {
    enableRevolut();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await handlePayments(
      new Request("https://shop.test/api/v1/webhooks/revolut", {
        method: "POST",
        body: JSON.stringify({ event: "ORDER_COMPLETED", order_id: crypto.randomUUID() }),
      }),
      env,
    );
    expect(response!.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("locks an amount already offered for payment and expires an unpaid session safely", async () => {
    const created = await start();
    expect(() =>
      sqlite.prepare("UPDATE orders SET total_bani=total_bani+100 WHERE id=?").run(created.orderId),
    ).toThrow("PAYMENT_AMOUNT_LOCKED");
    const payload = JSON.stringify({
      id: "evt_expiry",
      type: "checkout.session.expired",
      livemode: false,
      data: { object: { id: "cs_test_local", payment_status: "unpaid" } },
    });
    const t = String(Math.floor(Date.now() / 1000)),
      sig = await hmacHex(env.STRIPE_WEBHOOK_SECRET!, `${t}.${payload}`);
    expect(
      (await handlePayments(
        new Request("https://shop.test/api/v1/webhooks/stripe", {
          method: "POST",
          headers: { "stripe-signature": `t=${t},v1=${sig}` },
          body: payload,
        }),
        env,
      ))!.status,
    ).toBe(200);
    expect(
      sqlite.prepare("SELECT order_status FROM orders WHERE id=?").get(created.orderId)!
        .order_status,
    ).toBe("cancelled");
    const result = await handlePayments(request("/api/v1/payments/status", created), env);
    expect(((await result!.json()) as { data: unknown }).data).toMatchObject({
      status: "cancelled",
      canResume: false,
    });
  });
  it("allows an idempotent retry after a payment method has been disabled", async () => {
    const data = input(),
      created = await createWebsiteOrder(env.DB, data);
    const authorize = vi.fn(async () => {
      throw new Error("disabled");
    });
    const repeated = await createWebsiteOrder(env.DB, data, authorize);
    expect(repeated.orderId).toBe(created.orderId);
    expect(authorize).not.toHaveBeenCalled();
  });
});

it("does not place an order whose authoritative total differs from the buyer's accepted total", async () => {
  await expect(createWebsiteOrder(env.DB, { ...input(), expectedTotalBani: 1 })).rejects.toThrow(
    "Prețul sau livrarea",
  );
  expect(sqlite.prepare("SELECT count(*) AS n FROM orders").get()!.n).toBe(0);
});
