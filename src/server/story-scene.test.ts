import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { encodeAudioClip } from "@/lib/audio-clip";
import { handleStoryScene } from "./api/story-scene";

vi.mock("@/lib/admin-auth", () => ({
  authenticateAdminRequest: vi.fn(async () => ({ id: "scene-admin" })),
}));
let db: DatabaseSync;
let env: Env;
let objects: Map<string, Uint8Array>;
class Statement {
  private args: Record<string, SQLInputValue> = {};
  constructor(private sql: string) {}
  bind(...values: SQLInputValue[]) {
    this.args = Object.fromEntries(values.map((v, i) => [`?${i + 1}`, v]));
    return this;
  }
  async first() {
    return db.prepare(this.sql).get(this.args) ?? null;
  }
  async all() {
    return { results: db.prepare(this.sql).all(this.args) };
  }
  execute() {
    const r = db.prepare(this.sql).run(this.args);
    return { meta: { changes: Number(r.changes) } };
  }
}
beforeEach(() => {
  db = new DatabaseSync(":memory:");
  for (const f of readdirSync(resolve("cloudflare/d1/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    db.exec(readFileSync(resolve("cloudflare/d1/migrations", f), "utf8"));
  db.exec(
    "INSERT INTO admin_users(id,external_subject,email) VALUES('scene-admin','scene-admin','scene@example.test')",
  );
  objects = new Map();
  env = {
    DB: {
      prepare: (sql: string) => new Statement(sql),
      async batch(statements: Statement[]) {
        db.exec("BEGIN");
        try {
          const results = statements.map((s) => s.execute());
          db.exec("COMMIT");
          return results;
        } catch (e) {
          db.exec("ROLLBACK");
          throw e;
        }
      },
    },
    MEDIA: {
      async put(key: string, data: Uint8Array) {
        objects.set(key, data);
        return { size: data.byteLength };
      },
      async delete(key: string) {
        objects.delete(key);
      },
      async head(key: string) {
        return objects.has(key) ? { size: objects.get(key)!.byteLength } : null;
      },
      async get(key: string, options?: { range: { offset: number; length: number } }) {
        const data = objects.get(key);
        if (!data) return null;
        const bytes = options?.range
          ? data.slice(options.range.offset, options.range.offset + options.range.length)
          : data;
        return { size: data.byteLength, body: new Blob([new Uint8Array(bytes)]).stream() };
      },
    },
  } as unknown as Env;
});
afterEach(() => {
  db.close();
  vi.restoreAllMocks();
});
function request(path: string, init?: RequestInit) {
  return handleStoryScene(
    new Request(`https://shop.test/api/v1/${path}`, init),
    env,
  ) as Promise<Response>;
}
async function upload(seconds = 20, headers: Record<string, string> = {}) {
  const rate = 16000;
  const clip = encodeAudioClip(
    {
      sampleRate: rate,
      length: rate * seconds,
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(rate * seconds),
    },
    0,
    seconds,
  );
  return request("admin/story-scene/audio", {
    method: "POST",
    headers: { origin: "https://shop.test", "content-type": "audio/wav", ...headers },
    body: clip,
  });
}
async function asset() {
  const r = await upload();
  expect(r.status).toBe(201);
  return ((await r.json()) as { data: { id: string } }).data.id;
}
function save(id: string | null, override: Record<string, unknown> = {}) {
  return request("admin/story-scene", {
    method: "PUT",
    headers: { origin: "https://shop.test", "content-type": "application/json" },
    body: JSON.stringify({
      assetId: id,
      title: "Poveste în atelier",
      enabled: true,
      rightsConfirmed: true,
      expectedVersion: 1,
      ...override,
    }),
  });
}

describe("story scene audio with real SQLite and private object storage", () => {
  it("keeps the public scene silent by default and a new upload private", async () => {
    expect(await (await request("story/scene")).json()).toEqual({ data: { audio: null } });
    const id = await asset();
    expect((await request(`story/audio/${id}`)).status).toBe(404);
    expect((await request(`admin/story-scene/audio/${id}`)).status).toBe(200);
    expect(authenticateAdminRequest).toHaveBeenLastCalledWith(
      expect.any(Request),
      env,
      "integrations.read",
    );
    expect(
      db.prepare("SELECT action FROM business_activity WHERE action='story.audio.uploaded'").all(),
    ).toHaveLength(1);
  });
  it("requires authenticated administration and same-origin writes", async () => {
    vi.mocked(authenticateAdminRequest).mockRejectedValueOnce(
      Object.assign(new Error("private"), { statusCode: 401 }),
    );
    expect((await request("admin/story-scene")).status).toBe(401);
    const id = await asset();
    vi.mocked(authenticateAdminRequest).mockRejectedValueOnce(
      Object.assign(new Error("private"), { statusCode: 403 }),
    );
    expect((await request(`admin/story-scene/audio/${id}`)).status).toBe(403);
    expect((await upload(20, { origin: "https://other.test" })).status).toBe(403);
    expect(objects.size).toBe(1);
  });
  it("validates actual PCM bytes and duration, regardless of metadata", async () => {
    expect((await upload(14)).status).toBe(400);
    expect((await upload(31)).status).toBe(400);
    expect(
      (
        await request("admin/story-scene/audio", {
          method: "POST",
          headers: { origin: "https://shop.test", "content-type": "audio/wav" },
          body: new Uint8Array(100),
        })
      ).status,
    ).toBe(400);
    expect((await upload(20, { "content-type": "audio/mpeg" })).status).toBe(415);
    expect(objects.size).toBe(0);
    expect((await upload(15)).status).toBe(201);
    expect((await upload(30)).status).toBe(201);
  });
  it("bounds uploads even without Content-Length", async () => {
    const r = await request("admin/story-scene/audio", {
      method: "POST",
      headers: { origin: "https://shop.test", "content-type": "audio/wav" },
      body: new Uint8Array(3_000_001),
    });
    expect(r.status).toBe(413);
    expect(objects.size).toBe(0);
  });
  it("only publishes an existing asset with explicit rights confirmation", async () => {
    const id = await asset();
    expect((await save(id, { rightsConfirmed: false })).status).toBe(400);
    expect((await save(null)).status).toBe(400);
    expect((await save(crypto.randomUUID())).status).toBe(409);
    expect((await save(id)).status).toBe(200);
    const response = await request("story/scene");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      data: {
        audio: { url: `/api/v1/story/audio/${id}`, title: "Poveste în atelier", duration: 20 },
      },
    });
    expect((await request("story/scene", { method: "POST" })).status).toBe(405);
  });
  it("allows a local audio preview without falsifying rights, and closes it in production", async () => {
    Object.assign(env, { APP_ENV: "local", PUBLIC_SITE_URL: "http://localhost:3000" });
    const id = await asset();
    expect((await save(null, { rightsConfirmed: false })).status).toBe(400);
    expect((await save(id, { rightsConfirmed: false })).status).toBe(200);
    expect(
      db.prepare("SELECT rights_confirmed FROM story_scene_settings").get()!.rights_confirmed,
    ).toBe(0);
    expect((await request(`story/audio/${id}`)).status).toBe(200);
    Object.assign(env, { APP_ENV: "production", PUBLIC_SITE_URL: "https://cutiutamagica.eu" });
    expect(await (await request("story/scene")).json()).toEqual({ data: { audio: null } });
    expect((await request(`story/audio/${id}`)).status).toBe(404);
  });
  it("rejects stale edits atomically and audits only successful changes", async () => {
    const id = await asset();
    expect((await save(id)).status).toBe(200);
    expect((await save(id, { title: "stale", enabled: false })).status).toBe(409);
    expect(db.prepare("SELECT version,track_title FROM story_scene_settings").get()).toMatchObject({
      version: 2,
      track_title: "Poveste în atelier",
    });
    expect(
      db.prepare("SELECT action FROM business_activity WHERE action='story.scene.saved'").all(),
    ).toHaveLength(1);
  });
  it("streams valid byte ranges and rejects malformed or out-of-bounds ranges", async () => {
    const id = await asset();
    await save(id);
    const r = await request(`story/audio/${id}`, { headers: { range: "bytes=0-43" } });
    expect(r.status).toBe(206);
    expect(r.headers.get("content-range")).toBe("bytes 0-43/640044");
    expect(r.headers.get("content-type")).toBe("audio/wav");
    expect((await r.arrayBuffer()).byteLength).toBe(44);
    expect(
      (await request(`story/audio/${id}`, { headers: { range: "bytes=900000-" } })).status,
    ).toBe(416);
    expect(
      (await request(`story/audio/${id}`, { headers: { range: "bytes=0-1,2-3" } })).status,
    ).toBe(416);
    const head = await request(`story/audio/${id}`, { method: "HEAD" });
    expect(head.status).toBe(200);
    expect((await head.text()).length).toBe(0);
  });
  it("revokes previous audio URLs when replaced or disabled", async () => {
    const first = await asset();
    await save(first);
    const next = await asset();
    await save(next, { expectedVersion: 2 });
    expect((await request(`story/audio/${first}`)).status).toBe(404);
    expect((await request(`story/audio/${next}`)).status).toBe(200);
    await save(next, { enabled: false, expectedVersion: 3 });
    expect((await request(`story/audio/${next}`)).status).toBe(404);
    expect(await (await request("story/scene")).json()).toEqual({ data: { audio: null } });
  });
  it("does not publish missing object data or expose storage errors", async () => {
    const id = await asset();
    vi.spyOn(env.MEDIA, "get").mockRejectedValueOnce(
      new Error("internal storage key and credentials"),
    );
    const failed = await request(`admin/story-scene/audio/${id}`);
    expect(failed.status).toBe(500);
    expect(await failed.text()).not.toContain("credentials");
    objects.clear();
    expect((await save(id)).status).toBe(409);
    expect((await request(`admin/story-scene/audio/${id}`)).status).toBe(404);
  });
});
