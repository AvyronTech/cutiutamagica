import { handleStorefrontDesign } from "./api/storefront-design";
import { handleSalesWorkbench, googleCatalogFeed } from "./api/sales-workbench";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { listPublicCatalog } from "./db/catalog.repository";
import { catalogProducts } from "@/lib/catalog-products";
import { collectionProducts } from "@/lib/collections";
import { isAvailable } from "@/data/products";
import { createWebsiteOrder } from "./db/order.repository";
import type { WebsiteOrderInput } from "@/lib/order-contracts";
import { handleAdminInventory } from "./api/admin-inventory";
import { handleProductInterest } from "./api/product-interest";
import { handleAdminMediaApi } from "./api/admin-media";
import { handleAdminProductApi } from "./api/admin-product";
import { getPublicProductExperience } from "./api/product-experience";
import { encodeAudioClip } from "@/lib/audio-clip";
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
function productId(slug = "hp-keeper") {
  return String(sqlite.prepare("SELECT id FROM products WHERE slug=?").get(slug)!.id);
}
function patch(path: string, body: unknown) {
  return new Request(`https://test.local${path}`, {
    method: "PATCH",
    headers: { origin: "https://test.local", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const migrations = resolve("cloudflare/d1/migrations");
function migrate() {
  for (const file of readdirSync(migrations)
    .sort()
    .filter((f) => f.endsWith(".sql") && f.slice(0, 4) < "0019"))
    sqlite.exec(readFileSync(resolve(migrations, file), "utf8"));
}
function seed() {
  for (const file of ["0001_music_boxes.sql", "0002_vinted_catalog.sql", "0003_vinted_prices.sql"])
    sqlite.exec(readFileSync(resolve("cloudflare/d1/seed", file), "utf8"));
}
function catalog() {
  const db = {
    prepare(sql: string) {
      return {
        async all() {
          return { results: sqlite.prepare(sql).all() };
        },
      };
    },
  } as unknown as D1Database;
  return listPublicCatalog(db);
}
beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  migrate();
  seed();
  sqlite.exec(
    "INSERT INTO admin_users(id,external_subject,email) VALUES('test-admin','test-admin','test@example.test')",
  );
  sqlite.exec(readFileSync(resolve(migrations, "0019_storefront_experience.sql"), "utf8"));
  sqlite.exec(
    readFileSync(resolve(migrations, "0020_preserve_custom_storefront_media.sql"), "utf8"),
  );
  sqlite.exec(readFileSync(resolve(migrations, "0021_website_stock_reservations.sql"), "utf8"));
  sqlite.exec(readFileSync(resolve(migrations, "0022_product_worlds_and_messages.sql"), "utf8"));
  sqlite.exec(readFileSync(resolve(migrations, "0023_sales_workbench.sql"), "utf8"));
  sqlite.exec(readFileSync(resolve(migrations, "0024_checkout_foundation.sql"), "utf8"));
  sqlite.exec(readFileSync(resolve(migrations, "0025_about_scene_audio.sql"), "utf8"));
  sqlite.exec(readFileSync(resolve(migrations, "0026_hero_welcome_messages.sql"), "utf8"));
  sqlite.exec(readFileSync(resolve(migrations, "0027_chat_left_center.sql"), "utf8"));
  sqlite.exec(readFileSync(resolve(migrations, "0028_romanian_catalog_copy.sql"), "utf8"));
  sqlite.exec(readFileSync(resolve(migrations, "0029_product_discovery_seo.sql"), "utf8"));
});
afterEach(() => sqlite.close());
describe("storefront and dashboard share one catalog", () => {
  it("moves the default chat left without changing its messages or enabled state", () => {
    const row = sqlite
      .prepare("SELECT position,enabled,welcome_message FROM chat_settings WHERE id='default'")
      .get()!;
    expect(row.position).toBe("left");
    expect(row.enabled).toBe(1);
    expect(String(row.welcome_message)).toContain("cutiuța potrivită");
  });
  it("corrects legacy SEO copy while preserving administrator edits on replay", () => {
    const rows = sqlite
      .prepare("SELECT seo_title,seo_description,short_description,brand FROM products")
      .all();
    expect(rows).toHaveLength(10);
    for (const row of rows) {
      expect(String(row.seo_title)).toMatch(/Cutiuț[ăa]/);
      expect(String(row.short_description)).toContain("muzicală");
      expect(row.brand).toBe("Cutiuța Magică");
    }
    sqlite
      .prepare("UPDATE products SET seo_title=? WHERE slug='hp-keeper'")
      .run("Colecția noastră · titlu personalizat");
    sqlite.exec(readFileSync(resolve(migrations, "0028_romanian_catalog_copy.sql"), "utf8"));
    expect(
      sqlite.prepare("SELECT seo_title FROM products WHERE slug='hp-keeper'").get()!.seo_title,
    ).toBe("Colecția noastră · titlu personalizat");
  });
  it("shows exactly five available products in the three collections and five upcoming products", async () => {
    const products = catalogProducts(await catalog());
    expect(products).toHaveLength(10);
    expect(
      products
        .filter(isAvailable)
        .map((p) => p.id)
        .sort(),
    ).toEqual(["got-winter", "halloween", "hp-keeper", "kitten", "sunshine"]);
    expect(collectionProducts(products, "story").map((p) => p.id)).toEqual([
      "hp-keeper",
      "got-winter",
    ]);
    expect(collectionProducts(products, "emotion").map((p) => p.id)).toEqual(["sunshine"]);
    expect(
      collectionProducts(products, "dedicated")
        .map((p) => p.id)
        .sort(),
    ).toEqual(["halloween", "kitten"]);
    expect(products.filter((p) => !isAvailable(p))).toHaveLength(5);
    for (const p of products)
      for (const image of p.gallery)
        if (image.src.startsWith("/produse/"))
          expect(existsSync(resolve("public", image.src.slice(1)))).toBe(true);
  });
  it("previews unreviewed public media locally without changing rights or external sync", async () => {
    const env = bindings();
    const row = sqlite
      .prepare("SELECT id,version FROM product_media WHERE product_id=? AND slot_code='01_hero'")
      .get(productId())!;
    const path = `/api/v1/admin/media/${row.id}`;
    const body = {
      expectedVersion: Number(row.version),
      marketingApproved: false,
      rightsStatus: "review_required",
      publicAccess: true,
      status: "active",
      syncToAvyron: false,
    };
    expect((await handleAdminMediaApi(patch(path, body), env))!.status).toBe(409);
    Object.assign(env, { APP_ENV: "local", PUBLIC_SITE_URL: "http://localhost:3000" });
    expect((await handleAdminMediaApi(patch(path, body), env))!.status).toBe(200);
    expect(
      sqlite
        .prepare("SELECT rights_status,marketing_approved FROM product_media WHERE id=?")
        .get(row.id),
    ).toMatchObject({ rights_status: "review_required", marketing_approved: 0 });
    sqlite
      .prepare(
        "UPDATE product_media SET source_url='/preview-only.webp',sort_order=-999 WHERE id=?",
      )
      .run(row.id);
    expect(
      (await listPublicCatalog(env.DB, true)).find((p) => p.slug === "hp-keeper")!.imageUrl,
    ).toBe("/preview-only.webp");
    expect(
      (await catalog())
        .find((p) => p.slug === "hp-keeper")!
        .gallery.some((p) => p.src === "/preview-only.webp"),
    ).toBe(false);
    const localExperience = (await (await getPublicProductExperience(env, "hp-keeper")).json()) as {
      data: { gallery: Array<{ id: string }> };
    };
    expect(localExperience.data.gallery.some((p) => p.id === row.id)).toBe(true);
    const productionEnv = { ...env, APP_ENV: "production" } as Env;
    const publicExperience = (await (
      await getPublicProductExperience(productionEnv, "hp-keeper")
    ).json()) as { data: { gallery: Array<{ id: string }> } };
    expect(publicExperience.data.gallery.some((p) => p.id === row.id)).toBe(false);
    expect(
      (await handleAdminMediaApi(
        patch(path, { ...body, expectedVersion: Number(row.version) + 1, syncToAvyron: true }),
        env,
      ))!.status,
    ).toBe(409);
    sqlite.prepare("UPDATE product_media SET public_access=0 WHERE id=?").run(row.id);
    expect(
      (await listPublicCatalog(env.DB, true))
        .find((p) => p.slug === "hp-keeper")!
        .gallery.some((p) => p.src === "/preview-only.webp"),
    ).toBe(false);
  });
  it("publishes all discovery profiles and their sitemap from the central catalog", async () => {
    const products = await catalog();
    expect(products.every((p) => p.discovery?.intro && p.discovery.occasions.length === 3)).toBe(
      true,
    );
    expect(products.every((p) => p.discovery?.guides.length)).toBe(true);
    const { renderSitemap } = await import("@/lib/seo-sitemap");
    const sitemap = renderSitemap(products);
    expect(sitemap.match(/<url>/g)).toHaveLength(22);
    for (const p of products) expect(sitemap).toContain(`/produs/${p.slug}</loc>`);
    expect(sitemap).toContain("<image:loc>");
    expect(sitemap).not.toMatch(/\/(admin|comanda|auth|api)\b/);
  });
  it("honors administrator text, category, media and visibility changes", async () => {
    sqlite.exec(
      `UPDATE products SET name='Nume actualizat',description='Descriere actualizată',search_terms='vrăjitor, cadou magic',landing_collection='emotion',version=version+1 WHERE slug='hp-keeper';UPDATE product_media SET source_url='/new-admin-image.webp',sort_order=-250,marketing_approved=1,rights_status='cleared',version=version+1 WHERE product_id=(SELECT id FROM products WHERE slug='hp-keeper') AND slot_code='01_hero'`,
    );
    let products = catalogProducts(await catalog());
    const hp = products.find((p) => p.id === "hp-keeper")!;
    expect(hp.name).toBe("Nume actualizat");
    expect(hp.description).toBe("Descriere actualizată");
    expect(hp.searchTerms).toEqual(["vrăjitor", "cadou magic"]);
    expect(hp.collection).toBe("emotion");
    expect(hp.image).toBe("/new-admin-image.webp");
    sqlite.exec(`UPDATE products SET status='draft' WHERE slug='hp-keeper'`);
    products = catalogProducts(await catalog());
    expect(products.find((p) => p.id === "hp-keeper")).toBeUndefined();
  });
  it("preserves customized images when adding the storefront migration", async () => {
    sqlite.exec(
      "UPDATE product_media SET source_url='/custom-before-migration.webp',marketing_approved=1,rights_status='cleared',version=2 WHERE product_id=(SELECT id FROM products WHERE slug='hp-keeper') AND slot_code='01_hero'",
    );
    sqlite.exec(
      readFileSync(resolve(migrations, "0020_preserve_custom_storefront_media.sql"), "utf8"),
    );
    expect((await catalog()).find((p) => p.slug === "hp-keeper")!.imageUrl).toBe(
      "/custom-before-migration.webp",
    );
  });
  it("moves paused listings and exhausted tracked stock out of available collections", async () => {
    sqlite.exec(
      `UPDATE channel_listings SET status='paused' WHERE product_id=(SELECT id FROM products WHERE slug='hp-keeper') AND channel_id='channel_website';UPDATE product_variants SET inventory_policy='deny' WHERE product_id=(SELECT id FROM products WHERE slug='sunshine');UPDATE inventory_levels SET on_hand_quantity=reserved_quantity WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id=(SELECT id FROM products WHERE slug='sunshine'))`,
    );
    const products = catalogProducts(await catalog());
    expect(isAvailable(products.find((p) => p.id === "hp-keeper")!)).toBe(false);
    expect(isAvailable(products.find((p) => p.id === "sunshine")!)).toBe(false);
  });
  it("never invents a price for a future product", async () => {
    sqlite.exec(
      `DELETE FROM price_list_items WHERE variant_id IN(SELECT id FROM product_variants WHERE product_id=(SELECT id FROM products WHERE slug='fairy'))`,
    );
    const fairy = catalogProducts(await catalog()).find((p) => p.id === "fairy")!;
    expect(fairy.price).toBeUndefined();
    expect(isAvailable(fairy)).toBe(false);
  });
  it("deduplicates interest requests by product, email and kind", () => {
    const id = sqlite.prepare(`SELECT id FROM products WHERE slug='fairy'`).get()!.id;
    const q = sqlite.prepare(
      `INSERT INTO product_interest(id,product_id,email,kind) VALUES(?,?,?,?) ON CONFLICT(product_id,email,kind) DO NOTHING`,
    );
    q.run("first", id, "test@example.test", "notify");
    q.run("second", id, "test@example.test", "notify");
    expect(sqlite.prepare("SELECT count(*) as n FROM product_interest").get()!.n).toBe(1);
  });
});

// Real SQLite statements with mocked authentication and object storage exercise API writes locally.

describe("dashboard writes and interest registration", () => {
  it("saves stock, rejects stale writers and cannot reduce stock below reservations", async () => {
    const env = bindings(),
      id = productId(),
      path = `/api/v1/admin/products/${id}/inventory`;
    const load = async () => {
      const r = await handleAdminInventory(new Request(`https://test.local${path}`), env);
      return (
        (await r!.json()) as {
          data: {
            variant: { id: string; version: number };
            levels: { locationId: string; version: number; onHand: number; safety: number }[];
          };
        }
      ).data;
    };
    let data = await load();
    const body = {
      variantId: data.variant.id,
      expectedVersion: data.variant.version,
      policy: "deny",
      levels: data.levels.map((l) => ({ ...l, onHand: 7, safety: 1 })),
    };
    expect((await handleAdminInventory(patch(path, body), env))!.status).toBe(200);
    expect(
      (await handleAdminInventory(
        patch(path, { ...body, levels: body.levels.map((l) => ({ ...l, onHand: 999 })) }),
        env,
      ))!.status,
    ).toBe(409);
    expect(
      sqlite
        .prepare("SELECT on_hand_quantity FROM inventory_levels WHERE variant_id=?")
        .get(data.variant.id)!.on_hand_quantity,
    ).toBe(7);
    sqlite
      .prepare(
        "UPDATE inventory_levels SET reserved_quantity=3,version=version+1 WHERE variant_id=?",
      )
      .run(data.variant.id);
    data = await load();
    expect(
      (await handleAdminInventory(
        patch(path, {
          ...body,
          expectedVersion: data.variant.version,
          levels: data.levels.map((l) => ({ ...l, onHand: 2 })),
        }),
        env,
      ))!.status,
    ).toBe(409);
  });
  it("stores and deduplicates an interest request, rejects disabled preorders and oversize streams", async () => {
    const env = bindings();
    const post = (body: unknown) =>
      new Request("https://test.local/api/v1/product-interest", {
        method: "POST",
        headers: { origin: "https://test.local", "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    const payload = { productSlug: "fairy", email: "TEST@example.test", kind: "notify" };
    expect((await handleProductInterest(post(payload), env))!.status).toBe(201);
    expect((await handleProductInterest(post(payload), env))!.status).toBe(201);
    expect(sqlite.prepare("SELECT email FROM product_interest").all()).toEqual([
      { email: "test@example.test" },
    ]);
    expect((await handleProductInterest(post({ ...payload, kind: "preorder" }), env))!.status).toBe(
      409,
    );
    expect((await handleProductInterest(post({ email: "a".repeat(5000) }), env))!.status).toBe(413);
  });
  it("streams a verified 20-second recording and rejects a 10-second recording", async () => {
    const env = bindings(),
      samples = new Float32Array(44100 * 40);
    const buffer = {
      sampleRate: 44100,
      length: samples.length,
      numberOfChannels: 1,
      getChannelData: () => samples,
    };
    const send = async (seconds: number) => {
      const clip = encodeAudioClip(buffer, 0, seconds);
      return handleAdminMediaApi(
        new Request(`https://test.local/api/v1/admin/products/${productId()}/media`, {
          method: "POST",
          headers: {
            origin: "https://test.local",
            "content-type": "audio/wav",
            "x-media-size": String(clip.size),
            "x-media-filename": "melodie.wav",
            "x-media-metadata": encodeURIComponent(
              JSON.stringify({ mediaType: "audio", usageType: "audio" }),
            ),
          },
          body: clip,
        }),
        env,
      );
    };
    const result = await send(20);
    expect(result!.status).toBe(201);
    expect(
      sqlite.prepare("SELECT duration_seconds FROM product_media WHERE media_type='audio'").get()!
        .duration_seconds,
    ).toBe(20);
    expect((await send(10))!.status).toBe(400);
  });
  it("rejects stale product edits without changing listing availability", async () => {
    const env = bindings(),
      id = productId(),
      row = sqlite.prepare("SELECT * FROM products WHERE id=?").get(id)!;
    const body = {
      expectedVersion: Number(row.version),
      name: "Admin title",
      tagline: "Tagline",
      shortDescription: "Short",
      description: "Description",
      story: "Story",
      category: "Story",
      material: "Lemn",
      dimensionsText: "6 cm",
      weightG: null,
      rightsStatus: "review_required",
      rightsNotes: "",
      seoTitle: "",
      seoDescription: "",
      searchTerms: "",
      storefrontState: "available",
      discovery: {
        intro: "Un model pentru cititori.",
        audience: "Colecționari",
        occasions: ["Aniversare"],
        moments: ["La bibliotecă"],
        guides: ["craciun"],
      },
    };
    const path = `/api/v1/admin/products/${id}`;
    expect((await handleAdminProductApi(patch(path, body), env))!.status).toBe(200);
    expect((await catalog()).find((p) => p.id === id)!.discovery).toEqual(body.discovery);
    expect(
      (await handleAdminProductApi(patch(path, { ...body, storefrontState: "coming_soon" }), env))!
        .status,
    ).toBe(409);
    expect(
      sqlite
        .prepare(
          "SELECT status FROM channel_listings WHERE product_id=? AND channel_id='channel_website'",
        )
        .get(id)!.status,
    ).toBe("active");
  });
});

describe("tracked stock at checkout", () => {
  function order(quantity: number): WebsiteOrderInput {
    return {
      idempotencyKey: crypto.randomUUID(),
      website: "",
      customer: {
        name: "Test Local",
        email: "stock@example.test",
        phone: "0712345678",
        address: "Strada Test 10",
        city: "București",
        county: "București",
        postalCode: "010101",
        notes: "",
      },
      paymentMethod: "cash_on_delivery",
      shippingOption: "home_delivery",
      checkoutConsentAccepted: true,
      checkoutConsentVersion: "2026.09",
      items: [{ productId: "hp-keeper", quantity }],
    };
  }
  function track(quantity: number) {
    const variant = String(
      sqlite.prepare("SELECT id FROM product_variants WHERE product_id=? LIMIT 1").get(productId())!
        .id,
    );
    const location = String(
      sqlite.prepare("SELECT id FROM stock_locations WHERE active=1 LIMIT 1").get()!.id,
    );
    sqlite.prepare("UPDATE product_variants SET inventory_policy='deny' WHERE id=?").run(variant);
    sqlite
      .prepare(
        "INSERT INTO inventory_levels(id,variant_id,location_id,on_hand_quantity) VALUES(?,?,?,?) ON CONFLICT(variant_id,location_id) DO UPDATE SET on_hand_quantity=excluded.on_hand_quantity",
      )
      .run("test-stock", variant, location, quantity);
    return variant;
  }
  it("rejects an oversize order atomically and reserves valid quantities exactly once", async () => {
    const variant = track(2),
      env = bindings();
    await expect(createWebsiteOrder(env.DB, order(3))).rejects.toThrow("Stocul s-a schimbat");
    expect(sqlite.prepare("SELECT COUNT(*) as n FROM orders").get()!.n).toBe(0);
    const input = order(2),
      result = await createWebsiteOrder(env.DB, input);
    expect(result.replayed).toBe(false);
    expect((await createWebsiteOrder(env.DB, input)).replayed).toBe(true);
    expect(
      sqlite
        .prepare("SELECT reserved_quantity FROM inventory_levels WHERE variant_id=?")
        .get(variant)!.reserved_quantity,
    ).toBe(2);
    expect((await catalog()).find((p) => p.slug === "hp-keeper")!.availability).toBe(
      "out_of_stock",
    );
    await expect(createWebsiteOrder(env.DB, order(1))).rejects.toThrow("nu mai este disponibil");
  });
  it("releases cancelled orders and consumes shipped stock once", async () => {
    const variant = track(3),
      env = bindings(),
      first = await createWebsiteOrder(env.DB, order(2));
    sqlite.prepare("UPDATE orders SET order_status='cancelled' WHERE id=?").run(first.orderId);
    expect(
      sqlite
        .prepare("SELECT reserved_quantity FROM inventory_levels WHERE variant_id=?")
        .get(variant)!.reserved_quantity,
    ).toBe(0);
    const second = await createWebsiteOrder(env.DB, order(2));
    sqlite.prepare("UPDATE orders SET fulfillment_status='shipped' WHERE id=?").run(second.orderId);
    sqlite
      .prepare("UPDATE orders SET fulfillment_status='delivered' WHERE id=?")
      .run(second.orderId);
    expect(
      sqlite
        .prepare(
          "SELECT on_hand_quantity,reserved_quantity FROM inventory_levels WHERE variant_id=?",
        )
        .get(variant),
    ).toEqual({ on_hand_quantity: 1, reserved_quantity: 0 });
  });
});

describe("product worlds, public messages and sales workbench", () => {
  function write(path: string, body: unknown, method = "PUT") {
    return new Request(`https://test.local${path}`, {
      method,
      headers: { origin: "https://test.local", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  it("persists a product scene, rejects stale edits and exposes only the public projection", async () => {
    const env = bindings(),
      path = `/api/v1/admin/products/${productId()}/scene`;
    const data = {
      scene: "galaxy",
      accent: "#abccdd",
      occasion: "Un dar pentru tata.",
      expectedVersion: 0,
    };
    expect((await handleStorefrontDesign(write(path, data), env))!.status).toBe(200);
    expect(
      (await handleStorefrontDesign(write(path, { ...data, occasion: "stale" }), env))!.status,
    ).toBe(409);
    const p = (await catalog()).find((p) => p.slug === "hp-keeper")!;
    expect(p.scene).toEqual({
      scene: "galaxy",
      accent: "#abccdd",
      occasion: "Un dar pentru tata.",
    });
    expect(JSON.stringify(p)).not.toContain("test@example.test");
    expect(
      (await handleStorefrontDesign(
        write(path, { ...data, expectedVersion: 1, accent: "url(https://bad.test)" }),
        env,
      ))!.status,
    ).toBe(400);
  });
  it("provides three staggered home notes and preserves administrator edits on migration replay", () => {
    const home = sqlite
      .prepare(
        "SELECT id,delay_seconds,scroll_percent FROM storefront_messages WHERE placement='home' AND enabled=1 ORDER BY delay_seconds",
      )
      .all();
    expect(home.map((m) => m.delay_seconds)).toEqual([8, 26, 48]);
    expect(home.every((m) => m.scroll_percent === 0)).toBe(true);
    sqlite.exec(
      "UPDATE storefront_messages SET title='Text ales de echipă',enabled=0,version=7 WHERE id='message_story'",
    );
    sqlite.exec(readFileSync(resolve(migrations, "0026_hero_welcome_messages.sql"), "utf8"));
    expect(
      sqlite
        .prepare("SELECT title,enabled,version FROM storefront_messages WHERE id='message_story'")
        .get(),
    ).toMatchObject({ title: "Text ales de echipă", enabled: 0, version: 7 });
    expect(
      sqlite.prepare("SELECT COUNT(*) AS n FROM storefront_messages WHERE placement='home'").get()
        ?.n,
    ).toBe(3);
  });
  it("isolates enabled storefront messages from private admin alerts and rejects internal CTA links", async () => {
    const env = bindings();
    sqlite.exec(
      "INSERT INTO admin_notifications(id,notification_type,title,message) VALUES('private','security','Private alert','Never public')",
    );
    const r = await handleStorefrontDesign(
      new Request("https://test.local/api/v1/storefront/messages"),
      env,
    );
    const content = await r!.text();
    expect(content).toContain("Unele daruri");
    expect(content).not.toContain("Never public");
    expect(content).not.toContain('"id":"message_gift"');
    const message = {
      id: "new-message",
      expectedVersion: 0,
      title: "Un gând",
      message: "Descoperă magia cutiuțelor.",
      placement: "home",
      link: "/admin/integrations",
      label: "Descoperă",
      delaySeconds: 20,
      scrollPercent: 25,
      enabled: true,
    };
    expect(
      (await handleStorefrontDesign(write("/api/v1/admin/storefront/messages", message), env))!
        .status,
    ).toBe(400);
    expect(
      (await handleStorefrontDesign(
        write("/api/v1/admin/storefront/messages", { ...message, link: "/produse" }),
        env,
      ))!.status,
    ).toBe(200);
    expect(
      (await handleStorefrontDesign(
        write("/api/v1/admin/storefront/messages", { ...message, link: "/produse" }),
        env,
      ))!.status,
    ).toBe(409);
  });
  it("creates exactly one private alert for a deduplicated product interest", async () => {
    const env = bindings(),
      input = {
        productSlug: "lotr-rings",
        email: "visitor@example.test",
        kind: "notify",
        website: "",
      };
    const make = () => write("/api/v1/product-interest", input, "POST");
    expect((await handleProductInterest(make(), env))!.status).toBeLessThan(300);
    expect((await handleProductInterest(make(), env))!.status).toBeLessThan(300);
    expect(
      sqlite
        .prepare(
          "SELECT COUNT(*) AS n FROM admin_notifications WHERE deduplication_key LIKE 'interest_%'",
        )
        .get()!.n,
    ).toBe(1);
  });
  it("prepares publications without pretending they were sent, rejects duplicates and detects catalog changes", async () => {
    const env = bindings(),
      path = `/api/v1/admin/products/${productId()}/sales-channels`;
    const first = (await (await handleSalesWorkbench(
      new Request(`https://test.local${path}`),
      env,
    ))!.json()) as { data: { catalogHash: string; channels: { code: string }[] } };
    expect(first.data.channels.map((c) => c.code)).toEqual(
      expect.arrayContaining(["emag", "trendyol", "okazii", "olx", "vinted", "google_merchant"]),
    );
    const data = {
      code: "vinted",
      expectedVersion: 0,
      action: "prepare",
      title: "Cutiuța mea",
      description: "O cutiuță cu manivelă.",
      listingUrl: "",
      catalogHash: first.data.catalogHash,
    };
    expect((await handleSalesWorkbench(write(path, data, "POST"), env))!.status).toBe(200);
    expect((await handleSalesWorkbench(write(path, data, "POST"), env))!.status).toBe(409);
    expect(sqlite.prepare("SELECT COUNT(*) AS n FROM channel_publication_requests").get()!.n).toBe(
      1,
    );
    expect(sqlite.prepare("SELECT status FROM product_channel_drafts").get()!.status).toBe(
      "awaiting_publication",
    );
    expect(
      (await handleSalesWorkbench(
        write(path, { ...data, expectedVersion: 1, action: "confirm_manual" }, "POST"),
        env,
      ))!.status,
    ).toBe(400);
    expect(
      (await handleSalesWorkbench(
        write(
          path,
          {
            ...data,
            expectedVersion: 1,
            action: "confirm_manual",
            listingUrl: "https://www.vinted.ro/items/123",
          },
          "POST",
        ),
        env,
      ))!.status,
    ).toBe(200);
    sqlite
      .prepare("UPDATE products SET description='O descriere actualizată' WHERE id=?")
      .run(productId());
    const next = (await (await handleSalesWorkbench(
      new Request(`https://test.local${path}`),
      env,
    ))!.json()) as { data: { channels: { code: string; needsUpdate: boolean }[] } };
    expect(next.data.channels.find((c) => c.code === "vinted")!.needsUpdate).toBe(true);
    expect(
      (await handleSalesWorkbench(write(path, { ...data, expectedVersion: 2 }, "POST"), env))!
        .status,
    ).toBe(409);
  });
  it("keeps credentials out of channel profiles and rejects hostile profile links", async () => {
    const env = bindings(),
      path = "/api/v1/admin/sales-channels";
    const data = {
      code: "olx",
      accountUrl: "https://www.olx.ro/",
      sellerId: "123",
      dataSourceId: "",
      expectedVersion: 0,
      apiKey: "must-not-persist",
    };
    expect((await handleSalesWorkbench(write(path, data), env))!.status).toBe(200);
    const r = await handleSalesWorkbench(new Request(`https://test.local${path}`), env);
    expect(await r!.text()).not.toContain("must-not-persist");
    expect(
      (await handleSalesWorkbench(
        write(path, { ...data, expectedVersion: 1, accountUrl: "https://www.olx.ro.evil.test" }),
        env,
      ))!.status,
    ).toBe(400);
    const crossOrigin = new Request(`https://test.local${path}`, {
      method: "PUT",
      headers: { origin: "https://evil.test", "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    expect((await handleSalesWorkbench(crossOrigin, env))!.status).toBe(403);
  });
  it("exports real public prices and availability, escapes XML and never fabricates identifiers", async () => {
    const products = await catalog();
    products[0] = { ...products[0], name: 'A <B> & "C"', description: "A & B" };
    const xml = googleCatalogFeed(products);
    expect(xml).toContain("A &lt;B&gt; &amp; &quot;C&quot;");
    expect(xml).toContain("<g:availability>in_stock</g:availability>");
    expect(xml).toContain("<g:availability>out_of_stock</g:availability>");
    expect(xml).not.toContain("identifier_exists");
    expect(xml).not.toContain("admin");
    expect(googleCatalogFeed([{ ...products[0], price: null }])).not.toContain("<item>");
  });
  it("enforces body limits without relying on Content-Length", async () => {
    const env = bindings();
    const req = new Request("https://test.local/api/v1/admin/storefront/messages", {
      method: "PUT",
      headers: { origin: "https://test.local", "content-type": "application/json" },
      body: JSON.stringify({ text: "x".repeat(9000) }),
    });
    expect((await handleStorefrontDesign(req, env))!.status).toBe(413);
  });
});
