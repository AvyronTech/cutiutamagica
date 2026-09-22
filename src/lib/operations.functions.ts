import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { assertPermission, requireAdminAuth } from "@/lib/admin-auth";
import {
  accountConnectionInputSchema,
  backupPolicySchema,
  marketingCampaignInputSchema,
  marketingCostInputSchema,
  socialDraftInputSchema,
  socialPostDecisionSchema,
  socialRelationshipImportSchema,
  unfollowDecisionSchema,
} from "@/lib/operations-contracts";
import { listPublicCatalog } from "@/server/db/catalog.repository";
import { rankUnfollowCandidates } from "@/lib/social-analysis";
import { createApplicationBackup, readBackupPolicy } from "@/server/services/backup-center";
import { activity } from "@/server/services/growth-settings";

function sameOrigin(): void {
  const request = getRequest();
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new Error("Cerere nepermisă.");
}

export const getMarketingCenter = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "marketing.read");
    const [campaigns, costs, posts, proposals, runs, accounts, products] = await Promise.all([
      env.DB.prepare(
        `SELECT id,name,objective,status,currency,budget_minor AS budgetMinor,start_date AS startDate,
         end_date AS endDate,channels_json AS channelsJson,strategy,target_audience AS targetAudience,
         created_at AS createdAt FROM marketing_campaigns ORDER BY created_at DESC LIMIT 100`,
      ).all<Record<string, string | number | null>>(),
      env.DB.prepare(
        `SELECT id,campaign_id AS campaignId,channel,category,amount_minor AS amountMinor,
         currency,occurred_on AS occurredOn,note FROM marketing_cost_entries
         ORDER BY occurred_on DESC,created_at DESC LIMIT 150`,
      ).all<Record<string, string | number | null>>(),
      env.DB.prepare(
        `SELECT sp.id,sp.post_type AS postType,sp.status,sp.caption,sp.scheduled_at AS scheduledAt,
         sp.created_at AS createdAt,sa.provider,sa.label AS accountLabel
         FROM social_posts sp LEFT JOIN social_accounts sa ON sa.id=sp.account_id
         ORDER BY sp.created_at DESC LIMIT 100`,
      ).all<Record<string, string | null>>(),
      env.DB.prepare(
        `SELECT id,provider,username,profile_url AS profileUrl,engagement_rate AS engagementRate,
         last_interaction_at AS lastInteractionAt,score,reasons_json AS reasonsJson,decision,protected
         FROM social_unfollow_proposals ORDER BY
         CASE decision WHEN 'proposed' THEN 0 ELSE 1 END,score DESC LIMIT 100`,
      ).all<Record<string, string | number | null>>(),
      env.DB.prepare(
        `SELECT id,provider,source,status,imported_count AS importedCount,
         proposed_count AS proposedCount,created_at AS createdAt
         FROM social_analysis_runs ORDER BY created_at DESC LIMIT 20`,
      ).all<Record<string, string | number | null>>(),
      env.DB.prepare(
        `SELECT id,provider,label,account_type AS accountType,status,capabilities_json AS capabilitiesJson,
         last_synced_at AS lastSyncedAt FROM social_accounts ORDER BY provider,label`,
      ).all<Record<string, string | null>>(),
      listPublicCatalog(env.DB),
    ]);
    return {
      campaigns: campaigns.results,
      costs: costs.results,
      posts: posts.results,
      proposals: proposals.results,
      runs: runs.results,
      accounts: accounts.results,
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        melody: product.melody,
      })),
    };
  });

export const createMarketingCampaign = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(marketingCampaignInputSchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "marketing.write");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO marketing_campaigns(
          id,name,objective,currency,budget_minor,start_date,end_date,channels_json,strategy,
          target_audience,created_by,created_at,updated_at
        ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?12)`,
      ).bind(
        id,
        data.name,
        data.objective,
        data.currency,
        Math.round(data.budget * 100),
        data.startDate || null,
        data.endDate || null,
        JSON.stringify(data.channels),
        data.strategy,
        data.targetAudience,
        context.admin.id,
        now,
      ),
      activity(env.DB, context.admin.id, "marketing.campaign_created", id, now),
    ]);
    return { ok: true, id };
  });

export const addMarketingCost = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(marketingCostInputSchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "marketing.write");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO marketing_cost_entries(
          id,campaign_id,channel,category,amount_minor,currency,occurred_on,note,created_by,created_at
        ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)`,
      ).bind(
        id,
        data.campaignId || null,
        data.channel,
        data.category,
        Math.round(data.amount * 100),
        data.currency,
        data.occurredOn,
        data.note || null,
        context.admin.id,
        now,
      ),
      activity(env.DB, context.admin.id, "marketing.cost_added", id, now),
    ]);
    return { ok: true, id };
  });

