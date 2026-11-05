import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { handleDropshipping } from "./api/dropshipping";
import { researchProduct } from "./services/supplier-research";
import { saveSetting } from "./services/growth-settings";
import {
  contribution,
  emptyOpportunity,
  readiness,
  validListingUrl,
  type OpportunityData,
} from "@/lib/dropshipping";

let allowed = true;
vi.mock("@/lib/admin-auth", () => ({
  authenticateAdminRequest: vi.fn(async () => {
    if (!allowed) throw Object.assign(Error("Autentificare necesară."), { statusCode: 401 });
    return {
      id: "dropship-test-admin",
      email: "operator@example.test",
      permissions: ["catalog.read", "catalog.write"],
    };
  }),
}));
let sql: DatabaseSync;
class Statement {
  private args: Record<string, SQLInputValue> = {};
  constructor(private query: string) {}
  bind(...args: SQLInputValue[]) {
    this.args = Object.fromEntries(args.map((v, i) => [`?${i + 1}`, v]));
    return this;
  }
  execute() {
    const r = sql.prepare(this.query).run(this.args);
    return { success: true, meta: { changes: Number(r.changes) } };
  }
  async run() {
    return this.execute();
  }
  async first() {
    return sql.prepare(this.query).get(this.args) ?? null;
  }
  async all() {
    return { success: true, results: sql.prepare(this.query).all(this.args) };
  }
}
function environment() {
  const objects = new Map<string, Uint8Array>();
  return {
    DB: {
      prepare: (q: string) => new Statement(q),
      batch: async (statements: Statement[]) => {
        sql.exec("BEGIN");
        try {
          const results = statements.map((s) => s.execute());
          sql.exec("COMMIT");
          return results;
        } catch (e) {
          sql.exec("ROLLBACK");
          throw e;
        }
      },
    },
    MEDIA: {
      put: async (k: string, bytes: Uint8Array) => objects.set(k, bytes),
      get: async (k: string) =>
        objects.has(k) ? { body: new Response(Uint8Array.from(objects.get(k)!)).body } : null,
      delete: async (k: string) => objects.delete(k),
    },
    AI: {
      run: vi.fn(async () => ({
        response: JSON.stringify({
          title: "Lampă de birou compactă",
          description:
            "Lampă de birou din metal, cu bază stabilă și dimensiunile din fișa verificată a produsului.",
        }),
      })),
    },
    DROPSHIPPING_AI_PLAN: "free",
    APP_ENV: "local",
  } as unknown as Env & { DROPSHIPPING_AI_PLAN?: string };
}
const root = "https://test.local/api/v1/admin/dropshipping";
const id = "6d967e2d-f0ab-4e14-9855-d35cb9047171",
  asset = "aaf6ae2f-ec98-4463-a267-7645a52b87e9";
