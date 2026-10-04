import { z } from "zod";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import { boundedBytes, boundedJson } from "@/server/api/bounded-json";
import { getMarketingOrdersSkillPackage } from "@/server/agents/marketing-orders-manifest";

type AiStudioEnv = Env & { AI_STUDIO_RUNNER_HMAC_SECRET?: string };
type Modality = "text" | "image" | "video";

const createJobSchema = z.object({
  modality: z.enum(["text", "image", "video"]),
  purpose: z.enum(["social_post", "story", "reel", "tiktok", "campaign", "product_visual"]),
  productId: z.string().min(1).max(120).nullable().optional(),
  channel: z.enum(["facebook", "instagram", "tiktok", "website", "multi_channel"]),
  aspectRatio: z.enum(["1:1", "4:5", "9:16", "16:9"]),
  prompt: z.string().trim().min(12).max(4_000),
  idempotencyKey: z.string().uuid(),
});

const heartbeatSchema = z.object({
  runnerId: z.string().min(3).max(100),
  version: z.string().min(1).max(80),
  providers: z.object({
    ollama: z.object({ healthy: z.boolean(), models: z.array(z.string().max(120)).max(50) }),
    comfyui: z.object({
      healthy: z.boolean(),
      capabilities: z.array(z.enum(["image", "video"])).max(2),
    }),
  }),
});

const claimSchema = z.object({
  runnerId: z.string().min(3).max(100),
  capabilities: z
    .array(z.enum(["text", "image", "video"]))
    .min(1)
    .max(3),
});

const resultSchema = z.object({
  runnerId: z.string().min(3).max(100),
  status: z.enum(["completed", "failed"]),
  outputText: z.string().max(100_000).nullable().optional(),
  assetIds: z
    .array(z.string().regex(/^[a-zA-Z0-9_-]{8,120}$/))
    .max(8)
    .default([]),
  errorMessage: z.string().max(2_000).nullable().optional(),
});

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("cache-control", "private, no-store");
  return Response.json(data, { ...init, headers });
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function statusCode(error: unknown): number {
  if (error && typeof error === "object" && "statusCode" in error) {
    return Number((error as { statusCode: unknown }).statusCode) || 500;
  }
  return 500;
}

async function sha256Bytes(value: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(value).buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

async function registerRunnerNonce(
  env: AiStudioEnv,
  runnerId: string,
  nonce: string,
): Promise<boolean> {
  const result = await env.DB.prepare(
    `INSERT OR IGNORE INTO ai_runner_nonces (nonce, runner_id, expires_at)
     VALUES (?1, ?2, datetime('now', '+10 minutes'))`,
  )
    .bind(nonce, runnerId)
    .run();
  await env.DB.prepare("DELETE FROM ai_runner_nonces WHERE expires_at < datetime('now')").run();
  return Number(result.meta?.changes ?? 0) === 1;
}

async function verifyRunnerRequest(
  request: Request,
  env: AiStudioEnv,
  bodyBytes?: Uint8Array,
): Promise<{ runnerId: string; bodyBytes: Uint8Array }> {
  if (!env.AI_STUDIO_RUNNER_HMAC_SECRET) {
    throw Object.assign(new Error("Runnerul local nu este configurat."), { statusCode: 503 });
  }
  const runnerId = request.headers.get("x-ai-runner-id") ?? "";
  const timestamp = request.headers.get("x-ai-runner-timestamp") ?? "";
  const nonce = request.headers.get("x-ai-runner-nonce") ?? "";
  const declaredHash = request.headers.get("x-ai-content-sha256") ?? "";
  const supplied = (request.headers.get("x-ai-runner-signature") ?? "").replace(/^sha256=/, "");
  const timestampNumber = Number(timestamp);
  if (
    !runnerId ||
    !/^[a-zA-Z0-9._-]{3,100}$/.test(runnerId) ||
    !/^[a-zA-Z0-9_-]{16,120}$/.test(nonce) ||
    !/^[a-f0-9]{64}$/.test(declaredHash) ||
    !Number.isFinite(timestampNumber) ||
    Math.abs(Date.now() - timestampNumber) > 300_000
  ) {
    throw Object.assign(new Error("Semnătura runnerului este expirată sau invalidă."), {
      statusCode: 401,
    });
  }
  const bytes = bodyBytes ?? new Uint8Array();
  if (bodyBytes && !constantTimeEqual(await sha256Bytes(bytes), declaredHash)) {
    throw Object.assign(new Error("Conținutul nu corespunde amprentei declarate."), {
      statusCode: 401,
    });
  }
  const url = new URL(request.url);
  const signedValue = [request.method, url.pathname, timestamp, nonce, declaredHash].join("\n");
  const expected = await hmac(env.AI_STUDIO_RUNNER_HMAC_SECRET, signedValue);
  if (!constantTimeEqual(supplied, expected)) {
    throw Object.assign(new Error("Semnătura runnerului nu este validă."), { statusCode: 401 });
  }
  if (!(await registerRunnerNonce(env, runnerId, nonce))) {
    throw Object.assign(new Error("Cererea runnerului a fost deja procesată."), {
      statusCode: 409,
    });
  }
  return { runnerId, bodyBytes: bytes };
}

async function signedJson<T extends z.ZodTypeAny>(
  request: Request,
  env: AiStudioEnv,
  schema: T,
): Promise<{ runnerId: string; data: z.infer<T> }> {
  const bytes = await boundedBytes(request, 131_072);
  const verified = await verifyRunnerRequest(request, env, bytes);
  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(verified.bodyBytes));
  } catch {
    throw Object.assign(new Error("Cererea JSON nu este validă."), { statusCode: 400 });
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success || parsed.data.runnerId !== verified.runnerId) {
    throw Object.assign(new Error("Datele runnerului nu sunt valide."), { statusCode: 400 });
  }
  return { runnerId: verified.runnerId, data: parsed.data };
}