function generatedCaption(
  input: z.infer<typeof socialDraftInputSchema>,
  product?: { name: string; melody: string | null },
): string {
  const subject = product ? product.name : "o cutiuță muzicală aleasă din poveste";
  const melody = product?.melody
    ? ` Melodia ${product.melody} transformă fiecare rotire într-o amintire.`
    : "";
  const opening: Record<typeof input.tone, string> = {
    cald: "Unele cadouri nu se deschid. Se ascultă.",
    magic: "O rotire de manivelă și povestea începe.",
    nostalgic: "Melodia pe care ai crezut că ai uitat-o încape într-o cutiuță.",
    jucaus: "Mică la vedere. Mare la capitolul magie.",
    premium: "Lemn, mecanism clasic și o melodie aleasă cu grijă.",
  };
  const tags =
    input.platform === "tiktok"
      ? "#cutiutamuzicala #cadou #poveste"
      : "#CutiuțaMagică #CadouCuPoveste #CutiuțăMuzicală";
  return `${opening[input.tone]} Descoperă ${subject}.${melody}\n\n${input.callToAction}\n\n${tags}`;
}

export const createSocialDraft = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(socialDraftInputSchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "marketing.write");
    const catalog = await listPublicCatalog(env.DB);
    const product = catalog.find((item) => item.id === data.productId);
    const id = crypto.randomUUID();
    const runId = crypto.randomUUID();
    const approvalId = crypto.randomUUID();
    const now = new Date().toISOString();
    const caption = generatedCaption(data, product);
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO social_posts(
          id,account_id,post_type,status,caption,campaign_json,created_by,created_at,updated_at
        ) VALUES(?1,?2,?3,'draft',?4,?5,?6,?7,?7)`,
      ).bind(
        id,
        data.accountId || null,
        data.postType,
        caption,
        JSON.stringify({
          campaignId: data.campaignId || null,
          productId: data.productId || null,
          platform: data.platform,
          objective: data.objective,
          tone: data.tone,
          notes: data.notes,
          generationMode: "catalog_rules_v1",
          approvalRequired: true,
        }),
        context.admin.id,
        now,
      ),
      env.DB.prepare(
        `INSERT INTO ai_runs(
          id,agent_id,trigger_type,input_json,output_json,status,token_count,
          estimated_cost_microunits,requested_by,started_at,completed_at,created_at
        ) VALUES(?1,'agent_marketing_content','manual',?2,?3,'completed',0,0,?4,?5,?5,?5)`,
      ).bind(
        runId,
        JSON.stringify({
          productId: data.productId || null,
          platform: data.platform,
          postType: data.postType,
          objective: data.objective,
          tone: data.tone,
        }),
        JSON.stringify({ socialPostId: id, caption, generationMode: "catalog_rules_v1" }),
        context.admin.id,
        now,
      ),
      env.DB.prepare(
        `INSERT INTO approval_requests(
          id,request_type,entity_type,entity_id,risk_level,summary,proposed_action_json,
          status,requested_by_agent_id,requested_by_admin_id,created_at
        ) VALUES(?1,'social_publish','social_post',?2,'high',?3,?4,'pending',
          'agent_marketing_content',?5,?6)`,
      ).bind(
        approvalId,
        id,
        `Revizuiește și aprobă publicarea ${data.postType} pe ${data.platform}.`,
        JSON.stringify({ operation: "publish", socialPostId: id, requiresOfficialApi: true }),
        context.admin.id,
        now,
      ),
      activity(env.DB, context.admin.id, "social.draft_created", id, now),
    ]);
    return { ok: true, id, caption };
  });

export const reviewSocialDraft = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(socialPostDecisionSchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "marketing.write");
    const now = new Date().toISOString();
    const result = await env.DB.batch([
      env.DB.prepare(
        `UPDATE social_posts SET status=?2,
         approved_by=CASE WHEN ?2='approved' THEN ?3 ELSE approved_by END,updated_at=?4
         WHERE id=?1 AND status IN ('draft','review','approved')`,
      ).bind(data.postId, data.decision, context.admin.id, now),
      env.DB.prepare(
        `UPDATE approval_requests SET status=?2,reviewed_by=?3,reviewed_at=?4
         WHERE entity_type='social_post' AND entity_id=?1 AND status='pending'`,
      ).bind(
        data.postId,
        data.decision === "approved" ? "approved" : "rejected",
        context.admin.id,
        now,
      ),
      activity(env.DB, context.admin.id, `social.${data.decision}`, data.postId, now),
    ]);
    if (!result[0].meta.changes) throw new Error("Draftul nu mai poate fi modificat.");
    return {
      ok: true,
      status: data.decision,
      publication: data.decision === "approved" ? "awaiting_official_connector" : "cancelled",
    };
  });

export const analyzeSocialRelationships = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(socialRelationshipImportSchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "marketing.write");
    const id = crypto.randomUUID();
    const agentRunId = crypto.randomUUID();
    const now = new Date().toISOString();
    const candidates = rankUnfollowCandidates(data.accounts);
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO social_analysis_runs(
          id,provider,source,status,imported_count,proposed_count,requested_by,created_at,completed_at
        ) VALUES(?1,?2,'manual_import','completed',?3,?4,?5,?6,?6)`,
      ).bind(id, data.provider, data.accounts.length, candidates.length, context.admin.id, now),
      env.DB.prepare(
        `INSERT INTO ai_runs(
          id,agent_id,trigger_type,input_json,output_json,status,token_count,
          estimated_cost_microunits,requested_by,started_at,completed_at,created_at
        ) VALUES(?1,'agent_social_hygiene','manual',?2,?3,'completed',0,0,?4,?5,?5,?5)`,
      ).bind(
        agentRunId,
        JSON.stringify({ provider: data.provider, importedCount: data.accounts.length }),
        JSON.stringify({
          analysisRunId: id,
          proposedCount: candidates.length,
          execution: "proposal_only",
        }),
        context.admin.id,
        now,
      ),
    ]);
    if (candidates.length) {
      await env.DB.batch(
        candidates.map((account) =>
          env.DB.prepare(
            `INSERT INTO social_unfollow_proposals(
          id,run_id,provider,username,profile_url,follows_back,engagement_rate,
          last_interaction_at,score,reasons_json,protected,created_at
        ) VALUES(?1,?2,?3,?4,?5,0,?6,?7,?8,?9,0,?10)`,
          ).bind(
            crypto.randomUUID(),
            id,
            data.provider,
            account.username,
            account.profileUrl || null,
            account.engagementRate,
            account.lastInteractionAt,
            account.score,
            JSON.stringify(account.reasons),
            now,
          ),
        ),
      );
    }
    return { ok: true, runId: id, proposed: candidates.length };
  });

