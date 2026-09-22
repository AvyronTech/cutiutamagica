import { afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { credential, storeCredential, saveSetting } from "./services/growth-settings";
import { processOwnerReports } from "./services/owner-reports";
import { researchProduct, rankSupplierResults } from "./services/supplier-research";
import { listPublicCatalog } from "./db/catalog.repository";
import { previousMonth, reportSettingsSchema, marketplaceForUrl } from "@/lib/growth-contracts";
import type { CommerceEnv } from "./integrations/provider-runtime";
import { readProviderJson } from "./integrations/provider-runtime";
import { syncTraffic } from "./services/traffic-integrations";

const databases: DatabaseSync[] = [];
function database() {
  const sql = new DatabaseSync(":memory:");
  databases.push(sql);
  for (const name of readdirSync(resolve("cloudflare/d1/migrations")).sort())
    sql.exec(readFileSync(resolve("cloudflare/d1/migrations", name), "utf8"));
  sql.exec(readFileSync(resolve("cloudflare/d1/seed/0001_music_boxes.sql"), "utf8"));
  const prepare = (query: string) => {
    let values: Array<string | number | null> = [];
    const statement = {
      bind(...args: Array<string | number | null>) {
        values = args;
        return statement;
      },
      async first() {
        return sql.prepare(query).get(...values) ?? null;
      },
      async all() {
        return { success: true, results: sql.prepare(query).all(...values) };
      },
      async run() {
        const result = sql.prepare(query).run(...values);
        return { success: true, results: [], meta: { changes: Number(result.changes) } };
      },
    };
    return statement;
  };
  const db = {
    prepare,
    async batch(statements: Array<ReturnType<typeof prepare>>) {
      sql.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.all());
        sql.exec("COMMIT");
        return results;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  } as unknown as D1Database;
  const actor = String(sql.prepare("SELECT id FROM admin_users LIMIT 1").get()!.id);
  return { sql, db, actor };
}
afterEach(() => {
  vi.unstubAllGlobals();
  for (const db of databases.splice(0)) db.close();
});
describe("growth and commerce integration", () => {
  it("rejects oversized provider bodies", async () => {
    await expect(
      readProviderJson(new Response(JSON.stringify({ text: "x".repeat(100) })), 20),
    ).rejects.toThrow();
  });
  it("replaces traffic intervals without accumulating duplicate imports", async () => {
    const { db, sql, actor } = database();
    await saveSetting(db, "traffic", { gaPropertyId: "12345" }, actor);
    const day = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            rows: [
              {
                dimensionValues: [{ value: day.replaceAll("-", "") }],
                metricValues: [{ value: "10" }, { value: "25" }],
              },
            ],
          }),
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const env = { DB: db, GOOGLE_ACCESS_TOKEN: "test" } as CommerceEnv;
    await syncTraffic(env, "ga4");
    await syncTraffic(env, "ga4");
    expect(
      sql.prepare("SELECT COUNT(*) AS count,SUM(value) AS total FROM traffic_daily_metrics").get(),
    ).toMatchObject({ count: 2, total: 35 });
    fetchMock.mockImplementation(() =>
      Promise.resolve(new Response("Unauthorized", { status: 401 })),
    );
    await expect(syncTraffic(env, "ga4")).rejects.toThrow();
    expect(sql.prepare("SELECT COUNT(*) AS count FROM traffic_daily_metrics").get()).toMatchObject({
      count: 2,
    });
  });
  it("replays all migrations and returns one public row per product", async () => {
    const { db, sql } = database();
    const rows = await listPublicCatalog(db);
    expect(rows.length).toBe(8);
    expect(new Set(rows.map((r) => r.slug)).size).toBe(rows.length);
    expect(sql.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
  it("encrypts credentials and binds ciphertext to its provider", async () => {
    const { db, sql, actor } = database();
    const env = { DB: db, INTEGRATION_ENCRYPTION_KEY: btoa("a".repeat(32)) } as CommerceEnv;
    await storeCredential(env, "smartship", "private-api-value", actor);
    expect(await credential(env, "smartship")).toBe("private-api-value");
    expect(
      JSON.stringify(sql.prepare("SELECT * FROM integration_credentials").all()),
    ).not.toContain("private-api-value");
    sql.exec("UPDATE integration_credentials SET provider='stripe'");
    await expect(credential(env, "stripe")).rejects.toThrow();
  });
  it("moves FGO onboarding to ready for test without exposing its key", async () => {
    const { db, sql, actor } = database();
    const env = { DB: db, INTEGRATION_ENCRYPTION_KEY: btoa("b".repeat(32)) } as CommerceEnv;
    await storeCredential(env, "fgo", "fgo-private-test-value", actor);
    expect(await credential(env, "fgo")).toBe("fgo-private-test-value");
    expect(
      sql
        .prepare(
          "SELECT status FROM provider_configurations WHERE provider='fgo' AND environment='production'",
        )
        .get(),
    ).toMatchObject({ status: "ready_for_test" });
    expect(
      JSON.stringify(sql.prepare("SELECT * FROM integration_credentials").all()),
    ).not.toContain("fgo-private-test-value");
  });
  it("deduplicates monthly reports and excludes customer identity", async () => {
    const { db, actor } = database();
    const env = { DB: db, APP_ENV: "production", RESEND_API_KEY: "test-token" } as CommerceEnv;
    await saveSetting(
      db,
      "owner_reports",
      {
        enabled: true,
        recipients: ["cutiutamagica@gmail.com"],
        day: 5,
        hour: 9,
        sales: true,
        products: true,
        traffic: false,
      },
      actor,
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: "email-test" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const now = new Date("2026-09-15T10:00:00Z");
    await processOwnerReports(env, now);
    await processOwnerReports(env, now);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toEqual(["cutiutamagica@gmail.com"]);
    expect(body.text).not.toContain("customer_email");
  });
  it("stops reports when the owner account is suspended", async () => {
    const { db, sql, actor } = database();
    await saveSetting(
      db,
      "owner_reports",
      { enabled: true, recipients: ["cutiutamagica@gmail.com"], day: 5, hour: 9 },
      actor,
    );
    sql.exec("UPDATE admin_users SET status='suspended' WHERE email='cutiutamagica@gmail.com'");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await processOwnerReports(
      { DB: db, APP_ENV: "production" } as CommerceEnv,
      new Date("2026-09-15T10:00:00Z"),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("does not send reports before the configured local hour", async () => {
    const { db, actor } = database();
    await saveSetting(
      db,
      "owner_reports",
      { enabled: true, recipients: ["owner@example.com"], day: 5, hour: 9 },
      actor,
    );
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await processOwnerReports(
      { DB: db, APP_ENV: "production" } as CommerceEnv,
      new Date("2026-09-05T05:00:00Z"),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("keeps supplier searches within daily budget and reuses recent successful runs", async () => {
    const { db, sql, actor } = database();
    await saveSetting(
      db,
      "supplier_research",
      { enabled: true, maxDailyRuns: 1, refreshDays: 7 },
      actor,
    );
    const id = String(
      sql.prepare("SELECT id FROM products WHERE product_type='music_box' LIMIT 1").get()!.id,
    );
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          web: {
            results: [
              {
                title: "Wooden hand crank music box",
                url: "https://www.alibaba.com/product-detail/test.html",
                description: "Wooden music box USD 8.50 per item",
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const env = { DB: db, BRAVE_SEARCH_API_KEY: "test" } as CommerceEnv;
    expect((await researchProduct(env, id)).count).toBe(1);
    await expect(researchProduct(env, id)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      sql.prepare("SELECT price_text,price_status FROM supplier_suggestions").get(),
    ).toMatchObject({ price_text: "USD 8.50", price_status: "unverified" });
  });
  it("rejects spoofed supplier URLs and normalizes duplicate tracking links", () => {
    expect(marketplaceForUrl("https://alibaba.com.evil.test/x")).toBeNull();
    expect(marketplaceForUrl("https://user:secret@alibaba.com/x")).toBeNull();
    const rows = rankSupplierResults("music box", [
      {
        title: "Music box",
        description: "USD 12.50",
        url: "https://alibaba.com/product/x?utm_source=a",
      },
      {
        title: "Music box",
        description: "USD 12.50",
        url: "https://alibaba.com/product/x?utm_source=b",
      },
    ]);
    expect(rows).toHaveLength(1);
  });
  it("validates owner settings and year boundaries", () => {
    expect(reportSettingsSchema.safeParse({ enabled: true, recipients: [] }).success).toBe(false);
    expect(
      reportSettingsSchema.safeParse({ recipients: ["TEST@example.com", "test@example.com"] })
        .success,
    ).toBe(false);
    expect(previousMonth(new Date("2026-01-01T12:00:00Z"))).toBe("2025-12");
  });
});
