import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { normalizeTrendyolPackage, bani, trendyolRequest } from "./integrations/trendyol";
import { importTrendyolOrder } from "./services/trendyol-orders";
import {
  trendyolPrintPreview,
  trendyolLabel,
  safeTrendyolLabelUrl,
} from "./services/trendyol-documents";
import {
  isTrendyolPoll,
  syncTrendyolFinancials,
  verifyTrendyolConnection,
  processTrendyolPoll,
} from "./services/trendyol-sync";
import { reconcileTrendyolStock } from "./services/trendyol-stock";
import { handleTrendyol } from "./api/trendyol";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { AdminAuthError } from "@/lib/admin-password-auth-service";
import { issueSmartShipAwb } from "./services/smartship-fulfillment";
import { updateOrderStatus } from "./db/admin.repository";
vi.mock("@/lib/admin-auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/admin-auth")>()),
  authenticateAdminRequest: vi.fn(),
}));
vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("./services/growth-settings", () => ({
  credential: vi.fn(async () =>
    JSON.stringify({
      sellerId: "123",
      apiKey: "synthetic-key",
      apiSecret: "synthetic-secret",
      storeFrontCode: "RO",
    }),
  ),
}));
let sql: DatabaseSync, db: D1Database;
const raw = () => ({
  supplierId: 123,
  orderNumber: "90001",
  shipmentPackageId: 10001,
  currencyCode: "RON",
  orderCountryCode: "RO",
  status: "Picking",
  orderDate: 1794300000000,
  lastModifiedDate: 1794301000000,
  packageGrossAmount: 95,
  packageSellerDiscount: 28.5,
  packageTyDiscount: 0,
  packageTotalPrice: 66.5,
  customerFirstName: "Client",
  customerLastName: "Test",
  customerEmail: "synthetic@example.test",
  shipmentAddress: {
    fullName: "Client Test",
    phone: "0700000000",
    address1: "Adresă test",
    city: "Iași",
    countryCode: "RO",
  },
  invoiceAddress: {
    fullName: "Client Test",
    address1: "Adresă test",
    city: "Iași",
    countryCode: "RO",
  },
  cargoTrackingNumber: "555555",
  shipmentNumber: "123456",
  cargoProviderName: "FANEX",
  invoiceStatus: "NotInvoiced",
  discountDisplays: [{ displayName: "Campanie de test", discountAmount: 28.5 }],
  lines: [
    {
      id: 20001,
      stockCode: "CM-KITTEN",
      barcode: "00000000",
      productName: "Produs test",
      quantity: 1,
      lineGrossAmount: 95,
      lineSellerDiscount: 28.5,
      lineTyDiscount: 0,
      lineUnitPrice: 66.5,
      vatRate: 0,
      commission: 10.5,
    },
  ],
});
beforeEach(() => {
  vi.mocked(authenticateAdminRequest).mockReset();
  sql = new DatabaseSync(":memory:");
  for (const name of readdirSync("cloudflare/d1/migrations")
    .filter((n) => n.endsWith(".sql"))
    .sort())
    sql.exec(readFileSync(`cloudflare/d1/migrations/${name}`, "utf8"));
  sql.exec(readFileSync("cloudflare/d1/seed/0001_music_boxes.sql", "utf8"));
  sql.exec(readFileSync("cloudflare/d1/seed/0002_vinted_catalog.sql", "utf8"));
  sql.exec(
    "UPDATE product_variants SET inventory_policy='deny' WHERE sku='CM-KITTEN'; UPDATE inventory_levels SET on_hand_quantity=20,reserved_quantity=0 WHERE variant_id='variant_kitten_standard'",
  );
  const prepare = (query: string) => {
    let values: Record<string, SQLInputValue> = {};
    return {
      bind(...v: SQLInputValue[]) {
        values = Object.fromEntries(v.map((x, i) => [`?${i + 1}`, x]));
        return this;
      },
      async first() {
        return sql.prepare(query).get(values) ?? null;
      },
      async all() {
        return { results: sql.prepare(query).all(values), success: true };
      },
      async run() {
        const r = sql.prepare(query).run(values);
        return { success: true, meta: { changes: Number(r.changes) } };
      },
    };
  };
  db = {
    prepare,
    async batch(stmts: Array<ReturnType<typeof prepare>>) {
      sql.exec("BEGIN");
      try {
        const r = [];
        for (const s of stmts) r.push(await s.run());
        sql.exec("COMMIT");
        return r;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  } as unknown as D1Database;
});
afterEach(() => {
  sql.close();
  vi.unstubAllGlobals();
});
const stock = () =>
  sql
    .prepare(
      "SELECT on_hand_quantity AS physical,reserved_quantity AS reserved FROM inventory_levels WHERE variant_id='variant_kitten_standard'",
    )
    .get();
describe("Trendyol official V2 order and shared inventory", () => {
  it("refuses own-courier AWBs and manual status overrides for platform-managed orders", async () => {
    const r = await importTrendyolOrder(db, [normalizeTrendyolPackage(raw(), "123")]);
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    await expect(issueSmartShipAwb({ DB: db } as Env, r.orderId, "test-admin")).rejects.toThrow(
      "SmartShip",
    );
    await expect(
      updateOrderStatus(db, {
        orderId: r.orderId,
        status: "Expediată",
        expectedVersion: 2,
        actorId: "test-admin",
        requestId: "test-request",
      }),
    ).rejects.toThrow("Statusul Trendyol");
    expect(f).not.toHaveBeenCalled();
    expect(stock()).toEqual({ physical: 20, reserved: 1 });
  });
  it("keeps invoice-item references intact during status-only updates and blocks financial edits", async () => {
    const p = normalizeTrendyolPackage(raw(), "123"),
      r = await importTrendyolOrder(db, [p]);
    const item = sql.prepare("SELECT id FROM order_items WHERE order_id=?").get(r.orderId)!;
    sql
      .prepare(
        "INSERT INTO invoices(id,order_id,status,total_bani) VALUES('invoice-test',?,'issued',6650)",
      )
      .run(r.orderId);
    sql
      .prepare(
        "INSERT INTO invoice_lines(id,invoice_id,order_item_id,name,quantity,unit_price_bani,subtotal_bani,tax_bani,total_bani) VALUES('invoice-line-test','invoice-test',?,'Produs test',1,6650,6650,0,6650)",
      )
      .run(item.id);
    await importTrendyolOrder(db, [
      { ...p, status: "Shipped", lastModified: p.lastModified + 1000 },
    ]);
    expect(
      sql.prepare("SELECT order_item_id FROM invoice_lines WHERE id='invoice-line-test'").get()
        ?.order_item_id,
    ).toBe(item.id);
    await expect(
      importTrendyolOrder(db, [
        { ...p, lastModified: p.lastModified + 2000, lines: [{ ...p.lines[0], quantity: 2 }] },
      ]),
    ).rejects.toThrow("FINANCIAL_RECONCILIATION_REQUIRED");
  });
  it("preserves campaign price, reserves once and imports idempotently", async () => {
    const p = normalizeTrendyolPackage(raw(), "123");
    const first = await importTrendyolOrder(db, [p]);
    expect(first.reviewCode).toBeNull();
    expect(stock()).toEqual({ physical: 20, reserved: 1 });
    expect(
      sql
        .prepare("SELECT subtotal_bani,discount_bani,total_bani,paid_bani FROM orders WHERE id=?")
        .get(first.orderId),
    ).toEqual({ subtotal_bani: 9500, discount_bani: 2850, total_bani: 6650, paid_bani: 0 });
    expect((await importTrendyolOrder(db, [p])).replayed).toBe(true);
    expect(stock()).toEqual({ physical: 20, reserved: 1 });
    expect(sql.prepare("SELECT count(*) AS n FROM orders").get()?.n).toBe(1);
    expect(sql.prepare("SELECT count(*) AS n FROM invoices").get()?.n).toBe(0);
    expect(sql.prepare("SELECT count(*) AS n FROM shipments").get()?.n).toBe(0);
  });
  it("consumes on confirmed shipping once, and ignores older responses", async () => {
    const p = normalizeTrendyolPackage(raw(), "123");
    await importTrendyolOrder(db, [p]);
    const shipped = { ...p, status: "Shipped", lastModified: p.lastModified + 1000 };
    await importTrendyolOrder(db, [shipped]);
    await importTrendyolOrder(db, [shipped]);
    await importTrendyolOrder(db, [p]);
    expect(stock()).toEqual({ physical: 19, reserved: 0 });
    expect(
      sql.prepare("SELECT count(*) AS n FROM inventory_movements WHERE movement_type='sale'").get()
        ?.n,
    ).toBe(1);
  });
  it("releases a cancelled reservation without creating a refund", async () => {
    const p = normalizeTrendyolPackage(raw(), "123");
    await importTrendyolOrder(db, [p]);
    await importTrendyolOrder(db, [
      { ...p, status: "Cancelled", lastModified: p.lastModified + 1000 },
    ]);
    expect(stock()).toEqual({ physical: 20, reserved: 0 });
    expect(sql.prepare("SELECT refunded_bani FROM orders").get()?.refunded_bani).toBe(0);
  });
  it("records missing baseline for review and reconciles after an explicit count", async () => {
    sql.exec(
      "UPDATE product_variants SET inventory_policy='untracked' WHERE sku='CM-KITTEN';UPDATE inventory_levels SET on_hand_quantity=0 WHERE variant_id='variant_kitten_standard'",
    );
    const p = normalizeTrendyolPackage(raw(), "123");
    expect((await importTrendyolOrder(db, [p])).reviewCode).toBe("STOCK_BASELINE_REQUIRED");
    expect(stock()).toEqual({ physical: 0, reserved: 0 });
    sql.exec(
      "UPDATE product_variants SET inventory_policy='deny' WHERE sku='CM-KITTEN';UPDATE inventory_levels SET on_hand_quantity=20 WHERE variant_id='variant_kitten_standard'",
    );
    expect((await importTrendyolOrder(db, [p])).reviewCode).toBeNull();
    expect(stock()).toEqual({ physical: 20, reserved: 1 });
  });
  it("rolls back the entire import on insufficient physical stock", async () => {
    sql.exec(
      "UPDATE inventory_levels SET on_hand_quantity=0 WHERE variant_id='variant_kitten_standard'",
    );
    await expect(
      importTrendyolOrder(db, [normalizeTrendyolPackage(raw(), "123")]),
    ).rejects.toThrow();
    expect(sql.prepare("SELECT count(*) AS n FROM orders").get()?.n).toBe(0);
  });
  it("rejects unknown SKUs, revision conflicts and missing split packages", async () => {
    const p = normalizeTrendyolPackage(raw(), "123");
    await importTrendyolOrder(db, [p]);
    await expect(importTrendyolOrder(db, [{ ...p, net: 6600 }])).rejects.toThrow(
      "SOURCE_REVISION_CONFLICT",
    );
    await expect(
      importTrendyolOrder(db, [
        { ...p, lastModified: p.lastModified + 1000, lines: [{ ...p.lines[0], sku: "unknown" }] },
      ]),
    ).rejects.toThrow("SKU_MAPPING_REQUIRED");
    await expect(
      importTrendyolOrder(db, [{ ...p, id: "other", lastModified: p.lastModified + 1000 }]),
    ).rejects.toThrow("INCOMPLETE_OR_OLDER_PACKAGE_SET");
    expect(stock()).toEqual({ physical: 20, reserved: 1 });
  });
  it("prints private, escaped invoice preview without issuing fiscal documents", async () => {
    const p = normalizeTrendyolPackage(raw(), "123");
    p.customerName = "<script>alert(1)</script>";
    const r = await importTrendyolOrder(db, [p]);
    const response = await trendyolPrintPreview({ DB: db } as Env, r.orderId, "invoice");
    expect(response.headers.get("cache-control")).toContain("no-store");
    const html = await response.text();
    expect(html).toContain("66,50");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("neînregistrată fiscal");
    expect(sql.prepare("SELECT count(*) AS n FROM invoices").get()?.n).toBe(0);
  });
  it("rejects an unsafe provider label URL without fetching the destination", async () => {
    const r = await importTrendyolOrder(db, [normalizeTrendyolPackage(raw(), "123")]);
    const f = vi.fn(async () =>
      Response.json({ data: [{ format: "PDF", label: "https://attacker.invalid/label.pdf" }] }),
    );
    vi.stubGlobal("fetch", f);
    await expect(trendyolLabel({ DB: db } as Env, r.orderId, "10001")).rejects.toThrow(
      "UNSAFE_LABEL_URL",
    );
    expect(f).toHaveBeenCalledTimes(1);
  });
});
describe("Trendyol source validation", () => {
  it("uses edge-compatible manual redirects and refuses to forward API authentication", async () => {
    const f = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(null, { status: 302, headers: { location: "https://attacker.invalid" } }),
    );
    vi.stubGlobal("fetch", f);
    await expect(
      trendyolRequest(
        { sellerId: "123", apiKey: "test-key", apiSecret: "test-secret", storeFrontCode: "RO" },
        "/integration/test",
      ),
    ).rejects.toMatchObject({ code: "TRENDYOL_HTTP_302" });
    expect(f).toHaveBeenCalledTimes(1);
    expect(f.mock.calls[0][1]?.redirect).toBe("manual");
  });
  it("accepts a RO supplierId zero only when every line attests the authenticated seller", () => {
    const p = raw();
    p.supplierId = 0;
    expect(() => normalizeTrendyolPackage(p, "123")).toThrow("LINE_SELLER_MISMATCH");
    const body = { ...p, lines: p.lines.map((l) => ({ ...l, sellerId: 123 })) };
    expect(normalizeTrendyolPackage(body, "123").sellerId).toBe("123");
    expect(() =>
      normalizeTrendyolPackage(
        { ...body, lines: body.lines.map((l) => ({ ...l, sellerId: 999 })) },
        "123",
      ),
    ).toThrow("LINE_SELLER_MISMATCH");
  });

  it.each([NaN, Infinity, -1, "1e3", "", null])("rejects invalid monetary value %s", (v) =>
    expect(() => bani(v)).toThrow(),
  );
  it("requires exact seller, country, currency and V2 financial totals", () => {
    for (const change of [
      { supplierId: 999 },
      { currencyCode: "EUR" },
      { orderCountryCode: "TR" },
      { packageTotalPrice: 119 },
      { status: "Unexpected" },
    ])
      expect(() => normalizeTrendyolPackage({ ...raw(), ...change }, "123")).toThrow();
  });
  it("reconciles platform item discounts even when B2C package discount is zero", () => {
    const p = raw();
    p.packageTotalPrice = 60;
    p.lines[0].lineTyDiscount = 6.5;
    p.lines[0].lineUnitPrice = 60;
    expect(normalizeTrendyolPackage(p, "123").platformDiscount).toBe(650);
  });
  it("fails closed before an API request to any non-allowlisted path", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    await expect(
      trendyolRequest(
        { sellerId: "123", apiKey: "test-key", apiSecret: "test-secret", storeFrontCode: "RO" },
        "https://attacker.invalid",
      ),
    ).rejects.toThrow();
    expect(f).not.toHaveBeenCalled();
  });
  it("accepts only closed, non-secret queue payloads", () => {
    expect(isTrendyolPoll({ version: 5, type: "trendyol.poll" })).toBe(true);
    expect(isTrendyolPoll({ version: 5, type: "trendyol.poll", apiKey: "secret" })).toBe(false);
    expect(isTrendyolPoll({ version: 5, type: "admin" })).toBe(false);
    expect(isTrendyolPoll({ version: 5, type: "trendyol.stock", sku: "CM-SUNSHINE" })).toBe(true);
    expect(isTrendyolPoll({ version: 5, type: "trendyol.poll", sku: "CM-SUNSHINE" })).toBe(false);
  });
  it("supports platform-collected COD without treating it as a shop payment", async () => {
    const p = normalizeTrendyolPackage({ ...raw(), isCod: true }, "123");
    expect(p.isCod).toBe(true);
    await importTrendyolOrder(db, [p]);
    expect(sql.prepare("SELECT paid_bani FROM orders").get()?.paid_bani).toBe(0);
  });
  it.each([
    "http://cdn.dsmcdn.com/a.pdf",
    "https://cdn.dsmcdn.com.attacker.invalid/a.pdf",
    "https://user@cdn.dsmcdn.com/a.pdf",
    "https://s3.trendyol.com/private/a.pdf",
    "https://apigw.trendyol.com/integration/admin",
  ])("blocks unsafe document origin/path %s", (url) =>
    expect(() => safeTrendyolLabelUrl(url)).toThrow(),
  );
});

