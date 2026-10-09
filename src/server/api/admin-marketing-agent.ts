import { z } from "zod";
import { authenticateAdminRequest } from "@/lib/admin-auth";
import {
  getMarketingOrdersAgentBuild,
  getMarketingOrdersSkillPackage,
} from "@/server/agents/marketing-orders-manifest";
import { boundedBytes, boundedJson } from "@/server/api/bounded-json";
import type { AvyronQueueMessage } from "@/server/queue/avyron-sync-consumer";

type AgentSettings = {
  schemaVersion: number;
  timezone: string;
  mode: "draft_approval" | "paused";
  enabled: boolean;
  controlPlane: "cutiuta_magic_platform";
  publication: { requiresApproval: true; requiresVerifiedConnector: true };
  contentPlaybook: {
    version: string;
    feedDaily: true;
    storyDaily: true;
    storyFramesMin: number;
    storyFramesMax: number;
    reelEveryDays: number;
    tiktokEveryDays: number;
    requireSpecificProductLink: true;
    requireNativeVariants: true;
    requireOriginalProductLayer: true;
    measurementWindowsHours: number[];
  };
  avyron: {
    async: true;
    enabled: boolean;
    control: "none";
    shareAggregatedStats: boolean;
    shareSkillPackage: boolean;
    acceptDataProposals: boolean;
    acceptSkillProposals: boolean;
    allowPersonalData: false;
    allowOrders: false;
    allowPublishing: false;
  };
  [key: string]: unknown;
};

type SettingsRow = { value_json: string; version: number; updated_at: string };
type ExchangeRow = {
  id: string;
  direction: "outbound" | "inbound";
  exchange_type: string;
  status: string;
  payload_hash: string;
  attempts: number;
  last_error: string | null;
  review_payload_json?: string | null;
  created_at: string;
  updated_at: string;
};

const updateSettingsSchema = z.object({
  expectedVersion: z.number().int().positive(),
  enabled: z.boolean(),
  mode: z.enum(["draft_approval", "paused"]),
  avyron: z.object({
    enabled: z.boolean(),
    shareAggregatedStats: z.boolean(),
    shareSkillPackage: z.boolean(),
    acceptDataProposals: z.boolean(),
    acceptSkillProposals: z.boolean(),
  }),
});

const createExportSchema = z.object({
  type: z.enum(["stats_snapshot", "skill_package"]),
  idempotencyKey: z.string().uuid(),
});

const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

