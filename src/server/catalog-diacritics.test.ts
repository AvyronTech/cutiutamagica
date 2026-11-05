import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("corrects only legacy catalog copy and keeps administrator text", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(`
      CREATE TABLE products (
        id TEXT PRIMARY KEY, slug TEXT, name TEXT, tagline TEXT, description TEXT,
        story TEXT, category TEXT, short_description TEXT, seo_title TEXT,
        seo_description TEXT, brand TEXT
      );
      CREATE TABLE collections (
        id TEXT PRIMARY KEY, name TEXT, description TEXT, seo_title TEXT, seo_description TEXT
      );
      CREATE TABLE sales_channels (code TEXT PRIMARY KEY, name TEXT);
      CREATE TABLE channel_listings (
        channel_id TEXT, product_id TEXT, title_override TEXT
      );
      CREATE TABLE schema_metadata (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT);
      INSERT INTO products VALUES
        ('legacy','fairy','Zana Padurii Fermecate',
         'Un cadou delicat pentru visatoare si iubitoare de magie.',
         'Obiect muzical decorativ din lemn, actionat manual prin manivela.',
         'Un model luminos, potrivit pentru aniversari si daruri oferite din suflet.',
         'Fantasy','Cutiuta muzicala delicata din lemn, cu manivela si ilustratie fantasy.',
         'Cutiuta muzicala cu zana si manivela - Cutiuta Magica',
         'Cutiuta muzicala din lemn cu manivela si tema de poveste, potrivita pentru cadou.',
         'Cutiuta Magica'),
        ('custom','custom','Nume ales de administrator','Text editorial propriu',
         'Descriere proprie','Poveste proprie','Aventura','Descriere scurtă proprie',
         'Titlu SEO propriu','Descriere SEO proprie','Alt brand');
      INSERT INTO channel_listings VALUES
        ('channel_website','legacy','Zana Padurii Fermecate'),
        ('channel_website','custom','Nume ales de administrator');
      INSERT INTO schema_metadata(key,value) VALUES('schema_version','54');
    `);
    db.exec(
      readFileSync(
        resolve("cloudflare/d1/migrations/0055_complete_romanian_catalog_copy.sql"),
        "utf8",
      ),
    );
    const legacy = db.prepare("SELECT * FROM products WHERE id='legacy'").get()!;
    const custom = db.prepare("SELECT * FROM products WHERE id='custom'").get()!;
    expect(legacy).toMatchObject({
      name: "Zâna Pădurii Fermecate",
      description: "Obiect muzical decorativ din lemn, acționat manual prin manivelă.",
      brand: "Cutiuța Magică",
      seo_title: "Cutiuța muzicală cu zână și manivelă - Cutiuța Magică",
    });
    expect(custom).toMatchObject({
      name: "Nume ales de administrator",
      tagline: "Text editorial propriu",
      description: "Descriere proprie",
      seo_title: "Titlu SEO propriu",
      brand: "Alt brand",
    });
    expect(
      db.prepare("SELECT title_override FROM channel_listings WHERE product_id='legacy'").get()!
        .title_override,
    ).toBe("Zâna Pădurii Fermecate");
    expect(
      db.prepare("SELECT value FROM schema_metadata WHERE key='schema_version'").get()!.value,
    ).toBe("55");
  } finally {
    db.close();
  }
});
