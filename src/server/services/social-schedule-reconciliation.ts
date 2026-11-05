export type MetricoolScheduleReconciliation = {
  quotaUsed: number;
  quotaLimit: 20;
  futureSchedules: never[];
  evidenceNote: string;
  idempotencyKey: string;
};

export type MetricoolScheduleReconciliationResult = {
  ok: true;
  duplicate: boolean;
  reconciledCount: number;
  verifiedScheduledCount: number;
  observedAt: string;
};

const brandId = "7230540";
const ownerEmail = "cutiutamagicaofficial@gmail.com";
const reconciliationMessage =
  "Programarea locală nu a fost confirmată în ultima verificare Metricool; postarea necesită o revizie și o aprobare nouă înainte de reprogramare.";

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifiedScheduleCount(db: D1Database): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM v_social_publication_state
       WHERE publication_state='scheduled_verified'`,
    )
    .first<{ total: number }>();
  return Number(row?.total ?? 0);
}

export async function reconcileMetricoolSchedules(
  db: D1Database,
  adminId: string,
  data: MetricoolScheduleReconciliation,
  observedAt = new Date().toISOString(),
): Promise<MetricoolScheduleReconciliationResult> {
  // The hash identifies the logical request, not its execution time. Retrying the
  // same admin action therefore returns the first receipt instead of mutating twice.
  const contentHash = await sha256(`social.schedule.reconcile:${data.idempotencyKey}`);
  const existing = await db
    .prepare(
      `SELECT reconciled_count AS reconciledCount,observed_at AS observedAt
       FROM social_schedule_snapshots WHERE content_hash=?1`,
    )
    .bind(contentHash)
    .first<{ reconciledCount: number; observedAt: string }>();
  if (existing) {
    return {
      ok: true,
      duplicate: true,
      reconciledCount: Number(existing.reconciledCount),
      verifiedScheduledCount: await verifiedScheduleCount(db),
      observedAt: existing.observedAt,
    };
  }

  const id = crypto.randomUUID();
  const activityId = `social_schedule_reconciliation_${contentHash}`;
  const results = await db.batch([
    db
      .prepare(
        `UPDATE social_posts
         SET status='review',scheduled_at=NULL,approved_by=NULL,
             last_error_message=?1,updated_at=?2
         WHERE status='scheduled'
           AND NOT EXISTS (
             SELECT 1 FROM provider_operations operation
             WHERE operation.entity_type='social_post'
               AND operation.entity_id=social_posts.id
               AND operation.operation_type='social.schedule'
               AND operation.status='succeeded'
               AND operation.external_id IS NOT NULL
           )`,
      )
      .bind(reconciliationMessage, observedAt),
    db
      .prepare(
        `INSERT OR IGNORE INTO social_schedule_snapshots(
          id,provider,brand_id,owner_email,observed_at,quota_used,quota_limit,
          future_schedule_count,future_schedules_json,content_hash,reconciled_count,
          imported_by,evidence_note
        ) VALUES(?1,'metricool_reviewed',?2,?3,?4,?5,?6,?7,?8,?9,changes(),?10,?11)`,
      )
      .bind(
        id,
        brandId,
        ownerEmail,
        observedAt,
        data.quotaUsed,
        data.quotaLimit,
        data.futureSchedules.length,
        JSON.stringify(data.futureSchedules),
        contentHash,
        adminId,
        data.evidenceNote,
      ),
    db
      .prepare(
        `UPDATE approval_requests
         SET status='expired',reviewed_at=?1
         WHERE entity_type='social_post'
           AND status IN ('pending','approved')
           AND entity_id IN (
             SELECT id FROM social_posts
             WHERE status='review' AND updated_at=?1 AND last_error_message=?2
           )`,
      )
      .bind(observedAt, reconciliationMessage),
    db
      .prepare(
        `INSERT OR IGNORE INTO business_activity(id,actor_id,action,entity_id,created_at)
         VALUES(?1,?2,'social.schedule_reconciled',?3,?4)`,
      )
      .bind(activityId, adminId, id, observedAt),
  ]);

  const stored = await db
    .prepare(
      `SELECT reconciled_count AS reconciledCount,observed_at AS observedAt
       FROM social_schedule_snapshots WHERE content_hash=?1`,
    )
    .bind(contentHash)
    .first<{ reconciledCount: number; observedAt: string }>();
  if (!stored) throw new Error("Reconcilierea nu a putut fi salvată.");

  return {
    ok: true,
    duplicate: Number(results[1]?.meta.changes ?? 0) === 0,
    reconciledCount: Number(stored.reconciledCount),
    verifiedScheduledCount: await verifiedScheduleCount(db),
    observedAt: stored.observedAt,
  };
}