const inboundExchangeSchema = z.object({
  exchangeId: z.string().uuid(),
  type: z.enum(["data_proposal", "skill_proposal"]),
  payload: z.record(z.string(), z.unknown()),
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

function defaultSettings(): AgentSettings {
  return {
    schemaVersion: 3,
    timezone: "Europe/Bucharest",
    mode: "draft_approval",
    enabled: true,
    controlPlane: "cutiuta_magic_platform",
    publication: { requiresApproval: true, requiresVerifiedConnector: true },
    contentPlaybook: {
      version: "2026.10.10.1",
      feedDaily: true,
      storyDaily: true,
      storyFramesMin: 3,
      storyFramesMax: 5,
      reelEveryDays: 3,
      tiktokEveryDays: 3,
      requireSpecificProductLink: true,
      requireNativeVariants: true,
      requireOriginalProductLayer: true,
      measurementWindowsHours: [24, 72, 168],
    },
    avyron: {
      async: true,
      enabled: false,
      control: "none",
      shareAggregatedStats: false,
      shareSkillPackage: false,
      acceptDataProposals: false,
      acceptSkillProposals: false,
      allowPersonalData: false,
      allowOrders: false,
      allowPublishing: false,
    },
  };
}

function parseSettings(row: SettingsRow | null): AgentSettings {
  const fallback = defaultSettings();
  if (!row) return fallback;
  try {
    const value = JSON.parse(row.value_json) as Record<string, unknown>;
    const avyron = (value.avyron ?? {}) as Record<string, unknown>;
    const publication = (value.publication ?? {}) as Record<string, unknown>;
    return {
      ...fallback,
      ...value,
      schemaVersion: 3,
      controlPlane: "cutiuta_magic_platform",
      publication: {
        ...publication,
        requiresApproval: true,
        requiresVerifiedConnector: true,
      },
      contentPlaybook: {
        ...fallback.contentPlaybook,
        ...((value.contentPlaybook ?? {}) as Partial<AgentSettings["contentPlaybook"]>),
        version: "2026.10.10.1",
        feedDaily: true,
        storyDaily: true,
        requireSpecificProductLink: true,
        requireNativeVariants: true,
        requireOriginalProductLayer: true,
      },
      avyron: {
        ...fallback.avyron,
        ...avyron,
        async: true,
        control: "none",
        allowPersonalData: false,
        allowOrders: false,
        allowPublishing: false,
      },
    } as AgentSettings;
  } catch {
    return fallback;
  }
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function statusCode(error: unknown): number {
  if (error && typeof error === "object" && "statusCode" in error) {
    return Number((error as { statusCode: unknown }).statusCode) || 500;
  }
  return 500;
}

async function readSettings(
  db: D1Database,
): Promise<{ settings: AgentSettings; row: SettingsRow | null }> {
  const row = await db
    .prepare(
      "SELECT value_json, version, updated_at FROM operational_settings WHERE key = 'agent.marketing_orders'",
    )
    .first<SettingsRow>();
  return { settings: parseSettings(row), row };
}

async function getState(request: Request, env: Env): Promise<Response> {
  await authenticateAdminRequest(request, env, "marketing.agent.read");
  const [build, settingsResult, agent, relatedAgents, accounts, target, exchanges] =
    await Promise.all([
      getMarketingOrdersAgentBuild(),
      readSettings(env.DB),
      env.DB.prepare(
        `SELECT code, name, purpose, approval_policy, max_actions_per_run, status, updated_at
         FROM ai_agents WHERE id = 'agent_marketing_orders'`,
      ).first(),
      env.DB.prepare(
        `SELECT code, name, purpose, approval_policy, status, updated_at
         FROM ai_agents
         WHERE id IN ('agent_content', 'agent_marketing_content', 'agent_seo')
         ORDER BY CASE id
           WHEN 'agent_content' THEN 1
           WHEN 'agent_marketing_content' THEN 2
           ELSE 3
         END`,
      ).all(),
      env.DB.prepare(
        `SELECT id, provider, account_type, label, capabilities_json, status, last_synced_at
         FROM social_accounts
         WHERE provider IN ('facebook', 'instagram', 'tiktok')
         ORDER BY provider, account_type`,
      ).all(),
      env.DB.prepare(
        `SELECT code, source_label, status, auth_mode, agent_exchange_endpoint_url,
                last_healthcheck_at, last_error_message
         FROM avyron_sync_targets WHERE code = 'avyron-os'`,
      ).first(),
      env.DB.prepare(
        `SELECT id, direction, exchange_type, status, payload_hash, attempts, last_error,
                CASE WHEN direction = 'inbound' THEN payload_json ELSE NULL END AS review_payload_json,
                created_at, updated_at
         FROM agent_exchange_items
         WHERE agent_id = 'agent_marketing_orders'
         ORDER BY created_at DESC LIMIT 30`,
      ).all<ExchangeRow>(),
    ]);
  return json({
    data: {
      build,
      agent,
      relatedAgents: relatedAgents.results,
      settings: settingsResult.settings,
      settingsVersion: settingsResult.row?.version ?? 0,
      settingsUpdatedAt: settingsResult.row?.updated_at ?? null,
      socialAccounts: accounts.results,
      avyronTarget: target,
      exchanges: exchanges.results.map(({ review_payload_json, ...exchange }) => ({
        ...exchange,
        reviewPayload: review_payload_json ? (JSON.parse(review_payload_json) as unknown) : null,
      })),
      authority: {
        controller: "cutiuta_magic_platform",
        administrators: "owner",
        avyronRole: "statistics_and_approved_exchange_only",
      },
    },
  });
}

async function updateSettings(request: Request, env: Env): Promise<Response> {
  const admin = await authenticateAdminRequest(request, env, "marketing.agent.manage");
  if (!sameOrigin(request)) return json({ error: { code: "ORIGIN_NOT_ALLOWED" } }, { status: 403 });
  const parsed = updateSettingsSchema.safeParse(await boundedJson(request, 16_384));
  if (!parsed.success) {
    return json(
      { error: { code: "INVALID_SETTINGS", issues: parsed.error.flatten() } },
      { status: 400 },
    );
  }
  const current = await readSettings(env.DB);
  if (!current.row || current.row.version !== parsed.data.expectedVersion) {
    return json({ error: { code: "VERSION_CONFLICT" } }, { status: 409 });
  }
  const next: AgentSettings = {
    ...current.settings,
    schemaVersion: 3,
    enabled: parsed.data.enabled,
    mode: parsed.data.enabled ? parsed.data.mode : "paused",
    controlPlane: "cutiuta_magic_platform",
    publication: { requiresApproval: true, requiresVerifiedConnector: true },
    avyron: {
      ...current.settings.avyron,
      ...parsed.data.avyron,
      async: true,
      control: "none",
      allowPersonalData: false,
      allowOrders: false,
      allowPublishing: false,
    },
  };
  const nextVersion = current.row.version + 1;
  const results = await env.DB.batch([
    env.DB.prepare(
      `UPDATE operational_settings
         SET value_json = ?1, version = ?2, updated_by = ?3,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE key = 'agent.marketing_orders' AND version = ?4`,
    ).bind(JSON.stringify(next), nextVersion, admin.id, current.row.version),
    env.DB.prepare(
      `UPDATE ai_agents
         SET status = ?1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = 'agent_marketing_orders'`,
    ).bind(next.enabled && next.mode === "draft_approval" ? "active" : "paused"),
    env.DB.prepare(
      `INSERT INTO audit_log (
           id, actor_admin_user_id, actor_label, action, entity_type, entity_id,
           before_json, after_json, metadata_json
         ) VALUES (?1, ?2, ?3, 'marketing_agent.settings.update', 'ai_agent',
           'agent_marketing_orders', ?4, ?5, ?6)`,
    ).bind(
      crypto.randomUUID(),
      admin.id,
      admin.email,
      current.row.value_json,
      JSON.stringify(next),
      JSON.stringify({ controlPlane: "cutiuta_magic_platform", avyronControl: "none" }),
    ),
  ]);
  if (Number(results[0].meta.changes) !== 1) {
    return json({ error: { code: "VERSION_CONFLICT" } }, { status: 409 });
  }
  return json({ data: { settings: next, settingsVersion: nextVersion } });
}

async function aggregatedStatistics(db: D1Database) {
  const [social, approvals, runs, catalog, orders] = await db.batch<Record<string, number>>([
    db.prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
              SUM(CASE WHEN status IN ('review','approved','scheduled') THEN 1 ELSE 0 END) AS planned,
              SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM social_posts`,
    ),
    db.prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
       FROM approval_requests`,
    ),
    db.prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
              SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM ai_runs WHERE agent_id = 'agent_marketing_orders'`,
    ),
    db.prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active
       FROM products WHERE product_type = 'music_box'`,
    ),
    db.prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN order_status IN ('pending','confirmed','processing') THEN 1 ELSE 0 END) AS open
       FROM orders`,
    ),
  ]);
  return {
    social: social.results[0] ?? {},
    approvals: approvals.results[0] ?? {},
    agentRuns: runs.results[0] ?? {},
    catalog: catalog.results[0] ?? {},
    orders: orders.results[0] ?? {},
  };
}

async function createExport(request: Request, env: Env): Promise<Response> {
  const admin = await authenticateAdminRequest(request, env, "marketing.agent.manage");
  if (!sameOrigin(request)) return json({ error: { code: "ORIGIN_NOT_ALLOWED" } }, { status: 403 });
  const parsed = createExportSchema.safeParse(await boundedJson(request, 16_384));
  if (!parsed.success) {
    return json(
      { error: { code: "INVALID_EXPORT", issues: parsed.error.flatten() } },
      { status: 400 },
    );
  }
  const { settings } = await readSettings(env.DB);
  const allowed =
    parsed.data.type === "stats_snapshot"
      ? settings.avyron.shareAggregatedStats
      : settings.avyron.shareSkillPackage;
  if (!allowed) {
    return json(
      { error: { code: "EXCHANGE_DISABLED", message: "Activează mai întâi acest tip de schimb." } },
      { status: 409 },
    );
  }
  const payload =
    parsed.data.type === "stats_snapshot"
      ? {
          schemaVersion: 1,
          source: "cutiuta-magica",
          scope: "aggregated_statistics",
          generatedAt: new Date().toISOString(),
          personalDataIncluded: false,
          data: await aggregatedStatistics(env.DB),
        }
      : {
          schemaVersion: 1,
          source: "cutiuta-magica",
          scope: "approved_skill_package",
          generatedAt: new Date().toISOString(),
          personalDataIncluded: false,
          data: await getMarketingOrdersSkillPackage(),
        };
  const payloadJson = JSON.stringify(payload);
  const exchangeId = crypto.randomUUID();
  const approvalId = crypto.randomUUID();
  const payloadHash = await sha256(payloadJson);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO approval_requests (
           id, request_type, entity_type, entity_id, risk_level, summary,
           proposed_action_json, status, requested_by_agent_id, requested_by_admin_id
         ) VALUES (?1, 'avyron.agent.exchange', 'agent_exchange', ?2, 'medium', ?3,
           ?4, 'pending', 'agent_marketing_orders', ?5)`,
    ).bind(
      approvalId,
      exchangeId,
      parsed.data.type === "stats_snapshot"
        ? "Trimite către AVYRON numai statistici agregate."
        : "Trimite către AVYRON pachetul versionat al skillului, fără date de client.",
      JSON.stringify({ exchangeId, type: parsed.data.type, payloadHash }),
      admin.id,
    ),
    env.DB.prepare(
      `INSERT INTO agent_exchange_items (
           id, agent_id, direction, exchange_type, source_system, destination_system,
           payload_json, payload_hash, idempotency_key, status, approval_request_id, created_by
         ) VALUES (?1, 'agent_marketing_orders', 'outbound', ?2, 'cutiuta-magica',
           'avyron-os', ?3, ?4, ?5, 'pending_approval', ?6, ?7)`,
    ).bind(
      exchangeId,
      parsed.data.type,
      payloadJson,
      payloadHash,
      parsed.data.idempotencyKey,
      approvalId,
      admin.id,
    ),
    env.DB.prepare(
      `INSERT INTO audit_log (
           id, actor_admin_user_id, actor_label, action, entity_type, entity_id,
           after_json, metadata_json
         ) VALUES (?1, ?2, ?3, 'marketing_agent.exchange.propose', 'agent_exchange',
           ?4, ?5, ?6)`,
    ).bind(
      crypto.randomUUID(),
      admin.id,
      admin.email,
      exchangeId,
      JSON.stringify({ type: parsed.data.type, status: "pending_approval" }),
      JSON.stringify({ payloadHash, destination: "avyron-os", personalDataIncluded: false }),
    ),
  ]);
  return json(
    { data: { exchangeId, approvalId, status: "pending_approval", payloadHash } },
    { status: 201 },
  );
}