export const decideUnfollowProposal = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(unfollowDecisionSchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "marketing.write");
    await env.DB.prepare(
      `UPDATE social_unfollow_proposals SET decision=?2,decided_by=?3,decided_at=?4 WHERE id=?1`,
    )
      .bind(data.proposalId, data.decision, context.admin.id, new Date().toISOString())
      .run();
    return { ok: true, execution: "manual_or_official_api_required" };
  });

export const getBackupCenter = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "backup.read");
    const [policy, runs] = await Promise.all([
      readBackupPolicy(env.DB),
      env.DB.prepare(
        `SELECT id,trigger_type AS triggerType,status,r2_key AS r2Key,size_bytes AS sizeBytes,
         table_count AS tableCount,is_baseline AS isBaseline,error_message AS errorMessage,
         created_at AS createdAt,completed_at AS completedAt
         FROM backup_runs ORDER BY created_at DESC LIMIT 100`,
      ).all<Record<string, string | number | null>>(),
    ]);
    return { policy, runs: runs.results, timeTravel: { enabled: true, freeRetentionDays: 7 } };
  });

export const saveBackupPolicy = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(backupPolicySchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "backup.write");
    await env.DB.prepare(
      `UPDATE backup_policies SET enabled=?1,frequency=?2,weekday=?3,hour=?4,
       retention_count=?5,max_age_days=?6,include_customer_data=?7,updated_by=?8,updated_at=?9
       WHERE id='default'`,
    )
      .bind(
        data.enabled ? 1 : 0,
        data.frequency,
        data.weekday,
        data.hour,
        data.retentionCount,
        data.maxAgeDays,
        data.includeCustomerData ? 1 : 0,
        context.admin.id,
        new Date().toISOString(),
      )
      .run();
    return { ok: true };
  });

