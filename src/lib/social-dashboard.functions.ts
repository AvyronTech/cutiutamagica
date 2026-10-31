import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { assertPermission, requireAdminAuth } from "@/lib/admin-auth";
import {
  metricoolScheduleReconciliationSchema,
  socialSnapshotSchema,
} from "@/lib/social-dashboard-contracts";
import { reconcileMetricoolSchedules } from "@/server/services/social-schedule-reconciliation";
import { activity } from "@/server/services/growth-settings";

type Snapshot = {
  id: string;
  network: "facebook" | "instagram" | "tiktok";
  periodStart: string;
  periodEnd: string;
  followersObservedOn: string | null;
  followers: number | null;
  posts: number | null;
  views: number | null;
  interactions: number | null;
  reels: number | null;
  source: string;
  importedAt: string;
};

export const getSocialDashboard = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async ({ context }) => {
    assertPermission(context.admin, "marketing.read");
    const [snapshots, accounts, metricool, postCounts, latestScheduleSnapshot] = await Promise.all([
      env.DB.prepare(
        `SELECT id,network,period_start AS periodStart,period_end AS periodEnd,
          followers_observed_on AS followersObservedOn,followers,posts,views,interactions,
          reels,source,imported_at AS importedAt
         FROM (
           SELECT *, ROW_NUMBER() OVER (PARTITION BY network ORDER BY period_end DESC, imported_at DESC) AS rank
           FROM social_analytics_snapshots WHERE brand_id = '7230540'
         ) WHERE rank = 1`,
      ).all<Snapshot>(),
      env.DB.prepare(
        `SELECT provider,label,account_type AS accountType,status,last_synced_at AS lastSyncedAt
         FROM social_accounts WHERE provider IN ('facebook','instagram','tiktok')
         ORDER BY provider,account_type`,
      ).all<{
        provider: string;
        label: string;
        accountType: string;
        status: string;
        lastSyncedAt: string | null;
      }>(),
      env.DB.prepare(
        `SELECT status,last_verified_at AS lastVerifiedAt FROM account_connections
         WHERE owner='cutiuta_magica' AND provider='metricool' AND label='Metricool · brand 7230540'
         LIMIT 1`,
      ).first<{ status: string; lastVerifiedAt: string | null }>(),
      env.DB.prepare(
        `SELECT publication_state AS status,COUNT(*) AS count
         FROM v_social_publication_state GROUP BY publication_state`,
      ).all<{ status: string; count: number }>(),
      env.DB.prepare(
        `SELECT observed_at AS observedAt,quota_used AS quotaUsed,quota_limit AS quotaLimit,
                future_schedule_count AS futureScheduleCount,reconciled_count AS reconciledCount,
                evidence_note AS evidenceNote
         FROM social_schedule_snapshots
         WHERE provider='metricool_reviewed' AND brand_id='7230540'
         ORDER BY observed_at DESC,created_at DESC LIMIT 1`,
      ).first<{
        observedAt: string;
        quotaUsed: number;
        quotaLimit: number;
        futureScheduleCount: number;
        reconciledCount: number;
        evidenceNote: string;
      }>(),
    ]);
    return {
      snapshots: snapshots.results,
      accounts: accounts.results,
      metricool: metricool ?? { status: "setup_required", lastVerifiedAt: null },
      postCounts: postCounts.results,
      latestScheduleSnapshot: latestScheduleSnapshot ?? null,
    };
  });

export const reconcileMetricoolSchedule = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(metricoolScheduleReconciliationSchema)
  .handler(async ({ context, data }) => {
    const request = getRequest();
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new Error("Cerere nepermisă.");
    assertPermission(context.admin, "marketing.write");

    return reconcileMetricoolSchedules(env.DB, context.admin.id, data);
  });

export const saveSocialSnapshot = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .validator(socialSnapshotSchema)
  .handler(async ({ context, data }) => {
    const request = getRequest();
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new Error("Cerere nepermisă.");
    assertPermission(context.admin, "marketing.write");
    const payload = JSON.stringify(data);
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const statement = env.DB.prepare(
      `INSERT OR IGNORE INTO social_analytics_snapshots(
        id,brand_id,network,period_start,period_end,followers_observed_on,
        followers,posts,views,interactions,reels,source,content_hash,imported_by,imported_at
      ) VALUES (?1,'7230540',?2,?3,?4,?5,?6,?7,?8,?9,?10,'metricool_reviewed',?11,?12,?13)`,
    ).bind(
      id,
      data.network,
      data.periodStart,
      data.periodEnd,
      data.followersObservedOn,
      data.followers,
      data.posts,
      data.views,
      data.interactions,
      data.reels,
      hash,
      context.admin.id,
      now,
    );
    const results = await env.DB.batch([
      statement,
      activity(env.DB, context.admin.id, "social.analytics_import_requested", hash, now),
    ]);
    return { ok: true, imported: results[0].meta.changes > 0 };
  });