async function decideExchange(request: Request, env: Env, exchangeId: string): Promise<Response> {
  const admin = await authenticateAdminRequest(request, env, "marketing.agent.manage");
  if (!sameOrigin(request)) return json({ error: { code: "ORIGIN_NOT_ALLOWED" } }, { status: 403 });
  const parsed = decisionSchema.safeParse(await boundedJson(request, 4_096));
  if (!parsed.success) return json({ error: { code: "INVALID_DECISION" } }, { status: 400 });
  const exchange = await env.DB.prepare(
    `SELECT id, direction, exchange_type, status, approval_request_id
       FROM agent_exchange_items WHERE id = ?1`,
  )
    .bind(exchangeId)
    .first<ExchangeRow & { approval_request_id: string | null }>();
  if (!exchange) return json({ error: { code: "EXCHANGE_NOT_FOUND" } }, { status: 404 });
  if (exchange.status !== "pending_approval") {
    return json({ error: { code: "EXCHANGE_ALREADY_REVIEWED" } }, { status: 409 });
  }

  let nextStatus = parsed.data.decision === "approved" ? "approved" : "rejected";
  let shouldQueue = false;
  if (parsed.data.decision === "approved" && exchange.direction === "outbound") {
    const syncEnv = env as Env & { AVYRON_SYNC_HMAC_SECRET?: string };
    const [{ settings }, target] = await Promise.all([
      readSettings(env.DB),
      env.DB.prepare(
        `SELECT status, agent_exchange_endpoint_url
           FROM avyron_sync_targets WHERE code = 'avyron-os'`,
      ).first<{ status: string; agent_exchange_endpoint_url: string | null }>(),
    ]);
    const typeEnabled =
      exchange.exchange_type === "stats_snapshot"
        ? settings.avyron.shareAggregatedStats
        : settings.avyron.shareSkillPackage;
    shouldQueue =
      settings.avyron.enabled &&
      typeEnabled &&
      target?.status === "active" &&
      Boolean(target.agent_exchange_endpoint_url) &&
      Boolean(syncEnv.AVYRON_SYNC_HMAC_SECRET);
    if (shouldQueue) nextStatus = "queued";
  }

  const results = await env.DB.batch([
    env.DB.prepare(
      `UPDATE agent_exchange_items
         SET status = ?1, reviewed_by = ?2,
             reviewed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?3 AND status = 'pending_approval'`,
    ).bind(nextStatus, admin.id, exchangeId),
    env.DB.prepare(
      `UPDATE approval_requests
         SET status = ?1, reviewed_by = ?2,
             reviewed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?3 AND status = 'pending'`,
    ).bind(parsed.data.decision, admin.id, exchange.approval_request_id),
    env.DB.prepare(
      `INSERT INTO audit_log (
           id, actor_admin_user_id, actor_label, action, entity_type, entity_id,
           after_json, metadata_json
         ) VALUES (?1, ?2, ?3, 'marketing_agent.exchange.review', 'agent_exchange',
           ?4, ?5, '{}')`,
    ).bind(
      crypto.randomUUID(),
      admin.id,
      admin.email,
      exchangeId,
      JSON.stringify({ decision: parsed.data.decision, status: nextStatus }),
    ),
  ]);
  if (Number(results[0].meta.changes) !== 1) {
    return json({ error: { code: "EXCHANGE_ALREADY_REVIEWED" } }, { status: 409 });
  }
  if (shouldQueue) {
    const message: AvyronQueueMessage = {
      version: 1,
      kind: "avyron.agent.exchange",
      exchangeId,
    };
    try {
      await env.COMMERCE_EVENTS.send(message);
    } catch (error) {
      await env.DB.prepare(
        `UPDATE agent_exchange_items SET status = 'approved', last_error = ?1,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?2`,
      )
        .bind(
          error instanceof Error ? error.message.slice(0, 500) : "Queue unavailable",
          exchangeId,
        )
        .run();
      nextStatus = "approved";
    }
  }
  return json({
    data: { exchangeId, status: nextStatus, queued: shouldQueue && nextStatus === "queued" },
  });
}

