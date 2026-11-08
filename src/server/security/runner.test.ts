import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash, createHmac } from "node:crypto";
import { securityDatabase } from "./testing/database";
import { issueServiceIdentity, revokeServiceIdentity } from "./service-identities";
import type { CommerceEnv } from "../integrations/provider-runtime";
vi.mock("@/lib/admin-auth", () => ({ authenticateAdminRequest: vi.fn() }));
import { __runnerSecurity } from "../api/admin-ai-studio";
const open: ReturnType<typeof securityDatabase>[] = [];
afterEach(() => {
  for (const d of open.splice(0)) d.sql.close();
});
function fixture() {
  const d = securityDatabase();
  open.push(d);
  return {
    ...d,
    env: {
      DB: d.db,
      INTEGRATION_ENCRYPTION_KEY: btoa("R".repeat(32)),
      AI_STUDIO_RUNNER_HMAC_SECRET: "test-legacy-runner-key",
    } as Env & CommerceEnv & { AI_STUDIO_RUNNER_HMAC_SECRET: string },
    actor: (d.sql.prepare("SELECT id FROM admin_users LIMIT 1").get() as { id: string }).id,
  };
}
function signed(
  id: string,
  secret: string,
  version = "2",
  options: { nonce?: string; timestamp?: number; signedId?: string; payload?: string } = {},
) {
  const path = "/api/v1/integrations/ai-studio/runner/heartbeat",
    bytes = new TextEncoder().encode(options.payload || JSON.stringify({ runnerId: id }));
  const timestamp = String(options.timestamp ?? Date.now()),
    nonce = options.nonce || crypto.randomUUID().replaceAll("-", "");
  const hash = createHash("sha256").update(bytes).digest("hex");
  const message = (
    version === "2"
      ? [options.signedId || id, "POST", path, timestamp, nonce, hash]
      : ["POST", path, timestamp, nonce, hash]
  ).join("\n");
  return {
    bytes,
    request: new Request("https://api.cutiutamagica.eu" + path, {
      method: "POST",
      headers: {
        "x-ai-runner-id": id,
        "x-ai-signature-version": version,
        "x-ai-runner-timestamp": timestamp,
        "x-ai-runner-nonce": nonce,
        "x-ai-content-sha256": hash,
        "x-ai-runner-signature": createHmac("sha256", secret).update(message).digest("hex"),
      },
      body: bytes,
    }),
  };
}
describe("AI runner protocol", () => {
  it("preserves legacy v1 and rejects replay, tampering, expired requests and incorrect keys", async () => {
    const f = fixture();
    const valid = signed("legacy-runner", f.env.AI_STUDIO_RUNNER_HMAC_SECRET, "1");
    expect(
      await __runnerSecurity.verifyRunnerRequest(valid.request, f.env, valid.bytes),
    ).toMatchObject({ runnerId: "legacy-runner" });
    await expect(
      __runnerSecurity.verifyRunnerRequest(valid.request, f.env, valid.bytes),
    ).rejects.toMatchObject({ statusCode: 409 });
    for (const item of [
      signed("legacy-runner", "wrong-key"),
      signed("legacy-runner", f.env.AI_STUDIO_RUNNER_HMAC_SECRET, "2", {
        timestamp: Date.now() - 600_000,
      }),
    ])
      await expect(
        __runnerSecurity.verifyRunnerRequest(item.request, f.env, item.bytes),
      ).rejects.toMatchObject({ statusCode: 401 });
    const item = signed("legacy-runner", f.env.AI_STUDIO_RUNNER_HMAC_SECRET);
    await expect(
      __runnerSecurity.verifyRunnerRequest(
        item.request,
        f.env,
        new TextEncoder().encode("tampered"),
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
  it("requires v2 and binds per-runner keys and IDs before any job or asset is accepted", async () => {
    const f = fixture();
    const a = await issueServiceIdentity(
      f.env,
      new Request("https://app.cutiutamagica.eu/"),
      f.actor,
      { id: "runner-a", label: "Runner A" },
    );
    const b = await issueServiceIdentity(
      f.env,
      new Request("https://app.cutiutamagica.eu/"),
      f.actor,
      { id: "runner-b", label: "Runner B" },
    );
    const valid = signed("runner-a", a.secret);
    await expect(
      __runnerSecurity.verifyRunnerRequest(valid.request, f.env, valid.bytes),
    ).resolves.toMatchObject({ runnerId: "runner-a" });
    for (const item of [
      signed("runner-a", a.secret, "1"),
      signed("runner-b", a.secret),
      signed("runner-b", b.secret, "2", { signedId: "runner-a" }),
    ])
      await expect(
        __runnerSecurity.verifyRunnerRequest(item.request, f.env, item.bytes),
      ).rejects.toMatchObject({ statusCode: 401 });
    await revokeServiceIdentity(
      f.env,
      new Request("https://app.cutiutamagica.eu/"),
      f.actor,
      "runner-a",
    );
    const revoked = signed("runner-a", a.secret);
    await expect(
      __runnerSecurity.verifyRunnerRequest(revoked.request, f.env, revoked.bytes),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
