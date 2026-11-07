import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { handleCustomerBilling } from "./api/customer-billing";
import { handleCustomerLoyalty } from "./api/customer-loyalty";
import { handlePersonalization } from "./api/personalization";
import { handleReviewAccount } from "./review-accounts";
import { handleAdminInventory } from "./api/admin-inventory";
import { guardAdminPage } from "./admin-page-guard";

vi.mock("cloudflare:workers", () => ({ env: {} }));

let sql: DatabaseSync;
let env: Env;
const tokenA = "a".repeat(64);
const tokenB = "b".repeat(64);
const eventA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const eventB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const cardB = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

function request(
  path: string,
  token: string | null = tokenA,
  method = "GET",
  body?: unknown,
  origin = "https://cutiutamagica.eu",
) {
  return new Request(`https://cutiutamagica.eu${path}`, {
    method,
    headers: {
      origin,
      "content-type": "application/json",
      ...(token ? { cookie: `cm_reviewer=${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

beforeEach(() => {
  sql = new DatabaseSync(":memory:");
  for (const file of readdirSync("cloudflare/d1/migrations")
    .filter((name) => name.endsWith(".sql"))
    .sort())
    sql.exec(readFileSync(`cloudflare/d1/migrations/${file}`, "utf8"));
  sql.exec(readFileSync("cloudflare/d1/seed/0001_music_boxes.sql", "utf8"));
  const prepare = (query: string) => {
    let values: SQLInputValue[] = [];
    return {
      bind(...args: SQLInputValue[]) {
        values = args;
        return this;
      },
      async first() {
        return sql.prepare(query).get(...values) ?? null;
      },
      async all() {
        return { results: sql.prepare(query).all(...values), success: true };
      },
      async run() {
        const result = sql.prepare(query).run(...values);
        return { success: true, results: [], meta: { changes: Number(result.changes) } };
      },
    };
  };
  env = {
    APP_ENV: "local",
    DB: {
      prepare,
      async batch(statements: Array<ReturnType<typeof prepare>>) {
        sql.exec("BEGIN");
        try {
          const results = [];
          for (const statement of statements) results.push(await statement.all());
          sql.exec("COMMIT");
          return results;
        } catch (error) {
          sql.exec("ROLLBACK");
          throw error;
        }
      },
    },
  } as unknown as Env;
  for (const [id, token] of [
    ["a", tokenA],
    ["b", tokenB],
  ]) {
    sql
      .prepare("INSERT INTO customers(id,email,email_normalized,full_name) VALUES(?,?,?,?)")
      .run(`customer-${id}`, `${id}@example.test`, `${id}@example.test`, `Client ${id}`);
    sql
      .prepare(
        "INSERT INTO review_accounts(id,email,display_name,password_hash,password_salt,customer_id) VALUES(?,?,?,'unused','unused',?)",
      )
      .run(id, `${id}@example.test`, `Client ${id}`, `customer-${id}`);
    sql
      .prepare("INSERT INTO review_sessions(token_hash,account_id,expires_at) VALUES(?,?,?)")
      .run(hash(token), id, Math.floor(Date.now() / 1000) + 3600);
    sql
      .prepare(
        "INSERT INTO orders(id,order_number,public_token,idempotency_key,channel_id,customer_id,subtotal_bani,total_bani,customer_name,customer_phone_e164,internal_note) VALUES(?,?,?,?,'channel_emag',?,10000,10000,?,'+40700000000',?)",
      )
      .run(
        `order-${id}`,
        `CM-PRIVATE-${id}`,
        `public-${id}`,
        `key-${id}`,
        `customer-${id}`,
        `Client ${id}`,
        `STAFF-ONLY-${id}`,
      );
    sql
      .prepare(
        "INSERT INTO gift_calendar_events(id,review_account_id,occasion,person_name,event_month,event_day,reminder_days_json,email_enabled) VALUES(?,?,'birthday',?,12,31,'[7,3]',0)",
      )
      .run(id === "a" ? eventA : eventB, id, `PRIVATE-PERSON-${id}`);
    sql
      .prepare(
        "INSERT INTO personalization_requests(id,account_id,customer_name,email,phone,box_color,melody,lid_image_r2_key,lid_image_mime,lid_image_original_name,total_bani,consent_processing) VALUES(?,?,?,?,'0712345678','black','melody-1',?,'image/png','cover.png',18900,1)",
      )
      .run(
        `request-${id}`,
        id,
        `Client ${id}`,
        `${id}@example.test`,
        `private/personalizations/${id}.png`,
      );
  }
  sql
    .prepare(
      "INSERT INTO billing_customers(id,customer_id,provider,external_customer_id) VALUES('billing-b','customer-b','stripe','cus_b')",
    )
    .run();
  sql
    .prepare(
      "INSERT INTO customer_payment_methods(id,customer_id,billing_customer_id,provider,external_payment_method_id,display_label,last4) VALUES(?,'customer-b','billing-b','stripe','pm_private_b','Visa •••• 1234','1234')",
    )
    .run(cardB);
  vi.spyOn(globalThis, "fetch").mockRejectedValue(
    new Error("No external calls allowed in account isolation tests"),
  );
});
afterEach(() => {
  sql.close();
  vi.restoreAllMocks();
});

describe("customer account access boundaries", () => {
  it("returns only the session owner's orders, cards and requests despite forged selectors", async () => {
    const billing = await handleCustomerBilling(
      request("/api/v1/customer/billing?customerId=customer-b&accountId=b"),
      env,
    );
    expect(billing?.status).toBe(200);
    const payload = await billing!.text();
    expect(payload).toContain("CM-PRIVATE-a");
    expect(payload).not.toContain("CM-PRIVATE-b");
    expect(payload).not.toContain("STAFF-ONLY");
    expect(payload).not.toContain("pm_private_b");
    const ownCard = await handleCustomerBilling(request("/api/v1/customer/billing", tokenB), env);
    const ownCardBody = await ownCard!.text();
    expect(ownCardBody).toContain("1234");
    expect(ownCardBody).not.toContain("pm_private_b");
    const personalizations = await handlePersonalization(
      request("/api/v1/personalization/requests?accountId=b"),
      env,
    );
    const history = await personalizations!.text();
    expect(history).toContain("request-a");
    expect(history).not.toContain("request-b");
    expect(history).not.toContain("private/personalizations");
  });

  it("keeps the customer's calendar private and does not serialize staff adjustment notes", async () => {
    sql
      .prepare(
        "INSERT INTO magic_star_ledger(id,review_account_id,delta,reason,source_type,source_id,note) VALUES('adjust-a','a',1,'admin_adjustment','admin_adjustment','internal-action','STAFF-ONLY-INVESTIGATION')",
      )
      .run();
    const response = await handleCustomerLoyalty(
      request("/api/v1/customer/rewards?accountId=b"),
      env,
    );
    expect(response?.status).toBe(200);
    const body = await response!.text();
    expect(body).toContain("PRIVATE-PERSON-a");
    expect(body).not.toContain("PRIVATE-PERSON-b");
    expect(body).not.toContain("STAFF-ONLY");
    const mutation = await handleCustomerLoyalty(
      request(`/api/v1/customer/gift-calendar/${eventB}`, tokenA, "PATCH", { emailEnabled: true }),
      env,
    );
    expect(mutation?.status).toBe(404);
    expect(
      sql.prepare("SELECT email_enabled FROM gift_calendar_events WHERE id=?").get(eventB)
        ?.email_enabled,
    ).toBe(0);
  });

  it("does not treat a customer cookie as an administrative session", async () => {
    const page = await guardAdminPage(request("/admin/orders"), env.DB);
    expect(page?.status).toBe(302);
    expect(page?.headers.get("location")).toContain("/auth?redirect=");
    const api = await handleAdminInventory(
      request("/api/v1/admin/products/product-a/inventory"),
      env,
    );
    expect(api?.status).toBe(401);
    expect(await api!.text()).not.toContain("levels");
  });

  it("rejects unauthenticated, expired, blocked and cross-origin customer operations", async () => {
    expect(
      (await handleCustomerBilling(request("/api/v1/customer/billing", null), env))?.status,
    ).toBe(401);
    sql.prepare("UPDATE review_sessions SET expires_at=1 WHERE account_id='a'").run();
    expect((await handleCustomerLoyalty(request("/api/v1/customer/rewards"), env))?.status).toBe(
      401,
    );
    sql.prepare("UPDATE review_accounts SET status='blocked' WHERE id='b'").run();
    expect(
      (await handlePersonalization(request("/api/v1/personalization/requests", tokenB), env))
        ?.status,
    ).toBe(401);
    sql
      .prepare("UPDATE review_sessions SET expires_at=? WHERE account_id='a'")
      .run(Math.floor(Date.now() / 1000) + 3600);
    const csrf = await handleCustomerLoyalty(
      request(
        `/api/v1/customer/gift-calendar/${eventA}`,
        tokenA,
        "PATCH",
        { emailEnabled: true },
        "https://evil.example",
      ),
      env,
    );
    expect(csrf?.status).toBe(403);
  });

  it("updates only the authenticated display name and cannot change identity or permissions", async () => {
    const response = await handleReviewAccount(
      request("/api/v1/reviewer/profile", tokenA, "POST", {
        displayName: "Ana DEMO",
        accountId: "b",
        email: "b@example.test",
        role: "owner",
      }),
      env,
    );
    expect(response?.status).toBe(200);
    expect(
      sql.prepare("SELECT display_name,email FROM review_accounts WHERE id='a'").get(),
    ).toEqual({ display_name: "Ana DEMO", email: "a@example.test" });
    expect(
      sql.prepare("SELECT display_name FROM review_accounts WHERE id='b'").get()?.display_name,
    ).toBe("Client b");
    expect(
      sql.prepare("SELECT COUNT(*) AS n FROM admin_users WHERE email='a@example.test'").get()?.n,
    ).toBe(0);
    const invalid = await handleReviewAccount(
      request("/api/v1/reviewer/profile", tokenA, "POST", { displayName: "a" }),
      env,
    );
    expect(invalid?.status).toBe(400);
    const csrf = await handleReviewAccount(
      request(
        "/api/v1/reviewer/profile",
        tokenA,
        "POST",
        { displayName: "Other" },
        "https://evil.example",
      ),
      env,
    );
    expect(csrf?.status).toBe(403);
  });

  it("does not remove or contact a provider for another customer's card", async () => {
    const response = await handleCustomerBilling(
      request(`/api/v1/customer/billing/cards/${cardB}`, tokenA, "DELETE"),
      env,
    );
    expect(response?.status).toBe(404);
    expect(
      sql.prepare("SELECT status FROM customer_payment_methods WHERE id=?").get(cardB)?.status,
    ).toBe("active");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("stores quoted profile input as text rather than executable SQL", async () => {
    const displayName = "Ana'); DROP TABLE review_accounts; --";
    const response = await handleReviewAccount(
      request("/api/v1/reviewer/profile", tokenA, "POST", { displayName }),
      env,
    );
    expect(response?.status).toBe(200);
    expect(
      sql.prepare("SELECT display_name FROM review_accounts WHERE id='a'").get()?.display_name,
    ).toBe(displayName);
    expect(sql.prepare("SELECT COUNT(*) AS n FROM review_accounts").get()?.n).toBe(2);
  });
});