async function dispatchExchange(request: Request, env: Env, exchangeId: string): Promise<Response> {
  const admin = await authenticateAdminRequest(request, env, "marketing.agent.manage");
  if (!sameOrigin(request)) return json({ error: { code: "ORIGIN_NOT_ALLOWED" } }, { status: 403 });
  const exchange = await env.DB.prepare(
    `SELECT id, direction, exchange_type, status, approval_request_id
     FROM agent_exchange_items WHERE id = ?1`,
  )
    .bind(exchangeId)
    .first<ExchangeRow & { approval_request_id: string | null }>();
  if (!exchange || exchange.direction !== "outbound") {
    return json({ error: { code: "EXCHANGE_NOT_FOUND" } }, { status: 404 });
  }
  if (!exchange.approval_request_id || !["approved", "failed"].includes(exchange.status)) {
    return json({ error: { code: "EXCHANGE_NOT_DISPATCHABLE" } }, { status: 409 });
  }
  const syncEnv = env as Env & { AVYRON_SYNC_HMAC_SECRET?: string };
  const [{ settings }, target, approval] = await Promise.all([
    readSettings(env.DB),
    env.DB.prepare(
      `SELECT status, agent_exchange_endpoint_url
       FROM avyron_sync_targets WHERE code = 'avyron-os'`,
    ).first<{ status: string; agent_exchange_endpoint_url: string | null }>(),
    env.DB.prepare("SELECT status FROM approval_requests WHERE id = ?1")
      .bind(exchange.approval_request_id)
      .first<{ status: string }>(),
  ]);
  const typeEnabled =
    exchange.exchange_type === "stats_snapshot"
      ? settings.avyron.shareAggregatedStats
      : settings.avyron.shareSkillPackage;
  if (
    approval?.status !== "approved" ||
    !settings.avyron.enabled ||
    !typeEnabled ||
    target?.status !== "active" ||
    !target.agent_exchange_endpoint_url ||
    !syncEnv.AVYRON_SYNC_HMAC_SECRET
  ) {
    return json(
      {
        error: {
          code: "INTEGRATION_NOT_READY",
          message: "Aprobarea, endpointul HTTPS și secretul HMAC trebuie să fie active.",
        },
      },
      { status: 409 },
    );
  }
  const result = await env.DB.prepare(
    `UPDATE agent_exchange_items
     SET status = 'queued', last_error = NULL, next_retry_at = NULL,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?1 AND status IN ('approved', 'failed')`,
  )
    .bind(exchangeId)
    .run();
  if (Number(result.meta.changes) !== 1) {
    return json({ error: { code: "EXCHANGE_NOT_DISPATCHABLE" } }, { status: 409 });
  }
  const message: AvyronQueueMessage = {
    version: 1,
    kind: "avyron.agent.exchange",
    exchangeId,
  };
  try {
    await env.COMMERCE_EVENTS.send(message);
    await env.DB.prepare(
      `INSERT INTO audit_log (
         id, actor_admin_user_id, actor_label, action, entity_type, entity_id,
         after_json, metadata_json
       ) VALUES (?1, ?2, ?3, 'marketing_agent.exchange.dispatch', 'agent_exchange',
         ?4, ?5, '{}')`,
    )
      .bind(
        crypto.randomUUID(),
        admin.id,
        admin.email,
        exchangeId,
        JSON.stringify({ status: "queued" }),
      )
      .run();
  } catch (error) {
    await env.DB.prepare(
      `UPDATE agent_exchange_items SET status = 'approved', last_error = ?1,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?2`,
    )
      .bind(error instanceof Error ? error.message.slice(0, 500) : "Queue unavailable", exchangeId)
      .run();
    return json(
      { error: { code: "QUEUE_UNAVAILABLE", message: "Schimbul a rămas aprobat, netrimis." } },
      { status: 503 },
    );
  }
  return json({ data: { exchangeId, status: "queued" } }, { status: 202 });
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToHex(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))),
  );
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function containsForbiddenPersonalData(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsForbiddenPersonalData);
  const forbidden =
    /(email|phone|telefon|address|adresa|customer|client|order|comanda|message|mesaj)/i;
  return Object.entries(value as Record<string, unknown>).some(
    ([key, nested]) => forbidden.test(key) || containsForbiddenPersonalData(nested),
  );
}