async function getStudioState(request: Request, env: Env): Promise<Response> {
  await authenticateAdminRequest(request, env, "marketing.agent.read");
  const [models, jobs, connections, products, settings] = await Promise.all([
    env.DB.prepare(
      `SELECT id, provider, modality, label, runtime_model_id, official_repository_url,
              license_spdx, settings_json, status, last_verified_at, last_error_message
       FROM ai_model_profiles ORDER BY CASE modality WHEN 'text' THEN 1 WHEN 'image' THEN 2 ELSE 3 END`,
    ).all(),
    env.DB.prepare(
      `SELECT j.id, j.modality, j.purpose, j.channel, j.aspect_ratio, j.prompt_text,
              j.status, j.output_text, j.error_message, j.product_id, j.runner_id,
              j.created_at, j.completed_at, p.name AS product_name, m.label AS model_label,
              (SELECT COUNT(*) FROM ai_generation_assets a WHERE a.job_id = j.id) AS asset_count
       FROM ai_generation_jobs j
       JOIN ai_model_profiles m ON m.id = j.model_profile_id
       LEFT JOIN products p ON p.id = j.product_id
       ORDER BY j.created_at DESC LIMIT 40`,
    ).all(),
    env.DB.prepare(
      `SELECT id, provider, label, status, scopes_json, last_verified_at, notes
       FROM account_connections WHERE provider IN ('ollama_local', 'comfyui_local')
       ORDER BY provider`,
    ).all(),
    env.DB.prepare(
      `SELECT id, name, slug FROM products
       WHERE product_type = 'music_box' AND status = 'active'
       ORDER BY name`,
    ).all(),
    env.DB.prepare(
      "SELECT value_json, version, updated_at FROM operational_settings WHERE key = 'ai.content_studio'",
    ).first<{ value_json: string; version: number; updated_at: string }>(),
  ]);
  return json({
    data: {
      models: models.results,
      jobs: jobs.results,
      connections: connections.results,
      products: products.results,
      settings: settings ? JSON.parse(settings.value_json) : null,
      settingsVersion: settings?.version ?? 0,
      settingsUpdatedAt: settings?.updated_at ?? null,
      security: {
        localPullRunner: true,
        secretsStoredInDatabase: false,
        publicOutputs: false,
        approvalRequired: true,
      },
    },
  });
}

