import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

let db: DatabaseSync;
let before: Array<{ id: string; sku: string; ean_gtin: string | null }>;
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  const dir = resolve("cloudflare/d1/migrations");
  for (const name of readdirSync(dir)
    .filter((n) => n.endsWith(".sql") && n < "0091")
    .sort())
    db.exec(readFileSync(resolve(dir, name), "utf8"));
  db.exec(readFileSync(resolve("cloudflare/d1/seed/0001_music_boxes.sql"), "utf8"));
  before = db
    .prepare("SELECT id,sku,ean_gtin FROM product_variants ORDER BY id")
    .all() as typeof before;
  db.exec(readFileSync(resolve(dir, "0091_product_code_registry.sql"), "utf8"));
});
afterEach(() => db.close());

describe("store-owned code registry migration", () => {
  it("backfills all existing identities once without changing SKUs, GTINs or stock", () => {
    expect(db.prepare("SELECT id,sku,ean_gtin FROM product_variants ORDER BY id").all()).toEqual(
      before,
    );
    const products = db.prepare("SELECT count(*) AS n FROM products").get()!.n;
    const variants = db.prepare("SELECT count(*) AS n FROM product_variants").get()!.n;
    expect(db.prepare("SELECT count(*) AS n FROM product_internal_codes").get()!.n).toBe(products);
    expect(db.prepare("SELECT count(*) AS n FROM variant_merchant_codes").get()!.n).toBe(variants);
    expect(db.prepare("SELECT code FROM product_internal_codes LIMIT 1").get()!.code).toMatch(
      /^CM-P-\d{6,}$/,
    );
    expect(db.prepare("SELECT code FROM variant_merchant_codes LIMIT 1").get()!.code).toMatch(
      /^CM-R-\d{6,}$/,
    );
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  it("keeps codes stable through rename, SKU correction and archival and prohibits reassignment", () => {
    const row = db.prepare("SELECT product_id,code FROM product_internal_codes LIMIT 1").get()!;
    const variant = db
      .prepare("SELECT id FROM product_variants WHERE product_id=? LIMIT 1")
      .get(row.product_id)!.id;
    const reference = db
      .prepare("SELECT code FROM variant_merchant_codes WHERE variant_id=?")
      .get(variant)!.code;
    db.prepare("UPDATE products SET name='Titlu nou',published_at=NULL WHERE id=?").run(
      row.product_id,
    );
    db.prepare("UPDATE product_variants SET sku='CM-QA-NEW' WHERE id=?").run(variant);
    db.prepare("UPDATE products SET status='archived' WHERE id=?").run(row.product_id);
    expect(
      db.prepare("SELECT code FROM product_internal_codes WHERE product_id=?").get(row.product_id)!
        .code,
    ).toBe(row.code);
    expect(
      db.prepare("SELECT code FROM variant_merchant_codes WHERE variant_id=?").get(variant)!.code,
    ).toBe(reference);
    expect(() =>
      db.prepare("DELETE FROM product_internal_codes WHERE product_id=?").run(row.product_id),
    ).toThrow(/IMMUTABLE/);
    expect(() =>
      db
        .prepare("UPDATE variant_merchant_codes SET sequence_number=999 WHERE variant_id=?")
        .run(variant),
    ).toThrow(/IMMUTABLE/);
    expect(() =>
      db.prepare("UPDATE product_variants SET sku='CM-P-999999' WHERE id=?").run(variant),
    ).toThrow(/NAMESPACE/);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  it("allocates codes atomically for new products and multiple variants from any write path", () => {
    db.exec(
      "INSERT INTO products(id,slug,name,category) VALUES('qa-product','qa-product','Produs nou','Cadouri')",
    );
    db.exec(
      "INSERT INTO product_variants(id,product_id,sku,name) VALUES('qa-v1','qa-product','CM-QA-001','Standard'),('qa-v2','qa-product','CM-QA-002','Alternativ')",
    );
    expect(
      db.prepare("SELECT code FROM product_internal_codes WHERE product_id='qa-product'").get()!
        .code,
    ).toMatch(/^CM-P-/);
    const codes = db
      .prepare("SELECT code FROM variant_merchant_codes WHERE variant_id IN ('qa-v1','qa-v2')")
      .all();
    expect(codes).toHaveLength(2);
    expect(codes[0].code).not.toBe(codes[1].code);
    expect(() =>
      db.exec(
        "INSERT INTO product_variants(id,product_id,sku,name) VALUES('qa-bad','qa-product','CM-R-999999','Invalid')",
      ),
    ).toThrow(/NAMESPACE/);
    expect(
      db.prepare("SELECT * FROM variant_merchant_codes WHERE variant_id='qa-bad'").all(),
    ).toEqual([]);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });
});