async function receiveInboundExchange(request: Request, env: Env): Promise<Response> {
  type SyncEnv = Env & { AVYRON_SYNC_HMAC_SECRET?: string };
  const syncEnv = env as SyncEnv;
  const target = await env.DB.prepare(
    "SELECT status, auth_mode FROM avyron_sync_targets WHERE code = 'avyron-os'",
  ).first<{ status: string; auth_mode: string }>();
  if (
    target?.status !== "active" ||
    target.auth_mode !== "hmac" ||
    !syncEnv.AVYRON_SYNC_HMAC_SECRET
  ) {
    return json({ error: { code: "INTEGRATION_NOT_READY" } }, { status: 503 });
  }
  const timestamp = request.headers.get("x-avyron-timestamp") ?? "";
  const nonce = request.headers.get("x-avyron-nonce") ?? "";
  const supplied = (request.headers.get("x-avyron-signature") ?? "").replace(/^sha256=/, "");
  const timestampNumber = Number(timestamp);
  if (
    !nonce ||
    !Number.isFinite(timestampNumber) ||
    Math.abs(Date.now() - timestampNumber) > 300_000
  ) {
    return json({ error: { code: "STALE_OR_INVALID_REQUEST" } }, { status: 401 });
  }
  const rawBytes = await boundedBytes(request, 32_768);
  const raw = new TextDecoder().decode(rawBytes);
  const expected = await hmac(syncEnv.AVYRON_SYNC_HMAC_SECRET, `${timestamp}.${nonce}.${raw}`);
  if (!constantTimeEqual(supplied, expected)) {
    return json({ error: { code: "INVALID_SIGNATURE" } }, { status: 401 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: { code: "INVALID_JSON" } }, { status: 400 });
  }
  const parsed = inboundExchangeSchema.safeParse(body);
  if (!parsed.success || containsForbiddenPersonalData(parsed.data?.payload)) {
    return json({ error: { code: "INVALID_OR_FORBIDDEN_PAYLOAD" } }, { status: 400 });
  }
  const { settings } = await readSettings(env.DB);
  const accepted =
    parsed.data.type === "data_proposal"
      ? settings.avyron.acceptDataProposals
      : settings.avyron.acceptSkillProposals;
  if (!settings.avyron.enabled || !accepted) {
    return json({ error: { code: "EXCHANGE_DISABLED" } }, { status: 403 });
  }
  const exchangeId = `in_${parsed.data.exchangeId.replaceAll("-", "")}`;
  const approvalId = `approval_${parsed.data.exchangeId.replaceAll("-", "")}`;
  const payloadJson = JSON.stringify({
    schemaVersion: 1,
    source: "avyron-os",
    receivedAt: new Date().toISOString(),
    personalDataIncluded: false,
    data: parsed.data.payload,
  });
  const payloadHash = await sha256(payloadJson);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT OR IGNORE INTO approval_requests (
           id, request_type, entity_type, entity_id, risk_level, summary,
           proposed_action_json, status, requested_by_agent_id
         ) VALUES (?1, 'avyron.agent.exchange', 'agent_exchange', ?2, 'medium', ?3,
           ?4, 'pending', 'agent_marketing_orders')`,
    ).bind(
      approvalId,
      exchangeId,
      "Propunere AVYRON primită; nu se aplică fără aprobarea proprietarului Cutiuța Magică.",
      JSON.stringify({ exchangeId, type: parsed.data.type, payloadHash }),
    ),
    env.DB.prepare(
      `INSERT OR IGNORE INTO agent_exchange_items (
           id, agent_id, direction, exchange_type, source_system, destination_system,
           payload_json, payload_hash, idempotency_key, external_exchange_id, status,
           approval_request_id, received_at
         ) VALUES (?1, 'agent_marketing_orders', 'inbound', ?2, 'avyron-os',
           'cutiuta-magica', ?3, ?4, ?5, ?6, 'pending_approval', ?7,
           strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
    ).bind(
      exchangeId,
      parsed.data.type,
      payloadJson,
      payloadHash,
      `avyron:${parsed.data.exchangeId}`,
      parsed.data.exchangeId,
      approvalId,
    ),
  ]);
  return json({ data: { exchangeId, status: "pending_approval" } }, { status: 202 });
}