async function productContext(env: Env, productId: string | null | undefined) {
  if (!productId) return null;
  const [product, media] = await Promise.all([
    env.DB.prepare(
      `SELECT id, slug, name, tagline, short_description, description, story, category,
              material, dimensions_text, weight_g, rights_status, details_json
       FROM products WHERE id = ?1 AND product_type = 'music_box' AND status = 'active'`,
    )
      .bind(productId)
      .first<Record<string, unknown>>(),
    env.DB.prepare(
      `SELECT id, media_type, alt_text, mime_type, width, height, slot_code, is_primary
       FROM product_media
       WHERE product_id = ?1 AND status = 'active' AND public_access = 1
         AND marketing_approved = 1 AND rights_status = 'cleared'
       ORDER BY is_primary DESC, sort_order, created_at LIMIT 12`,
    )
      .bind(productId)
      .all<Record<string, unknown>>(),
  ]);
  if (!product) {
    throw Object.assign(new Error("Produsul nu există sau nu este disponibil."), {
      statusCode: 404,
    });
  }
  return {
    ...product,
    approvedMedia: media.results.map((item) => ({
      ...item,
      sourceUrl: `${env.PUBLIC_SITE_URL.replace(/\/$/, "")}/media/${String(item.id)}`,
    })),
  };
}

