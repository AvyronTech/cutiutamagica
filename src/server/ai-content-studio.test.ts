import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash, createHmac } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("cloudflare:workers", () => ({ env: {} }));
vi.mock("@/lib/admin-auth", () => ({
  authenticateAdminRequest: async () => ({
    id: "admin_cutiutamagica_gmail",
    email: "cutiutamagica@gmail.com",
    permissions: ["marketing.agent.read", "marketing.agent.manage", "marketing.write"],
    mustChangePassword: false,
  }),
}));

const databases: DatabaseSync[] = [];

function database() {
  const sql = new DatabaseSync(":memory:");
  databases.push(sql);
  for (const name of readdirSync(resolve("cloudflare/d1/migrations")).sort()) {
    sql.exec(readFileSync(resolve("cloudflare/d1/migrations", name), "utf8"));
  }
  const prepare = (query: string) => {
    let values: Array<string | number | null> = [];
    const statement = {
      bind(...args: Array<string | number | null>) {
        values = args;
        return statement;
      },
      async first<T>() {
        return (sql.prepare(query).get(...values) as T | undefined) ?? null;
      },
      async all<T>() {
        return { success: true, results: sql.prepare(query).all(...values) as T[] };
      },
      async run() {
        const result = sql.prepare(query).run(...values);
        return { success: true, results: [], meta: { changes: Number(result.changes) } };
      },
    };
    return statement;
  };
  const db = {
    prepare,
    async batch(statements: Array<ReturnType<typeof prepare>>) {
      sql.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sql.exec("COMMIT");
        return results;
      } catch (error) {
        sql.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as D1Database;
  return { db, sql };
}

function signedRequest(secret: string, nonce: string, payload: object) {
  const path = "/api/v1/integrations/ai-studio/runner/heartbeat";
  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const hash = createHash("sha256").update(body).digest("hex");
  const signature = createHmac("sha256", secret)
    .update(["POST", path, timestamp, nonce, hash].join("\n"))
    .digest("hex");
  return new Request(`https://cutiutamagica.eu${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ai-runner-id": "cutiuta-imac-test",
      "x-ai-runner-timestamp": timestamp,
      "x-ai-runner-nonce": nonce,
      "x-ai-content-sha256": hash,
      "x-ai-runner-signature": `sha256=${signature}`,
    },
    body,
  });
}

afterEach(() => {
  for (const db of databases.splice(0)) db.close();
});

describe("local AI content studio", () => {
  it("seeds only official model metadata and keeps every provider inactive until a real heartbeat", () => {
    const { sql } = database();
    const models = sql
      .prepare(
        `SELECT provider, modality, official_repository_url, license_spdx, status
         FROM ai_model_profiles ORDER BY modality`,
      )
      .all();
    expect(models).toHaveLength(3);
    expect(models.every((model) => model.status === "setup_required")).toBe(true);
    expect(
      models.every((model) =>
        String(model.official_repository_url).startsWith("https://github.com/"),
      ),
    ).toBe(true);
    expect(models.every((model) => model.license_spdx === "Apache-2.0")).toBe(true);

    const settings = sql
      .prepare("SELECT value_json FROM operational_settings WHERE key = 'ai.content_studio'")
      .get() as { value_json: string };
    expect(JSON.parse(settings.value_json)).toMatchObject({
      approvalRequired: true,
      autoPublish: false,
      protectProductPixels: true,
      allowThirdPartyNodes: false,
    });
    expect(settings.value_json).not.toMatch(/password|api[_-]?key|token/i);
  });

  it("accepts an authentic heartbeat, activates verified capabilities and rejects replay", async () => {
    const { handleAdminAiStudioApi } = await import("./api/admin-ai-studio");
    const { db, sql } = database();
    const secret = "unit-test-ai-runner-secret";
    const nonce = "nonce_for_ai_test_000001";
    const payload = {
      runnerId: "cutiuta-imac-test",
      version: "1.0.0-test",
      providers: {
        ollama: { healthy: true, models: ["qwen3:8b"], selectedModel: "qwen3:8b" },
        comfyui: { healthy: true, capabilities: ["image", "video"] },
      },
    };
    const env = { DB: db, AI_STUDIO_RUNNER_HMAC_SECRET: secret } as unknown as Env;

    const accepted = await handleAdminAiStudioApi(signedRequest(secret, nonce, payload), env);
    expect(accepted?.status).toBe(200);
    expect(
      sql.prepare("SELECT COUNT(*) AS count FROM ai_model_profiles WHERE status = 'active'").get(),
    ).toMatchObject({ count: 3 });
    expect(
      sql
        .prepare(
          "SELECT COUNT(*) AS count FROM account_connections WHERE provider IN ('ollama_local','comfyui_local') AND status = 'active'",
        )
        .get(),
    ).toMatchObject({ count: 2 });

    const replay = await handleAdminAiStudioApi(signedRequest(secret, nonce, payload), env);
    expect(replay?.status).toBe(409);
  });

  it("does not activate the text profile when the selected Ollama model differs", async () => {
    const { handleAdminAiStudioApi } = await import("./api/admin-ai-studio");
    const { db, sql } = database();
    const secret = "unit-test-ai-runner-secret";
    const response = await handleAdminAiStudioApi(
      signedRequest(secret, "nonce_for_ai_test_000002", {
        runnerId: "cutiuta-imac-test",
        version: "1.1.0-test",
        providers: {
          ollama: { healthy: true, models: ["qwen3:8b", "qwen3:4b"], selectedModel: "qwen3:4b" },
          comfyui: { healthy: false, capabilities: [] },
        },
      }),
      { DB: db, AI_STUDIO_RUNNER_HMAC_SECRET: secret } as unknown as Env,
    );
    expect(response?.status).toBe(200);
    expect(
      sql.prepare("SELECT status FROM ai_model_profiles WHERE id='ai_model_qwen3_ollama'").get(),
    ).toMatchObject({ status: "degraded" });
  });

  it("persists one dashboard review without publishing generated content", async () => {
    const { handleAdminAiStudioApi } = await import("./api/admin-ai-studio");
    const { db, sql } = database();
    const jobId = "aij_review_test";
    const approvalId = "approval_review_test";
    const runId = "air_review_test";
    sql
      .prepare(
        `INSERT INTO ai_runs(id,agent_id,trigger_type,status)
      VALUES(?1,'agent_marketing_orders','manual','awaiting_approval')`,
      )
      .run(runId);
    sql
      .prepare(
        `INSERT INTO approval_requests(id,request_type,entity_type,entity_id,risk_level,summary,proposed_action_json,status,requested_by_agent_id)
      VALUES(?1,'ai.generated_content.review','ai_generation_job',?2,'medium','Text de verificat','{}','pending','agent_marketing_orders')`,
      )
      .run(approvalId, jobId);
    sql
      .prepare(
        `INSERT INTO ai_generation_jobs(id,agent_id,model_profile_id,ai_run_id,modality,purpose,channel,aspect_ratio,prompt_text,idempotency_key,status,output_text,approval_request_id)
      VALUES(?1,'agent_marketing_orders','ai_model_qwen3_ollama',?2,'text','social_post','instagram','4:5','Text pentru produsul real','review-test-key','awaiting_review','Ciornă de test',?3)`,
      )
      .run(jobId, runId, approvalId);
    const request = () =>
      new Request(`https://cutiutamagica.eu/api/v1/admin/ai-studio/jobs/${jobId}/review`, {
        method: "POST",
        headers: { origin: "https://cutiutamagica.eu", "content-type": "application/json" },
        body: JSON.stringify({ decision: "approved" }),
      });
    const env = { DB: db } as unknown as Env;
    const reviewed = await handleAdminAiStudioApi(request(), env);
    expect(reviewed?.status).toBe(200);
    expect(
      sql.prepare("SELECT status FROM ai_generation_jobs WHERE id=?1").get(jobId),
    ).toMatchObject({ status: "completed" });
    expect(
      sql.prepare("SELECT status FROM approval_requests WHERE id=?1").get(approvalId),
    ).toMatchObject({ status: "approved" });
    expect(
      sql
        .prepare("SELECT COUNT(*) AS count FROM audit_log WHERE action='ai.studio.job.approved'")
        .get(),
    ).toMatchObject({ count: 1 });
    const reviewPayload = (await reviewed?.json()) as { data?: { publication?: string } };
    expect(reviewPayload.data).toMatchObject({ publication: "none" });
    expect((await handleAdminAiStudioApi(request(), env))?.status).toBe(409);
  });
});
