import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { handleProductIdentification } from "./product-identification";

vi.mock("@/lib/admin-auth", () => ({
  authenticateAdminRequest: vi.fn(async (request: Request, _env: Env, permission?: string) => {
    if (permission && !request.headers.get("x-test-permissions")?.split(",").includes(permission))
      throw Object.assign(new Error("Permisiune lipsă."), { statusCode: 403 });
    return {
      id: "admin-test",
      email: "admin@example.test",
      permissions: request.headers.get("x-test-permissions")?.split(",") ?? [],
    };
  }),
}));

let sqlite: DatabaseSync;
class Statement {
  private args: Record<string, SQLInputValue> = {};
  constructor(private readonly sql: string) {}
  bind(...args: SQLInputValue[]) {
    this.args = Object.fromEntries(args.map((value, index) => [`?${index + 1}`, value]));
    return this;
  }
  async first<T>() {
    return (sqlite.prepare(this.sql).get(this.args) as T | undefined) ?? null;
  }
  async all<T>() {
    return { results: sqlite.prepare(this.sql).all(this.args) as T[] };
  }
  async run() {
    const result = sqlite.prepare(this.sql).run(this.args);
    return { meta: { changes: Number(result.changes) } };
  }
  execute() {
    const result = sqlite.prepare(this.sql).run(this.args);
    return { meta: { changes: Number(result.changes) } };
  }
}
function env() {
  return {
    PUBLIC_SITE_URL: "https://cutiutamagica.eu",
    DB: {
      prepare: (sql: string) => new Statement(sql),
      async batch(statements: Statement[]) {
        sqlite.exec("BEGIN");
        try {
          const result = statements.map((statement) => statement.execute());
          sqlite.exec("COMMIT");
          return result;
        } catch (error) {
          sqlite.exec("ROLLBACK");
          throw error;
        }
      },
    },
  } as unknown as Env;
}
const url = "https://cutiutamagica.eu/api/v1/admin/product-identification";
function get(query = "", permissions = "catalog.read,inventory.read") {
  return new Request(url + query, { headers: { "x-test-permissions": permissions } });
}
function post(body: unknown, permissions = "catalog.write,inventory.write") {
  return new Request(url, {
    method: "POST",
    headers: {
      origin: "https://cutiutamagica.eu",
      "content-type": "application/json",
      "x-test-permissions": permissions,
    },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  const migrations = resolve("cloudflare/d1/migrations");
  for (const file of readdirSync(migrations)
    .filter((name) => name.endsWith(".sql"))
    .sort())
    sqlite.exec(readFileSync(resolve(migrations, file), "utf8"));
  for (const file of ["0001_music_boxes.sql", "0002_vinted_catalog.sql", "0003_vinted_prices.sql"])
    sqlite.exec(readFileSync(resolve("cloudflare/d1/seed", file), "utf8"));
  sqlite
    .prepare(
      "INSERT INTO admin_users(id,external_subject,email,status) VALUES('admin-test','admin-test','admin@example.test','active')",
    )
    .run();
});
afterEach(() => sqlite.close());

describe("product identification API", () => {
  it("creates inactive variants with unique reserved SKUs and existing inventory infrastructure", async () => {
    const product = sqlite.prepare("SELECT id FROM products LIMIT 1").get() as { id: string };
    const input = {
      action: "variant.create",
      productId: product.id,
      name: "Ediție test",
      priceBani: 19900,
    };
    expect((await handleProductIdentification(post(input, "inventory.write"), env()))!.status).toBe(
      403,
    );
    const response = (await handleProductIdentification(post(input, "catalog.write"), env()))!;
    expect(response.status).toBe(201);
    const created = (await response.json()) as { data: { id: string; sku: string } };
    expect(created.data.sku).toMatch(/^CM-[A-Z0-9]+-\d{3,}$/);
    expect(
      sqlite.prepare("SELECT status FROM product_variants WHERE id=?").get(created.data.id),
    ).toMatchObject({ status: "inactive" });
    expect(
      sqlite
        .prepare("SELECT on_hand_quantity FROM inventory_levels WHERE variant_id=?")
        .get(created.data.id),
    ).toMatchObject({ on_hand_quantity: 0 });
    expect(
      sqlite
        .prepare("SELECT price_bani FROM price_list_items WHERE variant_id=?")
        .get(created.data.id),
    ).toMatchObject({ price_bani: 19900 });
    expect((await handleProductIdentification(post(input, "catalog.write"), env()))!.status).toBe(
      409,
    );
    const second = (await handleProductIdentification(
      post({ ...input, name: "Ediție test 2" }, "catalog.write"),
      env(),
    ))!;
    expect(second.status).toBe(201);
    const secondData = (await second.json()) as { data: { sku: string } };
    expect(secondData.data.sku).not.toBe(created.data.sku);
    expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  it("requires permissions and returns scan-ready catalog without private destinations", async () => {
    expect((await handleProductIdentification(get("", "inventory.read"), env()))!.status).toBe(403);
    expect((await handleProductIdentification(get("", "catalog.read"), env()))!.status).toBe(403);
    const response = (await handleProductIdentification(get(), env()))!;
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      data: { products: Array<{ sku: string; public_url: string | null }> };
    };
    expect(payload.data.products.length).toBeGreaterThan(0);
    expect(payload.data.products.every((product) => Boolean(product.sku))).toBe(true);
    expect(
      payload.data.products.every(
        (product) =>
          !product.public_url || product.public_url.startsWith("https://cutiutamagica.eu/"),
      ),
    ).toBe(true);
  });

  it("previews imports, rejects duplicate or invalid GTIN and applies only new pending codes", async () => {
    const variant = sqlite
      .prepare("SELECT id FROM product_variants WHERE ean_gtin IS NULL LIMIT 1")
      .get() as { id: string };
    const row = {
      variantId: variant.id,
      gtin: "4006381333931",
      source: "supplier",
      sourceReference: "Factura furnizor",
      lotQuantity: 0,
      lotSourceKind: "supplier",
      supplierReference: "",
    };
    const preview = (await (await handleProductIdentification(
      post({ action: "import", mode: "preview", rows: [row] }),
      env(),
    ))!.json()) as { data: { valid: boolean; summary: { gtinAssignments: number } } };
    expect(preview.data).toMatchObject({ valid: true, summary: { gtinAssignments: 1 } });
    const invalid = (await (await handleProductIdentification(
      post({ action: "import", mode: "preview", rows: [{ ...row, gtin: "4006381333932" }] }),
      env(),
    ))!.json()) as { data: { valid: boolean } };
    expect(invalid.data.valid).toBe(false);
    const applied = (await handleProductIdentification(
      post({ action: "import", mode: "apply", rows: [row] }),
      env(),
    ))!;
    expect(applied.status).toBe(200);
    expect(
      sqlite.prepare("SELECT ean_gtin FROM product_variants WHERE id=?").get(variant.id),
    ).toMatchObject({ ean_gtin: row.gtin });
    expect(
      sqlite
        .prepare("SELECT verification_status FROM product_identifier_sources WHERE variant_id=?")
        .get(variant.id),
    ).toMatchObject({ verification_status: "pending" });
    const other = sqlite
      .prepare("SELECT id FROM product_variants WHERE id!=? LIMIT 1")
      .get(variant.id) as { id: string };
    const duplicate = (await (await handleProductIdentification(
      post({ action: "import", mode: "preview", rows: [{ ...row, variantId: other.id }] }),
      env(),
    ))!.json()) as { data: { valid: boolean } };
    expect(duplicate.data.valid).toBe(false);
  });

  it("receives lots in the existing inventory ledger and blocks unauthorised writes", async () => {
    const variant = sqlite.prepare("SELECT id FROM product_variants LIMIT 1").get() as {
      id: string;
    };
    const input = {
      action: "lot.create",
      variantId: variant.id,
      locationId: "location_main",
      sourceKind: "supplier",
      receivedAt: "2026-10-13",
      quantity: 3,
    };
    expect((await handleProductIdentification(post(input, "catalog.write"), env()))!.status).toBe(
      403,
    );
    const response = (await handleProductIdentification(post(input), env()))!;
    expect(response.status).toBe(201);
    const stock = sqlite
      .prepare(
        "SELECT on_hand_quantity FROM inventory_levels WHERE variant_id=? AND location_id='location_main'",
      )
      .get(variant.id) as { on_hand_quantity: number };
    expect(stock.on_hand_quantity).toBeGreaterThanOrEqual(3);
    const lot = sqlite
      .prepare("SELECT lot_code,initial_quantity FROM product_lots WHERE variant_id=?")
      .get(variant.id) as { lot_code: string; initial_quantity: number };
    expect(lot.lot_code).toMatch(/^LOT-\d{6}-001$/);
    expect(lot.initial_quantity).toBe(3);
    expect(
      sqlite
        .prepare(
          "SELECT COUNT(*) AS n FROM inventory_movements WHERE reference_type='lot' AND reference_id=(SELECT id FROM product_lots WHERE lot_code=?)",
        )
        .get(lot.lot_code),
    ).toMatchObject({ n: 1 });
    const channel = sqlite.prepare("SELECT id FROM sales_channels LIMIT 1").get() as { id: string };
    const product = sqlite
      .prepare("SELECT product_id,sku,name FROM product_variants WHERE id=?")
      .get(variant.id) as {
      product_id: string;
      sku: string;
      name: string;
    };
    sqlite
      .prepare(
        `INSERT INTO orders(id,order_number,public_token,idempotency_key,channel_id,order_status,fulfillment_status,subtotal_bani,total_bani,customer_name,customer_phone_e164)
      VALUES('order-test','CM-TEST-1','token-test','idempotency-test',?1,'confirmed','packed',10000,10000,'Client Test','+40712345678')`,
      )
      .run(channel.id);
    sqlite
      .prepare(
        `INSERT INTO order_items(id,order_id,product_id,variant_id,sku,product_name,quantity,unit_price_bani,tax_rate_bps,line_subtotal_bani,line_total_bani)
      VALUES('item-test','order-test',?1,?2,?3,?4,2,5000,0,10000,10000)`,
      )
      .run(product.product_id, variant.id, product.sku, product.name);
    const lotId = sqlite
      .prepare("SELECT id FROM product_lots WHERE lot_code=?")
      .get(lot.lot_code) as { id: string };
    const allocation = {
      action: "lot.allocate",
      lotId: lotId.id,
      orderItemId: "item-test",
      quantity: 2,
    };
    expect((await handleProductIdentification(post(allocation), env()))!.status).toBe(403);
    const allocated = (await handleProductIdentification(
      post(allocation, "inventory.write,orders.read"),
      env(),
    ))!;
    expect(allocated.status).toBe(201);
    const allocationId = (await allocated.json()) as { data: { id: string } };
    expect(
      (await handleProductIdentification(post(allocation, "inventory.write,orders.read"), env()))!
        .status,
    ).toBe(409);
    expect(
      (await handleProductIdentification(
        post(
          { action: "lot.release", allocationId: allocationId.data.id },
          "inventory.write,orders.read",
        ),
        env(),
      ))!.status,
    ).toBe(200);
    expect(
      sqlite
        .prepare("SELECT status FROM product_lot_allocations WHERE id=?")
        .get(allocationId.data.id),
    ).toMatchObject({ status: "released" });
    expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  it("links a private personalization request to one internal code and reuses its production status", async () => {
    sqlite
      .prepare(
        `INSERT INTO personalization_requests(
      id,customer_name,email,phone,box_color,melody,lid_image_r2_key,lid_image_mime,
      lid_image_original_name,total_bani,consent_processing)
      VALUES('request-test','Ana Test','ana@example.test','0712345678','black','melody-1',
      'private/request-test.webp','image/webp','fotografie.webp',18900,1)`,
      )
      .run();
    const body = { action: "personalization.assign", requestId: "request-test" };
    expect((await handleProductIdentification(post(body, "catalog.write"), env()))!.status).toBe(
      403,
    );
    const assigned = (await handleProductIdentification(post(body, "orders.write"), env()))!;
    expect(assigned.status).toBe(201);
    const first = (await assigned.json()) as { data: { code: string } };
    expect(first.data.code).toMatch(/^PER-\d{6}-0001$/);
    const repeated = (await (await handleProductIdentification(
      post(body, "orders.write"),
      env(),
    ))!.json()) as { data: { code: string } };
    expect(repeated.data.code).toBe(first.data.code);
    const advanced = (await handleProductIdentification(
      post(
        { action: "personalization.status", requestId: "request-test", status: "approved" },
        "orders.write",
      ),
      env(),
    ))!;
    expect(advanced.status).toBe(200);
    expect(
      sqlite.prepare("SELECT status FROM personalization_requests WHERE id='request-test'").get(),
    ).toMatchObject({ status: "approved" });
    const premature = (await handleProductIdentification(
      post(
        { action: "personalization.status", requestId: "request-test", status: "in_production" },
        "orders.write",
      ),
      env(),
    ))!;
    expect(premature.status).toBe(409);
    sqlite
      .prepare(
        "UPDATE personalization_requests SET procurement_status='received' WHERE id='request-test'",
      )
      .run();
    expect(
      (await handleProductIdentification(
        post(
          { action: "personalization.status", requestId: "request-test", status: "in_production" },
          "orders.write",
        ),
        env(),
      ))!.status,
    ).toBe(200);
    expect(
      (await handleProductIdentification(
        post(
          { action: "personalization.status", requestId: "request-test", status: "shipped" },
          "orders.write",
        ),
        env(),
      ))!.status,
    ).toBe(200);
    expect(
      sqlite.prepare("SELECT status FROM personalization_requests WHERE id='request-test'").get(),
    ).toMatchObject({ status: "shipped" });
    expect(
      sqlite
        .prepare(
          "SELECT COUNT(*) AS n FROM personalization_identifiers WHERE request_id='request-test'",
        )
        .get(),
    ).toMatchObject({ n: 1 });
    const restricted = (await (await handleProductIdentification(
      get("?export=1"),
      env(),
    ))!.json()) as { data: { personalizations: unknown[] } };
    expect(restricted.data.personalizations).toEqual([]);
    const authorized = (await (await handleProductIdentification(
      get("?export=1", "catalog.read,inventory.read,orders.read"),
      env(),
    ))!.json()) as { data: { personalizations: Array<{ code: string }> } };
    expect(authorized.data.personalizations).toContainEqual(
      expect.objectContaining({ code: first.data.code }),
    );
  });
});