async function createJob(request: Request, env: Env): Promise<Response> {
  const admin = await authenticateAdminRequest(request, env, "marketing.draft");
  if (!sameOrigin(request)) return json({ error: { code: "ORIGIN_NOT_ALLOWED" } }, { status: 403 });
  const parsed = createJobSchema.safeParse(await boundedJson(request, 16_384));
  if (!parsed.success) {
    return json(
      { error: { code: "INVALID_AI_JOB", issues: parsed.error.flatten() } },
      { status: 400 },
    );
  }
  if (parsed.data.modality !== "text" && !parsed.data.productId) {
    return json(
      {
        error: {
          code: "PRODUCT_REQUIRED",
          message: "Imaginea sau videoul trebuie legat de un produs real.",
        },
      },
      { status: 400 },
    );
  }
  const model = await env.DB.prepare(
    `SELECT id, label FROM ai_model_profiles
     WHERE modality = ?1 AND status = 'active' ORDER BY updated_at DESC LIMIT 1`,
  )
    .bind(parsed.data.modality)
    .first<{ id: string; label: string }>();
  if (!model) {
    return json(
      {
        error: {
          code: "MODEL_NOT_READY",
          message: "Pornește runnerul local și verifică modelul înainte de generare.",
        },
      },
      { status: 409 },
    );
  }
  const context = await productContext(env, parsed.data.productId);
  const skillPackage = await getMarketingOrdersSkillPackage();
  if (parsed.data.modality !== "text" && context && context.approvedMedia.length === 0) {
    return json(
      {
        error: {
          code: "APPROVED_MEDIA_REQUIRED",
          message: "Produsul nu are o imagine aprobată pentru marketing.",
        },
      },
      { status: 409 },
    );
  }
  const jobId = `aij_${crypto.randomUUID().replaceAll("-", "")}`;
  const runId = `air_${crypto.randomUUID().replaceAll("-", "")}`;
  const constraints = {
    language: "ro-RO",
    truthfulProductDataOnly: true,
    approvedMediaOnly: true,
    protectedProductLayer: parsed.data.modality !== "text",
    editableAreas:
      parsed.data.modality === "text"
        ? ["copy", "headline", "cta", "hashtags"]
        : ["background", "ambient_light", "props", "composition"],
    forbidden: [
      "invented_product_details",
      "invented_reviews",
      "customer_personal_data",
      "secrets",
      "automatic_publication",
      "regenerated_product_geometry",
    ],
    reviewRequired: true,
  };
  const contextSnapshot = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    source: "cutiuta-magica-admin",
    skill: {
      name: "cutiuta-magica-marketing-comenzi",
      version: skillPackage.version,
      hash: skillPackage.hash,
      documents: skillPackage.documents,
    },
    product: context,
    policies: {
      delivery: `${env.PUBLIC_SITE_URL.replace(/\/$/, "")}/livrare`,
      returns: `${env.PUBLIC_SITE_URL.replace(/\/$/, "")}/retur`,
      privacy: `${env.PUBLIC_SITE_URL.replace(/\/$/, "")}/politica-de-confidentialitate`,
    },
  };
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO ai_runs (id, agent_id, trigger_type, input_json, status, requested_by)
       VALUES (?1, 'agent_marketing_orders', 'manual', ?2, 'queued', ?3)`,
    ).bind(
      runId,
      JSON.stringify({ ...parsed.data, contextSnapshot, constraints, modelLabel: model.label }),
      admin.id,
    ),
    env.DB.prepare(
      `INSERT INTO ai_generation_jobs (
         id, agent_id, model_profile_id, ai_run_id, modality, purpose, product_id,
         channel, aspect_ratio, prompt_text, constraints_json, context_snapshot_json,
         idempotency_key, status, requested_by
       ) VALUES (?1, 'agent_marketing_orders', ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 'queued', ?13)`,
    ).bind(
      jobId,
      model.id,
      runId,
      parsed.data.modality,
      parsed.data.purpose,
      parsed.data.productId ?? null,
      parsed.data.channel,
      parsed.data.aspectRatio,
      parsed.data.prompt,
      JSON.stringify(constraints),
      JSON.stringify(contextSnapshot),
      parsed.data.idempotencyKey,
      admin.id,
    ),
    env.DB.prepare(
      `INSERT INTO audit_log (id, actor_label, action, entity_type, entity_id, after_json, metadata_json)
       VALUES (?1, ?2, 'ai.studio.job.create', 'ai_generation_job', ?3, ?4, ?5)`,
    ).bind(
      `audit_${crypto.randomUUID().replaceAll("-", "")}`,
      admin.email,
      jobId,
      JSON.stringify({
        modality: parsed.data.modality,
        purpose: parsed.data.purpose,
        status: "queued",
      }),
      JSON.stringify({ autoPublish: false, approvalRequired: true }),
    ),
  ]);
  return json({ data: { jobId, status: "queued" } }, { status: 201 });
}

async function heartbeat(request: Request, env: AiStudioEnv): Promise<Response> {
  const { data } = await signedJson(request, env, heartbeatSchema);
  const now = new Date().toISOString();
  const qwenReady = data.providers.ollama.models.some(
    (model) => model === "qwen3:8b" || model.startsWith("qwen3:"),
  );
  const imageReady =
    data.providers.comfyui.healthy && data.providers.comfyui.capabilities.includes("image");
  const videoReady =
    data.providers.comfyui.healthy && data.providers.comfyui.capabilities.includes("video");
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE ai_model_profiles SET status = ?1, last_verified_at = ?2,
         last_error_message = ?3, updated_at = ?2 WHERE id = 'ai_model_qwen3_ollama'`,
    ).bind(
      qwenReady ? "active" : "degraded",
      now,
      qwenReady ? null : "Qwen3 nu este disponibil în Ollama.",
    ),
    env.DB.prepare(
      `UPDATE ai_model_profiles SET status = ?1, last_verified_at = ?2,
         last_error_message = ?3, updated_at = ?2 WHERE id = 'ai_model_qwen_image_comfyui'`,
    ).bind(
      imageReady ? "active" : "degraded",
      now,
      imageReady ? null : "Workflow-ul oficial de imagine nu este disponibil.",
    ),
    env.DB.prepare(
      `UPDATE ai_model_profiles SET status = ?1, last_verified_at = ?2,
         last_error_message = ?3, updated_at = ?2 WHERE id = 'ai_model_wan22_comfyui'`,
    ).bind(
      videoReady ? "active" : "degraded",
      now,
      videoReady ? null : "Workflow-ul oficial video nu este disponibil.",
    ),
    env.DB.prepare(
      `UPDATE account_connections SET status = ?1, last_verified_at = ?2,
         updated_at = ?2 WHERE id = 'connection_ai_ollama_local'`,
    ).bind(data.providers.ollama.healthy ? "active" : "degraded", now),
    env.DB.prepare(
      `UPDATE account_connections SET status = ?1, last_verified_at = ?2,
         updated_at = ?2 WHERE id = 'connection_ai_comfyui_local'`,
    ).bind(data.providers.comfyui.healthy ? "active" : "degraded", now),
  ]);
  return json({ data: { accepted: true, version: data.version, checkedAt: now } });
}

