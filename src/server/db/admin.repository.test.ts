import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  createAdminOrder,
  createAdminProduct,
  getAdminSettingsData,
  listAdminProducts,
  saveAdminBusinessSettingsData,
} from "./admin.repository";

let sqlite: DatabaseSync;

class Statement {
  private args: Record<string, SQLInputValue> = {};
  constructor(private readonly sql: string) {}
  bind(...args: SQLInputValue[]) {
    this.args = Object.fromEntries(args.map((value, index) => [`?${index + 1}`, value]));
    return this;
  }
  execute() {
    if (/^\s*SELECT/i.test(this.sql)) {
      return {
        success: true,
        results: sqlite.prepare(this.sql).all(this.args),
        meta: { changes: 0 },
      };
    }
    const result = sqlite.prepare(this.sql).run(this.args);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
  async run() {
    return this.execute();
  }
  async all<T>() {
    return { results: sqlite.prepare(this.sql).all(this.args) as T[] };
  }
  async first<T>() {
    return (sqlite.prepare(this.sql).get(this.args) as T | undefined) ?? null;
  }
}

function database() {
  return {
    prepare: (sql: string) => new Statement(sql),
    async batch(statements: Statement[]) {
      sqlite.exec("BEGIN");
      try {
        const results = statements.map((statement) => statement.execute());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as D1Database;
}

beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  for (const file of readdirSync(resolve("cloudflare/d1/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    sqlite.exec(readFileSync(resolve("cloudflare/d1/migrations", file), "utf8"));
  }
  for (const file of [
    "0001_music_boxes.sql",
    "0002_vinted_catalog.sql",
    "0003_vinted_prices.sql",
  ]) {
    sqlite.exec(readFileSync(resolve("cloudflare/d1/seed", file), "utf8"));
  }
  sqlite
    .prepare(
      "INSERT INTO admin_users(id,external_subject,email,status) VALUES('admin-test','admin-test','admin@example.test','active')",
    )
    .run();
});

afterEach(() => sqlite.close());

describe("admin business settings", () => {
  it("updates business details without rewriting hidden legacy settings", async () => {
    sqlite
      .prepare(
        `INSERT INTO site_settings(key,value_json,visibility,validation_status)
       VALUES ('admin.social','{"instagram":"kept"}','private','review_required')`,
      )
      .run();
    const before = await getAdminSettingsData(database());
    const saved = await saveAdminBusinessSettingsData(
      database(),
      { ...before.business, description: "Cutiuțe muzicale" },
      "admin-test",
      "business-settings-test",
    );
    expect(saved.business.description).toBe("Cutiuțe muzicale");
    expect(saved.social.instagram).toBe("kept");
    expect(
      sqlite.prepare("SELECT value_json FROM site_settings WHERE key='admin.social'").get(),
    ).toMatchObject({ value_json: '{"instagram":"kept"}' });
  });
});

describe("admin creation flows", () => {
  it("creates a future product with a variant, price and tracked inventory", async () => {
    const result = await createAdminProduct(database(), {
      name: "Cutiuța Lunii Albastre",
      slug: "cutiuta-lunii-albastre",
      sku: "CM-LUNA-01",
      category: "Cadouri speciale",
      priceBani: 13900,
      actorId: "admin-test",
      requestId: "request-product",
    });

    const products = await listAdminProducts(database(), "https://cutiutamagica.eu");
    const created = products.find((product) => product.id === result.id);
    expect(created).toMatchObject({
      name: "Cutiuța Lunii Albastre",
      status: "inactiv",
      price: 139,
      sku: "CM-LUNA-01",
      stock: 0,
      inventoryTracked: true,
    });
  });

  it("allocates SKU codes atomically and never reuses an archived code", async () => {
    const first = await createAdminProduct(database(), {
      name: "Pisicuță muzicală",
      slug: "pisicuta-noua",
      category: "Cadouri speciale",
      priceBani: 13900,
      actorId: "admin-test",
      requestId: "auto-sku-1",
    });
    expect(first.sku).toMatch(/^CM-PM-\d{3,}$/);
    sqlite.prepare("UPDATE product_variants SET status='archived' WHERE sku=?").run(first.sku);
    const second = await createAdminProduct(database(), {
      name: "Pisicuță muzicală",
      slug: "pisicuta-noua-2",
      category: "Cadouri speciale",
      priceBani: 13900,
      actorId: "admin-test",
      requestId: "auto-sku-2",
    });
    expect(second.sku).not.toBe(first.sku);
    expect(Number(second.sku.split("-").at(-1))).toBe(Number(first.sku.split("-").at(-1)) + 1);
    expect(() =>
      sqlite.prepare("DELETE FROM product_sku_registry WHERE sku=?").run(first.sku),
    ).toThrow();
  });

  it("creates an audited manual marketplace order from the real catalog price", async () => {
    const order = await createAdminOrder(database(), {
      channelCode: "vinted",
      customerName: "Ana Test",
      customerPhone: "0712345678",
      customerEmail: "ana@example.test",
      productId: "product_hp_keeper",
      quantity: 2,
      shippingBani: 1500,
      externalOrderId: "VINTED-TEST-1",
      internalNote: "Comandă asistată",
      actorId: "admin-test",
      requestId: "request-order",
    });

    expect(order.platform).toBe("Vinted");
    expect(order.status).toBe("Nouă");
    expect(order.phone).toBe("+40712345678");
    expect(order.products).toContain("x2");
    expect(order.total).toBeGreaterThan(15);
    const audit = sqlite
      .prepare("SELECT action FROM audit_log WHERE entity_id=?")
      .get(order.id) as { action: string };
    expect(audit.action).toBe("order.manual.create");
  });
});
