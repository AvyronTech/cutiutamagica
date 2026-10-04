import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { handleReviews, listReviews } from "./api/reviews";
import { handleReviewAccount, currentReviewer } from "./review-accounts";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { validReviewSource } from "@/lib/reviews";
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

let env: Env;
beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  const dir = resolve("cloudflare/d1/migrations"),
    files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  for (const file of files.filter((f) => f.slice(0, 4) < "0019"))
    sqlite.exec(readFileSync(resolve(dir, file), "utf8"));
  for (const file of ["0001_music_boxes.sql", "0002_vinted_catalog.sql", "0003_vinted_prices.sql"])
    sqlite.exec(readFileSync(resolve("cloudflare/d1/seed", file), "utf8"));
  sqlite.exec(
    "INSERT INTO admin_users(id,external_subject,email) VALUES('test-admin','test-admin','test@example.test')",
  );
  for (const file of files.filter((f) => f.slice(0, 4) >= "0019"))
    sqlite.exec(readFileSync(resolve(dir, file), "utf8"));
  env = bindings();
  Object.assign(env, { APP_ENV: "production", PUBLIC_SITE_URL: "https://cutiutamagica.eu" });
});
afterEach(() => {
  sqlite.close();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
function request(path: string, body?: unknown, cookie?: string, method = body ? "POST" : "GET") {
  return new Request(`https://cutiutamagica.eu/api/v1/${path}`, {
    method,
    headers: {
      origin: "https://cutiutamagica.eu",
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
const input = {
  productSlug: "hp-keeper",
  displayName: "Andreea M.",
  email: "private@example.test",
  rating: 4,
  body: "O cutiuță cu detalii frumoase și mecanism interesant.",
  language: "ro",
  countryCode: "RO",
  consent: true,
};
async function submit(body: unknown = input, cookie?: string) {
  return (await handleReviews(request("reviews", body, cookie), env))!;
}
async function moderate(id: string, status = "approved", version = 1) {
  return (await handleReviews(
    request(
      `admin/reviews/${id}`,
      { status, expectedVersion: version, featured: false, note: "Notă privată" },
      undefined,
      "PATCH",
    ),
    env,
  ))!;
}
async function reviewId() {
  const r = await submit();
  expect(r.status).toBe(201);
  return ((await r.json()) as { data: { id: string } }).data.id;
}

describe("reviews and moderation using real SQLite", () => {
  it("keeps guests pending until explicit admin approval, excludes private data, and allows withdrawal", async () => {
    const id = await reviewId();
    expect((await listReviews(env, "hp-keeper")).reviews).toHaveLength(0);
    expect((await moderate(id)).status).toBe(200);
    const visible = await listReviews(env, "hp-keeper");
    expect(visible.total).toBe(1);
    expect(visible.average).toBe(4);
    expect(visible.reviews[0]).toMatchObject({
      productSlug: "hp-keeper",
      displayName: "Andreea M.",
      source: "store",
      countryCode: "RO",
    });
    expect(visible.reviews[0].productName).not.toContain("14+");
    expect(JSON.stringify(visible)).not.toMatch(/private@example|Notă privată|password|account_id/);
    expect((await moderate(id, "pending", 2)).status).toBe(200);
    expect((await listReviews(env, null)).total).toBe(0);
  });
  it("protects moderation by permission, origin and optimistic concurrency with an audit trail", async () => {
    const id = await reviewId();
    vi.mocked(authenticateAdminRequest).mockRejectedValueOnce(
      Object.assign(new Error("Interzis"), { statusCode: 403 }),
    );
    expect((await moderate(id)).status).toBe(403);
    expect((await moderate(id)).status).toBe(200);
    expect((await moderate(id, "rejected")).status).toBe(409);
    expect(
      sqlite.prepare("SELECT count(*) n FROM audit_log WHERE action='review.moderated'").get()!.n,
    ).toBe(1);
    expect(authenticateAdminRequest).toHaveBeenLastCalledWith(
      expect.any(Request),
      env,
      "catalog.write",
    );
  });
  it("validates stars, guest data, consent, honeypot and body size", async () => {
    for (const extra of [
      { rating: 0 },
      { rating: 6 },
      { rating: 2.5 },
      { email: "invalid" },
      { displayName: "A" },
      { consent: false },
      { countryCode: "ZZ" },
      { website: "spam" },
    ])
      expect((await submit({ ...input, ...extra })).status).toBe(400);
    expect((await submit({ ...input, body: "x".repeat(9000) })).status).toBe(413);
    const forged = request("reviews", input);
    forged.headers.set("origin", "https://other.test");
    expect((await handleReviews(forged, env))!.status).toBe(403);
  });
  it("ignores forged approval, source and account identity from public submissions", async () => {
    expect(
      (
        await submit({
          ...input,
          status: "approved",
          source: "emag",
          featured: true,
          account_id: "forged",
        })
      ).status,
    ).toBe(201);
    expect(
      sqlite.prepare("SELECT status,source,featured,account_id FROM product_reviews").get(),
    ).toMatchObject({ status: "pending", source: "store", featured: 0, account_id: null });
    expect((await submit()).status).toBe(409);
  });
  it("accepts critical reviews and limits repeated submissions atomically", async () => {
    expect((await submit({ ...input, rating: 1 })).status).toBe(201);
    for (let i = 0; i < 5; i++) await submit({ ...input, email: `person${i}@example.test` });
    expect((await submit({ ...input, email: "overflow@example.test" })).status).toBe(429);
  });
  it("requires a real platform URL and queues imported reviews without publishing", async () => {
    const imported = {
      ...input,
      source: "emag",
      sourceUrl: "https://emag.ro/product/reviews/123",
      authentic: true,
    };
    expect(
      (await handleReviews(
        request("admin/reviews/import", {
          ...imported,
          sourceUrl: "https://emag.ro.evil.test/review",
        }),
        env,
      ))!.status,
    ).toBe(400);
    const r = (await handleReviews(request("admin/reviews/import", imported), env))!;
    expect(r.status).toBe(201);
    expect((await listReviews(env, null)).total).toBe(0);
    const id = ((await r.json()) as { data: { id: string } }).data.id;
    expect((await moderate(id)).status).toBe(200);
    expect((await listReviews(env, null)).reviews[0]).toMatchObject({
      source: "emag",
      sourceUrl: imported.sourceUrl,
    });
    expect((await handleReviews(request("admin/reviews/import", imported), env))!.status).toBe(409);
  });
  it("never inserts sample reviews or public demonstration metadata in any environment", async () => {
    for (const APP_ENV of ["local", "production"]) {
      Object.assign(env, {
        APP_ENV,
        PUBLIC_SITE_URL: APP_ENV === "local" ? "http://localhost:3000" : "https://cutiutamagica.eu",
      });
      const result = await listReviews(env, null);
      expect(result.reviews).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.average).toBeNull();
      expect(result).not.toHaveProperty("demo");
    }
  });
  it("removes 14+ from titles while retaining product age information in details", () => {
    expect(sqlite.prepare("SELECT COUNT(*) n FROM products WHERE name LIKE '%14+%'").get()!.n).toBe(
      0,
    );
    expect(
      sqlite.prepare("SELECT details_json FROM products WHERE slug='hp-keeper'").get()!
        .details_json,
    ).toContain("14+");
  });
  it("only accepts source URLs belonging to the named platform", () => {
    expect(validReviewSource("facebook", "https://www.facebook.com/page/reviews/12")).toBe(true);
    expect(validReviewSource("emag", "https://emag.ro/")).toBe(false);
    expect(validReviewSource("emag", "javascript:alert(1)")).toBe(false);
    expect(validReviewSource("olx", "https://olx.ro@evil.test/review")).toBe(false);
  });
});

describe("customer Google OpenID Connect accounts", () => {
  function enableGoogle() {
    Object.assign(env, {
      CUSTOMER_GOOGLE_CLIENT_ID: "google-client-id.apps.googleusercontent.com",
      CUSTOMER_GOOGLE_CLIENT_SECRET: "google-client-secret",
    });
  }

  async function beginGoogleLogin() {
    const response = (await handleReviewAccount(request("reviewer/oauth/google"), env))!;
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location")!);
    const state = location.searchParams.get("state")!;
    const stateCookie = response.headers.get("set-cookie")!;
    return { location, state, stateCookie };
  }

  it("keeps OAuth visibly disabled until the two Worker secrets exist", async () => {
    const providers = (await handleReviewAccount(request("reviewer/providers"), env))!;
    expect(await providers.json()).toEqual({ data: { google: { enabled: false } } });

    const start = (await handleReviewAccount(request("reviewer/oauth/google"), env))!;
    expect(start.status).toBe(302);
    expect(start.headers.get("location")).toBe("https://cutiutamagica.eu/cont?auth=neconfigurat");
  });

  it("starts Google authorization with a short-lived, HttpOnly state cookie", async () => {
    enableGoogle();
    const { location, stateCookie } = await beginGoogleLogin();
    expect(location.origin).toBe("https://accounts.google.com");
    expect(location.searchParams.get("scope")).toBe("openid email profile");
    expect(location.searchParams.get("response_type")).toBe("code");
    expect(location.searchParams.get("redirect_uri")).toBe(
      "https://cutiutamagica.eu/api/v1/reviewer/oauth/google/callback",
    );
    expect(stateCookie).toContain("cm_customer_oauth_state=");
    expect(stateCookie).toContain("HttpOnly");
    expect(stateCookie).toContain("SameSite=Lax");
    expect(stateCookie).toContain("Secure");
  });

  it("creates an OAuth-only account, session and trusted review identity", async () => {
    enableGoogle();
    const { state, stateCookie } = await beginGoogleLogin();
    const providerFetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ access_token: "google-access-token-for-test", token_type: "Bearer" }),
      )
      .mockResolvedValueOnce(
        Response.json({
          sub: "google-subject-123",
          email: "member@example.test",
          email_verified: true,
          name: "Maria P.",
        }),
      );
    vi.stubGlobal("fetch", providerFetch);

    const callback = (await handleReviewAccount(
      request(
        `reviewer/oauth/google/callback?code=valid-code&state=${state}`,
        undefined,
        stateCookie,
      ),
      env,
    ))!;
    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toBe("https://cutiutamagica.eu/cont");
    expect(providerFetch).toHaveBeenCalledTimes(2);

    const cookies = callback.headers.get("set-cookie")!;
    expect(cookies).toContain("cm_reviewer=");
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain("SameSite=Strict");
    const session = cookies.match(/cm_reviewer=[a-f0-9]{64}/)?.[0];
    expect(session).toBeTruthy();
    expect(
      sqlite.prepare("SELECT email,display_name,auth_mode FROM review_accounts").get(),
    ).toMatchObject({ email: "member@example.test", display_name: "Maria P.", auth_mode: "oauth" });
    expect(
      sqlite.prepare("SELECT provider,provider_subject FROM review_oauth_identities").get(),
    ).toMatchObject({ provider: "google", provider_subject: "google-subject-123" });

    expect(await currentReviewer(request("reviewer", undefined, session), env)).toMatchObject({
      displayName: "Maria P.",
    });
    expect(
      (
        await submit(
          { ...input, email: "forged@example.test", displayName: "Pretend author" },
          session,
        )
      ).status,
    ).toBe(201);
    expect(
      sqlite.prepare("SELECT display_name,email,origin,status FROM product_reviews").get(),
    ).toMatchObject({
      display_name: "Maria P.",
      email: "member@example.test",
      origin: "account",
      status: "pending",
    });
  });

  it("rejects forged OAuth state and retires local customer passwords", async () => {
    enableGoogle();
    const { stateCookie } = await beginGoogleLogin();
    const forged = (await handleReviewAccount(
      request(
        "reviewer/oauth/google/callback?code=valid-code&state=forged-state",
        undefined,
        stateCookie,
      ),
      env,
    ))!;
    expect(forged.status).toBe(302);
    expect(forged.headers.get("location")).toBe("https://cutiutamagica.eu/cont?auth=eroare");
    expect((await handleReviewAccount(request("reviewer/login", {}), env))!.status).toBe(410);
    expect((await handleReviewAccount(request("reviewer/register", {}), env))!.status).toBe(410);
  });
});