async function claimJob(request: Request, env: AiStudioEnv): Promise<Response> {
  const { data } = await signedJson(request, env, claimSchema);
  const canText = data.capabilities.includes("text") ? 1 : 0;
  const canImage = data.capabilities.includes("image") ? 1 : 0;
  const canVideo = data.capabilities.includes("video") ? 1 : 0;
  const job = await env.DB.prepare(
    `UPDATE ai_generation_jobs
     SET status = 'running', runner_id = ?1,
         started_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = (
       SELECT id FROM ai_generation_jobs
       WHERE status = 'queued'
         AND ((modality = 'text' AND ?2 = 1) OR (modality = 'image' AND ?3 = 1) OR (modality = 'video' AND ?4 = 1))
       ORDER BY created_at LIMIT 1
     ) AND status = 'queued'
     RETURNING id, model_profile_id, modality, purpose, product_id, channel, aspect_ratio,
               prompt_text, constraints_json, context_snapshot_json`,
  )
    .bind(data.runnerId, canText, canImage, canVideo)
    .first<Record<string, unknown>>();
  if (!job) return new Response(null, { status: 204 });
  await env.DB.prepare(
    "UPDATE ai_runs SET status = 'running', started_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = (SELECT ai_run_id FROM ai_generation_jobs WHERE id = ?1)",
  )
    .bind(job.id)
    .run();
  return json({
    data: {
      ...job,
      constraints: JSON.parse(String(job.constraints_json)),
      context: JSON.parse(String(job.context_snapshot_json)),
    },
  });
}