function connectedEnv() {
  sql.exec(
    "INSERT INTO trendyol_sync_state(id,seller_id,verified_at,enabled) VALUES(1,'123','2026-11-10T00:00:00Z',1)",
  );
  return { DB: db, COMMERCE_EVENTS: { send: vi.fn(), sendBatch: vi.fn() } } as unknown as Env;
}
function stockFetch(quantity: number, post?: () => Response | Promise<Response>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/orders/stream"))
      return Response.json({ content: [{ orderNumber: "90001" }], hasMore: false });
    if (url.pathname.endsWith("/v2/orders"))
      return Response.json({ content: [raw()], totalPages: 1 });
    if (url.pathname.endsWith("/approved/inventory-and-price"))
      return Response.json({
        content: [
          {
            variants: [
              {
                stockCode: "CM-KITTEN",
                barcode: "00000000",
                quantity,
                salePrice: 119,
                listPrice: 119,
              },
            ],
          },
        ],
        totalPages: 1,
      });
    if (init?.method === "POST" && post) return post();
    throw new Error("Unexpected test endpoint");
  });
}
describe("Trendyol stock and financial reconciliation", () => {
  it("dispatches every tracked observed SKU, including products without a marketplace order", async () => {
    const env = connectedEnv();
    sql.exec(
      "UPDATE product_variants SET inventory_policy='deny' WHERE sku='CM-SUNSHINE';UPDATE inventory_levels SET on_hand_quantity=20 WHERE variant_id='variant_sunshine_standard';INSERT INTO marketplace_inventory_snapshots(provider,sku,barcode,quantity,sale_price_bani,list_price_bani,observed_at) VALUES('trendyol','CM-SUNSHINE','sunshine-test',20,11900,11900,'2026-01-01T00:00:00Z')",
    );
    await processTrendyolPoll(env, { version: 5, type: "trendyol.stock" });
    expect(env.COMMERCE_EVENTS.sendBatch).toHaveBeenCalledWith([
      {
        body: { version: 5, type: "trendyol.stock", sku: "CM-SUNSHINE" },
        contentType: "json",
        delaySeconds: 10,
      },
    ]);
    const f = vi.fn(async (input: RequestInfo | URL) =>
      new URL(String(input)).pathname.endsWith("/orders/stream")
        ? Response.json({ content: [], hasMore: false })
        : Response.json({
            content: [
              {
                variants: [
                  {
                    stockCode: "CM-SUNSHINE",
                    barcode: "sunshine-test",
                    quantity: 20,
                    salePrice: 119,
                    listPrice: 119,
                  },
                ],
              },
            ],
            totalPages: 1,
          }),
    );
    vi.stubGlobal("fetch", f);
    await processTrendyolPoll(env, { version: 5, type: "trendyol.stock", sku: "CM-SUNSHINE" });
    expect(f).toHaveBeenCalledTimes(2);
    expect(
      sql
        .prepare("SELECT observed_at FROM marketplace_inventory_snapshots WHERE sku='CM-SUNSHINE'")
        .get()?.observed_at,
    ).not.toBe("2026-01-01T00:00:00Z");
  });
  it("marks the existing channel and integration verified only after a real adapter read succeeds", async () => {
    const f = vi.fn(async () => Response.json({ content: [], hasMore: false }));
    vi.stubGlobal("fetch", f);
    await verifyTrendyolConnection({ DB: db } as Env);
    expect(
      sql.prepare("SELECT status FROM sales_channels WHERE code='trendyol'").get()?.status,
    ).toBe("active");
    expect(
      sql
        .prepare(
          "SELECT external_account_id,status FROM integration_accounts WHERE id='integration_trendyol_production'",
        )
        .get(),
    ).toEqual({ external_account_id: "123", status: "connected" });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it("confirms matching 19 available without publishing prices or stock", async () => {
    const env = connectedEnv();
    await importTrendyolOrder(db, [normalizeTrendyolPackage(raw(), "123")]);
    const f = stockFetch(19);
    vi.stubGlobal("fetch", f);
    expect(await reconcileTrendyolStock(env, "CM-KITTEN")).toMatchObject({
      status: "confirmed",
      quantity: 19,
      changed: false,
    });
    expect(f.mock.calls.every((c) => c[1]?.method !== "POST")).toBe(true);
    sql.exec(
      "INSERT INTO stock_locations(id,code,name,location_type) VALUES('virtual-test','VIRTUAL_TEST','Virtual test','virtual');INSERT INTO inventory_levels(id,variant_id,location_id,on_hand_quantity) VALUES('virtual-level','variant_kitten_standard','virtual-test',100)",
    );
    vi.mocked(authenticateAdminRequest).mockResolvedValue({
      id: "staff-test",
      email: "staff@example.test",
      permissions: ["orders.read"],
      mustChangePassword: false,
    } as Awaited<ReturnType<typeof authenticateAdminRequest>>);
    const response = await handleTrendyol(new Request("https://test.local" + endpoint), env);
    const payload = (await response!.json()) as {
      data: { inventory: { central_available: number }[] };
    };
    expect(payload.data.inventory[0].central_available).toBe(19);
  });
  it("publishes a decrease as quantity only, then confirms without a duplicate request", async () => {
    const env = connectedEnv();
    await importTrendyolOrder(db, [normalizeTrendyolPackage(raw(), "123")]);
    sql.exec(
      "UPDATE inventory_levels SET on_hand_quantity=19 WHERE variant_id='variant_kitten_standard'",
    );
    const f = stockFetch(19, () => Response.json({ batchRequestId: "test-batch" }));
    vi.stubGlobal("fetch", f);
    expect(await reconcileTrendyolStock(env, "CM-KITTEN")).toMatchObject({
      status: "accepted",
      quantity: 18,
    });
    const post = f.mock.calls.find((c) => c[1]?.method === "POST")!;
    expect(JSON.parse(post[1]!.body as string)).toEqual({
      items: [{ barcode: "00000000", quantity: 18 }],
    });
    const next = stockFetch(18);
    vi.stubGlobal("fetch", next);
    await reconcileTrendyolStock(env, "CM-KITTEN");
    expect(next.mock.calls.every((c) => c[1]?.method !== "POST")).toBe(true);
    expect(sql.prepare("SELECT status FROM trendyol_stock_updates").get()?.status).toBe(
      "confirmed",
    );
  });
  it("blocks automatic increases and untracked stock rather than publishing an assumed quantity", async () => {
    const env = connectedEnv();
    await importTrendyolOrder(db, [normalizeTrendyolPackage(raw(), "123")]);
    vi.stubGlobal("fetch", stockFetch(17));
    await expect(reconcileTrendyolStock(env, "CM-KITTEN")).rejects.toThrow(
      "STOCK_INCREASE_REQUIRES_APPROVAL",
    );
    sql.exec("UPDATE product_variants SET inventory_policy='untracked' WHERE sku='CM-KITTEN'");
    await expect(reconcileTrendyolStock(env, "CM-KITTEN")).rejects.toThrow(
      "STOCK_BASELINE_REQUIRED",
    );
  });
  it("does not resubmit a timed-out stock update", async () => {
    const env = connectedEnv();
    await importTrendyolOrder(db, [normalizeTrendyolPackage(raw(), "123")]);
    sql.exec(
      "UPDATE inventory_levels SET on_hand_quantity=19 WHERE variant_id='variant_kitten_standard'",
    );
    const f = stockFetch(19, () => {
      throw new Error("Connection lost");
    });
    vi.stubGlobal("fetch", f);
    await expect(reconcileTrendyolStock(env, "CM-KITTEN")).rejects.toThrow(
      "STOCK_UPDATE_AWAITING_CONFIRMATION",
    );
    await expect(reconcileTrendyolStock(env, "CM-KITTEN")).rejects.toThrow(
      "STOCK_UPDATE_AWAITING_CONFIRMATION",
    );
    expect(f.mock.calls.filter((c) => c[1]?.method === "POST")).toHaveLength(1);
  });
  it("imports all six financial record types idempotently without marking the order paid", async () => {
    const env = connectedEnv();
    await importTrendyolOrder(db, [normalizeTrendyolPackage(raw(), "123")]);
    const f = vi.fn(async (input: RequestInfo | URL) => {
      const u = new URL(String(input));
      expect(u.searchParams.get("size")).toBe("500");
      return Response.json({
        totalPages: 1,
        content: [
          {
            id: "fin-test",
            sellerId: 123,
            currencyCode: "RON",
            transactionDate: 1794305000000,
            orderNumber: "90001",
            credit: 66.5,
            debt: 0,
            commissionAmount: 6.9825,
            sellerRevenue: 59.5175,
            bankAccount: "do-not-copy",
          },
        ],
      });
    });
    vi.stubGlobal("fetch", f);
    for (let cycle = 0; cycle < 2; cycle++)
      for (let page = 0; page < 6; page++)
        expect((await syncTrendyolFinancials(env)).hasMore).toBe(page < 5);
    expect(sql.prepare("SELECT count(*) AS n FROM marketplace_financial_entries").get()?.n).toBe(6);
    const row = sql.prepare("SELECT source_json FROM marketplace_financial_entries LIMIT 1").get()!;
    expect(String(row.source_json)).toContain("6.9825");
    expect(String(row.source_json)).not.toContain("bankAccount");
    expect(sql.prepare("SELECT paid_bani FROM orders").get()?.paid_bani).toBe(0);
  });
});
describe("Trendyol administrative API permissions", () => {
  it("starts the first approved poll immediately when automation is enabled", async () => {
    const env = connectedEnv();
    sql.exec(
      "INSERT INTO admin_users(id,external_subject,email) VALUES('queue-admin','queue-admin','queue-admin@example.test')",
    );
    vi.mocked(authenticateAdminRequest).mockResolvedValue({
      id: "queue-admin",
      email: "queue-admin@example.test",
      permissions: ["orders.read", "integrations.write"],
      mustChangePassword: false,
    } as Awaited<ReturnType<typeof authenticateAdminRequest>>);
    const r = await handleTrendyol(
      new Request("https://test.local" + endpoint, {
        method: "POST",
        headers: { origin: "https://test.local", "content-type": "application/json" },
        body: JSON.stringify({ action: "automation", enabled: true }),
      }),
      env,
    );
    expect(r?.status).toBe(200);
    expect(await r!.json()).toMatchObject({ data: { saved: true, initialPollQueued: true } });
    expect(env.COMMERCE_EVENTS.send).toHaveBeenCalledWith({ version: 5, type: "trendyol.poll" });
  });
  it("denies an unauthenticated document and state request", async () => {
    vi.mocked(authenticateAdminRequest).mockRejectedValue(
      new AdminAuthError("Acces interzis", 401),
    );
    for (const path of [endpoint, endpoint + "/orders/test/packing"])
      expect(
        (await handleTrendyol(new Request("https://test.local" + path), { DB: db } as Env))?.status,
      ).toBe(401);
  });
  it("does not grant inventory writes or finance access to read-only staff", async () => {
    vi.mocked(authenticateAdminRequest).mockResolvedValue({
      id: "staff-test",
      email: "staff@example.test",
      permissions: ["orders.read"],
      mustChangePassword: false,
    } as Awaited<ReturnType<typeof authenticateAdminRequest>>);
    for (const action of ["sync-orders", "sync-finance"]) {
      const r = await handleTrendyol(
        new Request("https://test.local" + endpoint, {
          method: "POST",
          headers: { origin: "https://test.local", "content-type": "application/json" },
          body: JSON.stringify({ action }),
        }),
        { DB: db } as Env,
      );
      expect(r?.status).toBe(403);
    }
    const response = await handleTrendyol(new Request("https://test.local" + endpoint), {
      DB: db,
    } as Env);
    const payload = (await response!.json()) as {
      data: { finance: unknown[]; canSync: boolean; canFinance: boolean };
    };
    expect(payload.data.finance).toEqual([]);
    expect(payload.data.canFinance).toBe(false);
    expect(payload.data.canSync).toBe(false);
  });
});
const endpoint = "/api/v1/admin/trendyol";