export async function handleAdminMarketingAgentApi(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  const base = "/api/v1/admin/marketing-agent";
  const inbound = "/api/v1/integrations/avyron/marketing-agent/exchanges";
  const decisionMatch = path.match(
    /^\/api\/v1\/admin\/marketing-agent\/exchanges\/([a-zA-Z0-9_-]+)\/decision$/,
  );
  const dispatchMatch = path.match(
    /^\/api\/v1\/admin\/marketing-agent\/exchanges\/([a-zA-Z0-9_-]+)\/dispatch$/,
  );
  if (
    path !== base &&
    path !== `${base}/exports` &&
    path !== inbound &&
    !decisionMatch &&
    !dispatchMatch
  )
    return null;
  try {
    if (path === inbound) {
      if (request.method === "POST") return receiveInboundExchange(request, env);
      return json(
        { error: { code: "METHOD_NOT_ALLOWED" } },
        { status: 405, headers: { allow: "POST" } },
      );
    }
    if (path === base) {
      if (request.method === "GET") return getState(request, env);
      if (request.method === "PATCH") return updateSettings(request, env);
      return json(
        { error: { code: "METHOD_NOT_ALLOWED" } },
        { status: 405, headers: { allow: "GET, PATCH" } },
      );
    }
    if (path === `${base}/exports`) {
      if (request.method === "POST") return createExport(request, env);
      return json(
        { error: { code: "METHOD_NOT_ALLOWED" } },
        { status: 405, headers: { allow: "POST" } },
      );
    }
    if (decisionMatch && request.method === "POST") {
      return decideExchange(request, env, decisionMatch[1]);
    }
    if (dispatchMatch && request.method === "POST") {
      return dispatchExchange(request, env, dispatchMatch[1]);
    }
    return json(
      { error: { code: "METHOD_NOT_ALLOWED" } },
      { status: 405, headers: { allow: "POST" } },
    );
  } catch (error) {
    const status = statusCode(error);
    console.error("admin.marketing_agent.failed", error);
    return json(
      {
        error: {
          code:
            status === 401
              ? "UNAUTHORIZED"
              : status === 403
                ? "FORBIDDEN"
                : "MARKETING_AGENT_FAILED",
          message:
            status >= 500
              ? "Operația agentului nu a putut fi finalizată."
              : (error as Error).message,
        },
      },
      { status },
    );
  }
}