async function uploadAsset(
  request: Request,
  env: AiStudioEnv,
  jobId: string,
  assetId: string,
): Promise<Response> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  const mime = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  const mediaType = mime.startsWith("image/")
    ? "image"
    : mime.startsWith("video/")
      ? "video"
      : null;
  const allowed = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"]);
  if (
    !mediaType ||
    !allowed.has(mime) ||
    !Number.isFinite(declaredLength) ||
    declaredLength <= 0 ||
    declaredLength > 200_000_000
  ) {
    return json({ error: { code: "INVALID_AI_ASSET" } }, { status: 400 });
  }
  const verified = await verifyRunnerRequest(request, env);
  const job = await env.DB.prepare(
    "SELECT id, modality, runner_id, status FROM ai_generation_jobs WHERE id = ?1",
  )
    .bind(jobId)
    .first<{ id: string; modality: Modality; runner_id: string | null; status: string }>();
  if (!job || job.status !== "running" || job.runner_id !== verified.runnerId) {
    return json({ error: { code: "AI_JOB_NOT_CLAIMED" } }, { status: 409 });
  }
  if (
    (job.modality === "image" && mediaType !== "image") ||
    (job.modality === "video" && mediaType !== "video")
  ) {
    return json({ error: { code: "AI_ASSET_MODALITY_MISMATCH" } }, { status: 400 });
  }
  const digest = request.headers.get("x-ai-content-sha256")!;
  const extension = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
  const key = `ai-studio/${jobId}/${assetId}.${extension}`;
  try {
    const stored = await env.MEDIA.put(key, request.body, {
      sha256: digest,
      httpMetadata: { contentType: mime, cacheControl: "private, no-store" },
      customMetadata: { jobId, assetId, reviewStatus: "pending", source: "local-ai-runner" },
    });
    if (!stored) throw new Error("R2_WRITE_REJECTED");
    await env.DB.prepare(
      `INSERT INTO ai_generation_assets (id, job_id, r2_key, media_type, mime_type, byte_size, sha256)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
      .bind(assetId, jobId, key, mediaType, mime, declaredLength, digest)
      .run();
    return json({ data: { assetId, stored: true } }, { status: 201 });
  } catch (error) {
    await env.MEDIA.delete(key).catch(() => undefined);
    throw error;
  }
}

async function finishJob(request: Request, env: AiStudioEnv, jobId: string): Promise<Response> {
  const { data } = await signedJson(request, env, resultSchema);
  const job = await env.DB.prepare(
    "SELECT id, ai_run_id, runner_id, status FROM ai_generation_jobs WHERE id = ?1",
  )
    .bind(jobId)
    .first<{ id: string; ai_run_id: string | null; runner_id: string | null; status: string }>();
  if (!job || job.status !== "running" || job.runner_id !== data.runnerId) {
    return json({ error: { code: "AI_JOB_NOT_CLAIMED" } }, { status: 409 });
  }
  if (data.status === "failed") {
    const message = data.errorMessage || "Procesarea locală a eșuat.";
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE ai_generation_jobs SET status = 'failed', error_message = ?2,
           completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1`,
      ).bind(jobId, message),
      env.DB.prepare(
        `UPDATE ai_runs SET status = 'failed', error_message = ?2,
           completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1`,
      ).bind(job.ai_run_id, message),
    ]);
    return json({ data: { jobId, status: "failed" } });
  }
  const assets = data.assetIds.length
    ? await env.DB.prepare(
        `SELECT id FROM ai_generation_assets WHERE job_id = ?1 AND id IN (${data.assetIds.map(() => "?").join(",")})`,
      )
        .bind(jobId, ...data.assetIds)
        .all<{ id: string }>()
    : { results: [] as Array<{ id: string }> };
  if (
    assets.results.length !== data.assetIds.length ||
    (!data.outputText && assets.results.length === 0)
  ) {
    return json({ error: { code: "AI_RESULT_INCOMPLETE" } }, { status: 400 });
  }
  const approvalId = `approval_${crypto.randomUUID().replaceAll("-", "")}`;
  const summary = data.outputText
    ? "Text generat local, pregătit pentru verificare editorială."
    : `${assets.results.length} fișier(e) generate local, pregătite pentru verificare.`;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO approval_requests (
         id, request_type, entity_type, entity_id, risk_level, summary,
         proposed_action_json, status, requested_by_agent_id
       ) VALUES (?1, 'ai.generated_content.review', 'ai_generation_job', ?2, 'medium', ?3, ?4,
         'pending', 'agent_marketing_orders')`,
    ).bind(
      approvalId,
      jobId,
      summary,
      JSON.stringify({ jobId, assetIds: data.assetIds, autoPublish: false }),
    ),
    env.DB.prepare(
      `UPDATE ai_generation_jobs SET status = 'awaiting_review', output_text = ?2,
         approval_request_id = ?3, completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1`,
    ).bind(jobId, data.outputText ?? null, approvalId),
    env.DB.prepare(
      `UPDATE ai_runs SET status = 'awaiting_approval', output_json = ?2,
         completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1`,
    ).bind(
      job.ai_run_id,
      JSON.stringify({ outputText: data.outputText ?? null, assetIds: data.assetIds }),
    ),
  ]);
  return json({ data: { jobId, status: "awaiting_review", approvalId } });
}

export async function handleAdminAiStudioApi(request: Request, env: Env): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  const base = "/api/v1/admin/ai-studio";
  const runnerBase = "/api/v1/integrations/ai-studio/runner";
  const resultMatch = path.match(
    /^\/api\/v1\/integrations\/ai-studio\/runner\/jobs\/([a-zA-Z0-9_-]+)\/result$/,
  );
  const assetMatch = path.match(
    /^\/api\/v1\/integrations\/ai-studio\/runner\/jobs\/([a-zA-Z0-9_-]+)\/assets\/([a-zA-Z0-9_-]+)$/,
  );
  if (
    path !== base &&
    path !== `${base}/jobs` &&
    path !== `${runnerBase}/heartbeat` &&
    path !== `${runnerBase}/jobs/claim` &&
    !resultMatch &&
    !assetMatch
  )
    return null;
  try {
    if (path === base && request.method === "GET") return await getStudioState(request, env);
    if (path === `${base}/jobs` && request.method === "POST") return await createJob(request, env);
    if (path === `${runnerBase}/heartbeat` && request.method === "POST") {
      return await heartbeat(request, env as AiStudioEnv);
    }
    if (path === `${runnerBase}/jobs/claim` && request.method === "POST") {
      return await claimJob(request, env as AiStudioEnv);
    }
    if (resultMatch && request.method === "POST") {
      return await finishJob(request, env as AiStudioEnv, resultMatch[1]);
    }
    if (assetMatch && request.method === "PUT") {
      return await uploadAsset(request, env as AiStudioEnv, assetMatch[1], assetMatch[2]);
    }
    return json({ error: { code: "METHOD_NOT_ALLOWED" } }, { status: 405 });
  } catch (error) {
    const code = statusCode(error);
    if (code >= 500) console.error("ai_studio.request_failed", error);
    return json(
      {
        error: {
          code: code === 401 ? "AI_RUNNER_AUTH_FAILED" : "AI_STUDIO_REQUEST_FAILED",
          message: error instanceof Error ? error.message : "Operația AI a eșuat.",
        },
      },
      { status: code },
    );
  }
}