function request(path = "", body?: unknown, origin = "https://test.local") {
  return new Request(
    root + path,
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body: JSON.stringify(body),
        },
  );
}
async function call(env: ReturnType<typeof environment>, path = "", body?: unknown) {
  const r = (await handleDropshipping(request(path, body), env))!;
  return {
    status: r.status,
    ...((await r.json()) as { data: Record<string, unknown>; error: { message: string } }),
  };
}
function facts(): OpportunityData {
  const data = emptyOpportunity();
  Object.assign(data, {
    name: "Lampă de birou",
    category: "Iluminat",
    supplierName: "Furnizor sintetic",
    supplierUrl: "https://supplier.example.test/lampa",
    supplierEvidence: "Ofertă sintetică verificată la data testului, fără achiziție.",
    facts: "Material metal; dimensiuni 20 × 15 × 30 cm; culoare albă.",
    factsVerified: true,
    stock: 5,
    deliveryDays: 4,
    quoteValidUntil: "2099-12-31",
    supplierShipsDirect: true,
    returnsTerms: "Retur și urmărire confirmate în oferta sintetică.",
    rightsEvidence: "Fotografie proprie sintetică folosită numai în test.",
    saleBani: 20000,
    costBani: 6000,
    shippingBani: 2000,
    feesBani: 2000,
    reserveBani: 1000,
  });
  data.channels.emag = {
    title: "Lampă de birou compactă",
    description: "Lampă din metal, cu dimensiuni de 20 × 15 × 30 cm și finisaj alb.",
    categoryId: "123",
    attributes: "Material: metal; culoare: alb.",
    account: "Cutiuța Magică · seller sintetic",
    requirementsEvidence: "Cerințele categoriei verificate în portalul sintetic.",
    requirementsCheckedAt: new Date().toISOString().slice(0, 10),
    assetId: asset,
  };
  return data;
}
async function create(env: ReturnType<typeof environment>, data = facts()) {
  expect((await call(env, "", { id, data })).status).toBe(200);
  sql
    .prepare(
      "INSERT OR IGNORE INTO dropshipping_assets(id,opportunity_id,channel,r2_key,checksum_sha256,width,height,rights_evidence) VALUES(?,?,'emag','private/test.png','checksum',1200,1200,?)",
    )
    .run(asset, id, data.rightsEvidence);
}
beforeEach(() => {
  allowed = true;
  sql = new DatabaseSync(":memory:");
  sql.exec("PRAGMA foreign_keys=ON");
  for (const f of readdirSync(resolve("cloudflare/d1/migrations"))
    .filter((x) => x.endsWith(".sql"))
    .sort())
    sql.exec(readFileSync(resolve("cloudflare/d1/migrations", f), "utf8"));
  sql
    .prepare(
      "INSERT INTO admin_users(id,external_subject,email) VALUES('dropship-test-admin','dropship-test-admin','operator@example.test')",
    )
    .run();
});
afterEach(() => {
  vi.useRealTimers();
  sql.close();
  vi.restoreAllMocks();
});
describe("dropshipping workspace", () => {
  it("expires supplier quotations on the Romanian business date, including the UTC midnight boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-05T22:30:00Z"));
    const data = facts();
    data.quoteValidUntil = "2026-11-05";
    expect(readiness(data, "emag")).toContain(
      "Actualizează stocul, termenul și valabilitatea ofertei.",
    );
  });
  it("accepts general categories as opportunities without inventing music-box catalog products or costs", async () => {
    const env = environment();
    await create(env);
    await call(env, "", { id, data: facts() });
    expect(sql.prepare("SELECT COUNT(*) n FROM dropshipping_opportunities").get()?.n).toBe(1);
    expect(sql.prepare("SELECT COUNT(*) n FROM products").get()?.n).toBe(0);
    expect(contribution(facts())).toEqual({ bani: 9000, percent: 45 });
    expect(contribution({ ...facts(), shippingBani: null })).toBeNull();
    expect(readiness(facts(), "website")).toContain(
      "Leagă un produs compatibil din catalogul central; produsele generale nu se publică drept cutiuțe muzicale.",
    );
  });
  it("binds approval to a revision, expires it after editing and rejects stale writes", async () => {
    const env = environment();
    await create(env);
    expect(
      (await call(env, `/${id}/approve`, { expectedVersion: 1, channel: "emag" })).status,
    ).toBe(200);
    const changed = { ...facts(), name: "Lampă '); DROP TABLE products; --" };
    expect((await call(env, `/${id}`, { expectedVersion: 1, data: changed })).status).toBe(200);
    expect((await call(env, `/${id}`, { expectedVersion: 1, data: facts() })).status).toBe(409);
    expect(
      (
        await call(env, `/${id}/claim`, {
          expectedVersion: 2,
          channel: "emag",
          observedAccount: facts().channels.emag.account,
        })
      ).status,
    ).toBe(409);
    expect(
      sql.prepare("SELECT status FROM approval_requests WHERE entity_type='dropshipping'").get()
        ?.status,
    ).toBe("expired");
    expect(sql.prepare("SELECT name FROM dropshipping_opportunities").get()?.name).toBe(
      changed.name,
    );
    expect(sql.prepare("SELECT COUNT(*) n FROM products").get()?.n).toBe(0);
  });
  it("claims only once, blocks wrong identity, requires public proof and reconciles uncertain outcomes before retry", async () => {
    const env = environment();
    await create(env);
    await call(env, `/${id}/approve`, { expectedVersion: 1, channel: "emag" });
    const claim = {
      expectedVersion: 1,
      channel: "emag",
      observedAccount: facts().channels.emag.account,
    };
    expect(
      (await call(env, `/${id}/claim`, { ...claim, observedAccount: "Alt seller" })).status,
    ).toBe(409);
    const claimed = await call(env, `/${id}/claim`, claim);
    expect(claimed.status).toBe(200);
    expect((await call(env, `/${id}/claim`, claim)).status).toBe(409);
    expect((await call(env, `/${id}`, { expectedVersion: 1, data: facts() })).status).toBe(409);
    const result = {
      expectedVersion: 1,
      channel: "emag",
      operationId: claimed.data.operationId,
      status: "published_manual",
      listingUrl: "https://marketplace.emag.ro/",
      evidence: "Verificare sintetică de rezultat și identitate.",
    };
    expect((await call(env, `/${id}/result`, result)).status).toBe(400);
    expect((await call(env, `/${id}/result`, { ...result, status: "uncertain" })).status).toBe(200);
    expect(
      (await call(env, `/${id}/approve`, { expectedVersion: 1, channel: "emag" })).status,
    ).toBe(409);
    expect(
      (
        await call(env, `/${id}/reconcile`, {
          ...result,
          listingUrl: "https://www.emag.ro/produs-sintetic/pd/TEST",
        })
      ).status,
    ).toBe(200);
    expect(
      sql.prepare("SELECT status FROM approval_requests WHERE entity_type='dropshipping'").get()
        ?.status,
    ).toBe("executed");
    expect(
      sql.prepare("SELECT status,published_revision FROM dropshipping_placements").get(),
    ).toMatchObject({ status: "published_manual", published_revision: 1 });
    expect(
      (
        await call(env, `/${id}/result`, {
          ...result,
          listingUrl: "https://www.emag.ro/produs-sintetic/pd/TEST",
        })
      ).status,
    ).toBe(409);
  });
  it("requires renewed approval after expiry, expired quotation, missing image or changed rights", async () => {
    const env = environment();
    const data = facts();
    data.quoteValidUntil = "2000-01-01";
    await create(env, data);
    expect(
      (await call(env, `/${id}/approve`, { expectedVersion: 1, channel: "emag" })).status,
    ).toBe(409);
    await call(env, `/${id}`, { expectedVersion: 1, data: facts() });
    sql.prepare("DELETE FROM dropshipping_assets").run();
    expect(
      (await call(env, `/${id}/approve`, { expectedVersion: 2, channel: "emag" })).status,
    ).toBe(409);
    sql
      .prepare(
        "INSERT INTO dropshipping_assets(id,opportunity_id,channel,r2_key,checksum_sha256,width,height,rights_evidence) VALUES(?,?,'emag','test','hash',1200,1200,?)",
      )
      .run(asset, id, facts().rightsEvidence);
    expect(
      (await call(env, `/${id}/approve`, { expectedVersion: 2, channel: "emag" })).status,
    ).toBe(200);
    sql.exec("UPDATE approval_requests SET expires_at='2000-01-01'");
    expect(
      (
        await call(env, `/${id}/claim`, {
          expectedVersion: 2,
          channel: "emag",
          observedAccount: facts().channels.emag.account,
        })
      ).status,
    ).toBe(409);
  });
  it("renews expired approval with an immutable receipt and preserves the update target after publication", async () => {
    const env = environment();
    await create(env);
    const first = await call(env, `/${id}/approve`, { expectedVersion: 1, channel: "emag" });
    sql
      .prepare("UPDATE approval_requests SET expires_at='2000-01-01' WHERE id=?")
      .run(String(first.data.approvalId));
    const renewed = await call(env, `/${id}/approve`, { expectedVersion: 1, channel: "emag" });
    expect(renewed.status).toBe(200);
    expect(renewed.data.approvalId).not.toBe(first.data.approvalId);
    expect(
      sql
        .prepare("SELECT COUNT(*) n FROM approval_receipts WHERE approval_request_id=?")
        .get(String(renewed.data.approvalId))?.n,
    ).toBe(1);
    const claimed = await call(env, `/${id}/claim`, {
      expectedVersion: 1,
      channel: "emag",
      observedAccount: facts().channels.emag.account,
    });
    const listingUrl = "https://www.emag.ro/produs-sintetic/pd/TEST";
    expect(
      (
        await call(env, `/${id}/result`, {
          expectedVersion: 1,
          channel: "emag",
          operationId: claimed.data.operationId,
          status: "published_manual",
          listingUrl,
          evidence: "Dovadă sintetică numai pentru test, fără publicare reală.",
        })
      ).status,
    ).toBe(200);
    expect(
      (await call(env, `/${id}/approve`, { expectedVersion: 1, channel: "emag" })).status,
    ).toBe(409);
    expect(
      (
        await call(env, `/${id}`, {
          expectedVersion: 1,
          data: { ...facts(), name: "Lampă actualizată" },
        })
      ).status,
    ).toBe(200);
    expect(
      (await call(env, `/${id}/approve`, { expectedVersion: 2, channel: "emag" })).status,
    ).toBe(200);
    const snapshot = JSON.parse(
      String(sql.prepare("SELECT snapshot_json FROM dropshipping_placements").get()?.snapshot_json),
    );
    expect(snapshot).toMatchObject({
      operation: "update",
      previousListingUrl: listingUrl,
      revision: 2,
    });
  });
  it("uses bounded, authenticated, same-origin requests and never fetches supplier URLs", async () => {
    const env = environment();
    allowed = false;
    expect((await call(env)).status).toBe(401);
    allowed = true;
    expect(
      (await handleDropshipping(request("", { id, data: facts() }, "https://evil.test"), env))
        ?.status,
    ).toBe(403);
    const large = await handleDropshipping(
      request("", { id, data: { ...facts(), facts: "x".repeat(65000) } }),
      env,
    );
    expect(large?.status).toBe(413);
    expect(
      (
        await call(env, "", {
          id,
          data: { ...facts(), supplierUrl: "https://user:secret@evil.test/" },
        })
      ).status,
    ).toBe(400);
    expect(validListingUrl("emag", "https://emag.ro.evil.test/product")).toBe(false);
    expect(validListingUrl("website", "https://cutiutamagica.eu/admin/products")).toBe(false);
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await create(env);
    await call(env, `/${id}/approve`, { expectedVersion: 1, channel: "emag" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("finishes inference with a reviewable draft, reuses it and rejects malformed output without overwriting facts", async () => {
    const env = environment();
    await create(env);
    env.DROPSHIPPING_AI_PLAN = "unverified";
    expect(
      (await call(env, `/${id}/generate`, { expectedVersion: 1, channel: "emag" })).status,
    ).toBe(409);
    expect(env.AI.run).not.toHaveBeenCalled();
    env.DROPSHIPPING_AI_PLAN = "free";
    const first = await call(env, `/${id}/generate`, { expectedVersion: 1, channel: "emag" });
    expect(first.status).toBe(200);
    expect(first.data).toMatchObject({ state: "draft", reviewRequired: true });
    expect(
      sql.prepare("SELECT status FROM ai_runs WHERE id=?").get(String(first.data.runId))?.status,
    ).toBe("completed");
    expect(
      sql.prepare("SELECT COUNT(*) n FROM approval_requests WHERE entity_type='dropshipping'").get()
        ?.n,
    ).toBe(0);
    expect(
      (await call(env, `/${id}/generate`, { expectedVersion: 1, channel: "emag" })).data.cached,
    ).toBe(true);
    expect(env.AI.run).toHaveBeenCalledTimes(1);
    expect(sql.prepare("SELECT version FROM dropshipping_opportunities").get()?.version).toBe(1);
    vi.mocked(env.AI.run).mockResolvedValueOnce({ response: "unstructured" });
    expect(
      (await call(env, `/${id}/generate`, { expectedVersion: 1, channel: "trendyol" })).status,
    ).toBe(502);
    expect(sql.prepare("SELECT COUNT(*) n FROM ai_runs WHERE status='failed'").get()?.n).toBe(1);
  });
  it("caps daily AI/search work atomically, counts failures and does not choose a paid fallback", async () => {
    const env = environment();
    await create(env);
    for (let i = 0; i < 8; i++)
      sql
        .prepare(
          "INSERT INTO ai_runs(id,agent_id,trigger_type,status) VALUES(?,'agent_dropshipping','manual','failed')",
        )
        .run(`run-${i}`);
    expect(
      (await call(env, `/${id}/generate`, { expectedVersion: 1, channel: "emag" })).status,
    ).toBe(429);
    expect(env.AI.run).not.toHaveBeenCalled();
  });
  it("respects the shared supplier-research switch and budget in both workspaces", async () => {
    const env = Object.assign(environment(), { BRAVE_SEARCH_API_KEY: "synthetic-search-key" });
    await create(env);
    const fetchMock = vi.spyOn(globalThis, "fetch");
    expect((await call(env, `/${id}/research`, { expectedVersion: 1 })).status).toBe(409);
    await saveSetting(
      env.DB,
      "supplier_research",
      { enabled: true, maxDailyRuns: 1 },
      "dropship-test-admin",
    );
    sql
      .prepare(
        "INSERT INTO products(id,slug,name,category) VALUES('budget-product','budget-product','Produs test','Test')",
      )
      .run();
    sql
      .prepare(
        "INSERT INTO supplier_research_runs(id,product_id,query,status,created_at) VALUES('existing-search','budget-product','synthetic','failed',?)",
      )
      .run(new Date().toISOString());
    expect((await call(env, `/${id}/research`, { expectedVersion: 1 })).status).toBe(429);
    sql.prepare("DELETE FROM supplier_research_runs WHERE id='existing-search'").run();
    sql
      .prepare(
        "INSERT INTO ai_runs(id,agent_id,trigger_type,status,input_json) VALUES('dropship-search','agent_dropshipping','manual','failed',?)",
      )
      .run(JSON.stringify({ kind: "supplier_search", opportunityId: id }));
    await expect(researchProduct(env, "budget-product")).rejects.toThrow(/limita zilnică/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("marks abandoned execution uncertain and requires reconciliation before editing", async () => {
    const env = environment();
    await create(env);
    await call(env, `/${id}/approve`, { expectedVersion: 1, channel: "emag" });
    await call(env, `/${id}/claim`, {
      expectedVersion: 1,
      channel: "emag",
      observedAccount: facts().channels.emag.account,
    });
    sql.exec("UPDATE dropshipping_placements SET started_at='2000-01-01'");
    const detail = await call(env, `/${id}`);
    expect((detail.data.placements as Array<{ status: string }>)[0].status).toBe("uncertain");
    expect((await call(env, `/${id}/archive`, { expectedVersion: 1 })).status).toBe(409);
  });
  it("serves private images only to authenticated admins and checks binary limits and dimensions", async () => {
    const env = environment();
    await create(env);
    const upload = new Request(root + `/${id}/image?channel=emag`, {
      method: "POST",
      headers: {
        origin: "https://test.local",
        "content-type": "image/png",
        "x-rights-evidence": encodeURIComponent(facts().rightsEvidence),
      },
      body: new Uint8Array(40),
    });
    expect((await handleDropshipping(upload, env))?.status).toBe(400);
    const png = Uint8Array.from(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5N8AAAAASUVORK5CYII=",
        "base64",
      ),
    );
    const source = new Request(root + `/${id}/image?channel=source`, {
      method: "POST",
      headers: {
        origin: "https://test.local",
        "content-type": "image/png",
        "x-rights-evidence": encodeURIComponent(facts().rightsEvidence),
      },
      body: png,
    });
    const uploaded = (await handleDropshipping(source, env))!;
    expect(uploaded.status).toBe(200);
    const payload = (await uploaded.json()) as { data: { id: string } };
    const image = (await handleDropshipping(request(`/${payload.data.id}/image`), env))!;
    expect(image.status).toBe(200);
    expect(image.headers.get("cache-control")).toContain("no-store");
    expect(image.headers.get("content-type")).toBe("image/png");
    allowed = false;
    expect((await call(env, `/${asset}/image`)).status).toBe(401);
  });
});
