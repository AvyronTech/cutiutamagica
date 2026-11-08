import { afterEach, describe, expect, it, vi } from "vitest";
import { securityDatabase } from "./testing/database";
import { processAvyronSync, isAggregateStatistics } from "../queue/avyron-sync-consumer";
import { digestHex } from "../integrations/provider-runtime";
const opened: ReturnType<typeof securityDatabase>[] = [];
afterEach(() => {
  opened.splice(0).forEach((d) => d.sql.close());
  vi.unstubAllGlobals();
});
const payload = () => ({
  schemaVersion: 1,
  source: "cutiuta-magica",
  scope: "aggregated_statistics",
  generatedAt: new Date().toISOString(),
  personalDataIncluded: false,
  data: {
    social: { total: 2 },
    approvals: { total: 1 },
    agentRuns: { total: 0 },
    catalog: { total: 1 },
    orders: { total: 3 },
    storage: { total: 0 },
  },
});
async function fixture(status = "queued", approval = "approved", value = payload()) {
  const d = securityDatabase();
  opened.push(d);
  const body = JSON.stringify(value),
    hash = await digestHex("SHA-256", body);
  d.sql
    .prepare(
      `INSERT INTO approval_requests(id,request_type,entity_type,entity_id,risk_level,summary,proposed_action_json,status)
    VALUES('approval','avyron.agent.exchange','agent_exchange','exchange','medium','Test',?,?)`,
    )
    .run(JSON.stringify({ exchangeId: "exchange", payloadHash: hash }), approval);
  d.sql
    .prepare(
      `INSERT INTO agent_exchange_items(id,agent_id,direction,exchange_type,source_system,destination_system,payload_json,payload_hash,idempotency_key,status,approval_request_id)
    VALUES('exchange','agent_marketing_orders','outbound','stats_snapshot','cutiuta-magica','avyron-os',?,?,'test-exchange',?,'approval')`,
    )
    .run(body, hash, status);
  d.sql
    .exec(`UPDATE avyron_sync_targets SET status='active',agent_exchange_endpoint_url='https://api.avyron.eu/stats' WHERE code='avyron-os';
    UPDATE operational_settings SET value_json='{"avyron":{"enabled":true,"shareAggregatedStats":true}}' WHERE key='agent.marketing_orders';`);
  const fetcher = vi.fn(
    async (_url: URL | RequestInfo, _init?: RequestInit) => new Response(null, { status: 204 }),
  );
  vi.stubGlobal("fetch", fetcher);
  const env = { DB: d.db, AVYRON_SYNC_HMAC_SECRET: "synthetic-queue-fixture" } as unknown as Env;
  const run = () =>
    processAvyronSync(env, { version: 1, kind: "avyron.agent.exchange", exchangeId: "exchange" });
  return { ...d, env, fetcher, run };
}
describe("AVYRON aggregate-only execution boundary", () => {
  it("rejects personal fields, text disguised as counters and extra envelope keys", () => {
    expect(isAggregateStatistics(payload())).toBe(true);
    expect(isAggregateStatistics({ ...payload(), email: "private@example.test" })).toBe(false);
    expect(
      isAggregateStatistics({
        ...payload(),
        data: { ...payload().data, orders: { total: "private@example.test" } },
      }),
    ).toBe(false);
  });
  it.each([
    ["pending_approval", "approved"],
    ["rejected", "approved"],
    ["queued", "rejected"],
    ["queued", "pending"],
  ])("never executes state %s with approval %s", async (status, approval) => {
    const f = await fixture(status, approval);
    await f.run();
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it("rechecks approved hash, expiry and payload before sending", async () => {
    const f = await fixture();
    f.sql.exec("UPDATE approval_requests SET expires_at='2000-01-01T00:00:00.000Z'");
    await f.run();
    expect(f.fetcher).not.toHaveBeenCalled();
    f.sql.exec(
      "UPDATE approval_requests SET expires_at=NULL; UPDATE agent_exchange_items SET payload_json='{}'",
    );
    await f.run();
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it("uses the exchange endpoint, rejects redirects and claims concurrent delivery only once", async () => {
    const f = await fixture();
    await Promise.all([f.run(), f.run()]);
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect(String(f.fetcher.mock.calls[0][0])).toBe("https://api.avyron.eu/stats");
    expect(f.fetcher.mock.calls[0][1]).toMatchObject({ redirect: "error", method: "POST" });
    await f.run();
    expect(f.fetcher).toHaveBeenCalledTimes(1);
    expect(f.sql.prepare("SELECT status FROM agent_exchange_items").get()?.status).toBe("sent");
  });
  it.each([
    "https://127.0.0.1/internal",
    "https://evil.invalid/",
    "https://api.avyron.eu:8443/",
    "https://user:pass@api.avyron.eu/",
  ])("refuses untrusted destination %s", async (url) => {
    const f = await fixture();
    f.sql.prepare("UPDATE avyron_sync_targets SET agent_exchange_endpoint_url=?").run(url);
    await f.run();
    expect(f.fetcher).not.toHaveBeenCalled();
  });
  it("blocks legacy skills/assets even when settings and secrets exist", async () => {
    const f = await fixture();
    f.sql.exec("UPDATE agent_exchange_items SET exchange_type='skill_package'");
    await f.run();
    await processAvyronSync(f.env, { version: 1, kind: "avyron.asset.sync", jobId: "absent" });
    expect(f.fetcher).not.toHaveBeenCalled();
  });
});