export const runBackupNow = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    sameOrigin();
    assertPermission(context.admin, "backup.write");
    return createApplicationBackup(env, "manual", context.admin.id);
  });

export const protectBackupAsBaseline = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(z.object({ backupId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "backup.write");
    await env.DB.batch([
      env.DB.prepare("UPDATE backup_runs SET is_baseline=0 WHERE is_baseline=1"),
      env.DB.prepare(
        "UPDATE backup_runs SET is_baseline=1 WHERE id=?1 AND status IN ('completed','partial')",
      ).bind(data.backupId),
      activity(env.DB, context.admin.id, "backup.baseline_changed", data.backupId),
    ]);
    return { ok: true };
  });

export const getAccountVault = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "accounts.read");
    const [connections, devices, social] = await Promise.all([
      env.DB.prepare(
        `SELECT id,owner,provider,label,auth_method AS authMethod,secret_reference AS secretReference,
         status,scopes_json AS scopesJson,last_verified_at AS lastVerifiedAt,expires_at AS expiresAt,notes
         FROM account_connections ORDER BY owner,provider,label`,
      ).all<Record<string, string | null>>(),
      env.DB.prepare(
        `SELECT d.id,d.device_name AS deviceName,d.platform,d.last_seen_at AS lastSeenAt,
         d.revoked_at AS revokedAt,d.created_at AS createdAt,u.email
         FROM admin_devices d JOIN admin_users u ON u.id=d.admin_user_id
         ORDER BY d.revoked_at IS NOT NULL,d.last_seen_at DESC LIMIT 100`,
      ).all<Record<string, string | null>>(),
      env.DB.prepare(
        `SELECT id,provider,label,account_type AS accountType,status,last_synced_at AS lastSyncedAt
         FROM social_accounts ORDER BY provider,label`,
      ).all<Record<string, string | null>>(),
    ]);
    return {
      connections: connections.results,
      devices: devices.results,
      social: social.results,
    };
  });

export const saveAccountConnection = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(accountConnectionInputSchema)
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "accounts.write");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO account_connections(
        id,owner,provider,label,auth_method,secret_reference,scopes_json,notes,created_at,updated_at
      ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?9)
      ON CONFLICT(owner,provider,label) DO UPDATE SET auth_method=excluded.auth_method,
      secret_reference=excluded.secret_reference,scopes_json=excluded.scopes_json,
      notes=excluded.notes,updated_at=excluded.updated_at`,
    )
      .bind(
        id,
        data.owner,
        data.provider.toLowerCase(),
        data.label,
        data.authMethod,
        data.secretReference || null,
        JSON.stringify(data.scopes),
        data.notes || null,
        now,
      )
      .run();
    return { ok: true };
  });

export const registerAdminDevice = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(
    z.object({
      deviceId: z.string().uuid(),
      name: z.string().trim().min(2).max(100),
      platform: z.enum(["ios", "android", "desktop", "unknown"]),
    }),
  )
  .handler(async ({ context, data }) => {
    sameOrigin();
    const now = new Date().toISOString();
    await env.DB.prepare(
      `INSERT INTO admin_devices(id,admin_user_id,device_name,platform,last_seen_at,created_at)
       VALUES(?1,?2,?3,?4,?5,?5)
       ON CONFLICT(id) DO UPDATE SET device_name=excluded.device_name,platform=excluded.platform,
       last_seen_at=excluded.last_seen_at
       WHERE admin_devices.admin_user_id=excluded.admin_user_id
         AND admin_devices.revoked_at IS NULL`,
    )
      .bind(data.deviceId, context.admin.id, data.name, data.platform, now)
      .run();
    return { ok: true };
  });

export const revokeAdminDevice = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(z.object({ deviceId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    sameOrigin();
    assertPermission(context.admin, "accounts.write");
    await env.DB.prepare("UPDATE admin_devices SET revoked_at=?2 WHERE id=?1")
      .bind(data.deviceId, new Date().toISOString())
      .run();
    return { ok: true };
  });
